// =========================================================
// CREVIO — MIGRATION 003
// TRUSTED DEVICES
// =========================================================

const db = require("../db");

const migrate = db.transaction(() => {
    // =================================================
    // TRUSTED DEVICES TABLE
    // =================================================

    db.exec(`
        CREATE TABLE IF NOT EXISTS trusted_devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            device_token TEXT NOT NULL,
            device_name TEXT,
            user_agent TEXT,
            ip_address TEXT,
            expires_at DATETIME NOT NULL,
            last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        );
    `);

    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS
            idx_trusted_devices_token
        ON trusted_devices(device_token);
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS
            idx_trusted_devices_user
        ON trusted_devices(user_id);
    `);

    // =================================================
    // MIGRATION HISTORY
    // =================================================

    db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            migration_name TEXT NOT NULL UNIQUE,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    db.prepare(`
        INSERT OR IGNORE INTO schema_migrations (migration_name)
        VALUES (?)
    `).run("003_trusted_devices");
});

try {
    migrate();
    console.log("✅ Crevio migration 003 completed successfully.");
} catch (error) {
    console.error("❌ Crevio migration 003 failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}