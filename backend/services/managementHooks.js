// =========================================================
// CREVIO — MANAGEMENT SYSTEM HOOKS
// File: backend/services/managementHooks.js
// =========================================================
// These functions are called by the future Crevio Management
// System (a separate project) to inspect, act on, and clean up
// user data.
//
// IMPORTANT: Crevio itself NEVER deletes user data. Only the
// management system can permanently remove a user, and only
// by calling permanentlyDeleteUser() with an explicit
// confirmation token.
//
// Locked by: phase-management-hooks
// =========================================================
const db = require("../../database/db");
const PLANS = require("../../config/plans");

// ---------- 1. List downgraded users ----------
// Returns every user currently on Free who previously held a
// paid plan. Useful for retention campaigns and audits.
function getDowngradedUsers(opts) {
    opts = opts || {};
    const limit = Math.min(opts.limit || 100, 1000);
    try {
        return db.prepare(
            "SELECT s.id AS subscription_id, s.user_id, s.plan AS current_plan, " +
            "       s.previous_plan, s.downgraded_at, " +
            "       u.email, u.display_name " +
            "FROM subscriptions s " +
            "JOIN users u ON u.id = s.user_id " +
            "WHERE s.plan = 'free' " +
            "AND s.downgraded_at IS NOT NULL " +
            "ORDER BY s.downgraded_at DESC " +
            "LIMIT ?"
        ).all(limit);
    } catch (e) {
        console.error("[managementHooks] getDowngradedUsers:", e.message);
        return [];
    }
}

// ---------- 2. User downgrade history ----------
// Full audit trail of a user's plan changes over time.
function getUserDowngradeHistory(userId) {
    if (!userId) return [];
    try {
        return db.prepare(
            "SELECT id, plan, previous_plan, downgraded_at, updated_at " +
            "FROM subscriptions WHERE user_id = ? ORDER BY updated_at DESC"
        ).all(userId);
    } catch (e) {
        console.error("[managementHooks] getUserDowngradeHistory:", e.message);
        return [];
    }
}

// ---------- 3. Restore user to a paid plan ----------
// Clears all grace-period state, resets reminder markers, and
// puts the user back on the requested plan.
function restoreUserPlan(userId, planId) {
    if (!userId || !planId) return { success: false, reason: "userId and planId required" };
    if (!PLANS.PLANS[planId]) return { success: false, reason: "invalid plan" };

    try {
        db.prepare(
            "UPDATE subscriptions SET plan = ?, status = 'active', " +
            "grace_ends_at = NULL, downgraded_at = NULL, " +
            "data_removal_warned_at = NULL, updated_at = CURRENT_TIMESTAMP " +
            "WHERE user_id = ?"
        ).run(planId, userId);
        db.prepare("UPDATE users SET plan = ? WHERE id = ?").run(planId, userId);

        // Clear reminder markers so future lifecycle events fire correctly
        try {
            const subIds = db.prepare("SELECT id FROM subscriptions WHERE user_id = ?").all(userId).map(function (r) { return r.id; });
            if (subIds.length) {
                const ph = subIds.map(function () { return "?"; }).join(",");
                const stmt = db.prepare("DELETE FROM subscription_reminders_sent WHERE subscription_id IN (" + ph + ")");
                stmt.run.apply(stmt, subIds);
            }
        } catch (e) { /* silent */ }

        return { success: true, userId: userId, plan: planId };
    } catch (e) {
        console.error("[managementHooks] restoreUserPlan:", e.message);
        return { success: false, reason: e.message };
    }
}

// ---------- 4. Permanent user deletion ----------
// DANGEROUS. Requires an explicit confirmation token to prevent
// accidents. Returns a full report of what was deleted.
function permanentlyDeleteUser(userId, confirm) {
    if (!userId) return { success: false, reason: "userId required" };

    const expected = "DELETE_USER_" + userId;
    if (confirm !== expected) {
        return {
            success: false,
            reason: "confirmation required",
            hint: "Call with confirm: \"" + expected + "\" to proceed"
        };
    }

    const report = { userId: userId, deleted: {}, errors: [] };

    // 1. subscription_reminders_sent (uses subscription_id)
    try {
        const subIds = db.prepare("SELECT id FROM subscriptions WHERE user_id = ?").all(userId).map(function (r) { return r.id; });
        if (subIds.length) {
            const ph = subIds.map(function () { return "?"; }).join(",");
            const stmt = db.prepare("DELETE FROM subscription_reminders_sent WHERE subscription_id IN (" + ph + ")");
            const r = stmt.run.apply(stmt, subIds);
            report.deleted["subscription_reminders_sent"] = r.changes;
        }
    } catch (e) { report.errors.push("subscription_reminders_sent: " + e.message); }

    // 2. Tables with user_id
    const userTables = [
        "bot_ratings", "notifications", "security_events",
        "sessions", "trusted_devices", "otp_challenges",
        "password_history", "two_factor_methods",
        "two_factor_recovery_codes", "subscriptions"
    ];
    userTables.forEach(function (t) {
        try {
            const r = db.prepare("DELETE FROM " + t + " WHERE user_id = ?").run(userId);
            report.deleted[t] = r.changes;
        } catch (e) {
            report.errors.push(t + ": " + e.message);
        }
    });

    // 3. Tables with creator_id (or user_id fallback)
    const creatorTables = ["messages", "conversations", "projects", "media", "services", "skills", "social_links"];
    creatorTables.forEach(function (t) {
        try {
            const r = db.prepare("DELETE FROM " + t + " WHERE creator_id = ?").run(userId);
            report.deleted[t] = r.changes;
        } catch (e) {
            try {
                const r = db.prepare("DELETE FROM " + t + " WHERE user_id = ?").run(userId);
                report.deleted[t] = r.changes;
            } catch (e2) {
                report.errors.push(t + ": " + e2.message);
            }
        }
    });

    // 4. Finally the user record itself
    try {
        const r = db.prepare("DELETE FROM users WHERE id = ?").run(userId);
        report.deleted["users"] = r.changes;
    } catch (e) {
        report.errors.push("users: " + e.message);
    }

    return { success: true, report: report };
}

module.exports = {
    getDowngradedUsers: getDowngradedUsers,
    getUserDowngradeHistory: getUserDowngradeHistory,
    restoreUserPlan: restoreUserPlan,
    permanentlyDeleteUser: permanentlyDeleteUser
};