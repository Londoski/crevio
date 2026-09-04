// =========================================================
// CREVIO — MEDIA LIBRARY ROUTES
// (List, search, filter, assign, bulk actions)
// =========================================================

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const mediaController = require("../controllers/mediaController");

// All routes require authentication
router.use(authMiddleware);

// GET /api/media – list media with filters, search, pagination
router.get("/", mediaController.getMedia);

// POST /api/media – upload (will be implemented later)
router.post("/", mediaController.uploadMedia);

// PUT /api/media/:id – update media details
router.put("/:id", mediaController.updateMedia);

// DELETE /api/media/:id – delete media
router.delete("/:id", mediaController.deleteMedia);

// (Optional) Bulk actions – we'll add in Stage 6
// router.post("/bulk", mediaController.bulkAction);

module.exports = router;