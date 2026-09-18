// =========================================================
// MIGRATION — notifications v2
// File: scripts/migrate-notifications-v2.js
// Adds entity references + read_at so notifications can point
// at the authoritative workspace record (project / portfolio /
// conversation) for MVP navigation.
// Idempotent. Non-destructive. Safe to run multiple times.
// =========================================================
const db = require("../database/db");

function hasTable(name) {
    try {
        return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
    } catch (e) { return false; }
}
function hasColumn(table, col) {
    try {
        return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col);
    } catch (e) { return false; }
}

if (!hasTable("notifications")) {
    console.error("❌ notifications table does not exist. Run scripts/init-notifications.js first.");
    process.exit(1);
}

// ---------- Columns ----------
const cols = [
    ["entity_type", "TEXT"],
    ["entity_id",   "INTEGER"],
    ["read_at",     "DATETIME"]
];

cols.forEach(([name, type]) => {
    if (!hasColumn("notifications", name)) {
        db.exec(`ALTER TABLE notifications ADD COLUMN ${name} ${type}`);
        console.log(`✅ Added notifications.${name} (${type})`);
    } else {
        console.log(`⏭️  Exists: notifications.${name}`);
    }
});

// ---------- Indexes ----------
try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user_read    ON notifications(user_id, is_read)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)`);
    console.log("✅ Indexes ready (user_id + is_read, user_id + created_at)");
} catch (e) {
    console.log("⚠️  Index note:", e.message);
}

// ---------- Backfill: mark existing is_read=1 rows with read_at ----------
try {
    const r = db.prepare(`
        UPDATE notifications
        SET read_at = COALESCE(read_at, created_at)
        WHERE is_read = 1 AND read_at IS NULL
    `).run();
    if (r.changes > 0) console.log(`✅ Backfilled read_at for ${r.changes} already-read notification(s)`);
    else console.log("⏭️  No backfill needed");
} catch (e) {
    console.log("⚠️  Backfill note:", e.message);
}

// ---------- Report ----------
const finalCols = db.prepare("PRAGMA table_info(notifications)").all().map(c => c.name);
console.log("\n📋 Final schema: " + finalCols.join(", "));
console.log("\n✅ Migration complete");