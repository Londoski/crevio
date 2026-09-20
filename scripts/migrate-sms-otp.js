// MIGRATION — sms_outbox (queued SMS for future provider)
const db = require("../database/db");

function hasTable(n) {
    try { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(n); }
    catch (e) { return false; }
}

if (!hasTable("sms_outbox")) {
    db.exec(
        "CREATE TABLE sms_outbox (" +
        "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "  user_id INTEGER," +
        "  to_phone TEXT NOT NULL," +
        "  body TEXT NOT NULL," +
        "  category TEXT," +
        "  status TEXT DEFAULT 'queued'," +
        "  provider TEXT," +
        "  provider_message_id TEXT," +
        "  error TEXT," +
        "  attempts INTEGER DEFAULT 0," +
        "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
        "  sent_at DATETIME" +
        ")"
    );
    console.log("✅ Created: sms_outbox");
} else {
    console.log("⏭️  Exists: sms_outbox");
}

try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_sms_outbox_user ON sms_outbox(user_id, created_at DESC)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_sms_outbox_status ON sms_outbox(status, created_at DESC)");
    console.log("✅ Indexes: sms_outbox");
} catch (e) { console.log("⚠️  idx:", e.message); }

console.log("\n✅ Migration complete");
