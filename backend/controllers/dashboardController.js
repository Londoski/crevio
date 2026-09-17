// =========================================================
// CREVIO — DASHBOARD CONTROLLER (Overview Command Center)
// File: backend/controllers/dashboardController.js
// All data is DB-driven. No hardcoded values.
// =========================================================

const db = require("../../database/db");

function safeGet(sql, ...params) {
    try { return db.prepare(sql).get(...params); }
    catch (e) { return null; }
}

function safeAll(sql, ...params) {
    try { return db.prepare(sql).all(...params); }
    catch (e) { return []; }
}

// =========================================================
// GET /api/dashboard/overview
// Returns: user, portfolio, stats, completion,
//          recentProjects, recentActivity
// =========================================================
exports.getOverview = (req, res) => {
    try {
        const userId = req.user.id;

        // ---------- 1. USER / PROFESSIONAL IDENTITY ----------
        const user = safeGet(`
            SELECT id, username, email, display_name, profile_image,
                   bio, location, phone, role, primary_profession, specialties,
                   created_at
            FROM users WHERE id = ?
        `, userId) || {};

        // ---------- 2. PORTFOLIO STATE ----------
        const portfolioConfig = safeGet(
            "SELECT * FROM portfolio_config WHERE user_id = ? LIMIT 1",
            userId
        );

        let portfolioTheme = {};
        try {
            portfolioTheme = portfolioConfig?.theme_settings
                ? JSON.parse(portfolioConfig.theme_settings)
                : {};
        } catch (e) { portfolioTheme = {}; }

        const portfolioStatus = portfolioConfig?.published ? "published" : "draft";
        const portfolioSlug   = (user.username || "user").toLowerCase();
        const portfolioUrl    = `/p/${portfolioSlug}`;

        // ---------- 3. CORE STATS ----------
        // IMPORTANT: drafts + published = total. Never overlap.
        const projectStats = safeGet(`
            SELECT
                COUNT(*)                                          AS total,
                SUM(CASE WHEN published = 1 THEN 1 ELSE 0 END)    AS published,
                SUM(CASE WHEN published = 0 OR published IS NULL THEN 1 ELSE 0 END) AS drafts
            FROM projects WHERE user_id = ?
        `, userId) || { total: 0, published: 0, drafts: 0 };

        const totalMedia    = safeGet("SELECT COUNT(*) AS c FROM project_media WHERE user_id = ?", userId)?.c || 0;
        const totalServices = safeGet("SELECT COUNT(*) AS c FROM services WHERE user_id = ?", userId)?.c || 0;
        const totalSkills   = safeGet("SELECT COUNT(*) AS c FROM creator_skills WHERE user_id = ?", userId)?.c || 0;
        const totalSocials  = safeGet("SELECT COUNT(*) AS c FROM social_links WHERE user_id = ?", userId)?.c || 0;

        // ---------- 4. DYNAMIC COMPLETION ----------
        // Each milestone is 1/N of the total.
        const milestones = [
            {
                key: "profile",
                label: "Complete your professional profile",
                done: !!(user.display_name && user.bio),
                href: "/dashboard/pages/profile.html"
            },
            {
                key: "title",
                label: "Add your professional title",
                done: !!(user.primary_profession),
                href: "/dashboard/pages/profile.html"
            },
            {
                key: "project",
                label: "Add your first project",
                done: (projectStats.total || 0) > 0,
                href: "/dashboard/pages/project-create.html"
            },
            {
                key: "media",
                label: "Upload media",
                done: totalMedia > 0,
                href: "/dashboard/pages/media.html"
            },
            {
                key: "service",
                label: "Add a service",
                done: totalServices > 0,
                href: "/dashboard/pages/service-edit.html"
            },
            {
                key: "skills",
                label: "Add skills",
                done: totalSkills > 0,
                href: "/dashboard/pages/skills.html"
            },
            {
                key: "social",
                label: "Link a social account",
                done: totalSocials > 0,
                href: "/dashboard/pages/social-links.html"
            },
            {
                key: "publish",
                label: "Publish your portfolio",
                done: portfolioStatus === "published",
                href: "/dashboard/pages/portfolio.html"
            }
        ];

        const completedCount = milestones.filter(m => m.done).length;
        const completionPct  = Math.round((completedCount / milestones.length) * 100);

        // ---------- 5. RECENT PROJECTS ----------
        // Real projects, safest order. Uses real "name" column.
        const recentProjects = safeAll(`
            SELECT
                id,
                name,
                description,
                category,
                thumbnail_url AS thumbnail,
                published,
                created_at
            FROM projects
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 3
        `, userId).map(p => ({
            id: p.id,
            title: p.name || "Untitled Project",
            description: p.description || "",
            category: p.category || "",
            thumbnail: p.thumbnail || null,
            status: p.published ? "published" : "draft",
            created_at: p.created_at
        }));

        // ---------- 6. RECENT ACTIVITY ----------
        // Build from real events we know exist.
        const activity = [];

        const latestProjects = safeAll(`
            SELECT name, created_at, published
            FROM projects WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 2
        `, userId);
        latestProjects.forEach(p => {
            activity.push({
                icon: p.published ? "upload-cloud" : "folder-plus",
                text: p.published
                    ? `You published "${p.name || "a project"}"`
                    : `You created "${p.name || "a project"}"`,
                time: p.created_at,
                href: "/dashboard/pages/projects.html"
            });
        });

        const latestSkills = safeAll(`
            SELECT s.name AS skill_name, cs.created_at
            FROM creator_skills cs
            LEFT JOIN skills s ON s.id = cs.skill_id
            WHERE cs.user_id = ?
            ORDER BY cs.created_at DESC LIMIT 1
        `, userId);
        latestSkills.forEach(s => {
            if (s.skill_name) {
                activity.push({
                    icon: "star",
                    text: `You added "${s.skill_name}" to your skills`,
                    time: s.created_at,
                    href: "/dashboard/pages/skills.html"
                });
            }
        });

        const latestServices = safeAll(`
            SELECT title, created_at FROM services
            WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 1
        `, userId);
        latestServices.forEach(s => {
            activity.push({
                icon: "briefcase",
                text: `You created the service "${s.title || "Untitled"}"`,
                time: s.created_at,
                href: "/dashboard/pages/services.html"
            });
        });

        const latestMedia = safeAll(`
            SELECT original_filename, created_at FROM project_media
            WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 1
        `, userId);
        latestMedia.forEach(m => {
            activity.push({
                icon: "image",
                text: `You uploaded ${m.original_filename || "an image"}`,
                time: m.created_at,
                href: "/dashboard/pages/media.html"
            });
        });

        // Sort activity newest first, take top 6
        activity.sort((a, b) => new Date(b.time) - new Date(a.time));
        const recentActivity = activity.slice(0, 6);

        // ---------- 7. RESPONSE ----------
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name || user.username || "User",
                profile_image: user.profile_image || null,
                role: user.role || "creator",
                primary_profession: user.primary_profession || null,
                specialties: user.specialties || null,
                bio: user.bio || null
            },
            portfolio: {
                status: portfolioStatus,
                url: portfolioUrl,
                slug: portfolioSlug,
                title: portfolioTheme.title || user.display_name || user.username,
                last_published_at: portfolioConfig?.last_published_at || null
            },
            stats: {
                projects:   projectStats.total || 0,
                published:  projectStats.published || 0,
                drafts:     projectStats.drafts || 0,
                media:      totalMedia,
                services:   totalServices,
                skills:     totalSkills,
                socials:    totalSocials
            },
            completion: {
                percent: completionPct,
                completed: completedCount,
                total: milestones.length,
                milestones: milestones
            },
            recentProjects: recentProjects,
            recentActivity: recentActivity
        });
    } catch (err) {
        console.error("Overview error:", err);
        res.status(500).json({ success: false, message: "Failed to load overview", error: err.message });
    }
};

// =========================================================
// GET /api/dashboard/activity — kept for compatibility
// =========================================================
exports.getActivity = (req, res) => {
    try {
        const userId = req.user.id;
        const activity = [];

        const projects = safeAll(`
            SELECT name, created_at, published FROM projects
            WHERE user_id = ? ORDER BY created_at DESC LIMIT 5
        `, userId);
        projects.forEach(p => activity.push({
            icon: p.published ? "upload-cloud" : "folder-plus",
            text: p.published ? `Published "${p.name}"` : `Created "${p.name}"`,
            time: p.created_at
        }));

        activity.sort((a, b) => new Date(b.time) - new Date(a.time));
        res.json({ success: true, activity: activity.slice(0, 10) });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};