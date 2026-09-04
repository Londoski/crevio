// =========================================================
// CREVIO — SOCIAL ROUTES
// =========================================================

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/socialController");

// ---- Account CRUD ----
router.get("/accounts", authMiddleware, controller.getAccounts);
router.post("/accounts", authMiddleware, controller.createAccount);
router.put("/accounts/:id", authMiddleware, controller.updateAccount);
router.delete("/accounts/:id", authMiddleware, controller.deleteAccount);
router.post("/accounts/reorder", authMiddleware, controller.reorderAccounts);

// ---- Analytics ----
router.get("/analytics/overview", authMiddleware, controller.getOverviewStats);
router.get("/analytics/top-pages", authMiddleware, controller.getTopPages);
router.get("/analytics/clicks-over-time", authMiddleware, controller.getClicksOverTime);
router.get("/analytics/traffic-sources", authMiddleware, controller.getTrafficSources);
router.get("/analytics/cta-performance", authMiddleware, controller.getCTAPerformance);

// ---- Public tracking redirect (no auth) ----
router.get("/track/:id", controller.trackRedirect);

module.exports = router;