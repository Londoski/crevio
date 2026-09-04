// =========================================================
// CREVIO — SKILL CONTROLLER
// =========================================================

const skillModel = require("../models/skillModel");

// ---- GET SELECTED SKILLS ----
const getSelectedSkills = async (req, res) => {
    try {
        const userId = req.user.id;
        const skills = skillModel.getSelectedSkills(userId);
        res.json({ success: true, skills });
    } catch (err) {
        console.error('Get selected skills error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ---- SAVE SELECTED SKILLS ----
const saveSelectedSkills = async (req, res) => {
    try {
        const userId = req.user.id;
        const { skillIds } = req.body;
        if (!Array.isArray(skillIds)) {
            return res.status(400).json({ success: false, error: 'skillIds must be an array' });
        }
        const skills = skillModel.saveSelectedSkills(userId, skillIds);
        res.json({ success: true, skills });
    } catch (err) {
        console.error('Save selected skills error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ---- REMOVE SELECTED SKILL ----
const removeSelectedSkill = async (req, res) => {
    try {
        const userId = req.user.id;
        const { skillId } = req.params;
        skillModel.removeSelectedSkill(userId, skillId);
        res.json({ success: true });
    } catch (err) {
        console.error('Remove selected skill error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ---- GET ALL GLOBAL SKILLS ----
const getAllSkills = async (req, res) => {
    try {
        const skills = skillModel.getAllGlobalSkills();
        res.json({ success: true, skills });
    } catch (err) {
        console.error('Get all skills error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ---- GET SKILLS BY CATEGORY ----
const getSkillsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const skills = skillModel.getSkillsByCategory(categoryId);
        res.json({ success: true, skills });
    } catch (err) {
        console.error('Get skills by category error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ---- SEARCH SKILLS ----
const searchSkills = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ success: true, skills: [] });
        const skills = skillModel.searchSkills(q);
        res.json({ success: true, skills });
    } catch (err) {
        console.error('Search skills error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ---- GET CATEGORIES WITH USER COUNTS (for "Explore Skill Categories") ----
const getCategories = async (req, res) => {
    try {
        const userId = req.user.id;
        const categories = skillModel.getCategoriesWithUserCounts(userId);
        res.json({ success: true, categories });
    } catch (err) {
        console.error('Get categories error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ---- GET RECOMMENDED SKILLS ----
const getRecommendedSkills = async (req, res) => {
    try {
        const userId = req.user.id;
        const skills = skillModel.getRecommendedSkills(userId);
        res.json({ success: true, recommended: skills });
    } catch (err) {
        console.error('Get recommended skills error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ---- GET ALL CATEGORIES (simple list) ----
const getAllCategories = async (req, res) => {
    try {
        const categories = skillModel.getAllCategories();
        res.json({ success: true, categories });
    } catch (err) {
        console.error('Get all categories error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getSelectedSkills,
    saveSelectedSkills,
    removeSelectedSkill,
    getAllSkills,
    getSkillsByCategory,
    searchSkills,
    getCategories,
    getRecommendedSkills,
    getAllCategories
};