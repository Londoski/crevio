// =========================================================
// CREVIO — SECURITY CONTROLLER
// File: backend/controllers/securityController.js
// Includes the "This wasn't me" compromise-report flow.
// =========================================================

const bcrypt = require("bcrypt");
const db = require("../../database/db");
const deviceService = require("../services/deviceService");
const passwordHistoryService = require("../services/passwordHistoryService");
const emailOtpService = require("../services/emailOtpService");
const smsService = require("../services/smsService");
const lockdownService = require("../services/lockdownService");

function cols(table) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name); }
    catch (e) { return []; }
}
function tableExists(name) {
    try { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name); }
    catch (e) { return false; }
}
function appUrl() {
    const u = process.env.APP_URL || process.env.SITE_URL || "http://localhost:3000";
    return String(u).replace(/\/+$/, "");
}

// =========================================================
// GET /api/security/report-compromise?token=xyz
// Public. Validates the token WITHOUT consuming it, then
// redirects to the confirmation page.
// =========================================================
exports.reportCompromiseGet = (req, res) => {
    try {
        const token = String(req.query.token || "").trim();
        if (!token) {
            return res.redirect("/dashboard/pages/locked.html?error=missing_token");
        }

        // Peek: does this token exist, is it unconsumed, unexpired?
        const crypto = require("crypto");
        const hash = crypto.createHash("sha256").update(token).digest("hex");
        const row = db.prepare(`
            SELECT id, user_id FROM verification_tokens
            WHERE token_hash = ?
              AND token_type = 'compromise_lockdown'
              AND used_at IS NULL
              AND expires_at > CURRENT_TIMESTAMP
        `).get(hash);

        if (!row) {
            return res.redirect("/dashboard/pages/locked.html?error=invalid_token");
        }

        // Redirect to the confirm page — do NOT consume token here.
        return res.redirect("/dashboard/pages/locked-confirm.html?token=" + encodeURIComponent(token));
    } catch (err) {
        console.error("reportCompromiseGet error:", err);
        return res.redirect("/dashboard/pages/locked.html?error=server");
    }
};

