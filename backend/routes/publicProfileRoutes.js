// =========================================================
// CREVIO — PUBLIC PROFILE ROUTES
// =========================================================

const express = require('express');
const router = express.Router();
const userModel = require('../models/userModel');

router.get('/:username/profile', (req, res) => {
    try {
        const user = userModel.findByUsername(req.params.username);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.json({
            success: true,
            user: {
                username: user.username,
                display_name: user.display_name,
                bio: user.bio,
                location: user.location,
                profile_image: user.profile_image
            }
        });
    } catch (error) {
        console.error('Public profile error:', error);
        res.status(500).json({ success: false, message: 'Unable to load profile.' });
    }
});

module.exports = router;