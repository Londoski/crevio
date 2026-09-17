// =========================================================
// MIGRATION — Messages (all-in-one)
// File: scripts/migrate-messages.js
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
function addCol(table, col, type) {
    if (!hasColumn(table, col)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
        console.log(`✅ Added ${table}.${col}`);
    } else {
        console.log(`⏭️  Exists: ${table}.${col}`);
    }
}

// -------- tables --------
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
} else console.log("⏭️  Exists: conversations");

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
} else console.log("⏭️  Exists: messages");

// -------- conversations columns --------
addCol("conversations", "starred",         "INTEGER DEFAULT 0");
addCol("conversations", "archived",        "INTEGER DEFAULT 0");
addCol("conversations", "source",          "TEXT");
addCol("conversations", "budget",          "TEXT");
addCol("conversations", "timeline",        "TEXT");
addCol("conversations", "pinned",          "INTEGER DEFAULT 0");   // creator pin
addCol("conversations", "client_pinned",   "INTEGER DEFAULT 0");   // client pin
addCol("conversations", "muted",           "INTEGER DEFAULT 0");
addCol("conversations", "manually_unread", "INTEGER DEFAULT 0");
addCol("conversations", "list_name",       "TEXT");

// -------- messages columns --------
addCol("messages", "deleted",     "INTEGER DEFAULT 0");
addCol("messages", "edited",      "INTEGER DEFAULT 0");
addCol("messages", "pinned",      "INTEGER DEFAULT 0");
addCol("messages", "starred",     "INTEGER DEFAULT 0");
addCol("messages", "reported",    "INTEGER DEFAULT 0");
addCol("messages", "reply_to_id", "INTEGER");
addCol("messages", "reactions",   "TEXT");

console.log("\n✅ Migration complete");