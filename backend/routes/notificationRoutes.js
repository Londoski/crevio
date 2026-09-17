// =========================================================
// CREVIO — NOTIFICATION ROUTES
// File: backend/routes/notificationRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

router.get("/",              auth, notificationController.getNotifications);
router.post("/",             auth, notificationController.createNotification);
router.patch("/read-all",    auth, notificationController.markAllRead);
router.patch("/:id/read",    auth, notificationController.markRead);
router.delete("/:id",        auth, notificationController.deleteNotification);

module.exports = router;