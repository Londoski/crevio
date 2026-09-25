// =========================================================
// CREVIO — MEDIA LIBRARY ROUTES
// File: backend/routes/mediaLibraryRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/mediaLibraryController");

// ---- Main library endpoints ----
router.get("/", authMiddleware, controller.getMedia);
router.post("/upload", authMiddleware, controller.uploadMedia);
router.delete("/:id", authMiddleware, controller.deleteMedia);

// ---- Not yet wired (controller has no matching export) ----
// TODO: implement getMediaById in mediaController.js, then re-enable:
// router.get("/:id", authMiddleware, controller.getMediaById);
//
// TODO: implement updateMedia in mediaController.js, then re-enable:
// router.put("/:id", authMiddleware, controller.updateMedia);
//
// TODO: implement bulkDeleteMedia in mediaController.js, then re-enable:
// router.delete("/bulk", authMiddleware, controller.bulkDeleteMedia);
//
// TODO: implement bulkAssignMedia in mediaController.js, then re-enable:
// router.put("/bulk/assign", authMiddleware, controller.bulkAssignMedia);

module.exports = router;