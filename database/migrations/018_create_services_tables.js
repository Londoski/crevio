// =========================================================
// CREVIO — MIGRATION 018: Services & Service-Project Relationship (FIXED)
// =========================================================

const db = require("../db");

function tableExists(table) {
    return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
}

function addColumnIfMissing(table, column, definition) {
    const columns = db.prepare(`PRAGMA table_info("${table}")`).all();
    if (!columns.some(c => c.name === column)) {
        db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
        console.log(`✅ Added column ${column} to ${table}`);
    }
}

const migrate = db.transaction(() => {
    console.log("📦 Creating services tables...");

    // ---- services (check if columns exist) ----
    if (!tableExists('services')) {
        db.exec(`
            CREATE TABLE services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                description TEXT,
                category TEXT,
                image_url TEXT,
                pricing_type TEXT DEFAULT 'fixed',
                price INTEGER,
                min_price INTEGER,
                max_price INTEGER,
                currency TEXT DEFAULT 'USD',
                delivery_time TEXT,
                revisions INTEGER,
                availability INTEGER DEFAULT 1,
                status TEXT DEFAULT 'draft',
                featured INTEGER DEFAULT 0,
                show_on_portfolio INTEGER DEFAULT 1,
                cta_type TEXT DEFAULT 'quote',
                cta_label TEXT,
                cta_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Created services table");
    } else {
        console.log("ℹ️ services table already exists");
        // Add any missing columns (without UNIQUE constraints)
        addColumnIfMissing('services', 'user_id', 'INTEGER NOT NULL DEFAULT 1');
        addColumnIfMissing('services', 'title', 'TEXT NOT NULL DEFAULT "Untitled Service"');
        addColumnIfMissing('services', 'slug', 'TEXT');
        addColumnIfMissing('services', 'description', 'TEXT');
        addColumnIfMissing('services', 'category', 'TEXT');
        addColumnIfMissing('services', 'image_url', 'TEXT');
        addColumnIfMissing('services', 'pricing_type', 'TEXT DEFAULT "fixed"');
        addColumnIfMissing('services', 'price', 'INTEGER');
        addColumnIfMissing('services', 'min_price', 'INTEGER');
        addColumnIfMissing('services', 'max_price', 'INTEGER');
        addColumnIfMissing('services', 'currency', 'TEXT DEFAULT "USD"');
        addColumnIfMissing('services', 'delivery_time', 'TEXT');
        addColumnIfMissing('services', 'revisions', 'INTEGER');
        addColumnIfMissing('services', 'availability', 'INTEGER DEFAULT 1');
        addColumnIfMissing('services', 'status', 'TEXT DEFAULT "draft"');
        addColumnIfMissing('services', 'featured', 'INTEGER DEFAULT 0');
        addColumnIfMissing('services', 'show_on_portfolio', 'INTEGER DEFAULT 1');
        addColumnIfMissing('services', 'cta_type', 'TEXT DEFAULT "quote"');
        addColumnIfMissing('services', 'cta_label', 'TEXT');
        addColumnIfMissing('services', 'cta_url', 'TEXT');
        // Create unique index for slug separately
        try {
            db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_services_slug ON services(slug)`);
            console.log("✅ Created unique index on services.slug");
        } catch (e) {
            console.log("ℹ️ Unique index on services.slug already exists");
        }
    }

    // ---- service_included_items ----
    if (!tableExists('service_included_items')) {
        db.exec(`
            CREATE TABLE service_included_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_id INTEGER NOT NULL,
                item TEXT NOT NULL,
                display_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Created service_included_items table");
    } else {
        console.log("ℹ️ service_included_items already exists");
    }

    // ---- service_faqs ----
    if (!tableExists('service_faqs')) {
        db.exec(`
            CREATE TABLE service_faqs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_id INTEGER NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                display_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Created service_faqs table");
    } else {
        console.log("ℹ️ service_faqs already exists");
    }

    // ---- service_projects ----
    if (!tableExists('service_projects')) {
        db.exec(`
            CREATE TABLE service_projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_id INTEGER NOT NULL,
                project_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                UNIQUE(service_id, project_id)
            )
        `);
        console.log("✅ Created service_projects table");
    } else {
        console.log("ℹ️ service_projects already exists");
    }

    // ---- Add slug to projects (without UNIQUE constraint, then create index) ----
    if (tableExists('projects')) {
        addColumnIfMissing('projects', 'slug', 'TEXT');
        // Create unique index for projects.slug
        try {
            db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug)`);
            console.log("✅ Created unique index on projects.slug");
        } catch (e) {
            console.log("ℹ️ Unique index on projects.slug already exists");
        }
    }

    console.log("✅ Migration 018 completed.");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration 018 failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}