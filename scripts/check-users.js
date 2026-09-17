const db = require("../database/db");

console.log("\n=== USERS ===");
const users = db.prepare("SELECT id, username, email, substr(password_hash, 1, 20) AS hash_preview, length(password_hash) AS hash_len, account_status FROM users").all();
console.table(users);

console.log("\n=== SUBSCRIPTIONS ===");
try { console.table(db.prepare("SELECT user_id, plan, status FROM subscriptions").all()); } catch (e) { console.log("no table"); }
