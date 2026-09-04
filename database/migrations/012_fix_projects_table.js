// =========================================================
// CREVIO — MIGRATION 012: Fix Projects Table
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
    console.log("📦 Running migration 012...");

    // ---- Create projects table if missing ----
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
        // ---- Add missing columns to projects ----
        addColumnIfMissing('projects', 'user_id', 'INTEGER NOT NULL DEFAULT 1');
        addColumnIfMissing('projects', 'name', 'TEXT NOT NULL DEFAULT "Unnamed Project"');
        addColumnIfMissing('projects', 'description', 'TEXT');
        addColumnIfMissing('projects', 'category', 'TEXT');
        addColumnIfMissing('projects', 'thumbnail_url', 'TEXT');
        addColumnIfMissing('projects', 'published', 'INTEGER DEFAULT 0');
        addColumnIfMissing('projects', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
        console.log("✅ Verified projects table columns");
    }

    // ---- Ensure project_media has project_id (should already) ----
    if (tableExists('project_media')) {
        addColumnIfMissing('project_media', 'project_id', 'INTEGER');
        addColumnIfMissing('project_media', 'user_id', 'INTEGER NOT NULL DEFAULT 1');
        console.log("✅ Verified project_media columns");
    }

    console.log("✅ Migration 012 completed.");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration 012 failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}