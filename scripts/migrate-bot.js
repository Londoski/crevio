const db = require("../database/db");

function has(n) {
    try { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(n); }
    catch (e) { return false; }
}

if (!has("bot_ratings")) {
    db.exec(`
        CREATE TABLE bot_ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            message_id TEXT NOT NULL,
            message_content TEXT,
            rating TEXT NOT NULL,
            source TEXT DEFAULT 'bot',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, message_id)
        )
    `);
    console.log("✅ Created bot_ratings");
} else {
    console.log("⏭️  bot_ratings exists");
}

if (!has("bot_shares")) {
    db.exec(`
        CREATE TABLE bot_shares (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            message_id TEXT,
            conversation_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("✅ Created bot_shares");
} else {
    console.log("⏭️  bot_shares exists");
}

console.log("\nTables in DB:");
db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
  .forEach(r => console.log("  •", r.name));
