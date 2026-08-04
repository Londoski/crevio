const express = require("express");

const {
    createUser,
    getUserByUsername
} = require("../controllers/userController");

const router = express.Router();

// Create a new creator
router.post("/", createUser);

// Get creator profile by username
router.get("/username/:username", getUserByUsername);

module.exports = router;