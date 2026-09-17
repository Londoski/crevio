const db = require("../database/db");

function has(n) {
    try { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(n); }
    catch (e) { return false; }
}

if (!has("bot_conversations")) {
    db.exec(`
        CREATE TABLE bot_conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT DEFAULT 'New chat',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.exec("CREATE INDEX idx_bot_conv_user ON bot_conversations(user_id, updated_at DESC)");
    console.log("✅ Created bot_conversations");
} else console.log("⏭️  bot_conversations exists");

if (!has("bot_messages")) {
    db.exec(`
        CREATE TABLE bot_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES bot_conversations(id) ON DELETE CASCADE
        )
    `);
    db.exec("CREATE INDEX idx_bot_msg_conv ON bot_messages(conversation_id, id ASC)");
    console.log("✅ Created bot_messages");
} else console.log("⏭️  bot_messages exists");

console.log("\nDone.");
