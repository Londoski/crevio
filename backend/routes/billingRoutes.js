// =========================================================
// CREVIO — BILLING ROUTES
// File: backend/routes/billingRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const billingController = require("../controllers/billingController");

router.get("/entitlements",       auth, billingController.getEntitlements);
router.get("/plan",              auth, billingController.getPlan);
router.get("/usage",             auth, billingController.getUsage);
router.get("/payments",          auth, billingController.getPayments);
router.get("/payments/:id/invoice", auth, billingController.getInvoice);

module.exports = router;