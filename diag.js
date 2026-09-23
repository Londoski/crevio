const db = require("./database/db");
const fs = require("fs");
const path = require("path");

console.log("=== payments table schema ===");
try {
    db.prepare("PRAGMA table_info(payments)").all().forEach(function (c) {
        console.log("  " + c.name + " (" + c.type + ")" + (c.notnull ? " NOT NULL" : "") + (c.dflt_value ? " default=" + c.dflt_value : ""));
    });
} catch (e) { console.log("  ERR:", e.message); }

console.log("");
console.log("=== existing payments rows (if any) ===");
try {
    const rows = db.prepare("SELECT * FROM payments LIMIT 3").all();
    console.log("  count:", rows.length);
    if (rows.length) console.log("  first row:", JSON.stringify(rows[0], null, 2));
} catch (e) { console.log("  ERR:", e.message); }

console.log("");
console.log("=== webhook_events table? ===");
try {
    const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='webhook_events'").get();
    if (t) {
        db.prepare("PRAGMA table_info(webhook_events)").all().forEach(function (c) {
            console.log("  " + c.name + " (" + c.type + ")");
        });
    } else {
        console.log("  (does not exist — we'll create it)");
    }
} catch (e) { console.log("  ERR:", e.message); }

console.log("");
console.log("=== paystackWebhookHandler — where does charge.success insert? ===");
const wh = fs.readFileSync(path.join(__dirname, "backend", "services", "paystackWebhookHandler.js"), "utf8");
const lines = wh.split("\n");
lines.forEach(function (l, i) {
    if (/INSERT INTO payments|INSERT INTO webhook|upsertSubscription/.test(l)) {
        console.log("  L" + (i+1) + ": " + l.trim().substring(0, 140));
    }
});