// =========================================================
// MIGRATION — email_outbox + geo_cache
// File: scripts/migrate-email-geo.js
// Adds the tables that back the security-notification pipeline.
// Idempotent. Additive. No destructive change.
// =========================================================
const db = require("../database/db");

function hasTable(n) {
    try { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(n); }
    catch (e) { return false; }
}

// ---------- email_outbox ----------
if (!hasTable("email_outbox")) {
    db.exec(`
        CREATE TABLE email_outbox (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            to_email TEXT NOT NULL,
            from_email TEXT,
            subject TEXT NOT NULL,
            html_body TEXT,
            text_body TEXT,
            category TEXT,
            status TEXT DEFAULT 'queued',
            provider TEXT,
            provider_message_id TEXT,
            error TEXT,
            attempts INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            sent_at DATETIME
        )
    `);
    console.log("✅ Created: email_outbox");
} else {
    console.log("⏭️  Exists: email_outbox");
}

try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_email_outbox_user    ON email_outbox(user_id, created_at DESC)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_email_outbox_status  ON email_outbox(status, created_at DESC)`);
    console.log("✅ Indexes: email_outbox");
} catch (e) { console.log("⚠️  idx note:", e.message); }

// ---------- geo_cache ----------
if (!hasTable("geo_cache")) {
    db.exec(`
        CREATE TABLE geo_cache (
            ip TEXT PRIMARY KEY,
            country TEXT,
            country_code TEXT,
            region TEXT,
            city TEXT,
            latitude REAL,
            longitude REAL,
            timezone TEXT,
            isp TEXT,
            raw_json TEXT,
            fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("✅ Created: geo_cache");
} else {
    console.log("⏭️  Exists: geo_cache");
}

console.log("\n✅ Migration complete");