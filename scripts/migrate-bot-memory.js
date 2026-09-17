const db = require("../database/db");
function has(n) {
    try { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(n); }
    catch (e) { return false; }
}
if (!has("bot_memory")) {
    db.exec("CREATE TABLE bot_memory (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "user_id INTEGER NOT NULL," +
        "key TEXT NOT NULL," +
        "value TEXT NOT NULL," +
        "category TEXT DEFAULT 'general'," +
        "source_conversation_id INTEGER," +
        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
        "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
        "UNIQUE(user_id, key)" +
    ")");
    db.exec("CREATE INDEX idx_bot_memory_user ON bot_memory(user_id, category)");
    console.log("✅ Created bot_memory");
} else console.log("⏭️  bot_memory exists");
