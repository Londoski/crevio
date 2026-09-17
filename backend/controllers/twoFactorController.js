// =========================================================
// CREVIO — TWO FACTOR CONTROLLER
// File: backend/controllers/twoFactorController.js
// =========================================================

const db = require("../../database/db");

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