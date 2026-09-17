// =========================================================
// CREVIO — MESSAGE ROUTES
// File: backend/routes/messageRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const messageController = require("../controllers/messageController");

// Public — clients can start a conversation (from portfolio contact form)
router.post("/conversations", messageController.startConversation);

// Protected — creator-side inbox
router.get("/conversations",         auth, messageController.getConversations);
router.get("/conversations/:id",     auth, messageController.getConversation);
router.post("/conversations/:id",    auth, messageController.sendMessage);
router.patch("/conversations/:id",   auth, messageController.updateConversation);
router.delete("/conversations/:id",  auth, messageController.deleteConversation);

module.exports = router;