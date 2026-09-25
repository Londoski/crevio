// =========================================================
// CREVIO — TESTIMONIAL ROUTES
// File: backend/routes/testimonialRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const c = require("../controllers/testimonialController");

router.get("/",       auth, c.list);
router.post("/",      auth, c.create);
router.patch("/:id",  auth, c.update);
router.delete("/:id", auth, c.remove);

module.exports = router;