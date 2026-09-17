const bcrypt = require("bcrypt");
const db = require("../database/db");

const EMAIL = "joseph_test@crevio.test";
const NEW_PASSWORD = "Crevio2026!";

const user = db.prepare("SELECT id FROM users WHERE email = ?").get(EMAIL);
if (!user) { console.log("❌ User not found"); process.exit(1); }

const hash = bcrypt.hashSync(NEW_PASSWORD, 12);
const r = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
console.log("✅ Password updated");
console.log("   Email:    ", EMAIL);
console.log("   Password: ", NEW_PASSWORD);
