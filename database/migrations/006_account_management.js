// =========================================================
// CREVIO — MIGRATION 006
// ACCOUNT MANAGEMENT (Deactivation & Deletion)
// =========================================================

const db = require("../db");

const migrate = db.transaction(() => {
    // ---- Check if columns exist and add them ----
    function addColumnIfMissing(table, column, definition) {
        const columns = db
            .prepare(`PRAGMA table_info("${table}")`)
            .all()
            .map(c => c.name);
        if (!columns.includes(column)) {
            db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
        }
    }

    // ---- Add fields to users table ----
    addColumnIfMissing('users', 'deactivated_at', 'DATETIME');
    addColumnIfMissing('users', 'deletion_requested_at', 'DATETIME');
    addColumnIfMissing('users', 'deletion_scheduled_for', 'DATETIME');
    addColumnIfMissing('users', 'deletion_reason', 'TEXT');

    // ---- Ensure account_status is present ----
    addColumnIfMissing('users', 'account_status', "TEXT NOT NULL DEFAULT 'active'");

    // ---- Migration record ----
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
    `).run("006_account_management");

    console.log("✅ Migration 006 completed: Account Management");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration 006 failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}
