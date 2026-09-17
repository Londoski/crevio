// =========================================================
// CREVIO — BOT ROUTES
// File: backend/routes/botRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const c = require("../controllers/botController");

// Chat + conversations
router.post("/chat",                     auth, c.chat);
router.post("/regenerate", auth, c.regenerate);
router.delete("/conversations/:id/messages/:msgId", auth, c.deleteBotMessage);
router.post("/chat-stream",              auth, c.chatStream);
router.get ("/conversations",            auth, c.listConversations);
router.post("/conversations",            auth, c.createConversation);
router.get ("/conversations/:id",        auth, c.getConversation);
router.delete("/conversations/:id",      auth, c.deleteConversation);

// Ratings + shares (existing)
router.post("/rate",                     auth, c.rate);
router.post("/rate-batch",               auth, c.getRatingsBatch);
router.get ("/ratings/:messageId",       auth, c.getRating);
router.post("/share",                    auth, c.share);

// Workspace intelligence
router.get ("/workspace", auth, c.getWorkspace);
router.post("/check",     auth, c.checkWorkspace);

// Memory
router.get ("/memory", auth, c.getMemory);
router.post("/memory/reset", auth, c.resetMemory);
router.post("/reset-all", auth, c.resetAll);

// Training
router.get   ("/training", auth, c.getTraining);
router.post  ("/training", auth, c.saveTraining);
router.delete("/training", auth, c.resetTraining);

// Offer status
router.post("/claim-offer", auth, c.claimOffer);
router.get ("/offer-status",             auth, c.getOfferStatus);

module.exports = router;
