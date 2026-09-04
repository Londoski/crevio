// =========================================================
// CREVIO — PUBLIC SKILL ROUTES
// =========================================================

const express = require("express");
const router = express.Router();
const controller = require("../controllers/publicSkillController");

// GET /api/public/:username/skills
router.get("/:username/skills", controller.getPublicSkills);

module.exports = router;