// =========================================================
// CREVIO — PROJECT MEDIA ROUTES
// File: backend/routes/projectMediaRoutes.js
// =========================================================

const express = require("express");
const router = express.Router({ mergeParams: true });
const authMiddleware = require("../middleware/authMiddleware");
const projectMediaController = require("../controllers/projectMediaController");

// All routes are prefixed with /api/projects/:projectId/media

// Get all media for a project
router.get("/", authMiddleware, projectMediaController.getProjectMedia);

// Link existing media to a project
router.post("/", authMiddleware, projectMediaController.linkMedia);

// Unlink media from a project
router.delete("/:mediaId", authMiddleware, projectMediaController.unlinkMedia);

module.exports = router;