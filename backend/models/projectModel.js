// =========================================================
// CREVIO — PROJECT MODEL
// =========================================================

const db = require("../../database/db");

const projectModel = {

    // ---- COUNT BY USER (safe) ----
    countByUser(userId) {
        try {
            const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='projects'`).get();
            if (!tableCheck) return 0;
            const result = db.prepare(`SELECT COUNT(*) as count FROM projects WHERE user_id = ?`).get(userId);
            return result ? result.count : 0;
        } catch (e) {
            return 0;
        }
    },

    // ---- COUNT PUBLISHED BY USER (safe) ----
    countPublishedByUser(userId) {
        try {
            const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='projects'`).get();
            if (!tableCheck) return 0;
            const result = db.prepare(`SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND published = 1`).get(userId);
            return result ? result.count : 0;
        } catch (e) {
            return 0;
        }
    },

    // ---- GET RECENT BY USER (safe) ----
    getRecentByUser(userId, limit = 5) {
        try {
            const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='projects'`).get();
            if (!tableCheck) return [];
            return db.prepare(`SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`).all(userId, limit);
        } catch (e) {
            console.error('getRecentByUser error:', e.message);
            return [];
        }
    },

    // ---- FIND BY ID ----
    findById(id) {
        try {
            return db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id);
        } catch (e) {
            return null;
        }
    },

    // ---- FIND BY USER (alias for findByUserId) ----
    findByUser(userId) {
        return this.findByUserId(userId);
    },

    // ---- FIND BY USER ID (exact method name expected by controller) ----
    findByUserId(userId) {
        try {
            const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='projects'`).get();
            if (!tableCheck) return [];
            return db.prepare(`SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
        } catch (e) {
            return [];
        }
    },

    // ---- CREATE ----
    create(project) {
        try {
            const stmt = db.prepare(`
                INSERT INTO projects (user_id, name, description, category, thumbnail_url, published)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(
                project.user_id,
                project.name,
                project.description || null,
                project.category || null,
                project.thumbnail_url || null,
                project.published ? 1 : 0
            );
            return this.findById(result.lastInsertRowid);
        } catch (e) {
            console.error('Create project error:', e);
            return null;
        }
    },

    // ---- UPDATE ----
    update(id, updates) {
        try {
            const fields = [];
            const values = [];
            if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
            if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
            if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
            if (updates.thumbnail_url !== undefined) { fields.push('thumbnail_url = ?'); values.push(updates.thumbnail_url); }
            if (updates.published !== undefined) { fields.push('published = ?'); values.push(updates.published ? 1 : 0); }
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(id);
            const sql = `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`;
            db.prepare(sql).run(...values);
            return this.findById(id);
        } catch (e) {
            console.error('Update project error:', e);
            return null;
        }
    },

    // ---- DELETE ----
    delete(id) {
        try {
            db.prepare(`DELETE FROM projects WHERE id = ?`).run(id);
            return true;
        } catch (e) {
            return false;
        }
    },

    // ---- DELETE BY USER ----
    deleteByUser(userId) {
        try {
            db.prepare(`DELETE FROM projects WHERE user_id = ?`).run(userId);
            return true;
        } catch (e) {
            return false;
        }
    }
};

module.exports = projectModel;