// =========================================================
// CREVIO — PROJECT CONTROLLER
// =========================================================

const projectModel = require('../models/projectModel');

// ---- GET ALL PROJECTS ----
const getProjects = (req, res) => {
    try {
        const userId = req.user.id;
        const projects = projectModel.findByUser(userId);
        res.json({ success: true, projects });
    } catch (err) {
        console.error('Get projects error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ---- GET SINGLE PROJECT ----
const getProject = (req, res) => {
    try {
        const userId = req.user.id;
        const project = projectModel.findById(req.params.id);
        if (!project || project.user_id !== userId) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        res.json({ success: true, project });
    } catch (err) {
        console.error('Get project error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ---- CREATE PROJECT ----
const createProject = (req, res) => {
    try {
        const userId = req.user.id;
        const projectData = { ...req.body, user_id: userId };
        const project = projectModel.create(projectData);
        res.json({ success: true, project });
    } catch (err) {
        console.error('Create project error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ---- UPDATE PROJECT ----
const updateProject = (req, res) => {
    try {
        const userId = req.user.id;
        const project = projectModel.findById(req.params.id);
        if (!project || project.user_id !== userId) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        const updated = projectModel.update(req.params.id, req.body);
        res.json({ success: true, project: updated });
    } catch (err) {
        console.error('Update project error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ---- DELETE PROJECT ----
const deleteProject = (req, res) => {
    try {
        const userId = req.user.id;
        const project = projectModel.findById(req.params.id);
        if (!project || project.user_id !== userId) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        projectModel.delete(req.params.id);
        res.json({ success: true, message: 'Project deleted' });
    } catch (err) {
        console.error('Delete project error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ---- TOGGLE FEATURED ----
const toggleFeatured = (req, res) => {
    try {
        const userId = req.user.id;
        const project = projectModel.findById(req.params.id);
        if (!project || project.user_id !== userId) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        const updated = projectModel.update(req.params.id, { featured: !project.featured });
        res.json({ success: true, project: updated });
    } catch (err) {
        console.error('Toggle featured error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ---- PUBLISH PROJECT ----
const publishProject = (req, res) => {
    try {
        const userId = req.user.id;
        const project = projectModel.findById(req.params.id);
        if (!project || project.user_id !== userId) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        const updated = projectModel.update(req.params.id, { published: true });
        res.json({ success: true, project: updated });
    } catch (err) {
        console.error('Publish project error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    toggleFeatured,
    publishProject
};