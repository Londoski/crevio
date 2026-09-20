// =========================================================
// CREVIO — AUTH CONTROLLER
// File: backend/controllers/authController.js
// =========================================================

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../../database/db");
const deviceService = require("../services/deviceService");
const accountSecurityService = require("../services/accountSecurityService");
const loginSecurityService = require("../services/loginSecurityService");
const emailOtpService = require("../services/emailOtpService");
const passwordHistoryService = require("../services/passwordHistoryService");

function cols(table) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name); }
    catch (e) { return []; }
}

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { email, password, username, display_name } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password required" });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }

        const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        if (existing) return res.status(400).json({ success: false, message: "User already exists" });

        const hashed = await bcrypt.hash(password, 12);
        const c = cols("users");
        const passwordCol = c.includes("password_hash") ? "password_hash" : "password";

        const fields = ["email", passwordCol, "username"];
        const placeholders = ["?", "?", "?"];
        const values = [email, hashed, username || email.split("@")[0]];

        if (c.includes("display_name") && display_name) {
            fields.push("display_name"); placeholders.push("?"); values.push(display_name);
        }
        if (c.includes("role")) {
            fields.push("role"); placeholders.push("?"); values.push("creator");
        }
        if (c.includes("created_at")) {
            fields.push("created_at"); placeholders.push("CURRENT_TIMESTAMP");
        }

        const sql = `INSERT INTO users (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`;
        const result = db.prepare(sql).run(...values);

        res.json({ success: true, message: "User registered", userId: result.lastInsertRowid });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password required" });
        }

        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

        const hash = user.password_hash || user.password;
        if (!hash) return res.status(401).json({ success: false, message: "Account has no password" });

        const ok = await bcrypt.compare(password, hash);
        if (!ok) return res.status(401).json({ success: false, message: "Invalid email or password" });

        // =========================================================
        // 2FA enforcement — TOTP preferred, else email_2fa
        // =========================================================
        try {
            const u2 = db.prepare("SELECT two_factor_enabled, email_2fa_enabled FROM users WHERE id = ?").get(user.id);

            let requiredMethod = null;

            if (u2 && u2.two_factor_enabled === 1) {
                const hasTotp = db.prepare(
                    "SELECT id FROM two_factor_methods WHERE user_id = ? AND method_type = 'authenticator' AND is_verified = 1 LIMIT 1"
                ).get(user.id);
                if (hasTotp) requiredMethod = "totp";
            }

            if (!requiredMethod && u2 && u2.email_2fa_enabled === 1) {
                requiredMethod = "email";
            }

            if (requiredMethod) {
                const fp = deviceService.fingerprint({
                    userAgent: req.headers["user-agent"] || "",
                    ipAddress: null,
                    acceptLanguage: req.headers["accept-language"] || ""
                });
                const trustedDev = db.prepare(
                    "SELECT id FROM trusted_devices WHERE user_id = ? AND device_token = ? AND expires_at > CURRENT_TIMESTAMP LIMIT 1"
                ).get(user.id, fp);

                if (!trustedDev) {
                    const ticket = jwt.sign(
                        { id: user.id, purpose: "2fa_login", method: requiredMethod },
                        process.env.JWT_SECRET,
                        { expiresIn: "5m" }
                    );

                    // For email method, send OTP immediately
                    if (requiredMethod === "email") {
                        try {
                            await emailOtpService.createAndSend({
                                userId: user.id,
                                userEmail: user.email,
                                challengeType: "login_otp"
                            });
                        } catch (e) { console.error("[login] send login_otp failed:", e.message); }
                    }

                    return res.json({
                        success: true,
                        requires_2fa: true,
                        ticket: ticket,
                        method: requiredMethod,
                        message: requiredMethod === "totp"
                            ? "Enter the 6-digit code from your authenticator app."
                            : "Check your email for a 6-digit code."
                    });
                }
            }
        } catch (e) { /* silent */ }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role || "creator" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );


        // Record login + detect new device (fire-and-forget — never blocks login)
        try {
            loginSecurityService.recordLogin({
                userId:      user.id,
                userEmail:   user.email,
                token:       token,
                userAgent:   req.headers["user-agent"] || "",
                ipAddress:   String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "",
                acceptLanguage: req.headers["accept-language"] || "",
                rememberDevice: req.body && req.body.rememberDevice === false ? false : true
            }).catch(function () {});
        } catch (e) {}

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                display_name: user.display_name,
                role: user.role || "creator",
                profile_image: user.profile_image
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
    res.json({ success: true, message: "Logged out" });
};

