// =========================================================
// CREVIO — PROJECT ROUTES
// =========================================================

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/authMiddleware');

// ---- All routes require authentication ----
router.use(authenticate);

// ---- Project CRUD ----
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProject);
router.post('/', projectController.createProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// ---- Additional features ----
router.patch('/:id/featured', projectController.toggleFeatured);
router.patch('/:id/publish', projectController.publishProject);

module.exports = router;