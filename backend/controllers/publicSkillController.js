// =========================================================
// CREVIO — PUBLIC SKILL CONTROLLER
// File: backend/controllers/publicSkillController.js
// =========================================================

const db = require("../../database/db");

// GET /api/public/skills/:username
exports.getByUsername = (req, res) => {
    try {
        const user = db.prepare("SELECT id, username FROM users WHERE username = ?").get(req.params.username);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        let skills = [];
        try {
            skills = db.prepare(`
                SELECT cs.id AS id, s.name AS name, sc.name AS category
                FROM creator_skills cs
                LEFT JOIN skills s ON s.id = cs.skill_id
                LEFT JOIN skill_categories sc ON sc.id = s.category_id
                WHERE cs.user_id = ?
                ORDER BY cs.id DESC
            `).all(user.id);
        } catch (e) {
            skills = db.prepare(`
                SELECT cs.id AS id, s.name AS name, 'other' AS category
                FROM creator_skills cs
                LEFT JOIN skills s ON s.id = cs.skill_id
                WHERE cs.user_id = ?
                ORDER BY cs.id DESC
            `).all(user.id);
        }

        res.json({ success: true, skills });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};