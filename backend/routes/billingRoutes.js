// =========================================================
// CREVIO — BILLING ROUTES
// =========================================================

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/billingController");

router.get("/status", authMiddleware, controller.getBillingStatus);
router.get("/plans", authMiddleware, controller.getPlans);
router.post("/upgrade", authMiddleware, controller.upgradePlan);
router.post("/cancel", authMiddleware, controller.cancelSubscription);
router.post("/reactivate", authMiddleware, controller.reactivateSubscription);
router.get("/payments", authMiddleware, controller.getPaymentHistory);

module.exports = router;