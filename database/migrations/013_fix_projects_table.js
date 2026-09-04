// =========================================================
// CREVIO — MIGRATION 013: Fix Projects Table
// =========================================================

const db = require("../db");

const migrate = db.transaction(() => {
    console.log("📦 Recreating projects table with correct schema...");

    // Drop the old table (safe because you have no projects yet)
    db.exec(`DROP TABLE IF EXISTS projects`);

    // Create a fresh projects table with the right columns
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

    console.log("✅ Projects table recreated.");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}