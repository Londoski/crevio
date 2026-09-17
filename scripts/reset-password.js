const bcrypt = require("bcrypt");
const db = require("../database/db");

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
    console.log("Usage: node scripts/reset-password.js email newPassword");
    process.exit(1);
}

const hash = bcrypt.hashSync(newPassword, 10);
const r = db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").run(hash, email);
console.log("✅ Updated rows:", r.changes);
console.log("   Email:", email);
console.log("   New password:", newPassword);
