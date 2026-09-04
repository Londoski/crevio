// =========================================================
// CREVIO — MIGRATION 005
// BILLING FOUNDATION
// =========================================================

const db = require("../db");

const migrate = db.transaction(() => {
    // ---- SUBSCRIPTIONS TABLE ----
    db.exec(`
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            plan TEXT NOT NULL DEFAULT 'free',
            status TEXT NOT NULL DEFAULT 'active',
            provider TEXT,
            provider_customer_id TEXT,
            provider_subscription_id TEXT,
            current_period_start DATETIME,
            current_period_end DATETIME,
            cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
            canceled_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);`);

    // ---- PAYMENTS TABLE ----
    db.exec(`
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subscription_id INTEGER,
            provider TEXT,
            provider_transaction_id TEXT,
            amount DECIMAL(10,2),
            currency TEXT DEFAULT 'USD',
            status TEXT NOT NULL,
            payment_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
        );
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(provider_transaction_id);`);

    // ---- USAGE TRACKING TABLE ----
    db.exec(`
        CREATE TABLE IF NOT EXISTS usage_tracking (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            metric TEXT NOT NULL,
            period_start DATETIME NOT NULL,
            period_end DATETIME NOT NULL,
            value INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            UNIQUE(user_id, metric, period_start, period_end)
        );
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_tracking(user_id);`);

    // ---- ENSURE USER HAS SUBSCRIPTION RECORD ----
    // Create free plan for all existing users
    db.exec(`
        INSERT OR IGNORE INTO subscriptions (user_id, plan, status)
        SELECT id, 'free', 'active'
        FROM users
        WHERE id NOT IN (SELECT user_id FROM subscriptions);
    `);

    // ---- MIGRATION RECORD ----
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
    `).run("005_billing_foundation");
});

try {
    migrate();
    console.log("✅ Migration 005 completed: Billing Foundation");
} catch (error) {
    console.error("❌ Migration 005 failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}