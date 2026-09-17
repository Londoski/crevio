// =========================================================
// CREVIO — PROJECT MEDIA CONTROLLER
// File: backend/controllers/projectMediaController.js
// =========================================================

const db = require("../../database/db");

function cols(table) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name); }
    catch (e) { return []; }
}

// GET /api/projects/:projectId/media
exports.getProjectMedia = (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT * FROM project_media
            WHERE project_id = ? AND user_id = ?
            ORDER BY COALESCE(sort_order, 0), created_at DESC
        `).all(req.params.projectId, req.user.id);

        res.json({ success: true, media: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// POST /api/projects/:projectId/media — link existing media
exports.linkMedia = (req, res) => {
    try {
        const { mediaId } = req.body;
        if (!mediaId) return res.status(400).json({ success: false, message: "mediaId required" });

        db.prepare("UPDATE project_media SET project_id = ? WHERE id = ? AND user_id = ?")
          .run(req.params.projectId, mediaId, req.user.id);

        res.json({ success: true, message: "Media linked" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// DELETE /api/projects/:projectId/media/:mediaId — unlink
exports.unlinkMedia = (req, res) => {
    try {
        const r = db.prepare(`
            UPDATE project_media SET project_id = NULL
            WHERE id = ? AND project_id = ? AND user_id = ?
        `).run(req.params.mediaId, req.params.projectId, req.user.id);

        res.json({ success: true, unlinked: r.changes });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};