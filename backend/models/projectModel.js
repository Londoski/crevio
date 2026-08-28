const db = require("../../database/db");
const projectMediaModel = require("./projectMediaModel");

const projectModel = {

    // ==========================================
    // CREATE A NEW PROJECT
    // ==========================================

    create(project) {

        const {
            user_id,
            title,
            description,
            category,
            thumbnail_url,
            project_url,
            client_name,
            year
        } = project;

        const stmt = db.prepare(`
            INSERT INTO projects (
                user_id,
                title,
                description,
                category,
                thumbnail_url,
                project_url,
                client_name,
                year
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        try {

            const result = stmt.run(
                user_id,
                title,
                description || null,
                category || null,
                thumbnail_url || null,
                project_url || null,
                client_name || null,
                year || null
            );

            return this.findById(
                result.lastInsertRowid
            );

        } catch (error) {

            console.error(
                "Database insert error:",
                error
            );

            throw error;

        }

    },


    // ==========================================
    // FIND PROJECT BY ID
    // ==========================================

    findById(id) {

        try {

            const stmt = db.prepare(`
                SELECT *
                FROM projects
                WHERE id = ?
            `);

            const project = stmt.get(id);

            if (!project) {

                return null;

            }

            project.media =
                projectMediaModel.findByProjectId(id);

            return project;

        } catch (error) {

            console.error(
                "Find by ID error:",
                error
            );

            return null;

        }

    },


    // ==========================================
    // GET ALL PROJECTS FOR USER
    // ==========================================

    findByUserId(user_id) {

        try {

            const stmt = db.prepare(`
                SELECT *
                FROM projects
                WHERE user_id = ?
                ORDER BY created_at DESC
            `);

            const projects =
                stmt.all(user_id);

            return projects.map(
                (project) => {

                    project.media =
                        projectMediaModel.findByProjectId(
                            project.id
                        );

                    return project;

                }
            );

        } catch (error) {

            console.error(
                "Find by user ID error:",
                error
            );

            return [];

        }

    },


    // ==========================================
    // UPDATE PROJECT
    // ==========================================

    update(id, project) {

        const {
            title,
            description,
            category,
            thumbnail_url,
            project_url,
            client_name,
            year
        } = project;

        const stmt = db.prepare(`
            UPDATE projects
            SET
                title = ?,
                description = ?,
                category = ?,
                thumbnail_url = ?,
                project_url = ?,
                client_name = ?,
                year = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        try {

            stmt.run(
                title,
                description || null,
                category || null,
                thumbnail_url || null,
                project_url || null,
                client_name || null,
                year || null,
                id
            );

            return this.findById(id);

        } catch (error) {

            console.error(
                "Update error:",
                error
            );

            throw error;

        }

    },


    // ==========================================
    // DELETE PROJECT
    // ==========================================

    delete(id) {

        try {

            const stmt = db.prepare(`
                DELETE FROM projects
                WHERE id = ?
            `);

            const result = stmt.run(id);

            return result.changes > 0;

        } catch (error) {

            console.error(
                "Delete error:",
                error
            );

            return false;

        }

    },


    // ==========================================
    // GET ALL PROJECTS
    // ==========================================

    getAll() {

        try {

            const stmt = db.prepare(`
                SELECT *
                FROM projects
                ORDER BY id DESC
            `);

            const projects =
                stmt.all();

            return projects.map(
                (project) => {

                    project.media =
                        projectMediaModel.findByProjectId(
                            project.id
                        );

                    return project;

                }
            );

        } catch (error) {

            console.error(
                "Get all error:",
                error
            );

            return [];

        }

    }

};


// ==========================================
// EXPORT
// ==========================================

module.exports = projectModel;