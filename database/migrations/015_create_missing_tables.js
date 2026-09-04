const db = require("../db");

function tableExists(table) {
    return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
}

const migrate = db.transaction(() => {
    console.log("📦 Creating missing tables...");

    // ---- Services table ----
    if (!tableExists('services')) {
        db.exec(`
            CREATE TABLE services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                price REAL,
                display_order INTEGER DEFAULT 0,
                is_visible INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Created services table");
    } else {
        console.log("ℹ️ services table already exists");
    }

    // ---- Social links table ----
    if (!tableExists('social_links')) {
        db.exec(`
            CREATE TABLE social_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                platform TEXT NOT NULL,
                url TEXT NOT NULL,
                display_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Created social_links table");
    } else {
        console.log("ℹ️ social_links table already exists");
    }

    console.log("✅ Migration 015 completed.");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}