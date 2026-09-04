// =========================================================
// CREVIO — PROJECT MEDIA ROUTES
// =========================================================

const express = require("express");
const router = express.Router({ mergeParams: true });
const authMiddleware = require("../middleware/authMiddleware");
const projectMediaController = require("../controllers/projectMediaController");

// All routes are prefixed with /api/projects/:projectId/media

// Get all media for a project
router.get("/", authMiddleware, projectMediaController.getProjectMedia);

// Add media to a project
router.post("/", authMiddleware, projectMediaController.addProjectMedia);

// Remove media from a project
router.delete("/:mediaId", authMiddleware, projectMediaController.removeProjectMedia);

// Update media order / details within project
router.put("/:mediaId", authMiddleware, projectMediaController.updateProjectMedia);

module.exports = router;