// =========================================================
// CREVIO — SOCIAL LINK MODEL
// =========================================================

const db = require("../../database/db");

const socialLinkModel = {

    // ---- COUNT BY USER (safe) ----
    countByUser(userId) {
        try {
            const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='social_links'`).get();
            if (!tableCheck) return 0;
            const result = db.prepare(`SELECT COUNT(*) as count FROM social_links WHERE user_id = ?`).get(userId);
            return result ? result.count : 0;
        } catch (e) {
            return 0;
        }
    },

    // ---- CREATE ----
    create(link) {
        try {
            const stmt = db.prepare(`
                INSERT INTO social_links (user_id, platform, url, display_order)
                VALUES (?, ?, ?, ?)
            `);
            const result = stmt.run(
                link.user_id,
                link.platform,
                link.url,
                link.display_order || 0
            );
            return this.findById(result.lastInsertRowid);
        } catch (e) {
            console.error('Create social link error:', e);
            return null;
        }
    },

    // ---- FIND BY ID ----
    findById(id) {
        try {
            return db.prepare(`SELECT * FROM social_links WHERE id = ?`).get(id);
        } catch (e) {
            return null;
        }
    },

    // ---- FIND BY USER ----
    findByUser(userId) {
        try {
            return db.prepare(`SELECT * FROM social_links WHERE user_id = ? ORDER BY display_order, created_at`).all(userId);
        } catch (e) {
            return [];
        }
    },

    // ---- UPDATE ----
    update(id, updates) {
        try {
            const fields = [];
            const values = [];
            if (updates.platform !== undefined) { fields.push('platform = ?'); values.push(updates.platform); }
            if (updates.url !== undefined) { fields.push('url = ?'); values.push(updates.url); }
            if (updates.display_order !== undefined) { fields.push('display_order = ?'); values.push(updates.display_order); }
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(id);
            const sql = `UPDATE social_links SET ${fields.join(', ')} WHERE id = ?`;
            db.prepare(sql).run(...values);
            return this.findById(id);
        } catch (e) {
            console.error('Update social link error:', e);
            return null;
        }
    },

    // ---- DELETE ----
    delete(id) {
        try {
            db.prepare(`DELETE FROM social_links WHERE id = ?`).run(id);
            return true;
        } catch (e) {
            return false;
        }
    },

    // ---- DELETE BY USER ----
    deleteByUser(userId) {
        try {
            db.prepare(`DELETE FROM social_links WHERE user_id = ?`).run(userId);
            return true;
        } catch (e) {
            return false;
        }
    }
};

module.exports = socialLinkModel;