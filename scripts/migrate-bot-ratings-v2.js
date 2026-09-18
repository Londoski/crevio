// =========================================================
// MIGRATION — bot_ratings v2
// File: scripts/migrate-bot-ratings-v2.js
// Purpose: capture full context for Crevio Management System
// =========================================================
const db = require("../database/db");

function hasTable(name) {
    try { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name); }
    catch (e) { return false; }
}
function hasColumn(table, col) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col); }
    catch (e) { return false; }
}

if (!hasTable("bot_ratings")) {
    db.exec(`
        CREATE TABLE bot_ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            message_id TEXT,
            rating TEXT,
            message TEXT,
            prompt TEXT,
            conversation_id INTEGER,
            user_plan TEXT,
            feedback_text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("✅ Created: bot_ratings");
} else {
    const cols = [
        ["message_id",      "TEXT"],
        ["message",         "TEXT"],
        ["prompt",          "TEXT"],
        ["conversation_id", "INTEGER"],
        ["user_plan",       "TEXT"],
        ["feedback_text",   "TEXT"],
        ["updated_at",      "DATETIME"]
    ];
    cols.forEach(([name, type]) => {
        if (!hasColumn("bot_ratings", name)) {
            db.exec(`ALTER TABLE bot_ratings ADD COLUMN ${name} ${type}`);
            console.log(`✅ Added bot_ratings.${name}`);
        }
    });
    console.log("⏭️  Table exists — columns checked");
}

// Index for the management system's future lookups
try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_bot_ratings_user_msg ON bot_ratings(user_id, message_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_bot_ratings_rating ON bot_ratings(rating)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_bot_ratings_created ON bot_ratings(created_at)`);
    console.log("✅ Indexes ready");
} catch (e) {
    console.log("⚠️ Index note:", e.message);
}

console.log("\n✅ Migration complete");