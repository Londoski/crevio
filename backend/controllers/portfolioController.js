// =========================================================
// CREVIO — PORTFOLIO CONTROLLER
// =========================================================

const portfolioModel = require("../models/portfolioModel");

// ---- Get current portfolio config ----
const getConfig = (req, res) => {
    try {
        const config = portfolioModel.getConfig(req.user.id);
        if (!config) {
            return res.status(404).json({
                success: false,
                message: "Portfolio configuration not found."
            });
        }
        // Parse JSON fields
        if (config.theme_settings) {
            config.theme_settings = JSON.parse(config.theme_settings);
        }
        if (config.template_default_settings) {
            config.template_default_settings = JSON.parse(config.template_default_settings);
        }
        res.json({ success: true, config });
    } catch (error) {
        console.error("Get portfolio config error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load portfolio configuration."
        });
    }
};

// ---- Update template ----
const updateTemplate = (req, res) => {
    try {
        const { templateId } = req.body;
        if (!templateId) {
            return res.status(400).json({
                success: false,
                message: "Template ID is required."
            });
        }
        const template = portfolioModel.getTemplate(templateId);
        if (!template) {
            return res.status(404).json({
                success: false,
                message: "Template not found."
            });
        }
        const config = portfolioModel.updateTemplate(req.user.id, templateId);
        // Re-parse JSON
        config.theme_settings = JSON.parse(config.theme_settings || '{}');
        res.json({
            success: true,
            message: "Template updated successfully.",
            config
        });
    } catch (error) {
        console.error("Update template error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to update template."
        });
    }
};

// ---- Update theme ----
const updateTheme = (req, res) => {
    try {
        const themeSettings = req.body;
        if (!themeSettings || typeof themeSettings !== 'object') {
            return res.status(400).json({
                success: false,
                message: "Theme settings must be a valid object."
            });
        }
        const config = portfolioModel.updateTheme(req.user.id, themeSettings);
        config.theme_settings = JSON.parse(config.theme_settings || '{}');
        res.json({
            success: true,
            message: "Theme updated successfully.",
            config
        });
    } catch (error) {
        console.error("Update theme error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to update theme."
        });
    }
};

// ---- Toggle publish ----
const togglePublish = (req, res) => {
    try {
        const { published } = req.body;
        if (published === undefined) {
            return res.status(400).json({
                success: false,
                message: "Published status is required."
            });
        }
        const config = portfolioModel.setPublished(req.user.id, Boolean(published));
        config.theme_settings = JSON.parse(config.theme_settings || '{}');
        res.json({
            success: true,
            message: published ? "Portfolio published." : "Portfolio unpublished.",
            config
        });
    } catch (error) {
        console.error("Toggle publish error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to change publish status."
        });
    }
};

// ---- Get all templates ----
const getTemplates = (req, res) => {
    try {
        const templates = portfolioModel.getAllTemplates();
        // Parse default theme settings for each template
        templates.forEach(t => {
            if (t.default_theme_settings) {
                t.default_theme_settings = JSON.parse(t.default_theme_settings);
            }
        });
        res.json({ success: true, templates });
    } catch (error) {
        console.error("Get templates error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load templates."
        });
    }
};

// ---- Get public portfolio data (for public route) ----
const getPublicPortfolio = (req, res) => {
    try {
        const { username } = req.params;
        // We need to get user by username
        const userModel = require("../models/userModel");
        const user = userModel.findByUsername(username);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Check if portfolio is published
        const config = portfolioModel.getConfig(user.id);
        if (!config || !config.published) {
            return res.status(404).json({ success: false, message: "Portfolio not published." });
        }

        // Get user content
        const projectModel = require("../models/projectModel");
        const serviceModel = require("../models/serviceModel");
        const skillModel = require("../models/skillModel");
        const socialLinksModel = require("../models/socialLinksModel");

        const projects = projectModel.findByUserId(user.id);
        const services = serviceModel.findByUserId(user.id);
        const skills = skillModel.findByUserId(user.id);
        const socials = socialLinksModel.findByUserId(user.id);

        // Parse theme settings
        config.theme_settings = JSON.parse(config.theme_settings || '{}');

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                bio: user.bio,
                profile_image: user.profile_image,
                location: user.location,
            },
            config: {
                template: {
                    id: config.template_id,
                    name: config.template_name,
                    slug: config.template_slug,
                },
                theme: config.theme_settings,
            },
            content: {
                projects,
                services,
                skills,
                socials,
            }
        });
    } catch (error) {
        console.error("Get public portfolio error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load public portfolio."
        });
    }
};

module.exports = {
    getConfig,
    updateTemplate,
    updateTheme,
    togglePublish,
    getTemplates,
    getPublicPortfolio,
};