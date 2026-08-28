const projectModel = require("../models/projectModel");


// ==========================================
// CREATE PROJECT
// ==========================================

const createProject = (req, res) => {
    try {
        const {
            title,
            description,
            category,
            thumbnail_url,
            project_url,
            client_name,
            year
        } = req.body;

        const user_id = req.user.id;

        // Validate title
        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Title is required."
            });
        }

        const project = projectModel.create({
            user_id,
            title: title.trim(),
            description,
            category,
            thumbnail_url,
            project_url,
            client_name,
            year
        });

        res.status(201).json({
            success: true,
            message: "Project created successfully.",
            project
        });

    } catch (error) {
        console.error("Create project error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create project."
        });
    }
};


// ==========================================
// GET MY PROJECTS
// ==========================================

const getMyProjects = (req, res) => {
    try {
        const user_id = req.user.id;

        const projects = projectModel.findByUserId(user_id);

        res.json({
            success: true,
            count: projects.length,
            projects
        });

    } catch (error) {
        console.error("Get projects error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve projects."
        });
    }
};


// ==========================================
// GET ONE PROJECT
// ==========================================

const getProjectById = (req, res) => {
    try {
        const user_id = req.user.id;
        const project_id = Number(req.params.id);

        console.log("Getting project:", project_id);
        console.log("Requested by user:", user_id);

        if (!Number.isInteger(project_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });
        }

        const project = projectModel.findById(project_id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found."
            });
        }

        // Security check
        if (project.user_id !== user_id) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this project."
            });
        }

        res.json({
            success: true,
            project
        });

    } catch (error) {
        console.error("Get project error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve project."
        });
    }
};


// ==========================================
// UPDATE PROJECT
// ==========================================

const updateProject = (req, res) => {
    try {
        const user_id = req.user.id;
        const project_id = Number(req.params.id);

        if (!Number.isInteger(project_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });
        }

        const project = projectModel.findById(project_id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found."
            });
        }

        // Security check
        if (project.user_id !== user_id) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to update this project."
            });
        }

        const {
            title,
            description,
            category,
            thumbnail_url,
            project_url,
            client_name,
            year
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Title is required."
            });
        }

        const updatedProject = projectModel.update(project_id, {
            title: title.trim(),
            description,
            category,
            thumbnail_url,
            project_url,
            client_name,
            year
        });

        res.json({
            success: true,
            message: "Project updated successfully.",
            project: updatedProject
        });

    } catch (error) {
        console.error("Update project error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update project."
        });
    }
};


// ==========================================
// DELETE PROJECT
// ==========================================

const deleteProject = (req, res) => {
    try {
        const user_id = req.user.id;
        const project_id = Number(req.params.id);

        if (!Number.isInteger(project_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });
        }

        const project = projectModel.findById(project_id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found."
            });
        }

        // Security check
        if (project.user_id !== user_id) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to delete this project."
            });
        }

        const deleted = projectModel.delete(project_id);

        if (!deleted) {
            return res.status(500).json({
                success: false,
                message: "Unable to delete project."
            });
        }

        res.json({
            success: true,
            message: "Project deleted successfully."
        });

    } catch (error) {
        console.error("Delete project error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to delete project."
        });
    }
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    createProject,
    getMyProjects,
    getProjectById,
    updateProject,
    deleteProject
};