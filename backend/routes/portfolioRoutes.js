// =========================================================
// CREVIO — PORTFOLIO ROUTES
// =========================================================

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/portfolioController");

// ---- Authenticated routes ----
router.get("/config", authMiddleware, controller.getConfig);
router.put("/template", authMiddleware, controller.updateTemplate);
router.put("/theme", authMiddleware, controller.updateTheme);
router.post("/publish", authMiddleware, controller.togglePublish);
router.get("/templates", authMiddleware, controller.getTemplates);

// ---- Public route ----
router.get("/public/:username", controller.getPublicPortfolio);

module.exports = router;