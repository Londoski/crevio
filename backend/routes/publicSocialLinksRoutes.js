// =========================================================
// CREVIO — PUBLIC SOCIAL LINKS ROUTES
// =========================================================

const express = require("express");
const router = express.Router();
const db = require("../../database/db");
const userModel = require("../models/userModel");

// ---- GET SOCIAL LINKS (legacy) ----
router.get("/social-links", (req, res) => {
    // This is the existing route – keep it as is.
    // We'll add the new endpoint below.
});

// ---- GET SOCIAL ACCOUNTS (new, for tracked links) ----
router.get("/:username/social", (req, res) => {
    try {
        const username = req.params.username;
        const user = userModel.findByUsername(username);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        const accounts = db.prepare(`
            SELECT id, platform, username, display_name, cta_label
            FROM social_accounts
            WHERE user_id = ? AND is_visible = 1
            ORDER BY display_order, created_at
        `).all(user.id);
        res.json({ success: true, accounts });
    } catch (error) {
        console.error("Get public social accounts error:", error);
        res.status(500).json({ success: false, message: "Unable to load social accounts." });
    }
});

module.exports = router;