// =========================================================
// CREVIO — DASHBOARD ROUTES
// File: backend/routes/dashboardRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const dashboardController = require("../controllers/dashboardController");

router.get("/overview", auth, dashboardController.getOverview);
router.get("/activity", auth, dashboardController.getActivity);

module.exports = router;