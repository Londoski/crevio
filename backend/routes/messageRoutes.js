// =========================================================
// CREVIO — MESSAGE ROUTES
// File: backend/routes/messageRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const c = require("../controllers/messageController");

// Public
router.post("/conversations",         c.startConversation);
router.post("/conversations/:id/pin", c.clientPinConversation);
router.post("/conversations/:id/visitor", c.getVisitorConversation);

// Protected — specific BEFORE :id
router.get("/stats",      auth, c.getStats);
router.get("/plan-limit", auth, c.getMyPlanLimit);
router.get("/pin-options",auth, c.getPinOptions);
router.patch("/read-all", auth, c.markAllRead);
router.post("/forward", auth, c.forwardMessage);

router.get("/conversations",       auth, c.getConversations);
router.get("/conversations/:id",   auth, c.getConversation);
router.post("/conversations/:id",  auth, c.sendMessage);
router.patch("/conversations/:id", auth, c.updateConversation);
router.delete("/conversations/:id",auth, c.deleteConversation);

// Message-level
router.delete("/conversations/:id/messages",                auth, c.clearMessages);
router.patch("/conversations/:id/messages/:msgId",          auth, c.updateMessage);
router.delete("/conversations/:id/messages/:msgId",         auth, c.deleteMessage);
router.post("/conversations/:id/messages/:msgId/reactions", auth, c.toggleReaction);
router.post("/conversations/:id/messages/:msgId/pin",       auth, c.pinMessage);
router.delete("/conversations/:id/messages/:msgId/pin",     auth, c.unpinMessage);

module.exports = router;
