const db = require("../db");

const migrate = db.transaction(() => {
    console.log("📦 Resetting project_media table...");
    db.exec(`DROP TABLE IF EXISTS project_media`);
    db.exec(`
        CREATE TABLE project_media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            project_id INTEGER,
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
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        )
    `);
    db.exec(`CREATE INDEX idx_project_media_user_id ON project_media(user_id)`);
    db.exec(`CREATE INDEX idx_project_media_project_id ON project_media(project_id)`);
    console.log("✅ Migration 011 completed.");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}