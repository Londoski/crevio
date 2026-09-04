// =========================================================
// CREVIO — MIGRATION 007
// PORTFOLIO CONFIGURATION
// =========================================================

const db = require("../db");

const migrate = db.transaction(() => {
    // ---- TEMPLATES TABLE ----
    db.exec(`
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            description TEXT,
            category TEXT,
            preview_image TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            default_theme_settings TEXT,  -- JSON
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // ---- PORTFOLIO CONFIG TABLE ----
    db.exec(`
        CREATE TABLE IF NOT EXISTS portfolio_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            template_id INTEGER,
            theme_settings TEXT,  -- JSON
            published INTEGER NOT NULL DEFAULT 0,
            last_published_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
        );
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_portfolio_config_user ON portfolio_config(user_id);`);

    // ---- SEED INITIAL TEMPLATES ----
    const templates = [
        {
            name: 'Cinematic',
            slug: 'cinematic',
            description: 'Dark, immersive, full-width media. Ideal for videographers and filmmakers.',
            category: 'Creative',
            preview_image: '/assets/templates/cinematic-preview.jpg',
            default_theme_settings: JSON.stringify({
                colors: {
                    background: '#0F172A',
                    surface: '#1E293B',
                    primary: '#F1F5F9',
                    secondary: '#94A3B8',
                    accent: '#2563EB',
                },
                typography: {
                    headingFont: 'Inter, sans-serif',
                    bodyFont: 'Inter, sans-serif',
                    headingScale: 'large',
                },
                layout: {
                    navigation: 'centered',
                    heroSize: 'full',
                },
                animations: true,
            })
        },
        {
            name: 'Minimal',
            slug: 'minimal',
            description: 'Clean, spacious, content-first. Perfect for designers, developers, and writers.',
            category: 'Minimal',
            preview_image: '/assets/templates/minimal-preview.jpg',
            default_theme_settings: JSON.stringify({
                colors: {
                    background: '#FAFAFA',
                    surface: '#FFFFFF',
                    primary: '#111827',
                    secondary: '#4B5563',
                    accent: '#2563EB',
                },
                typography: {
                    headingFont: 'Inter, sans-serif',
                    bodyFont: 'Inter, sans-serif',
                    headingScale: 'medium',
                },
                layout: {
                    navigation: 'minimal',
                    heroSize: 'medium',
                },
                animations: false,
            })
        },
        {
            name: 'Editorial',
            slug: 'editorial',
            description: 'Magazine-inspired, strong typography, image-heavy. Great for photographers and creatives.',
            category: 'Editorial',
            preview_image: '/assets/templates/editorial-preview.jpg',
            default_theme_settings: JSON.stringify({
                colors: {
                    background: '#F8F5F0',
                    surface: '#FFFFFF',
                    primary: '#1A1A1A',
                    secondary: '#4A4A4A',
                    accent: '#C0392B',
                },
                typography: {
                    headingFont: 'Playfair Display, serif',
                    bodyFont: 'Inter, sans-serif',
                    headingScale: 'large',
                },
                layout: {
                    navigation: 'sidebar',
                    heroSize: 'large',
                },
                animations: true,
            })
        }
    ];

    const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO templates (name, slug, description, category, preview_image, default_theme_settings)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    templates.forEach(t => {
        insertStmt.run(t.name, t.slug, t.description, t.category, t.preview_image, t.default_theme_settings);
    });

    // ---- CREATE PORTFOLIO CONFIG FOR EXISTING USERS (if not exists) ----
    // For each user, insert a default config (template_id = 1, theme = default from template)
    const users = db.prepare(`SELECT id FROM users`).all();
    const insertConfig = db.prepare(`
        INSERT OR IGNORE INTO portfolio_config (user_id, template_id, theme_settings, published)
        VALUES (?, ?, ?, 0)
    `);
    users.forEach(u => {
        // Get default theme from template 1
        const template = db.prepare(`SELECT default_theme_settings FROM templates WHERE id = 1`).get();
        insertConfig.run(u.id, 1, template ? template.default_theme_settings : null);
    });

    // ---- MIGRATION RECORD ----
    db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            migration_name TEXT NOT NULL UNIQUE,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    db.prepare(`
        INSERT OR IGNORE INTO schema_migrations (migration_name)
        VALUES (?)
    `).run("007_portfolio_config");

    console.log("✅ Migration 007 completed: Portfolio Configuration");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration 007 failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}