// POST /api/auth/set-password — helper for users without a password
exports.setPassword = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password required" });
        }

        const hashed = await bcrypt.hash(password, 12);
        const c = cols("users");
        const passwordCol = c.includes("password_hash") ? "password_hash" : "password";

        const r = db.prepare(`UPDATE users SET ${passwordCol} = ? WHERE email = ?`).run(hashed, email);
        if (r.changes === 0) return res.status(404).json({ success: false, message: "User not found" });

        res.json({ success: true, message: "Password updated" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PATCH /api/auth/email
// Body: { newEmail, currentPassword }
// =========================================================
exports.changeEmail = async (req, res) => {
    try {
        const uid = req.user.id;
        const newEmail = String(req.body.newEmail || "").trim().toLowerCase();
        const currentPassword = String(req.body.currentPassword || "");

        if (!newEmail || !currentPassword) {
            return res.status(400).json({ success: false, message: "Email and current password required" });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }

        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(uid);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const hash = user.password_hash || user.password;
        if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
            return res.status(401).json({ success: false, message: "Current password is incorrect" });
        }

        if (user.email === newEmail) {
            return res.status(400).json({ success: false, message: "That is already your email" });
        }

        const taken = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(newEmail, uid);
        if (taken) return res.status(409).json({ success: false, message: "Email already in use" });

        db.prepare("UPDATE users SET email = ? WHERE id = ?").run(newEmail, uid);

        // Invalidate other sessions (force re-login)
        try { db.prepare("DELETE FROM sessions WHERE user_id = ?").run(uid); } catch (e) {}

        // Notify: email was changed (fire-and-forget)
        try {
            accountSecurityService.notifyEmailChanged({
                userId:    uid,
                oldEmail:  user.email,
                newEmail:  newEmail,
                ipAddress: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "",
                userAgent: req.headers["user-agent"] || ""
            }).catch(function () {});
        } catch (e) {}

        res.json({ success: true, message: "Email updated. Please sign in again.", email: newEmail });
    } catch (err) {
        console.error("Change email error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =========================================================
// PATCH /api/auth/password
// Body: { currentPassword, newPassword, confirmPassword }
// =========================================================
exports.changePassword = async (req, res) => {
    try {
        const uid = req.user.id;
        const currentPassword = String(req.body.currentPassword || "");
        const newPassword     = String(req.body.newPassword || "");
        const confirmPassword = String(req.body.confirmPassword || "");

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }
        if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.status(400).json({ success: false, message: "Password must contain letters and numbers" });
        }
        if (newPassword === currentPassword) {
            return res.status(400).json({ success: false, message: "New password must be different" });
        }

        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(uid);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const hash = user.password_hash || user.password;
        if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
            return res.status(401).json({ success: false, message: "Current password is incorrect" });
        }

        // Block reuse of current or recent passwords
        if (await passwordHistoryService.isPasswordReused(uid, newPassword)) {
            return res.status(400).json({
                success: false,
                message: "This password was used recently. Please choose a different one."
            });
        }
        // Record the old hash before replacing it
        passwordHistoryService.recordPasswordChange(uid, hash);

        const newHash = await bcrypt.hash(newPassword, 12);
        const col = user.password_hash ? "password_hash" : "password";
        db.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).run(newHash, uid);

        // Notify: password was changed (fire-and-forget)
        try {
            accountSecurityService.notifyPasswordChanged({
                userId:    uid,
                userEmail: user.email,
                ipAddress: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "",
                userAgent: req.headers["user-agent"] || ""
            }).catch(function () {});
        } catch (e) {}

        // Invalidate all sessions
        try { db.prepare("DELETE FROM sessions WHERE user_id = ?").run(uid); } catch (e) {}

        res.json({ success: true, message: "Password updated. Please sign in again." });
    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const __DEVICE_TTL_MS = 2592000000;
function __futureIso(ms) {
    return new Date(Date.now() + ms).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}
function __getFingerprint(req) {
    return deviceService.fingerprint({
        userAgent: req.headers["user-agent"] || "",
        ipAddress: null,
        acceptLanguage: req.headers["accept-language"] || ""
    });
}

// =========================================================
// POST /api/auth/device-status  (PUBLIC)
// Body: { email }
// Returns whether the current browser is already trusted for that email
// =========================================================
exports.deviceStatus = (req, res) => {
    try {
        const email = String((req.body && req.body.email) || "").trim().toLowerCase();
        if (!email) return res.json({ success: true, trusted: false });
        const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
        if (!user) return res.json({ success: true, trusted: false });
        const fp = __getFingerprint(req);
        const dev = db.prepare(
            "SELECT device_name, expires_at FROM trusted_devices WHERE user_id = ? AND device_token = ? AND expires_at > CURRENT_TIMESTAMP LIMIT 1"
        ).get(user.id, fp);
        if (!dev) return res.json({ success: true, trusted: false });
        return res.json({
            success: true,
            trusted: true,
            deviceName: dev.device_name,
            expiresAt: dev.expires_at
        });
    } catch (err) {
        res.json({ success: true, trusted: false });
    }
};

// =========================================================
// GET /api/auth/trust-device-status  (AUTH)
// =========================================================
exports.trustDeviceStatus = (req, res) => {
    try {
        const fp = __getFingerprint(req);
        const dev = db.prepare(
            "SELECT device_name, expires_at FROM trusted_devices WHERE user_id = ? AND device_token = ? AND expires_at > CURRENT_TIMESTAMP LIMIT 1"
        ).get(req.user.id, fp);
        return res.json({
            success: true,
            trusted: !!dev,
            deviceName: dev ? dev.device_name : null,
            expiresAt: dev ? dev.expires_at : null
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/auth/trust-current-device  (AUTH)
// =========================================================
exports.trustCurrentDevice = (req, res) => {
    try {
        const userAgent = req.headers["user-agent"] || "";
        const acceptLanguage = req.headers["accept-language"] || "";
        const ipAddress = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || null;
        const fp = __getFingerprint(req);
        const parsed = deviceService.parse(userAgent);
        const expiresAt = __futureIso(__DEVICE_TTL_MS);

        const existing = db.prepare(
            "SELECT id FROM trusted_devices WHERE user_id = ? AND device_token = ? LIMIT 1"
        ).get(req.user.id, fp);

        if (existing) {
            db.prepare("UPDATE trusted_devices SET last_used_at = CURRENT_TIMESTAMP, expires_at = ? WHERE id = ?").run(expiresAt, existing.id);
        } else {
            db.prepare(
                "INSERT INTO trusted_devices (user_id, device_token, device_name, user_agent, ip_address, expires_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
            ).run(req.user.id, fp, parsed.friendly, userAgent, ipAddress, expiresAt);
        }

        res.json({ success: true, deviceName: parsed.friendly, expiresAt });
    } catch (err) {
        console.error("trustCurrentDevice error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/auth/untrust-current-device  (AUTH)
// =========================================================
exports.untrustCurrentDevice = (req, res) => {
    try {
        const fp = __getFingerprint(req);
        const r = db.prepare(
            "DELETE FROM trusted_devices WHERE user_id = ? AND device_token = ?"
        ).run(req.user.id, fp);
        res.json({ success: true, removed: r.changes });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/auth/verify-2fa
// =========================================================
exports.verify2FALogin = async (req, res) => {
    try {
        const ticket = String((req.body && req.body.ticket) || "").trim();
        const code = String((req.body && req.body.code) || "").trim();
        const rememberDevice = req.body && req.body.rememberDevice !== false;

        if (!ticket || !code) return res.status(400).json({ success: false, message: "Ticket and code required" });
        if (!/^\d{6}$/.test(code)) return res.status(400).json({ success: false, message: "Enter the 6-digit code." });

        let decoded;
        try { decoded = jwt.verify(ticket, process.env.JWT_SECRET); }
        catch (e) { return res.status(401).json({ success: false, message: "Session expired. Please log in again." }); }

        if (!decoded || decoded.purpose !== "2fa_login" || !decoded.id) {
            return res.status(401).json({ success: false, message: "Invalid ticket." });
        }

        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.id);
        if (!user) return res.status(401).json({ success: false, message: "User not found" });

        // Branch by method: "totp" (default) or "email"
        const loginMethod = decoded.method || "totp";
        let ok = false;

        if (loginMethod === "email") {
            const v = emailOtpService.verify({
                userId: user.id,
                code: code,
                challengeType: "login_otp"
            });
            ok = !!v.success;
        } else {
            const method = db.prepare(
                "SELECT * FROM two_factor_methods WHERE user_id = ? AND method_type = 'authenticator' AND is_verified = 1 ORDER BY is_primary DESC, id DESC LIMIT 1"
            ).get(user.id);
            if (!method) return res.status(400).json({ success: false, message: "No authenticator configured." });

            const totpService = require("../services/totpService");
            let secret;
            try { secret = totpService.decryptSecret(method.secret); }
            catch (e) {
                console.error("verify2FALogin decrypt error:", e.message);
                return res.status(500).json({ success: false, message: "Could not read 2FA secret." });
            }
            ok = await totpService.verifyToken({ secret, token: code });
        }

        if (!ok) return res.status(400).json({ success: false, message: "Incorrect code. Try again." });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role || "creator" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        try {
            loginSecurityService.recordLogin({
                userId: user.id,
                userEmail: user.email,
                token: token,
                userAgent: req.headers["user-agent"] || "",
                ipAddress: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "",
                acceptLanguage: req.headers["accept-language"] || "",
                rememberDevice: rememberDevice
            }).catch(function () {});
        } catch (e) {}

        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                display_name: user.display_name,
                role: user.role || "creator",
                profile_image: user.profile_image
            }
        });
    } catch (err) {
        console.error("verify2FALogin error:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};
