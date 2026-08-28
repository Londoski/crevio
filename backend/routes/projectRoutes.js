const express = require("express");

const router = express.Router();

const projectController = require("../controllers/projectController");
const authMiddleware = require("../middleware/authMiddleware");


// ==========================================
// PROJECT ROUTES
// ==========================================

// Get all projects belonging to logged-in user
router.get(
    "/",
    authMiddleware,
    projectController.getMyProjects
);

// Create a new project
router.post(
    "/",
    authMiddleware,
    projectController.createProject
);

// Get one project
router.get(
    "/:id",
    authMiddleware,
    projectController.getProjectById
);

// Update one project
router.put(
    "/:id",
    authMiddleware,
    projectController.updateProject
);

// Delete one project
router.delete(
    "/:id",
    authMiddleware,
    projectController.deleteProject
);


module.exports = router;