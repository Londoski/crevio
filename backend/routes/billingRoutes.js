// =========================================================
// CREVIO — BILLING ROUTES
// File: backend/routes/billingRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const billingController = require("../controllers/billingController");

router.post("/dev/change-plan",       auth, billingController.devChangePlan);
router.post("/dev/payment-succeeded", auth, billingController.devPaymentSucceeded);
router.post("/dev/payment-failed",    auth, billingController.devPaymentFailed);
router.post("/dev/run-expiry-check",  auth, billingController.devRunExpiryCheck);
router.post("/dev/subscription-renewed",  auth, billingController.devSubscriptionRenewed);
router.post("/dev/subscription-cancelled", auth, billingController.devSubscriptionCancelled);
router.post("/dev/refund-processed",      auth, billingController.devRefundProcessed);
router.post("/dev/trial-started",         auth, billingController.devTrialStarted);
router.post("/dev/trial-ending-soon",     auth, billingController.devTrialEndingSoon);
router.get("/entitlements",       auth, billingController.getEntitlements);
router.get("/plan",              auth, billingController.getPlan);
router.get("/usage",             auth, billingController.getUsage);
router.get("/payments",          auth, billingController.getPayments);
router.get("/payments/:id/invoice", auth, billingController.getInvoice);

// =========================================================
// PAYSTACK INTEGRATION
// =========================================================
router.post("/checkout",              auth, billingController.checkout);
router.get("/verify/:reference",      auth, billingController.verifyCheckout);
router.post("/portal",                auth, billingController.portal);

// =========================================================
// Crevio-native subscription management
// =========================================================
router.post("/cancel",     auth, billingController.cancelSubscription);
router.post("/reactivate", auth, billingController.reactivateSubscription);

module.exports = router;