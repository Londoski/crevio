// =========================================================
// CREVIO — SERVICE ROUTES
// File: backend/routes/serviceRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const serviceController = require("../controllers/serviceController");

// Main CRUD
router.get("/",       auth, serviceController.getServices);
router.get("/:id",    auth, serviceController.getService);
router.post("/",      auth, serviceController.createService);
router.patch("/:id",  auth, serviceController.updateService);
router.put("/:id",    auth, serviceController.updateService);   // alias
router.delete("/:id", auth, serviceController.deleteService);

// Sub-resources
router.put("/:id/included-items", auth, serviceController.saveIncludedItems);
router.put("/:id/faqs",           auth, serviceController.saveFaqs);
router.put("/:id/projects",       auth, serviceController.saveProjects);

module.exports = router;