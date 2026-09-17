// =========================================================
// MIGRATION — Messages v4
// Adds: conversations.client_pinned, messages.deleted, messages.edited
// File: scripts/migrate-messages-v4.js
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

add("conversations", "client_pinned", "INTEGER DEFAULT 0");
add("messages",      "deleted",       "INTEGER DEFAULT 0");
add("messages",      "edited",        "INTEGER DEFAULT 0");

console.log("\n✅ Migration v4 complete");