const userModel = require('../models/userModel');

const getMe = (req, res) => {
    try {
        const user = userModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (err) {
        console.error('Get me error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

const updateMe = (req, res) => {
    try {
        const updated = userModel.update(req.user.id, req.body);
        res.json({ success: true, user: updated });
    } catch (err) {
        console.error('Update me error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

const getProfile = (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({ success: false, message: 'Username required' });
        }
        const user = userModel.findByUsername(username);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getMe,
    updateMe,
    getProfile
};