// =========================================================
// MIGRATION — lockdown v1
// File: scripts/migrate-lockdown-v1.js
// Adds suspension columns to users + security_events audit table.
// Idempotent. Additive. Non-destructive.
// =========================================================
const db = require("../database/db");

function hasTable(n) {
    try { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(n); }
    catch (e) { return false; }
}
function hasCol(t, c) {
    try { return db.prepare(`PRAGMA table_info(${t})`).all().some(x => x.name === c); }
    catch (e) { return false; }
}

// ---------- users: suspension columns ----------
const cols = [
    ["suspended",        "INTEGER DEFAULT 0"],
    ["suspended_at",     "DATETIME"],
    ["suspended_reason", "TEXT"]
];

cols.forEach(([name, type]) => {
    if (!hasCol("users", name)) {
        db.exec(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
        console.log(`✅ Added users.${name}`);
    } else {
        console.log(`⏭️  Exists: users.${name}`);
    }
});

// ---------- security_events ----------
if (!hasTable("security_events")) {
    db.exec(`
        CREATE TABLE security_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            notification_id INTEGER,
            ip_address TEXT,
            user_agent TEXT,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("✅ Created: security_events");
} else {
    console.log("⏭️  Exists: security_events");
}

try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id, created_at DESC)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at DESC)`);
    console.log("✅ Indexes: security_events");
} catch (e) { console.log("⚠️  idx note:", e.message); }

// ---------- Report ----------
const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
console.log("\n📋 users columns:");
console.log("   " + userCols.join(", "));

console.log("\n✅ Migration complete");