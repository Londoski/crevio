// =========================================================
// MIGRATION — Messages v2
// File: scripts/migrate-messages-v2.js
// =========================================================

const db = require("../database/db");

function hasColumn(table, col) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col); }
    catch (e) { return false; }
}
function hasTable(name) {
    try { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name); }
    catch (e) { return false; }
}

if (!hasTable("conversations")) {
    db.exec(`
        CREATE TABLE conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            creator_id INTEGER NOT NULL,
            client_name TEXT,
            client_email TEXT,
            service_id INTEGER,
            project_id INTEGER,
            status TEXT DEFAULT 'new',
            source TEXT DEFAULT 'portfolio',
            budget TEXT,
            timeline TEXT,
            notes TEXT,
            starred INTEGER DEFAULT 0,
            archived INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("✅ Created: conversations");
} else {
    console.log("⏭️  Exists: conversations");
}

if (!hasTable("messages")) {
    db.exec(`
        CREATE TABLE messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender_type TEXT NOT NULL,
            content TEXT NOT NULL,
            attachments TEXT,
            read_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )
    `);
    console.log("✅ Created: messages");
} else {
    console.log("⏭️  Exists: messages");
}

["starred", "archived", "source", "budget", "timeline"].forEach(col => {
    if (!hasColumn("conversations", col)) {
        const type = (col === "starred" || col === "archived") ? "INTEGER DEFAULT 0" : "TEXT";
        db.exec(`ALTER TABLE conversations ADD COLUMN ${col} ${type}`);
        console.log(`✅ Added conversations.${col}`);
    }
});

console.log("\n✅ Migration complete");