// =========================================================
// CREVIO — PORTFOLIO AI ROUTES
// File: backend/routes/portfolioAiRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const controller = require("../controllers/portfolioAiController");

// POST /api/portfolio/ai/recommend
router.post("/recommend", auth, controller.recommend);

module.exports = router;