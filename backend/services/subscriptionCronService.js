// =========================================================
// CREVIO — SUBSCRIPTION CRON SERVICE
// File: backend/services/subscriptionCronService.js
// Daily job that checks for subscriptions expiring soon
// (default: within 7 days) and fires the notification.
// Idempotent per day via a lightweight marker table.
// =========================================================
const db = require("../../database/db");
const planNotificationService = require("./planNotificationService");

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const EXPIRY_WINDOW_DAYS = 7;
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
    } catch (e) {
        console.error("[subCron] marker table init failed:", e.message);
    }
}

function alreadySentToday(subscriptionId, reminderType) {
    try {
        const row = db.prepare(
            "SELECT id FROM subscription_reminders_sent " +
            "WHERE subscription_id = ? AND reminder_type = ? " +
            "AND date(sent_at) = date('now') LIMIT 1"
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

async function runExpiryCheck() {
    try {
        const rows = db.prepare(
            "SELECT s.id, s.user_id, s.plan, s.current_period_end, u.email " +
            "FROM subscriptions s " +
            "JOIN users u ON u.id = s.user_id " +
            "WHERE s.status = 'active' " +
            "AND s.current_period_end IS NOT NULL " +
            "AND s.cancel_at_period_end = 0 " +
            "AND date(s.current_period_end) = date('now', '+' || ? || ' days')"
        ).all(EXPIRY_WINDOW_DAYS);

        if (!rows.length) {
            console.log("[subCron] no subscriptions expiring in " + EXPIRY_WINDOW_DAYS + " days");
            return { checked: 0, sent: 0 };
        }

        let sent = 0;
        for (const row of rows) {
            if (alreadySentToday(row.id, "expiring_soon")) continue;

            const planCfg = require("../../config/plans").get(row.plan);
            const planName = planCfg ? planCfg.name : row.plan;

            await planNotificationService.onSubscriptionExpiringSoon({
                userId: row.user_id,
                userEmail: row.email,
                planName: planName,
                daysLeft: EXPIRY_WINDOW_DAYS,
                renewDate: row.current_period_end
            });

            markSent(row.id, "expiring_soon");
            sent++;
        }

        console.log("[subCron] checked " + rows.length + ", sent " + sent);
        return { checked: rows.length, sent: sent };
    } catch (e) {
        console.error("[subCron] runExpiryCheck failed:", e.message);
        return { checked: 0, sent: 0, error: e.message };
    }
}

function start() {
    if (timer) return;
    ensureMarkerTable();

    // First run 30 seconds after boot, then every 24h
    setTimeout(function () {
        runExpiryCheck().catch(function () {});
    }, 30 * 1000);

    timer = setInterval(function () {
        runExpiryCheck().catch(function () {});
    }, CHECK_INTERVAL_MS);

    console.log("[subCron] started — checks every 24h");
}

function stop() {
    if (timer) {
        clearInterval(timer);
        timer = null;
        console.log("[subCron] stopped");
    }
}

module.exports = {
    start: start,
    stop: stop,
    runExpiryCheck: runExpiryCheck
};