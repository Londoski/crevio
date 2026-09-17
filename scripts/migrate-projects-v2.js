// =========================================================
// MIGRATION — Extend projects table for Phase 1 MVP
// File: scripts/migrate-projects-v2.js
// Adds: client_name, role, project_year, content, published_at
// =========================================================

const db = require("../database/db");

function cols(table) {
    return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
}

const existing = cols("projects");
const additions = [
    ["client_name",   "TEXT"],
    ["role",          "TEXT"],
    ["project_year",  "INTEGER"],
    ["content",       "TEXT"],
    ["published_at",  "DATETIME"],
    ["updated_at",    "DATETIME"]
];

let added = 0;
for (const [name, type] of additions) {
    if (!existing.includes(name)) {
        try {
            db.exec(`ALTER TABLE projects ADD COLUMN ${name} ${type}`);
            console.log(`✅ Added column: ${name}`);
            added++;
        } catch (e) {
            console.error(`❌ Failed to add ${name}:`, e.message);
        }
    } else {
        console.log(`⏭️  Already exists: ${name}`);
    }
}

console.log(`\n✅ Migration done. ${added} column(s) added.`);