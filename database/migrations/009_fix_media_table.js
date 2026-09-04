const db = require("../db");

function addColumnIfMissing(table, column, definition) {
    const columns = db.prepare(`PRAGMA table_info("${table}")`).all();
    if (!columns.some(c => c.name === column)) {
        db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
        console.log(`✅ Added column ${column} to ${table}`);
    }
}

const migrate = db.transaction(() => {
    // Check if project_media exists
    const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='project_media'`).get();
    if (!tableCheck) {
        // Create the table if it doesn't exist
        db.exec(`
            CREATE TABLE project_media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                user_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                original_filename TEXT,
                media_type TEXT,
                media_url TEXT NOT NULL,
                thumbnail_url TEXT,
                title TEXT,
                description TEXT,
                caption TEXT,
                category TEXT,
                tags TEXT,
                file_size INTEGER,
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Created project_media table");
    } else {
        // Add missing columns
        addColumnIfMissing('project_media', 'user_id', 'INTEGER NOT NULL DEFAULT 1');
        addColumnIfMissing('project_media', 'title', 'TEXT');
        addColumnIfMissing('project_media', 'description', 'TEXT');
        addColumnIfMissing('project_media', 'caption', 'TEXT');
        addColumnIfMissing('project_media', 'category', 'TEXT');
        addColumnIfMissing('project_media', 'tags', 'TEXT');
        addColumnIfMissing('project_media', 'file_size', 'INTEGER');
        addColumnIfMissing('project_media', 'original_filename', 'TEXT');
        addColumnIfMissing('project_media', 'thumbnail_url', 'TEXT');
        addColumnIfMissing('project_media', 'sort_order', 'INTEGER DEFAULT 0');
        console.log("✅ Added missing columns to project_media");
    }
    console.log("✅ Migration 009 completed.");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration 009 failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}