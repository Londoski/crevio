// =========================================================
// MIGRATION — Messages v5 (message-level fields)
// File: scripts/migrate-messages-v5.js
// =========================================================

const db = require("../database/db");

function hasColumn(table, col) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col); }
    catch (e) { return false; }
}

const add = (table, col, type) => {
    if (!hasColumn(table, col)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
        console.log(`✅ Added ${table}.${col}`);
    } else {
        console.log(`⏭️  Exists: ${table}.${col}`);
    }
};

add("messages", "pinned",       "INTEGER DEFAULT 0");
add("messages", "starred",      "INTEGER DEFAULT 0");
add("messages", "reported",     "INTEGER DEFAULT 0");
add("messages", "reply_to_id",  "INTEGER");
add("messages", "reactions",    "TEXT");

console.log("\n✅ Migration v5 complete");