// =========================================================
// CREVIO — PROJECT MEDIA CONTROLLER
// =========================================================

const db = require("../../database/db");

// ---- Get media for a specific project ----
const getProjectMedia = (req, res) => {
    try {
        const userId = req.user.id;
        const projectId = parseInt(req.params.projectId);

        const media = db.prepare(`
            SELECT * FROM project_media
            WHERE project_id = ? AND user_id = ?
            ORDER BY sort_order, created_at
        `).all(projectId, userId);

        res.json({ success: true, media });
    } catch (error) {
        console.error("Get project media error:", error);
        res.status(500).json({ success: false, message: "Unable to load media." });
    }
};

// ---- Add media to a project ----
const addProjectMedia = (req, res) => {
    try {
        const userId = req.user.id;
        const projectId = parseInt(req.params.projectId);
        const { media_id } = req.body;

        if (!media_id) {
            return res.status(400).json({ success: false, message: "Media ID required." });
        }

        // Check if media belongs to user and is not already assigned
        const media = db.prepare(`SELECT * FROM project_media WHERE id = ? AND user_id = ?`).get(media_id, userId);
        if (!media) {
            return res.status(404).json({ success: false, message: "Media not found." });
        }

        db.prepare(`UPDATE project_media SET project_id = ? WHERE id = ?`).run(projectId, media_id);

        const updated = db.prepare(`SELECT * FROM project_media WHERE id = ?`).get(media_id);
        res.json({ success: true, media: updated });
    } catch (error) {
        console.error("Add project media error:", error);
        res.status(500).json({ success: false, message: "Unable to add media to project." });
    }
};

// ---- Remove media from a project (unassign) ----
const removeProjectMedia = (req, res) => {
    try {
        const userId = req.user.id;
        const projectId = parseInt(req.params.projectId);
        const mediaId = parseInt(req.params.mediaId);

        // Verify ownership
        const media = db.prepare(`SELECT * FROM project_media WHERE id = ? AND user_id = ? AND project_id = ?`).get(mediaId, userId, projectId);
        if (!media) {
            return res.status(404).json({ success: false, message: "Media not found in this project." });
        }

        db.prepare(`UPDATE project_media SET project_id = NULL WHERE id = ?`).run(mediaId);
        res.json({ success: true, message: "Media removed from project." });
    } catch (error) {
        console.error("Remove project media error:", error);
        res.status(500).json({ success: false, message: "Unable to remove media." });
    }
};

// ---- Update media details within project (e.g., sort_order) ----
const updateProjectMedia = (req, res) => {
    try {
        const userId = req.user.id;
        const projectId = parseInt(req.params.projectId);
        const mediaId = parseInt(req.params.mediaId);
        const { sort_order, title, description } = req.body;

        // Verify ownership
        const media = db.prepare(`SELECT * FROM project_media WHERE id = ? AND user_id = ? AND project_id = ?`).get(mediaId, userId, projectId);
        if (!media) {
            return res.status(404).json({ success: false, message: "Media not found in this project." });
        }

        let updates = [];
        let params = [];
        if (sort_order !== undefined) { updates.push("sort_order = ?"); params.push(sort_order); }
        if (title !== undefined) { updates.push("title = ?"); params.push(title); }
        if (description !== undefined) { updates.push("description = ?"); params.push(description); }

        if (updates.length === 0) {
            return res.json({ success: true, media });
        }

        params.push(mediaId);
        const sql = `UPDATE project_media SET ${updates.join(", ")} WHERE id = ?`;
        db.prepare(sql).run(...params);

        const updated = db.prepare(`SELECT * FROM project_media WHERE id = ?`).get(mediaId);
        res.json({ success: true, media: updated });
    } catch (error) {
        console.error("Update project media error:", error);
        res.status(500).json({ success: false, message: "Unable to update media." });
    }
};

module.exports = {
    getProjectMedia,
    addProjectMedia,
    removeProjectMedia,
    updateProjectMedia
};