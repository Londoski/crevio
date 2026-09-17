// =========================================================
// CREVIO — WEBHOOK ROUTES
// File: backend/routes/webhookRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");

// Note: no auth middleware — webhooks are verified by signature
router.post("/stripe",   webhookController.stripeWebhook);
router.post("/paystack", webhookController.paystackWebhook);

module.exports = router;