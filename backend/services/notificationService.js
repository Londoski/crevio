// =========================================================
// CREVIO — NOTIFICATION SERVICE
// File: backend/services/notificationService.js
// Single SQLite-native module. Any controller in Crevio may
// call .create() to emit a notification on a real event.
// All queries are scoped to a user. No Postgres. No orphans.
// =========================================================
const db = require("../../database/db");

// ---------- guards ----------
function hasColumn(col) {
    try {
        return db.prepare("PRAGMA table_info(notifications)").all().some(c => c.name === col);
    } catch (e) { return false; }
}
function tableExists() {
    try {
        return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'").get();
    } catch (e) { return false; }
}

// ---------- allowed types (MVP) ----------
// MVP emits only: "message" | "system"
// Future: "payment" | "alert" | "error" (icon already exists in UI)
const ALLOWED_TYPES = new Set(["message", "payment", "alert", "error", "system"]);

// ---------- internal helpers ----------
function safeString(v, max) {
    if (v === undefined || v === null) return "";
    return String(v).slice(0, max);
}

/**
 * Create a notification for a user.
 * Never throws — returns { success, id?, reason? } so callers can
 * safely fire-and-forget without breaking the primary action.
 *
 * @param {object} opts
 * @param {number} opts.userId       — recipient (required)
 * @param {string} opts.type         — one of ALLOWED_TYPES
 * @param {string} opts.title        — short header (required)
 * @param {string} [opts.message]    — optional body
 * @param {string} [opts.entityType] — 'project' | 'portfolio' | 'conversation' | ...
 * @param {number} [opts.entityId]   — id of the referenced record
 */
function create({ userId, type, title, message, entityType, entityId } = {}) {
    try {
        if (!userId) return { success: false, reason: "userId required" };
        if (!title)  return { success: false, reason: "title required" };

        const t = (type && ALLOWED_TYPES.has(type)) ? type : "system";

        if (!tableExists()) {
            return { success: false, reason: "notifications table missing" };
        }

        const hasEntityType = hasColumn("entity_type");
        const hasEntityId   = hasColumn("entity_id");

        // Build insert dynamically based on which columns exist
        const fields = ["user_id", "title", "message", "type", "is_read", "created_at"];
        const placeholders = ["?", "?", "?", "?", "0", "CURRENT_TIMESTAMP"];
        const values = [userId, safeString(title, 255), safeString(message, 2000), t];

        if (hasEntityType) {
            fields.push("entity_type");
            placeholders.push("?");
            values.push(entityType ? safeString(entityType, 50) : null);
        }
        if (hasEntityId) {
            fields.push("entity_id");
            placeholders.push("?");
            values.push(entityId ? Number(entityId) : null);
        }

        const stmt = db.prepare(
            `INSERT INTO notifications (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`
        );
        const r = stmt.run(...values);

        return { success: true, id: r.lastInsertRowid };
    } catch (err) {
        console.error("[notificationService.create] failed:", err.message);
        return { success: false, reason: err.message };
    }
}

/**
 * Count unread notifications for a user.
 * Never throws — returns 0 on failure.
 */
function unreadCount(userId) {
    try {
        if (!userId || !tableExists()) return 0;
        const row = db.prepare(
            "SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0"
        ).get(userId);
        return row ? Number(row.c) : 0;
    } catch (e) {
        return 0;
    }
}

module.exports = {
    create,
    unreadCount,
    // Exposed for tests / future use
    ALLOWED_TYPES
};