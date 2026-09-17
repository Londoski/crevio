// =========================================================
// MIGRATION — Services v2
// File: scripts/migrate-services-v2.js
// Adds: problem, outcome to services
// Creates: service_skills, service_process tables
// =========================================================

const db = require("../database/db");

function hasColumn(table, col) {
    try {
        return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col);
    } catch (e) { return false; }
}

function hasTable(name) {
    try {
        return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
    } catch (e) { return false; }
}

// 1. Add columns to services
if (!hasColumn("services", "problem")) {
    db.exec("ALTER TABLE services ADD COLUMN problem TEXT");
    console.log("✅ Added column: services.problem");
} else {
    console.log("⏭️  Exists: services.problem");
}

if (!hasColumn("services", "outcome")) {
    db.exec("ALTER TABLE services ADD COLUMN outcome TEXT");
    console.log("✅ Added column: services.outcome");
} else {
    console.log("⏭️  Exists: services.outcome");
}

// 2. Create service_skills
if (!hasTable("service_skills")) {
    db.exec(`
        CREATE TABLE service_skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id INTEGER NOT NULL,
            skill_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(service_id, skill_id),
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
        )
    `);
    console.log("✅ Created table: service_skills");
} else {
    console.log("⏭️  Exists: service_skills");
}

// 3. Create service_process
if (!hasTable("service_process")) {
    db.exec(`
        CREATE TABLE service_process (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id INTEGER NOT NULL,
            step_title TEXT NOT NULL,
            step_description TEXT,
            display_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
        )
    `);
    console.log("✅ Created table: service_process");
} else {
    console.log("⏭️  Exists: service_process");
}

console.log("\n✅ Migration complete");