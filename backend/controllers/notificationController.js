// =========================================================
// CREVIO — NOTIFICATION CONTROLLER
// File: backend/controllers/notificationController.js
// Auto-creates the notifications table if it's missing
// =========================================================

const db = require("../../database/db");

function tableExists(name) {
    try {
        return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
    } catch (e) { return false; }
}

function ensureTable() {
    if (tableExists("notifications")) return true;
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                message TEXT,
                type TEXT DEFAULT 'system',
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        return true;
    } catch (e) {
        console.error("Could not create notifications table:", e.message);
        return false;
    }
}

// =========================================================
// GET /api/notifications
// =========================================================
exports.getNotifications = (req, res) => {
    try {
        if (!ensureTable()) return res.json({ success: true, notifications: [] });

        const notifications = db.prepare(`
            SELECT * FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 100
        `).all(req.user.id);

        res.json({ success: true, notifications });
    } catch (err) {
        console.error("Get notifications error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PATCH /api/notifications/:id/read
// =========================================================
exports.markRead = (req, res) => {
    try {
        const r = db.prepare(
            "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?"
        ).run(req.params.id, req.user.id);

        if (r.changes === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Marked as read" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PATCH /api/notifications/read-all
// =========================================================
exports.markAllRead = (req, res) => {
    try {
        db.prepare(
            "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0"
        ).run(req.user.id);
        res.json({ success: true, message: "All marked as read" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// DELETE /api/notifications/:id
// =========================================================
exports.deleteNotification = (req, res) => {
    try {
        const r = db.prepare(
            "DELETE FROM notifications WHERE id = ? AND user_id = ?"
        ).run(req.params.id, req.user.id);
        if (r.changes === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/notifications — used internally
// =========================================================
exports.createNotification = (req, res) => {
    try {
        ensureTable();
        const { title, message, type } = req.body;
        if (!title) return res.status(400).json({ success: false, message: "Title required" });

        const r = db.prepare(`
            INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
            VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
        `).run(req.user.id, title, message || "", type || "system");

        res.json({ success: true, id: r.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/notifications/unread-count
// =========================================================
exports.unreadCount = (req, res) => {
    try {
        if (!ensureTable()) return res.json({ success: true, count: 0 });
        const row = db.prepare(
            "SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0"
        ).get(req.user.id);
        res.json({ success: true, count: row ? Number(row.c) : 0 });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};
