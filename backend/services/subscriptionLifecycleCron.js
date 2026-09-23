// =========================================================
// CREVIO — SUBSCRIPTION LIFECYCLE CRON
// File: backend/services/subscriptionLifecycleCron.js
// =========================================================
// Daily job that runs the subscription lifecycle:
//   Day -3:  Expiry warning
//   Day  0:  Grace period starts (3 days)
//   Day +3:  Downgrade to Free + notification
//   Day +30: Data removal warning (7 days notice)
// Idempotent — never fires the same notification twice.
// =========================================================
const db = require("../../database/db");
const planNotificationService = require("./planNotificationService");

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const GRACE_DAYS = 3;
const DATA_REMOVAL_WARNING_AFTER_DAYS = 30;
const DATA_REMOVAL_NOTICE_DAYS = 7;

let timer = null;

function ensureMarkerTable() {
    try {
        db.prepare(
            "CREATE TABLE IF NOT EXISTS subscription_reminders_sent (" +
            "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "  subscription_id INTEGER NOT NULL," +
            "  reminder_type TEXT NOT NULL," +
            "  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
            ")"
        ).run();
    } catch (e) { console.error("[lifecycle] marker table init:", e.message); }
}

function alreadySent(subscriptionId, reminderType) {
    try {
        const row = db.prepare(
            "SELECT id FROM subscription_reminders_sent " +
            "WHERE subscription_id = ? AND reminder_type = ? LIMIT 1"
        ).get(subscriptionId, reminderType);
        return !!row;
    } catch (e) { return false; }
}

function markSent(subscriptionId, reminderType) {
    try {
        db.prepare(
            "INSERT INTO subscription_reminders_sent (subscription_id, reminder_type) VALUES (?, ?)"
        ).run(subscriptionId, reminderType);
    } catch (e) {}
}

async function run() {
    const now = new Date();
    const results = { expiringWarned: 0, graceStarted: 0, downgraded: 0, dataWarned: 0 };

    try {
        const subs = db.prepare(
            "SELECT s.id, s.user_id, s.plan, s.current_period_end, s.cancel_at_period_end, " +
            "       s.grace_ends_at, s.downgraded_at, s.data_removal_warned_at, " +
            "       u.email " +
            "FROM subscriptions s " +
            "JOIN users u ON u.id = s.user_id " +
            "WHERE s.plan != 'free' " +
            "AND s.status = 'active' " +
            "AND s.current_period_end IS NOT NULL"
        ).all();

        for (const sub of subs) {
            const periodEnd = new Date(sub.current_period_end.replace(" ", "T") + "Z");

            // Cancelled subscriptions: skip warning + grace, downgrade at period_end
            if (sub.cancel_at_period_end === 1) {
                if (diffDays <= 0 && !sub.downgraded_at) {
                    try {
                        db.prepare("UPDATE subscriptions SET plan = 'free', status = 'cancelled', cancel_at_period_end = 0, downgraded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(sub.id);
                        try { db.prepare("UPDATE users SET plan = 'free' WHERE id = ?").run(sub.user_id); } catch (e) {}
                        await planNotificationService.onSubscriptionDowngraded({
                            userId: sub.user_id,
                            userEmail: sub.email,
                            planId: sub.plan
                        });
                        results.downgraded++;
                        console.log("[lifecycle] cancelled sub → free for user " + sub.user_id);
                    } catch (e) { console.error("[lifecycle] cancelled downgrade failed:", e.message); }
                }
                continue;
            }
            const diffMs = periodEnd.getTime() - now.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);

            // ============ STAGE A — Day -3 warning ============
            if (diffDays > 0 && diffDays <= 3 && !alreadySent(sub.id, "expiring_3day")) {
                try {
                    await planNotificationService.onSubscriptionExpiring({
                        userId: sub.user_id,
                        userEmail: sub.email,
                        planId: sub.plan,
                        renewalDate: sub.current_period_end
                    });
                    markSent(sub.id, "expiring_3day");
                    results.expiringWarned++;
                } catch (e) { console.error("[lifecycle] expiring warn failed:", e.message); }
            }

            // ============ STAGE B — Day 0 grace start ============
            if (diffDays <= 0 && !sub.grace_ends_at && !alreadySent(sub.id, "expired_grace_start")) {
                const graceEnd = new Date(periodEnd.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
                const graceEndStr = graceEnd.toISOString().replace("T", " ").substring(0, 19);
                try {
                    db.prepare("UPDATE subscriptions SET grace_ends_at = ? WHERE id = ?").run(graceEndStr, sub.id);
                    await planNotificationService.onSubscriptionExpired({
                        userId: sub.user_id,
                        userEmail: sub.email,
                        planId: sub.plan,
                        renewalDate: sub.current_period_end,
                        graceUntil: graceEndStr
                    });
                    markSent(sub.id, "expired_grace_start");
                    results.graceStarted++;
                } catch (e) { console.error("[lifecycle] grace start failed:", e.message); }
            }

            // ============ STAGE C — Day +3 downgrade ============
            if (sub.grace_ends_at && !sub.downgraded_at) {
                const graceEnd = new Date(sub.grace_ends_at.replace(" ", "T") + "Z");
                if (now.getTime() >= graceEnd.getTime()) {
                    try {
                        db.prepare("UPDATE subscriptions SET plan = 'free', downgraded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(sub.id);
                        try { db.prepare("UPDATE users SET plan = 'free' WHERE id = ?").run(sub.user_id); } catch (e) {}

                        await planNotificationService.onSubscriptionDowngraded({
                            userId: sub.user_id,
                            userEmail: sub.email,
                            planId: sub.plan
                        });
                        results.downgraded++;
                    } catch (e) { console.error("[lifecycle] downgrade failed:", e.message); }
                }
            }

            // ============ STAGE D — Day +30 data removal warning ============
            if (sub.downgraded_at && !sub.data_removal_warned_at) {
                const downgradedAt = new Date(sub.downgraded_at.replace(" ", "T") + "Z");
                const daysSince = (now.getTime() - downgradedAt.getTime()) / (1000 * 60 * 60 * 24);
                if (daysSince >= DATA_REMOVAL_WARNING_AFTER_DAYS) {
                    try {
                        await planNotificationService.onSubscriptionDataRemovalWarning({
                            userId: sub.user_id,
                            userEmail: sub.email,
                            planId: sub.plan,
                            daysUntilRemoval: DATA_REMOVAL_NOTICE_DAYS
                        });
                        db.prepare("UPDATE subscriptions SET data_removal_warned_at = CURRENT_TIMESTAMP WHERE id = ?").run(sub.id);
                        results.dataWarned++;
                    } catch (e) { console.error("[lifecycle] data warn failed:", e.message); }
                }
            }
        }

        console.log("[lifecycle] run complete:", JSON.stringify(results));
        return results;
    } catch (e) {
        console.error("[lifecycle] run failed:", e.message);
        return results;
    }
}

function start() {
    if (timer) return;
    ensureMarkerTable();

    setTimeout(function () { run().catch(function () {}); }, 45 * 1000);
    timer = setInterval(function () { run().catch(function () {}); }, CHECK_INTERVAL_MS);

    console.log("[lifecycle] started - checks every 24h");
}

function stop() {
    if (timer) {
        clearInterval(timer);
        timer = null;
        console.log("[lifecycle] stopped");
    }
}

module.exports = { start: start, stop: stop, run: run };