// MIGRATION — password history
const db = require("../database/db");

function hasTable(n) {
    try { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(n); }
    catch (e) { return false; }
}

if (!hasTable("password_history")) {
    db.exec(
        "CREATE TABLE password_history (" +
        "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "  user_id INTEGER NOT NULL," +
        "  password_hash TEXT NOT NULL," +
        "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
        ")"
    );
    console.log("✅ Created: password_history");
} else {
    console.log("⏭️  Exists: password_history");
}

try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id, id DESC)");
    console.log("✅ Indexes: password_history");
} catch (e) { console.log("⚠️  idx:", e.message); }

console.log("\n✅ Migration complete");
