// =========================================================
// CREVIO — WEBHOOK ROUTES
// =========================================================

const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");

// Stripe webhook endpoint (raw body required)
router.post("/stripe", express.raw({ type: 'application/json' }), webhookController.handleStripeWebhook);

module.exports = router;