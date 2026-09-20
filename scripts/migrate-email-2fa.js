// MIGRATION — email_2fa_enabled column
const db = require("../database/db");

function hasColumn(table, col) {
    try { return db.prepare("PRAGMA table_info(" + table + ")").all().some(c => c.name === col); }
    catch (e) { return false; }
}

if (!hasColumn("users", "email_2fa_enabled")) {
    db.exec("ALTER TABLE users ADD COLUMN email_2fa_enabled INTEGER DEFAULT 0");
    console.log("OK added users.email_2fa_enabled");
} else {
    console.log("SKIP email_2fa_enabled already exists");
}

console.log("done");
