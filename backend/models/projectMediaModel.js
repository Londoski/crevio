const db = require("../../database/db");

const projectMediaModel = {

    // Create a media item
    create(media) {
        const {
            project_id,
            media_type,
            media_url,
            title,
            description,
            sort_order
        } = media;

        const stmt = db.prepare(`
            INSERT INTO project_media (
                project_id,
                media_type,
                media_url,
                title,
                description,
                sort_order
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            project_id,
            media_type,
            media_url,
            title || null,
            description || null,
            sort_order || 0
        );

        return this.findById(result.lastInsertRowid);
    },


    // Find media by ID
    findById(id) {
        return db.prepare(`
            SELECT *
            FROM project_media
            WHERE id = ?
        `).get(id);
    },


    // Get all media belonging to a project
    findByProjectId(project_id) {
        return db.prepare(`
            SELECT *
            FROM project_media
            WHERE project_id = ?
            ORDER BY sort_order ASC, id ASC
        `).all(project_id);
    },


    // Update media
    update(id, media) {
        const {
            media_type,
            media_url,
            title,
            description,
            sort_order
        } = media;

        const stmt = db.prepare(`
            UPDATE project_media
            SET
                media_type = ?,
                media_url = ?,
                title = ?,
                description = ?,
                sort_order = ?
            WHERE id = ?
        `);

        const result = stmt.run(
            media_type,
            media_url,
            title || null,
            description || null,
            sort_order || 0,
            id
        );

        if (result.changes === 0) {
            return null;
        }

        return this.findById(id);
    },


    // Delete media
    delete(id) {
        const stmt = db.prepare(`
            DELETE FROM project_media
            WHERE id = ?
        `);

        const result = stmt.run(id);

        return result.changes > 0;
    }

};

module.exports = projectMediaModel;
