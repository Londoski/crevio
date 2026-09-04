// =========================================================
// CREVIO — MEDIA LIBRARY ROUTES
// =========================================================

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/mediaLibraryController");

// ---- Main library endpoints ----
router.get("/", authMiddleware, controller.getMedia);
router.get("/:id", authMiddleware, controller.getMediaById);
router.post("/upload", authMiddleware, controller.uploadMedia);
router.put("/:id", authMiddleware, controller.updateMedia);
router.delete("/:id", authMiddleware, controller.deleteMedia);
router.delete("/bulk", authMiddleware, controller.bulkDeleteMedia);
router.put("/bulk/assign", authMiddleware, controller.bulkAssignMedia);

module.exports = router;