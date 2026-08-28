const express = require("express");

const router = express.Router();

const publicProjectController =
    require("../controllers/publicProjectController");


// ==========================================
// PUBLIC PROJECT ROUTES
// ==========================================


// Get all public projects
router.get(
    "/projects",
    publicProjectController.getPublicProjects
);


// Get one public project
router.get(
    "/projects/:id",
    publicProjectController.getPublicProjectById
);


module.exports = router;