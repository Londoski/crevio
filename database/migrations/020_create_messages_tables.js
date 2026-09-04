// =========================================================
// CREVIO — MIGRATION 020: Messages / Inbox
// =========================================================

const db = require("../db");

function tableExists(table) {
    return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
}

function addColumnIfMissing(table, column, definition) {
    const columns = db.prepare(`PRAGMA table_info("${table}")`).all();
    if (!columns.some(c => c.name === column)) {
        db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
        console.log(`✅ Added column ${column} to ${table}`);
    }
}

const migrate = db.transaction(() => {
    console.log("📦 Creating messages tables...");

    // ---- conversations ----
    if (!tableExists('conversations')) {
        db.exec(`
            CREATE TABLE conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                creator_id INTEGER NOT NULL,
                client_name TEXT NOT NULL,
                client_email TEXT NOT NULL,
                service_id INTEGER,
                project_id INTEGER,
                status TEXT DEFAULT 'new_inquiry',
                source TEXT,
                budget TEXT,
                timeline TEXT,
                notes TEXT,
                starred INTEGER DEFAULT 0,
                archived INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
            )
        `);
        console.log("✅ Created conversations table");
    } else {
        console.log("ℹ️ conversations already exists");
    }

    // ---- messages ----
    if (!tableExists('messages')) {
        db.exec(`
            CREATE TABLE messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                sender_type TEXT NOT NULL, -- 'creator' or 'client'
                content TEXT NOT NULL,
                attachments TEXT, -- JSON array of attachment URLs
                read_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Created messages table");
    } else {
        console.log("ℹ️ messages already exists");
    }

    // ---- add missing columns if needed ----
    if (tableExists('conversations')) {
        addColumnIfMissing('conversations', 'creator_id', 'INTEGER NOT NULL');
        addColumnIfMissing('conversations', 'client_name', 'TEXT NOT NULL');
        addColumnIfMissing('conversations', 'client_email', 'TEXT NOT NULL');
        addColumnIfMissing('conversations', 'service_id', 'INTEGER');
        addColumnIfMissing('conversations', 'project_id', 'INTEGER');
        addColumnIfMissing('conversations', 'status', "TEXT DEFAULT 'new_inquiry'");
        addColumnIfMissing('conversations', 'source', 'TEXT');
        addColumnIfMissing('conversations', 'budget', 'TEXT');
        addColumnIfMissing('conversations', 'timeline', 'TEXT');
        addColumnIfMissing('conversations', 'notes', 'TEXT');
        addColumnIfMissing('conversations', 'starred', 'INTEGER DEFAULT 0');
        addColumnIfMissing('conversations', 'archived', 'INTEGER DEFAULT 0');
        addColumnIfMissing('conversations', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    }

    if (tableExists('messages')) {
        addColumnIfMissing('messages', 'conversation_id', 'INTEGER NOT NULL');
        addColumnIfMissing('messages', 'sender_type', "TEXT NOT NULL");
        addColumnIfMissing('messages', 'content', 'TEXT NOT NULL');
        addColumnIfMissing('messages', 'attachments', 'TEXT');
        addColumnIfMissing('messages', 'read_at', 'DATETIME');
    }

    console.log("✅ Migration 020 completed.");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration 020 failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}