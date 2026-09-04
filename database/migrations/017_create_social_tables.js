// =========================================================
// CREVIO — MIGRATION 017: Social Tables
// =========================================================

const db = require("../db");

function tableExists(table) {
    return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
}

const migrate = db.transaction(() => {
    console.log("📦 Creating social tables...");

    // ---- social_accounts ----
    if (!tableExists('social_accounts')) {
        db.exec(`
            CREATE TABLE social_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                platform TEXT NOT NULL,
                username TEXT,
                display_name TEXT,
                profile_url TEXT NOT NULL,
                cta_label TEXT,
                display_order INTEGER DEFAULT 0,
                is_visible INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Created social_accounts table");
    } else {
        console.log("ℹ️ social_accounts already exists");
    }

    // ---- social_click_events ----
    if (!tableExists('social_click_events')) {
        db.exec(`
            CREATE TABLE social_click_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                social_account_id INTEGER NOT NULL,
                portfolio_id INTEGER,
                project_id INTEGER,
                page_url TEXT,
                cta_location TEXT,
                visitor_id TEXT,
                device_category TEXT,
                browser TEXT,
                referrer TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (social_account_id) REFERENCES social_accounts(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Created social_click_events table");
    } else {
        console.log("ℹ️ social_click_events already exists");
    }

    console.log("✅ Migration 017 completed.");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}