// =========================================================
// MIGRATION — Messages v3 (pin, mute, unread, list)
// File: scripts/migrate-messages-v3.js
// =========================================================

const db = require("../database/db");

function hasColumn(table, col) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col); }
    catch (e) { return false; }
}

const newCols = [
    ["pinned",          "INTEGER DEFAULT 0"],
    ["muted",           "INTEGER DEFAULT 0"],
    ["manually_unread", "INTEGER DEFAULT 0"],
    ["list_name",       "TEXT"]
];

newCols.forEach(([col, type]) => {
    if (!hasColumn("conversations", col)) {
        db.exec(`ALTER TABLE conversations ADD COLUMN ${col} ${type}`);
        console.log(`✅ Added conversations.${col}`);
    } else {
        console.log(`⏭️  Exists: conversations.${col}`);
    }
});

console.log("\n✅ Migration v3 complete");