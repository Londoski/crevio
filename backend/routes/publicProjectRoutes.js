// =========================================================
// CREVIO — PUBLIC PROJECT ROUTES
// File: backend/routes/publicProjectRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const c = require("../controllers/publicProjectController");

// GET /api/public/projects/:username    — all projects for a user
router.get("/projects/:username", c.getByUsername);

// GET /api/public/projects/:username/:id — one specific project
router.get("/projects/:username/:id", c.getOne);

module.exports = router;