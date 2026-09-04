// =========================================================
// CREVIO — SKILL ROUTES
// =========================================================

const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skillController');
const { authenticate } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// ---- GET selected skills for user ----
router.get('/selected', skillController.getSelectedSkills);

// ---- SAVE selected skills ----
router.post('/selected', skillController.saveSelectedSkills);

// ---- REMOVE a selected skill ----
router.delete('/selected/:skillId', skillController.removeSelectedSkill);

// ---- GET all global skills ----
router.get('/all', skillController.getAllSkills);

// ---- GET skills by category ----
router.get('/category/:categoryId', skillController.getSkillsByCategory);

// ---- SEARCH skills ----
router.get('/search', skillController.searchSkills);

// ---- GET categories with user counts ----
router.get('/categories', skillController.getCategories);

// ---- GET recommended skills ----
router.get('/recommended', skillController.getRecommendedSkills);

// ---- GET all categories (simple) ----
router.get('/categories/list', skillController.getAllCategories);

module.exports = router;