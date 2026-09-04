// =========================================================
// CREVIO — DASHBOARD CONTROLLER
// =========================================================

const userModel = require("../models/userModel");
const projectModel = require("../models/projectModel");
const mediaModel = require("../models/mediaModel");
const serviceModel = require("../models/serviceModel");
const skillModel = require("../models/skillModel");
const socialLinkModel = require("../models/socialLinkModel");

const getOverview = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = userModel.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // ---- Counts (with safe fallbacks) ----
        const totalProjects = projectModel.countByUser(userId) || 0;
        const publishedProjects = projectModel.countPublishedByUser(userId) || 0;
        const totalMedia = mediaModel.countByUser(userId) || 0;
        const totalServices = serviceModel.countByUser(userId) || 0;
        const totalSkills = skillModel.countByUser(userId) || 0;
        const totalSocials = socialLinkModel.countByUser(userId) || 0;

        // ---- Portfolio published status ----
        let portfolioPublished = false;
        if (user.portfolio_published !== undefined) {
            portfolioPublished = user.account_status === 'active' && user.portfolio_published === 1;
        }

        // ---- COMPLETION CHECKLIST ----
        const checklist = [
            { label: 'Set up your profile', done: !!(user.display_name && user.bio) },
            { label: 'Add at least one project', done: totalProjects > 0 },
            { label: 'Add a service', done: totalServices > 0 },
            { label: 'Add at least one skill', done: totalSkills > 0 },
            { label: 'Add social links', done: totalSocials > 0 },
            { label: 'Publish your portfolio', done: portfolioPublished }
        ];

        const doneCount = checklist.filter(item => item.done).length;
        const completion = Math.round((doneCount / checklist.length) * 100);

        // ---- Recent projects (safe) ----
        let recentProjects = [];
        try {
            recentProjects = projectModel.getRecentByUser(userId, 5) || [];
            console.log(`✅ Found ${recentProjects.length} recent projects for user ${userId}`);
        } catch (e) {
            console.error('Error fetching recent projects:', e.message);
            recentProjects = [];
        }

        // ---- Recent activity (placeholder) ----
        const recentActivity = [
            { icon: 'user', message: 'You updated your profile', time_ago: '2 hours ago' },
            { icon: 'folder', message: 'You added a new project', time_ago: '1 day ago' }
        ];

        res.json({
            success: true,
            overview: {
                total_projects: totalProjects,
                published_projects: publishedProjects,
                total_media: totalMedia,
                total_services: totalServices,
                total_skills: totalSkills,
                portfolio_published: portfolioPublished,
                username: user.username,
                completion,
                checklist,
                recent_projects: recentProjects,
                recent_activity: recentActivity
            }
        });

    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to load overview: ' + error.message
        });
    }
};

module.exports = {
    getOverview
};