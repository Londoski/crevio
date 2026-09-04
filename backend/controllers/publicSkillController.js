// =========================================================
// CREVIO — PUBLIC SKILL CONTROLLER
// =========================================================

const userModel = require("../models/userModel");
const skillModel = require("../models/skillModel");

// ---- Get public skills for a user (by username) ----
const getPublicSkills = (req, res) => {
    try {
        const username = req.params.username;
        if (!username) {
            return res.status(400).json({ success: false, message: "Username required." });
        }

        // Find user by username
        const user = userModel.findByUsername(username);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Fetch selected skills
        const skills = skillModel.getSelectedSkills(user.id);

        // Return public-ready format
        res.json({
            success: true,
            skills: skills.map(s => ({
                id: s.id,
                name: s.name,
                category_name: s.category_name
            }))
        });

    } catch (error) {
        console.error("Get public skills error:", error);
        res.status(500).json({ success: false, message: "Unable to load skills." });
    }
};

module.exports = {
    getPublicSkills
};