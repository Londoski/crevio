// =========================================================
// CREVIO — PORTFOLIO MODEL
// =========================================================

const db = require("../../database/db");

const portfolioModel = {
    // ---- Get portfolio config for a user ----
    getConfig(userId) {
        return db.prepare(`
            SELECT
                pc.*,
                t.name AS template_name,
                t.slug AS template_slug,
                t.description AS template_description,
                t.preview_image AS template_preview,
                t.default_theme_settings AS template_default_settings
            FROM portfolio_config pc
            LEFT JOIN templates t ON pc.template_id = t.id
            WHERE pc.user_id = ?
        `).get(userId);
    },

    // ---- Update template ----
    updateTemplate(userId, templateId) {
        const stmt = db.prepare(`
            UPDATE portfolio_config
            SET template_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `);
        stmt.run(templateId, userId);
        return this.getConfig(userId);
    },

    // ---- Update theme settings ----
    updateTheme(userId, themeSettings) {
        const stmt = db.prepare(`
            UPDATE portfolio_config
            SET theme_settings = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `);
        stmt.run(JSON.stringify(themeSettings), userId);
        return this.getConfig(userId);
    },

    // ---- Update published status ----
    setPublished(userId, published) {
        const stmt = db.prepare(`
            UPDATE portfolio_config
            SET published = ?, last_published_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `);
        stmt.run(published ? 1 : 0, published ? 1 : 0, userId);
        return this.getConfig(userId);
    },

    // ---- Get all templates ----
    getAllTemplates() {
        return db.prepare(`
            SELECT * FROM templates WHERE is_active = 1 ORDER BY category, name
        `).all();
    },

    // ---- Get a single template ----
    getTemplate(id) {
        return db.prepare(`SELECT * FROM templates WHERE id = ?`).get(id);
    },
};

module.exports = portfolioModel;