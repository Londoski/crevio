// =========================================================
// CREVIO — DASHBOARD ROUTES
// =========================================================

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const dashboardController = require("../controllers/dashboardController");

// ---- GET /api/dashboard/overview ----
router.get("/overview", authMiddleware, dashboardController.getOverview);

module.exports = router;