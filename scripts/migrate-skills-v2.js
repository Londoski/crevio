// =========================================================
// MIGRATION — Skills v2
// File: scripts/migrate-skills-v2.js
// Adds: skills.description, skill_projects table
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

// 1. Add description to skills
if (!hasColumn("skills", "description")) {
    db.exec("ALTER TABLE skills ADD COLUMN description TEXT");
    console.log("✅ Added column: skills.description");
} else {
    console.log("⏭️  Exists: skills.description");
}

// 2. Create skill_projects join table
if (!hasTable("skill_projects")) {
    db.exec(`
        CREATE TABLE skill_projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            skill_id INTEGER NOT NULL,
            project_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(skill_id, project_id),
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    `);
    console.log("✅ Created table: skill_projects");
} else {
    console.log("⏭️  Exists: skill_projects");
}

// 3. Seed skill_categories if empty
const catCount = db.prepare("SELECT COUNT(*) AS c FROM skill_categories").get().c;
if (catCount === 0) {
    const categories = [
        { name: "Design",      slug: "design",      icon: "palette" },
        { name: "Development", slug: "development", icon: "code" },
        { name: "Video",       slug: "video",       icon: "video" },
        { name: "Photography", slug: "photography", icon: "camera" },
        { name: "Marketing",   slug: "marketing",   icon: "megaphone" },
        { name: "Writing",     slug: "writing",     icon: "pen-tool" },
        { name: "Consulting",  slug: "consulting",  icon: "users" },
        { name: "Other",       slug: "other",       icon: "star" }
    ];
    const stmt = db.prepare("INSERT INTO skill_categories (name, slug, icon, display_order) VALUES (?, ?, ?, ?)");
    categories.forEach((c, i) => stmt.run(c.name, c.slug, c.icon, i));
    console.log(`✅ Seeded ${categories.length} skill categories`);
} else {
    console.log(`⏭️  skill_categories already has ${catCount} rows`);
}

console.log("\n✅ Migration complete");