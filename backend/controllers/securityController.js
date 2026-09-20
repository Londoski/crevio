// =========================================================
// CREVIO — SECURITY CONTROLLER
// File: backend/controllers/securityController.js
// Includes the "This wasn't me" compromise-report flow.
// =========================================================

const bcrypt = require("bcrypt");
const db = require("../../database/db");
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
        if (sessions.length) {
            sessions[0].is_current = 1;
            for (let i = 1; i < sessions.length; i++) sessions[i].is_current = 0;
        }
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
        const r = db.prepare("DELETE FROM sessions WHERE user_id = ?").run(req.user.id);
        res.json({ success: true, message: "All sessions revoked", count: r.changes });
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
        if (userCols.includes("two_factor_enabled")) {
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