// =========================================================
// CREVIO — PUBLIC PROJECT CONTROLLER
// File: backend/controllers/publicProjectController.js
// =========================================================

const db = require("../../database/db");

// GET /api/public/projects/:username
exports.getByUsername = (req, res) => {
    try {
        const user = db.prepare("SELECT id, username FROM users WHERE username = ?").get(req.params.username);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const projects = db.prepare(`
            SELECT id, title, description, url, category, thumbnail, created_at
            FROM projects
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `).all(user.id);

        res.json({ success: true, projects });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// GET /api/public/projects/:username/:id
exports.getOne = (req, res) => {
    try {
        const user = db.prepare("SELECT id FROM users WHERE username = ?").get(req.params.username);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const project = db.prepare(`
            SELECT * FROM projects WHERE id = ? AND user_id = ?
        `).get(req.params.id, user.id);
        if (!project) return res.status(404).json({ success: false, message: "Project not found" });

        res.json({ success: true, project });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};