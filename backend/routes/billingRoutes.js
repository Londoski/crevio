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
router.get("/entitlements",       auth, billingController.getEntitlements);
router.get("/plan",              auth, billingController.getPlan);
router.get("/usage",             auth, billingController.getUsage);
router.get("/payments",          auth, billingController.getPayments);
router.get("/payments/:id/invoice", auth, billingController.getInvoice);

module.exports = router;