const db = require("../db");

function addColumnIfMissing(table, column, definition) {
    const columns = db.prepare(`PRAGMA table_info("${table}")`).all();
    if (!columns.some(c => c.name === column)) {
        db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
        console.log(`✅ Added column ${column} to ${table}`);
    }
}

const migrate = db.transaction(() => {
    addColumnIfMissing('project_media', 'title', 'TEXT');
    addColumnIfMissing('project_media', 'description', 'TEXT');
    addColumnIfMissing('project_media', 'caption', 'TEXT');
    addColumnIfMissing('project_media', 'category', 'TEXT');
    addColumnIfMissing('project_media', 'tags', 'TEXT');
    addColumnIfMissing('project_media', 'file_size', 'INTEGER');
    addColumnIfMissing('project_media', 'original_filename', 'TEXT');
    addColumnIfMissing('project_media', 'user_id', 'INTEGER');
    console.log("✅ Migration 008 completed.");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration 008 failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}