// =========================================================
// CREVIO — SOCIAL LINKS ROUTES
// File: backend/routes/socialLinksRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const socialLinksController = require("../controllers/socialLinksController");

router.get("/stats",    auth, socialLinksController.getStats);
router.put("/reorder",  auth, socialLinksController.reorder);

router.get("/",         auth, socialLinksController.getSocialLinks);
router.post("/",        auth, socialLinksController.createSocialLink);

router.patch("/:id/visibility", auth, socialLinksController.toggleVisibility);
router.patch("/:id",            auth, socialLinksController.updateSocialLink);
router.put("/:id",              auth, socialLinksController.updateSocialLink);
router.delete("/:id",           auth, socialLinksController.deleteSocialLink);

module.exports = router;