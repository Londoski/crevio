// =========================================================
// CREVIO — UPLOAD ROUTES
// =========================================================

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const uploadController = require("../controllers/uploadController");

// Upload thumbnail (authenticated)
router.post("/thumbnail", authMiddleware, uploadController.uploadThumbnailFile);

module.exports = router;