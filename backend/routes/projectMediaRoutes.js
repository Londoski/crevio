const express = require("express");

const router = express.Router();

const projectMediaController = require("../controllers/projectMediaController");
const authMiddleware = require("../middleware/authMiddleware");


// ==========================================
// PROJECT MEDIA ROUTES
// ==========================================

// Add media to a project
router.post(
    "/projects/:projectId/media",
    authMiddleware,
    projectMediaController.createMedia
);

// Get all media for a project
router.get(
    "/projects/:projectId/media",
    authMiddleware,
    projectMediaController.getProjectMedia
);

// Get one media item
router.get(
    "/media/:mediaId",
    authMiddleware,
    projectMediaController.getMediaById
);

// Update media
router.put(
    "/media/:mediaId",
    authMiddleware,
    projectMediaController.updateMedia
);

// Delete media
router.delete(
    "/media/:mediaId",
    authMiddleware,
    projectMediaController.deleteMedia
);


module.exports = router;