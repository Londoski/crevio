const express = require("express");

const {
    createUser,
    getCurrentUser,
    updateCurrentUser,
    getUserByUsername
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// PUBLIC ROUTES
// ==========================================

// Create user
router.post("/", createUser);

// Get public profile by username
router.get(
    "/username/:username",
    getUserByUsername
);


// ==========================================
// AUTHENTICATED ROUTES
// ==========================================

// Get logged-in user's profile
router.get(
    "/me",
    authMiddleware,
    getCurrentUser
);

// Update logged-in user's profile
router.put(
    "/me",
    authMiddleware,
    updateCurrentUser
);


module.exports = router;