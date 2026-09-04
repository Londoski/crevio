const db = require("../db");

function addColumnIfMissing(table, column, definition) {
    const columns = db.prepare(`PRAGMA table_info("${table}")`).all();
    if (!columns.some(c => c.name === column)) {
        db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
        console.log(`✅ Added column ${column} to ${table}`);
    }
}

function tableExists(table) {
    return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
}

const migrate = db.transaction(() => {
    console.log("📦 Checking projects table...");

    if (!tableExists('projects')) {
        db.exec(`
            CREATE TABLE projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT,
                thumbnail_url TEXT,
                published INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Created projects table");
    } else {
        // Add any missing columns
        addColumnIfMissing('projects', 'user_id', 'INTEGER NOT NULL DEFAULT 1');
        addColumnIfMissing('projects', 'name', 'TEXT NOT NULL DEFAULT "Unnamed Project"');
        addColumnIfMissing('projects', 'description', 'TEXT');
        addColumnIfMissing('projects', 'category', 'TEXT');
        addColumnIfMissing('projects', 'thumbnail_url', 'TEXT');
        addColumnIfMissing('projects', 'published', 'INTEGER DEFAULT 0');
        addColumnIfMissing('projects', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
        console.log("✅ Verified projects table columns");
    }

    console.log("✅ Migration 014 completed.");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}