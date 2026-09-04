// =========================================================
// CREVIO — MEDIA MODEL
// =========================================================

const db = require("../../database/db");

const mediaModel = {

    // ---- CREATE ----
    create(media) {
        const stmt = db.prepare(`
            INSERT INTO project_media (user_id, project_id, filename, original_filename, media_type, media_url, thumbnail_url, title, description, caption, category, tags, file_size, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            media.user_id,
            media.project_id || null,
            media.filename,
            media.original_filename || null,
            media.media_type || null,
            media.media_url,
            media.thumbnail_url || null,
            media.title || null,
            media.description || null,
            media.caption || null,
            media.category || null,
            media.tags || null,
            media.file_size || null,
            media.sort_order || 0
        );
        return this.findById(result.lastInsertRowid);
    },

    // ---- FIND BY ID ----
    findById(id) {
        return db.prepare(`SELECT * FROM project_media WHERE id = ?`).get(id);
    },

    // ---- FIND BY USER ----
    findByUser(userId) {
        return db.prepare(`SELECT * FROM project_media WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
    },

    // ---- FIND BY PROJECT ----
    findByProject(projectId) {
        return db.prepare(`SELECT * FROM project_media WHERE project_id = ? ORDER BY sort_order, created_at`).all(projectId);
    },

    // ---- COUNT BY USER ----
    countByUser(userId) {
        try {
            const result = db.prepare(`SELECT COUNT(*) as count FROM project_media WHERE user_id = ?`).get(userId);
            return result ? result.count : 0;
        } catch (e) {
            return 0;
        }
    },

    // ---- UPDATE ----
    update(id, updates) {
        const fields = [];
        const values = [];
        if (updates.project_id !== undefined) { fields.push('project_id = ?'); values.push(updates.project_id); }
        if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
        if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
        if (updates.caption !== undefined) { fields.push('caption = ?'); values.push(updates.caption); }
        if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
        if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(updates.tags); }
        if (updates.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(updates.sort_order); }
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const sql = `UPDATE project_media SET ${fields.join(', ')} WHERE id = ?`;
        db.prepare(sql).run(...values);
        return this.findById(id);
    },

    // ---- DELETE ----
    delete(id) {
        db.prepare(`DELETE FROM project_media WHERE id = ?`).run(id);
    },

    // ---- DELETE BY USER ----
    deleteByUser(userId) {
        db.prepare(`DELETE FROM project_media WHERE user_id = ?`).run(userId);
    }
};

module.exports = mediaModel;