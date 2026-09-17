// =========================================================
// CREVIO — SERVICE ROUTES
// File: backend/routes/serviceRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const serviceController = require("../controllers/serviceController");

// Public — no auth
router.get("/public/:slug/:serviceId", serviceController.getPublicService);

// Protected — stats first
router.get("/stats",    auth, serviceController.getStats);

// Main CRUD
router.get("/",         auth, serviceController.getServices);
router.post("/",        auth, serviceController.createService);
router.get("/:id",      auth, serviceController.getService);
router.patch("/:id",    auth, serviceController.updateService);
router.put("/:id",      auth, serviceController.updateService);
router.delete("/:id",   auth, serviceController.deleteService);

// Sub-resources
router.put("/:id/included-items", auth, serviceController.saveIncludedItems);
router.put("/:id/faqs",           auth, serviceController.saveFaqs);
router.put("/:id/projects",       auth, serviceController.saveProjects);
router.put("/:id/skills",         auth, serviceController.saveSkills);
router.put("/:id/process",        auth, serviceController.saveProcess);

module.exports = router;