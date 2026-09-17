// =========================================================
// CREVIO — ACCOUNT CONTROLLER
// File: backend/controllers/accountController.js
// Handles deactivate, reactivate, delete, cancel-deletion, export
// Uses real schema: users has account_status, deactivated_at,
//   deletion_requested_at, deletion_scheduled_for, deletion_reason
// =========================================================

const db = require("../../database/db");

function userCols() {
    try { return db.prepare("PRAGMA table_info(users)").all().map(c => c.name); }
    catch (e) { return []; }
}

function safeCount(sql, ...params) {
    try { return db.prepare(sql).get(...params)?.c || 0; }
    catch (e) { return 0; }
}

// =========================================================
// GET /api/account/overview
// =========================================================
exports.getOverview = (req, res) => {
    try {
        const c = userCols();
        const selectFields = [
            "id", "username", "email", "display_name", "role",
            "account_status", "created_at",
            "deactivated_at", "deletion_requested_at",
            "deletion_scheduled_for", "deletion_reason"
        ].filter(f => c.includes(f));

        const user = db.prepare(`SELECT ${selectFields.join(", ")} FROM users WHERE id = ?`).get(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        user.totalProjects = safeCount("SELECT COUNT(*) AS c FROM projects WHERE user_id = ?", req.user.id);
        user.totalServices = safeCount("SELECT COUNT(*) AS c FROM services WHERE user_id = ?", req.user.id);
        user.totalMedia    = safeCount("SELECT COUNT(*) AS c FROM project_media WHERE user_id = ?", req.user.id);

        res.json({ success: true, account: user });
    } catch (err) {
        console.error("Get overview error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/account/deactivate
// =========================================================
exports.deactivate = (req, res) => {
    try {
        const c = userCols();
        const has = (n) => c.includes(n);

        const setClauses = [];
        const values = [];

        if (has("account_status")) {
            setClauses.push("account_status = ?");
            values.push("deactivated");
        }
        if (has("deactivated_at")) {
            setClauses.push("deactivated_at = CURRENT_TIMESTAMP");
        }
        if (has("updated_at")) {
            setClauses.push("updated_at = CURRENT_TIMESTAMP");
        }

        if (!setClauses.length) {
            return res.status(400).json({ success: false, message: "No columns to update" });
        }

        const sql = `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`;
        values.push(req.user.id);

        db.prepare(sql).run(...values);

        res.json({ success: true, message: "Account deactivated" });
    } catch (err) {
        console.error("Deactivate error:", err);
        res.status(500).json({ success: false, message: "Failed to deactivate", error: err.message });
    }
};

// =========================================================
// POST /api/account/reactivate
// =========================================================
exports.reactivate = (req, res) => {
    try {
        const c = userCols();
        const has = (n) => c.includes(n);

        const setClauses = [];
        const values = [];

        if (has("account_status")) {
            setClauses.push("account_status = ?");
            values.push("active");
        }
        if (has("deactivated_at")) {
            setClauses.push("deactivated_at = NULL");
        }
        if (has("updated_at")) {
            setClauses.push("updated_at = CURRENT_TIMESTAMP");
        }

        if (!setClauses.length) {
            return res.status(400).json({ success: false, message: "Nothing to update" });
        }

        const sql = `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`;
        values.push(req.user.id);
        db.prepare(sql).run(...values);

        res.json({ success: true, message: "Account reactivated" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/account/delete
// Schedules deletion 30 days from now
// =========================================================
exports.deleteAccount = (req, res) => {
    try {
        const { reason } = req.body || {};
        const c = userCols();
        const has = (n) => c.includes(n);

        const setClauses = [];
        const values = [];

        if (has("account_status")) {
            setClauses.push("account_status = ?");
            values.push("pending_deletion");
        }
        if (has("deletion_requested_at")) {
            setClauses.push("deletion_requested_at = CURRENT_TIMESTAMP");
        }
        if (has("deletion_scheduled_for")) {
            setClauses.push("deletion_scheduled_for = datetime(CURRENT_TIMESTAMP, '+30 days')");
        }
        if (has("deletion_reason") && reason) {
            setClauses.push("deletion_reason = ?");
            values.push(reason);
        }
        if (has("updated_at")) {
            setClauses.push("updated_at = CURRENT_TIMESTAMP");
        }

        if (!setClauses.length) {
            return res.status(400).json({ success: false, message: "No deletion columns available" });
        }

        const sql = `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`;
        values.push(req.user.id);
        db.prepare(sql).run(...values);

        res.json({
            success: true,
            message: "Account scheduled for deletion in 30 days",
            scheduled_for: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
    } catch (err) {
        console.error("Delete account error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/account/cancel-deletion
// =========================================================
exports.cancelDeletion = (req, res) => {
    try {
        const c = userCols();
        const has = (n) => c.includes(n);

        const setClauses = [];
        if (has("account_status"))         setClauses.push("account_status = 'active'");
        if (has("deletion_requested_at"))  setClauses.push("deletion_requested_at = NULL");
        if (has("deletion_scheduled_for")) setClauses.push("deletion_scheduled_for = NULL");
        if (has("deletion_reason"))        setClauses.push("deletion_reason = NULL");
        if (has("updated_at"))             setClauses.push("updated_at = CURRENT_TIMESTAMP");

        if (!setClauses.length) {
            return res.status(400).json({ success: false, message: "Nothing to update" });
        }

        db.prepare(`UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`).run(req.user.id);
        res.json({ success: true, message: "Deletion cancelled" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/account/export — downloads all user data as JSON
// =========================================================
exports.exportData = (req, res) => {
    try {
        const userId = req.user.id;

        const safeAll = (sql, ...params) => {
            try { return db.prepare(sql).all(...params); }
            catch (e) { return []; }
        };
        const safeGet = (sql, ...params) => {
            try { return db.prepare(sql).get(...params); }
            catch (e) { return null; }
        };

        const c = userCols();
        const userFields = [
            "id", "username", "email", "display_name", "bio", "profile_image",
            "location", "phone", "role", "primary_profession", "specialties",
            "email_verified", "phone_verified", "account_status",
            "created_at", "updated_at"
        ].filter(f => c.includes(f));

        const exportData = {
            exported_at: new Date().toISOString(),
            user:      safeGet(`SELECT ${userFields.join(", ")} FROM users WHERE id = ?`, userId),
            projects:  safeAll("SELECT * FROM projects WHERE user_id = ?", userId),
            services:  safeAll("SELECT * FROM services WHERE user_id = ?", userId),
            media:     safeAll("SELECT * FROM project_media WHERE user_id = ?", userId),
            socials:   safeAll("SELECT * FROM social_links WHERE user_id = ?", userId),
            skills:    safeAll("SELECT * FROM creator_skills WHERE user_id = ?", userId),
            payments:  safeAll("SELECT * FROM payments WHERE user_id = ?", userId)
        };

        const json = JSON.stringify(exportData, null, 2);

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="crevio-export-${userId}-${Date.now()}.json"`);
        res.send(json);
    } catch (err) {
        console.error("Export error:", err);
        res.status(500).json({ success: false, message: "Failed to export", error: err.message });
    }
};