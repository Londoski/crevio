const db = require("./database/db");

// ============ EDIT THESE ============
const NEW_EMAIL    = "your-new-email@example.com";
const NEW_PASSWORD = "YourNewStrongPassword123!";
const NEW_USERNAME = "yourusername";         // optional; leave "" to keep
// =====================================

// Pick hashing library
let hashFn;
try {
    const bcrypt = require("bcrypt");
    hashFn = (pw) => bcrypt.hashSync(pw, 10);
    console.log("Using bcrypt");
} catch (e) {
    try {
        const bcrypt = require("bcryptjs");
        hashFn = (pw) => bcrypt.hashSync(pw, 10);
        console.log("Using bcryptjs");
    } catch (e2) {
        console.error("❌ No bcrypt library found. Install with: npm install bcrypt");
        process.exit(1);
    }
}

const userId = 1;   // change if you have multiple users

const newHash = hashFn(NEW_PASSWORD);

const cols = [];
const vals = [];
cols.push("email = ?");        vals.push(NEW_EMAIL);
cols.push("password_hash = ?"); vals.push(newHash);
if (NEW_USERNAME) { cols.push("username = ?"); vals.push(NEW_USERNAME); }
cols.push("email_verified = 1");
cols.push("account_status = 'active'");
vals.push(userId);

const sql = `UPDATE users SET ${cols.join(", ")} WHERE id = ?`;
const r = db.prepare(sql).run(...vals);

console.log("✅ Updated " + r.changes + " user(s)");
console.log("");
console.log("New credentials:");
console.log("  Email:    " + NEW_EMAIL);
console.log("  Password: " + NEW_PASSWORD);
console.log("  Username: " + (NEW_USERNAME || "(unchanged)"));
console.log("");
console.log("Verify with:");
console.log("  node -e \"const db=require('./database/db'); console.log(db.prepare('SELECT id,username,email FROM users WHERE id=1').get());\"");
