// =========================================================
// CREVIO — MIGRATION 010: Ensure Media Table Has All Columns
// =========================================================

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
    console.log("📦 Running migration 010...");

    // Create table if it doesn't exist
    if (!tableExists('project_media')) {
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
        // Add any missing columns
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
        console.log("✅ All columns verified");
    }

    console.log("✅ Migration 010 completed.");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration 010 failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}