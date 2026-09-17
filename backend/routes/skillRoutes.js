// =========================================================
// CREVIO — SKILL ROUTES
// File: backend/routes/skillRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const skillController = require("../controllers/skillController");

router.get("/stats",    auth, skillController.getStats);

router.get("/",         auth, skillController.getSkills);
router.post("/",        auth, skillController.createSkill);

router.get("/:id",      auth, skillController.getSkill);
router.patch("/:id",    auth, skillController.updateSkill);
router.delete("/:id",   auth, skillController.deleteSkill);

router.put("/:id/services", auth, skillController.saveServices);
router.put("/:id/projects", auth, skillController.saveProjects);

module.exports = router;