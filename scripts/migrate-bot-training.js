const db = require("../database/db");

function has(n) {
    try { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(n); }
    catch (e) { return false; }
}

if (!has("bot_training")) {
    db.exec(`
        CREATE TABLE bot_training (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            bot_name TEXT DEFAULT 'CrevioBot',
            user_name TEXT,
            profession TEXT,
            about_user TEXT,
            tone TEXT DEFAULT 'professional',
            response_length TEXT DEFAULT 'balanced',
            custom_instructions TEXT,
            include_portfolio INTEGER DEFAULT 1,
            include_projects  INTEGER DEFAULT 1,
            include_services  INTEGER DEFAULT 1,
            include_skills    INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("✅ Created bot_training");
} else console.log("⏭️  bot_training exists");
