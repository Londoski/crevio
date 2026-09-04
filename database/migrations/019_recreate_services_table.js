// =========================================================
// CREVIO — MIGRATION 019: Recreate Services Table (with UNIQUE slug)
// =========================================================

const db = require("../db");

function tableExists(table) {
    return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
}

const migrate = db.transaction(() => {
    console.log("📦 Recreating services table with correct schema...");

    // ---- Backup existing data (if any) ----
    let oldServices = [];
    let oldIncluded = [];
    let oldFaqs = [];
    let oldServiceProjects = [];

    if (tableExists('services')) {
        try {
            oldServices = db.prepare(`SELECT * FROM services`).all();
        } catch (e) {}
    }
    if (tableExists('service_included_items')) {
        try {
            oldIncluded = db.prepare(`SELECT * FROM service_included_items`).all();
        } catch (e) {}
    }
    if (tableExists('service_faqs')) {
        try {
            oldFaqs = db.prepare(`SELECT * FROM service_faqs`).all();
        } catch (e) {}
    }
    if (tableExists('service_projects')) {
        try {
            oldServiceProjects = db.prepare(`SELECT * FROM service_projects`).all();
        } catch (e) {}
    }

    console.log(`📦 Backed up ${oldServices.length} services, ${oldIncluded.length} included items, ${oldFaqs.length} FAQs, ${oldServiceProjects.length} service-project relations`);

    // ---- Drop existing tables ----
    db.exec(`DROP TABLE IF EXISTS service_projects`);
    db.exec(`DROP TABLE IF EXISTS service_faqs`);
    db.exec(`DROP TABLE IF EXISTS service_included_items`);
    db.exec(`DROP TABLE IF EXISTS services`);

    // ---- Create services table with correct schema ----
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

    // ---- Create service_included_items ----
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

    // ---- Create service_faqs ----
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

    // ---- Create service_projects ----
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

    console.log("✅ Recreated services tables");

    // ---- Restore data (if any) ----
    if (oldServices.length > 0) {
        console.log("📦 Restoring existing services data...");
        const insertService = db.prepare(`
            INSERT INTO services (id, user_id, title, slug, description, category, image_url, pricing_type, price, min_price, max_price, currency, delivery_time, revisions, availability, status, featured, show_on_portfolio, cta_type, cta_label, cta_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertIncluded = db.prepare(`
            INSERT INTO service_included_items (id, service_id, item, display_order, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        const insertFaq = db.prepare(`
            INSERT INTO service_faqs (id, service_id, question, answer, display_order, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const insertServiceProject = db.prepare(`
            INSERT INTO service_projects (id, service_id, project_id, created_at)
            VALUES (?, ?, ?, ?)
        `);

        // Insert services
        const insertMany = db.transaction((services) => {
            services.forEach(s => {
                // Generate slug if missing (should not happen)
                if (!s.slug) {
                    const base = s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'service';
                    let slug = base;
                    let counter = 1;
                    while (db.prepare(`SELECT id FROM services WHERE slug = ?`).get(slug)) {
                        slug = `${base}-${counter}`;
                        counter++;
                    }
                    s.slug = slug;
                }
                insertService.run(
                    s.id, s.user_id, s.title, s.slug, s.description, s.category, s.image_url,
                    s.pricing_type, s.price, s.min_price, s.max_price, s.currency,
                    s.delivery_time, s.revisions, s.availability, s.status, s.featured,
                    s.show_on_portfolio, s.cta_type, s.cta_label, s.cta_url,
                    s.created_at, s.updated_at
                );
            });
        });
        insertMany(oldServices);

        // Restore included items
        if (oldIncluded.length) {
            oldIncluded.forEach(item => insertIncluded.run(item.id, item.service_id, item.item, item.display_order, item.created_at));
        }
        // Restore FAQs
        if (oldFaqs.length) {
            oldFaqs.forEach(faq => insertFaq.run(faq.id, faq.service_id, faq.question, faq.answer, faq.display_order, faq.created_at));
        }
        // Restore service-projects
        if (oldServiceProjects.length) {
            oldServiceProjects.forEach(sp => insertServiceProject.run(sp.id, sp.service_id, sp.project_id, sp.created_at));
        }
        console.log(`✅ Restored ${oldServices.length} services, ${oldIncluded.length} included items, ${oldFaqs.length} FAQs, ${oldServiceProjects.length} relations`);
    }

    console.log("✅ Migration 019 completed.");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration 019 failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}