// =========================================================
// CREVIO — TWO FACTOR CONTROLLER
// File: backend/controllers/twoFactorController.js
// =========================================================

const db = require("../../database/db");
const totpService = require("../services/totpService");
const bcrypt = require("bcrypt");
const accountSecurityService = require("../services/accountSecurityService");

function cols(table) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name); }
    catch (e) { return []; }
}

// POST /api/2fa/setup
exports.setup = (req, res) => {
    try {
        const c = cols("users");
        if (c.includes("two_factor_enabled")) {
            db.prepare("UPDATE users SET two_factor_enabled = 1 WHERE id = ?").run(req.user.id);
        }
        // Notify: 2FA enabled (fire-and-forget)
        try {
            const __row = db.prepare("SELECT email FROM users WHERE id = ?").get(req.user.id);
            accountSecurityService.notify2FAEnabled({
                userId:    req.user.id,
                userEmail: __row && __row.email,
                ipAddress: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "",
                userAgent: req.headers["user-agent"] || ""
            }).catch(function () {});
        } catch (e) {}

        res.json({ success: true, message: "2FA enabled" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// POST /api/2fa/disable
exports.disable = (req, res) => {
    try {
        const c = cols("users");
        if (c.includes("two_factor_enabled")) {
            db.prepare("UPDATE users SET two_factor_enabled = 0 WHERE id = ?").run(req.user.id);
        }
        // Notify: 2FA disabled (fire-and-forget)
        try {
            const __row = db.prepare("SELECT email FROM users WHERE id = ?").get(req.user.id);
            accountSecurityService.notify2FADisabled({
                userId:    req.user.id,
                userEmail: __row && __row.email,
                ipAddress: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "",
                userAgent: req.headers["user-agent"] || ""
            }).catch(function () {});
        } catch (e) {}

        res.json({ success: true, message: "2FA disabled" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// GET /api/2fa/status
exports.status = (req, res) => {
    try {
        const c = cols("users");
        if (!c.includes("two_factor_enabled")) {
            return res.json({ success: true, enabled: false });
        }
        const row = db.prepare("SELECT two_factor_enabled FROM users WHERE id = ?").get(req.user.id);
        res.json({ success: true, enabled: !!row?.two_factor_enabled });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// POST /api/2fa/verify — verify a 6-digit code (placeholder)
exports.verify = (req, res) => {
    try {
        const { code } = req.body;
        if (!code || code.length !== 6) {
            return res.status(400).json({ success: false, message: "6-digit code required" });
        }
        // In real implementation, check against user's stored code / TOTP secret
        res.json({ success: true, verified: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/2fa/totp/setup
// Generates a new secret, stores it (unverified), returns QR
// =========================================================
exports.setupTotp = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Delete any pending unverified method so re-running setup is clean
        try {
            db.prepare("DELETE FROM two_factor_methods WHERE user_id = ? AND method_type = 'authenticator' AND is_verified = 0").run(userId);
        } catch (e) {}

        // Generate + encrypt
        const secret = totpService.createSecret();
        const encrypted = totpService.encryptSecret(secret);
        const uri = totpService.createAuthenticatorUri({ secret, email: user.email });
        const qr = await totpService.createQrCode(uri);

        // Store unverified method
        db.prepare(
            "INSERT INTO two_factor_methods (user_id, method_type, label, secret, is_primary, is_verified) VALUES (?, 'authenticator', ?, ?, 0, 0)"
        ).run(userId, user.email, encrypted);

        res.json({
            success: true,
            secret: secret,
            uri: uri,
            qr: qr
        });
    } catch (err) {
        console.error("setupTotp error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/2fa/totp/verify-setup
// Body: { code }
// Verifies the pending secret with a 6-digit code, then enables 2FA
// =========================================================
exports.verifyTotpSetup = async (req, res) => {
    try {
        const userId = req.user.id;
        const code = String((req.body && req.body.code) || "").trim();
        if (!/^\d{6}$/.test(code)) return res.status(400).json({ success: false, message: "Enter the 6-digit code from your authenticator app." });

        const method = db.prepare(
            "SELECT * FROM two_factor_methods WHERE user_id = ? AND method_type = 'authenticator' AND is_verified = 0 ORDER BY id DESC LIMIT 1"
        ).get(userId);

        if (!method) return res.status(400).json({ success: false, message: "No pending setup. Click Enable again." });

        let secret;
        try { secret = totpService.decryptSecret(method.secret); }
        catch (e) {
            console.error("verifyTotpSetup decrypt error:", e.message);
            return res.status(500).json({ success: false, message: "Could not read 2FA secret." });
        }

        const ok = await totpService.verifyToken({ secret, token: code });
        if (!ok) return res.status(400).json({ success: false, message: "Incorrect code. Try again." });

        // Mark verified + flip flag
        db.prepare("UPDATE two_factor_methods SET is_verified = 1, is_primary = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(method.id);
        db.prepare("UPDATE users SET two_factor_enabled = 1 WHERE id = ?").run(userId);

        res.json({ success: true, message: "Two-factor authentication enabled." });
    } catch (err) {
        console.error("verifyTotpSetup error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/2fa/totp/disable
// Body: { password }
// Verifies password, disables 2FA, removes methods
// =========================================================
exports.disableTotp = async (req, res) => {
    try {
        const userId = req.user.id;
        const password = String((req.body && req.body.password) || "");
        if (!password) return res.status(400).json({ success: false, message: "Password required to disable 2FA." });

        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const hash = user.password_hash || user.password;
        if (!hash) return res.status(500).json({ success: false, message: "No password stored" });

        const ok = await bcrypt.compare(password, hash);
        if (!ok) return res.status(401).json({ success: false, message: "Incorrect password." });

        db.prepare("DELETE FROM two_factor_methods WHERE user_id = ? AND method_type = 'authenticator'").run(userId);
        db.prepare("UPDATE users SET two_factor_enabled = 0 WHERE id = ?").run(userId);

        res.json({ success: true, message: "Two-factor authentication disabled." });
    } catch (err) {
        console.error("disableTotp error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/2fa/totp/status
// =========================================================
exports.totpStatus = (req, res) => {
    try {
        const userId = req.user.id;
        const user = db.prepare("SELECT two_factor_enabled FROM users WHERE id = ?").get(userId);
        const method = db.prepare(
            "SELECT id, label, is_verified, created_at FROM two_factor_methods WHERE user_id = ? AND method_type = 'authenticator' AND is_verified = 1 LIMIT 1"
        ).get(userId);

        res.json({
            success: true,
            enabled: !!(user && user.two_factor_enabled === 1),
            hasMethod: !!method,
            method: method || null
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};
