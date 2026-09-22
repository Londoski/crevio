// =========================================================
// CREVIO — USER ACTIVITY SERVICE
// File: backend/services/userActivityService.js
// =========================================================
// Tracks last_activity_at for every authenticated user.
// Throttled to 1 DB write per user per hour (in-memory cache).
// Also exposes MS hooks for querying inactive users and
// flagging dormancy. Crevio NEVER locks users automatically.
// =========================================================
const db = require("../../database/db");

const THROTTLE_MS = 60 * 60 * 1000; // 1 hour
const lastWriteCache = new Map();   // userId -> timestamp (ms)

// ---------- 1. Track activity (throttled) ----------
// Called on every authed request. Fast: in-memory check first,
// only touches the DB when the throttle window expires.
function trackActivity(userId) {
    if (!userId) return false;

    const now = Date.now();
    const cached = lastWriteCache.get(userId);
    if (cached && (now - cached) < THROTTLE_MS) return false;

    // Cache miss — check DB value (handles server restarts)
    try {
        const row = db.prepare("SELECT last_activity_at FROM users WHERE id = ?").get(userId);
        if (row && row.last_activity_at) {
            const dbTime = new Date(String(row.last_activity_at).replace(" ", "T") + "Z").getTime();
            if (isFinite(dbTime) && (now - dbTime) < THROTTLE_MS) {
                lastWriteCache.set(userId, dbTime);
                return false;
            }
        }
    } catch (e) { /* column may not exist yet — proceed to write anyway */ }

    try {
        db.prepare("UPDATE users SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?").run(userId);
        lastWriteCache.set(userId, now);
        return true;
    } catch (e) {
        console.error("[userActivity] trackActivity:", e.message);
        return false;
    }
}

// ---------- 2. Get inactive users ----------
// Returns users with no activity in the last N days. Falls back
// to created_at when last_activity_at is NULL (never-logged-in).
function getInactiveUsers(opts) {
    opts = opts || {};
    const days = Math.max(1, Math.min(Number(opts.days) || 90, 3650));
    const limit = Math.min(Number(opts.limit) || 100, 1000);

    try {
        return db.prepare(
            "SELECT id, email, display_name, plan, " +
            "       last_activity_at, dormant_flagged_at, dormant_reason, created_at " +
            "FROM users " +
            "WHERE (last_activity_at IS NULL AND created_at < datetime('now', '-' || ? || ' days')) " +
            "   OR (last_activity_at IS NOT NULL AND last_activity_at < datetime('now', '-' || ? || ' days')) " +
            "ORDER BY COALESCE(last_activity_at, created_at) ASC " +
            "LIMIT ?"
        ).all(days, days, limit);
    } catch (e) {
        console.error("[userActivity] getInactiveUsers:", e.message);
        return [];
    }
}

// ---------- 3. Flag user as dormant (MS action) ----------
// Records that the Management System considers this user dormant.
// Does NOT lock the account — that's a separate decision.
function flagUserDormant(userId, reason) {
    if (!userId) return { success: false, reason: "userId required" };
    try {
        db.prepare(
            "UPDATE users SET dormant_flagged_at = CURRENT_TIMESTAMP, dormant_reason = ? WHERE id = ?"
        ).run(reason || "flagged by management", userId);
        return { success: true, userId: userId, reason: reason || "flagged by management" };
    } catch (e) {
        console.error("[userActivity] flagUserDormant:", e.message);
        return { success: false, reason: e.message };
    }
}

// ---------- 4. Clear dormant flag (MS action) ----------
function unflagUserDormant(userId) {
    if (!userId) return { success: false, reason: "userId required" };
    try {
        db.prepare(
            "UPDATE users SET dormant_flagged_at = NULL, dormant_reason = NULL WHERE id = ?"
        ).run(userId);
        return { success: true, userId: userId };
    } catch (e) {
        console.error("[userActivity] unflagUserDormant:", e.message);
        return { success: false, reason: e.message };
    }
}

module.exports = {
    trackActivity: trackActivity,
    getInactiveUsers: getInactiveUsers,
    flagUserDormant: flagUserDormant,
    unflagUserDormant: unflagUserDormant,
    THROTTLE_MS: THROTTLE_MS
};