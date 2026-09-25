// =========================================================
// CREVIO — PUBLIC SKILL ROUTES
// File: backend/routes/publicSkillRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const controller = require("../controllers/publicSkillController");

// GET /api/public/:username/skills
router.get("/:username/skills", controller.getByUsername);

module.exports = router;