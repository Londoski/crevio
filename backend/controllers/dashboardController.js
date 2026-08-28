const db = require("../../database/db");


// ==========================================
// GET DASHBOARD
// ==========================================

const getDashboard = (req, res) => {
    try {
        const userId = req.user.id;

        // ------------------------------------------
        // Get user
        // ------------------------------------------

        const user = db.prepare(`
            SELECT
                id,
                username,
                email,
                display_name,
                bio,
                profile_image,
                location,
                created_at
            FROM users
            WHERE id = ?
        `).get(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }


        // ------------------------------------------
        // Project statistics
        // ------------------------------------------

        const projectStats = db.prepare(`
            SELECT
                COUNT(*) AS total_projects
            FROM projects
            WHERE user_id = ?
        `).get(userId);


        // ------------------------------------------
        // Media statistics
        // ------------------------------------------

        const mediaStats = db.prepare(`
            SELECT
                COUNT(*) AS total_media,
                SUM(CASE WHEN pm.media_type = 'image' THEN 1 ELSE 0 END) AS total_images,
                SUM(CASE WHEN pm.media_type = 'video' THEN 1 ELSE 0 END) AS total_videos
            FROM project_media pm
            INNER JOIN projects p
                ON pm.project_id = p.id
            WHERE p.user_id = ?
        `).get(userId);


        // ------------------------------------------
        // Recent projects
        // ------------------------------------------

        const recentProjects = db.prepare(`
            SELECT
                p.id,
                p.title,
                p.description,
                p.category,
                p.thumbnail_url,
                p.project_url,
                p.client_name,
                p.year,
                p.created_at,
                p.updated_at,

                (
                    SELECT COUNT(*)
                    FROM project_media pm
                    WHERE pm.project_id = p.id
                ) AS media_count

            FROM projects p

            WHERE p.user_id = ?

            ORDER BY p.created_at DESC

            LIMIT 5
        `).all(userId);


        // ------------------------------------------
        // Dashboard response
        // ------------------------------------------

        res.json({
            success: true,

            dashboard: {
                user,

                stats: {
                    projects: projectStats.total_projects || 0,
                    media: mediaStats.total_media || 0,
                    images: mediaStats.total_images || 0,
                    videos: mediaStats.total_videos || 0
                },

                recent_projects: recentProjects
            }
        });

    } catch (error) {

        console.error("Get dashboard error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load dashboard."
        });
    }
};


module.exports = {
    getDashboard
};