const db = require("../database/db");

function hasCol(t, c) {
    try { return db.prepare(`PRAGMA table_info(${t})`).all().some(x => x.name === c); }
    catch (e) { return false; }
}
function addCol(t, c, type) {
    if (!hasCol(t, c)) {
        db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${type}`);
        console.log(`✅ Added ${t}.${c}`);
    } else console.log(`⏭️  Exists: ${t}.${c}`);
}

addCol("subscriptions", "previous_plan",     "TEXT");
addCol("subscriptions", "trial_plan",        "TEXT");
addCol("subscriptions", "trial_started_at",  "DATETIME");
addCol("subscriptions", "trial_ends_at",     "DATETIME");
addCol("subscriptions", "trial_used",        "INTEGER DEFAULT 0");

console.log("\n✅ Migration complete");