// =========================================================
// POST /api/security/report-compromise
// Public. Body: { token }
// Consumes the token, locks down the account, redirects to
// the success page.
// =========================================================
exports.reportCompromisePost = async (req, res) => {
    try {
        const token = String((req.body && req.body.token) || "").trim();
        if (!token) {
            return res.status(400).json({ success: false, message: "Token required" });
        }

        const consumed = lockdownService.consumeToken(token);
        if (!consumed.success) {
            return res.status(400).json({
                success: false,
                message: consumed.reason === "invalid_or_expired"
                    ? "This link has already been used or expired."
                    : "Invalid link."
            });
        }

        const ipAddress = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || null;
        const userAgent = req.headers["user-agent"] || null;

        const result = await lockdownService.lockdown({
            userId: consumed.userId,
            reason: "reported_compromise",
            ipAddress,
            userAgent,
            notificationId: consumed.notificationId
        });

        if (!result.success) {
            return res.status(500).json({ success: false, message: "Lockdown failed", reason: result.reason });
        }

        return res.json({
            success: true,
            message: "Your account has been secured.",
            sessionsRevoked: result.sessionsRevoked,
            devicesRevoked: result.devicesRevoked
        });
    } catch (err) {
        console.error("reportCompromisePost error:", err);
        return res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/security/change-password
// =========================================================
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Both passwords required" });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }

        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const hash = user.password_hash || user.password;
        if (!hash) return res.status(500).json({ success: false, message: "No password stored" });

        const matches = await bcrypt.compare(currentPassword, hash);
        if (!matches) {
            return res.status(401).json({ success: false, message: "Current password is incorrect" });
        }

        // Block reuse of current or recent passwords
        if (await passwordHistoryService.isPasswordReused(req.user.id, newPassword)) {
            return res.status(400).json({
                success: false,
                message: "This password was used recently. Please choose a different one."
            });
        }
        // Record the old hash before replacing it
        passwordHistoryService.recordPasswordChange(req.user.id, hash);

        const newHash = await bcrypt.hash(newPassword, 12);
        const userCols = cols("users");
        const passwordCol = userCols.includes("password_hash") ? "password_hash" : "password";

        let sql = `UPDATE users SET ${passwordCol} = ?`;
        if (userCols.includes("updated_at")) sql += ", updated_at = CURRENT_TIMESTAMP";
        sql += " WHERE id = ?";

        db.prepare(sql).run(newHash, req.user.id);
        res.json({ success: true, message: "Password changed successfully" });
    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/security/sessions
// =========================================================
exports.getSessions = (req, res) => {
    try {
        let sessions = [];
        if (tableExists("sessions")) {
            try {
                sessions = db.prepare(`
                    SELECT * FROM sessions
                    WHERE user_id = ?
                    ORDER BY COALESCE(last_seen_at, created_at) DESC
                `).all(req.user.id);
            } catch (e) { sessions = []; }
        }
        // Mark the current session by matching the incoming JWT's hash
        try {
            const crypto = require("crypto");
            if (req.user && req.user.token) {
                const currentHash = crypto.createHash("sha256").update(String(req.user.token)).digest("hex");
                sessions.forEach(function (s) {
                    s.is_current = (s.session_token_hash === currentHash) ? 1 : 0;
                });
            } else {
                sessions.forEach(function (s) { s.is_current = 0; });
            }
        } catch (e) {
            sessions.forEach(function (s) { s.is_current = 0; });
        }
        
        // Enrich sessions with parsed device names
        try {
            sessions = sessions.map(function (sess) {
                const ua = sess.user_agent || sess.device || "";
                const parsed = deviceService.parse(ua);
                return Object.assign({}, sess, {
                    device: parsed.friendly,
                    browser: parsed.browser,
                    os: parsed.os,
                    location: null
                });
            });
        } catch (e) { console.warn("session enrich failed:", e.message); }

        res.json({ success: true, sessions });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// DELETE /api/security/sessions/:id
// =========================================================
exports.revokeSession = (req, res) => {
    try {
        if (!tableExists("sessions")) return res.json({ success: true, message: "No sessions table" });
        const r = db.prepare("DELETE FROM sessions WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
        if (r.changes === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Session revoked" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// DELETE /api/security/sessions
// =========================================================
exports.revokeAllSessions = (req, res) => {
    try {
        if (!tableExists("sessions")) return res.json({ success: true, message: "No sessions table" });

        // Identify the current session by hashing the JWT we received
        let currentHash = null;
        if (req.user && req.user.token) {
            const crypto = require("crypto");
            currentHash = crypto.createHash("sha256").update(String(req.user.token)).digest("hex");
        }

        let r;
        if (currentHash) {
            r = db.prepare(
                "DELETE FROM sessions WHERE user_id = ? AND session_token_hash != ?"
            ).run(req.user.id, currentHash);
        } else {
            // Fallback: no token info, don't delete at all (safer than logging user out)
            return res.status(400).json({ success: false, message: "Cannot determine current session." });
        }

        res.json({ success: true, message: "Other sessions revoked", count: r.changes });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/security/2fa
// =========================================================
exports.toggle2FA = (req, res) => {
    try {
        const { email_2fa } = req.body;
        const userCols = cols("users");
        if (userCols.includes("email_2fa_enabled")) {
            db.prepare("UPDATE users SET email_2fa_enabled = ? WHERE id = ?")
              .run(email_2fa ? 1 : 0, req.user.id);
        } else if (userCols.includes("two_factor_enabled")) {
            // Fallback if migration hasn't run
            db.prepare("UPDATE users SET two_factor_enabled = ? WHERE id = ?")
              .run(email_2fa ? 1 : 0, req.user.id);
        }
        res.json({ success: true, email_2fa: !!email_2fa });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/security/recovery-codes
// =========================================================
exports.generateRecoveryCodes = (req, res) => {
    try {
        const codes = [];
        for (let i = 0; i < 8; i++) codes.push(generateCode());

        if (tableExists("two_factor_recovery_codes")) {
            try {
                db.prepare("DELETE FROM two_factor_recovery_codes WHERE user_id = ?").run(req.user.id);
                const stmt = db.prepare(
                    "INSERT INTO two_factor_recovery_codes (user_id, code, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)"
                );
                for (const c of codes) stmt.run(req.user.id, c);
            } catch (e) {
                console.warn("Could not store recovery codes:", e.message);
            }
        }
        res.json({ success: true, codes });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 10; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
        if (i === 4) out += "-";
    }
    return out;
}


// =========================================================
// GET /api/security/reset-password?token=xyz
// Public. Verifies the reset token WITHOUT consuming it.
// =========================================================
exports.verifyResetTokenGet = (req, res) => {
    try {
        const token = String(req.query.token || "").trim();
        if (!token) return res.status(400).json({ success: false, message: "Token required" });

        const crypto = require("crypto");
        const hash = crypto.createHash("sha256").update(token).digest("hex");
        const row = db.prepare(`
            SELECT id, user_id FROM verification_tokens
            WHERE token_hash = ?
              AND token_type = 'password_reset_compromise'
              AND used_at IS NULL
              AND expires_at > CURRENT_TIMESTAMP
        `).get(hash);

        if (!row) return res.status(404).json({ success: false, message: "This link is invalid or has expired." });

        res.json({ success: true, userId: row.user_id });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/security/reset-password
// Public. Body: { token, newPassword }
// Consumes the token, sets the new password, unlocks the account.
// =========================================================
exports.resetPasswordPost = async (req, res) => {
    try {
        const token = String((req.body && req.body.token) || "").trim();
        const newPassword = String((req.body && req.body.newPassword) || "");

        if (!token) return res.status(400).json({ success: false, message: "Token required" });
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }
        if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.status(400).json({ success: false, message: "Password must contain letters and numbers" });
        }

        // Peek the token to get user_id WITHOUT consuming it, then block reuse
        const crypto = require("crypto");
        const hashPeek = crypto.createHash("sha256").update(token).digest("hex");
        const peek = db.prepare(
            "SELECT user_id FROM verification_tokens WHERE token_hash = ? " +
            "AND token_type = 'password_reset_compromise' AND used_at IS NULL " +
            "AND expires_at > CURRENT_TIMESTAMP"
        ).get(hashPeek);

        if (!peek) {
            return res.status(400).json({ success: false, message: "This link is invalid or has expired." });
        }

        if (await passwordHistoryService.isPasswordReused(peek.user_id, newPassword)) {
            return res.status(400).json({
                success: false,
                message: "This password was used recently. Please choose a different one."
            });
        }

        // Consume token via verificationService
        const verificationService = require("../services/verificationService");
        const row = verificationService.consumeVerificationToken(token);
        if (!row || row.token_type !== "password_reset_compromise") {
            return res.status(400).json({ success: false, message: "This link is invalid or has expired." });
        }

        // Update password
        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(row.user_id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const newHash = await bcrypt.hash(newPassword, 12);
        const userCols = cols("users");
        const passwordCol = userCols.includes("password_hash") ? "password_hash" : "password";
        let sql = `UPDATE users SET ${passwordCol} = ?`;
        if (userCols.includes("updated_at")) sql += ", updated_at = CURRENT_TIMESTAMP";
        sql += " WHERE id = ?";
        db.prepare(sql).run(newHash, row.user_id);

        // Unlock account via lockdownService
        const lockdownService = require("../services/lockdownService");
        // Do NOT unlock yet - require email OTP first.
        // Password is saved; account stays suspended until OTP verified.
        try {
            await emailOtpService.createAndSend({ userId: row.user_id, userEmail: user.email });
        } catch (e) { console.error("[reset] otp send failed:", e.message); }

        // Optionally queue an SMS for when Twilio is configured
        try {
            const phoneRow = db.prepare("SELECT phone FROM users WHERE id = ?").get(row.user_id);
            if (phoneRow && phoneRow.phone) {
                smsService.send({
                    userId: row.user_id,
                    to: phoneRow.phone,
                    body: "Your Crevio verification code has been sent to your email.",
                    category: "reset_otp_notice"
                }).catch(function () {});
            }
        } catch (e) {}

        // Notify + email confirmation
        try {
            const notificationService = require("../services/notificationService");
            notificationService.create({
                userId: row.user_id,
                type: "system",
                title: "Account unlocked",
                message: "Your password was reset and your account is unlocked. You can sign in again."
            });
        } catch (e) {}

        try {
            const emailService = require("../services/emailService");
            emailService.send({
                userId: row.user_id,
                to: user.email,
                subject: "Your Crevio password was reset",
                text: "Hi,\n\nYour Crevio password was just reset and your account has been unlocked.\n\nIf you did NOT do this, please contact our security team immediately:\n\n    security@crevio.indevs.in\n\nOr simply reply to this email — our security team monitors replies and will respond as soon as possible.\n\nThe Crevio Team",
                category: "security_password_reset"
            }).catch(function () {});
        } catch (e) {}

        res.json({ success: true, message: "Password updated. Enter the 6-digit code we just emailed you.", requires_otp: true });
    } catch (err) {
        console.error("resetPasswordPost error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};
// =========================================================
// POST /api/security/reset-verify-otp
// Public. Body: { token, code }
// Verifies the email OTP, unlocks the account on success.
// =========================================================
exports.verifyResetOtp = async (req, res) => {
    try {
        const token = String((req.body && req.body.token) || "").trim();
        const code  = String((req.body && req.body.code) || "").trim();
        if (!token || !code) return res.status(400).json({ success: false, message: "Token and code required" });

        const crypto = require("crypto");
        const hash = crypto.createHash("sha256").update(token).digest("hex");
        const row = db.prepare(
            "SELECT user_id FROM verification_tokens WHERE token_hash = ? AND token_type = 'password_reset_compromise' AND used_at IS NOT NULL LIMIT 1"
        ).get(hash);

        if (!row) return res.status(400).json({ success: false, message: "This session is invalid or has expired." });

        const v = emailOtpService.verify({ userId: row.user_id, code: code });
        if (!v.success) {
            let msg = "Incorrect code.";
            if (v.reason === "expired_or_missing") msg = "This code has expired. Request a new reset link.";
            if (v.reason === "too_many_attempts") msg = "Too many attempts. Request a new reset link.";
            if (v.reason === "invalid_format") msg = "Enter the 6-digit code from your email.";
            return res.status(400).json({ success: false, message: msg });
        }

        // OTP verified. Check if 2FA (TOTP) is enabled + has a verified method.
        let requiresTotp = false;
        try {
            const u2 = db.prepare("SELECT two_factor_enabled FROM users WHERE id = ?").get(row.user_id);
            if (u2 && u2.two_factor_enabled === 1) {
                const m = db.prepare(
                    "SELECT id FROM two_factor_methods WHERE user_id = ? AND method_type = 'authenticator' AND is_verified = 1 LIMIT 1"
                ).get(row.user_id);
                requiresTotp = !!m;
            }
        } catch (e) { requiresTotp = false; }

        if (requiresTotp) {
            return res.json({
                success: true,
                requires_totp: true,
                message: "Enter your authenticator code to finish."
            });
        }

        // No 2FA — finalize now
        await finalizeReset(row.user_id);
        res.json({ success: true, message: "Verification complete. Your account is unlocked." });
    } catch (err) {
        console.error("verifyResetOtp error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

exports.verifyResetTotp = async (req, res) => {
    try {
        const token = String((req.body && req.body.token) || "").trim();
        const code  = String((req.body && req.body.code) || "").trim();
        if (!token || !code) return res.status(400).json({ success: false, message: "Token and code required" });

        const crypto = require("crypto");
        const hash = crypto.createHash("sha256").update(token).digest("hex");
        const row = db.prepare(
            "SELECT user_id FROM verification_tokens WHERE token_hash = ? AND token_type = 'password_reset_compromise' AND used_at IS NOT NULL LIMIT 1"
        ).get(hash);

        if (!row) return res.status(400).json({ success: false, message: "This session is invalid or has expired." });

        const totpService = require("../services/totpService");
        const method = db.prepare(
            "SELECT * FROM two_factor_methods WHERE user_id = ? AND method_type = 'authenticator' AND is_verified = 1 ORDER BY is_primary DESC, id DESC LIMIT 1"
        ).get(row.user_id);

        if (!method) return res.status(400).json({ success: false, message: "No authenticator configured for this account." });

        let secret;
        try { secret = totpService.decryptSecret(method.secret); }
        catch (e) {
            console.error("verifyResetTotp decrypt error:", e.message);
            return res.status(500).json({ success: false, message: "Could not read 2FA secret." });
        }

        const ok = await totpService.verifyToken({ secret, token: code });
        if (!ok) return res.status(400).json({ success: false, message: "Incorrect code. Try again." });

        await finalizeReset(row.user_id);
        res.json({ success: true, message: "Verification complete. Your account is unlocked." });
    } catch (err) {
        console.error("verifyResetTotp error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// Shared finalization: unlock + notify + confirmation email
// =========================================================
async function finalizeReset(userId) {
    const lockdownService = require("../services/lockdownService");
    lockdownService.unlock({ userId: userId, reason: "multi_factor_verified" });

    try {
        const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId);
        const notificationService = require("../services/notificationService");
        const emailService = require("../services/emailService");

        notificationService.create({
            userId: userId,
            type: "system",
            title: "Account unlocked",
            message: "Your identity was verified and your account is unlocked. You can sign in again."
        });

        if (user && user.email) {
            emailService.send({
                userId: userId,
                to: user.email,
                subject: "Your Crevio account has been restored",
                text:
                    "Hi,\n\n" +
                    "Your Crevio account has been unlocked and is ready to use.\n\n" +
                    "If this wasn't you, please contact our security team immediately:\n\n" +
                    "    security@crevio.indevs.in\n\n" +
                    "Or simply reply to this email - our security team monitors replies and will respond as soon as possible.\n\n" +
                    "The Crevio Team",
                category: "security_account_restored"
            }).catch(function () {});
        }
    } catch (e) { console.error("finalizeReset notify error:", e.message); }
}

// =========================================================
// GET /api/security/2fa-status
// Returns both email_2fa and TOTP enabled state
// =========================================================
exports.get2FAStatus = (req, res) => {
    try {
        const userId = req.user.id;
        const userCols = cols("users");
        const row = userCols.includes("email_2fa_enabled")
            ? db.prepare("SELECT email_2fa_enabled, two_factor_enabled FROM users WHERE id = ?").get(userId)
            : db.prepare("SELECT two_factor_enabled FROM users WHERE id = ?").get(userId);

        const email2FA = !!(row && row.email_2fa_enabled === 1);

        let totpEnabled = false;
        try {
            const m = db.prepare(
                "SELECT id FROM two_factor_methods WHERE user_id = ? AND method_type = 'authenticator' AND is_verified = 1 LIMIT 1"
            ).get(userId);
            totpEnabled = !!m;
        } catch (e) {}

        res.json({
            success: true,
            email_2fa: email2FA,
            totp_enabled: totpEnabled
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};
