// =========================================================
// CREVIO — MEDIA LIBRARY CONTROLLER (Safe Join)
// =========================================================

const db = require("../../database/db");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// ---- Ensure uploads/media directory exists ----
const mediaUploadDir = path.join(__dirname, "../../uploads/media");
if (!fs.existsSync(mediaUploadDir)) {
    fs.mkdirSync(mediaUploadDir, { recursive: true });
}

// ---- Multer storage ----
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, mediaUploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `media_${req.user.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Unsupported file type.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
}).single('media');

// ---- GET all media (safe join) ----
const getMedia = (req, res) => {
    try {
        const userId = req.user.id;
        const { filter, search, sort } = req.query;

        // First, check if projects table exists and has name column
        let projectNameColumn = 'NULL as project_name';
        try {
            const tableInfo = db.prepare(`PRAGMA table_info(projects)`).all();
            const hasName = tableInfo.some(c => c.name === 'name');
            if (hasName) {
                projectNameColumn = 'p.name as project_name';
            }
        } catch (e) {
            // ignore
        }

        let sql = `
            SELECT pm.*, ${projectNameColumn}
            FROM project_media pm
            LEFT JOIN projects p ON pm.project_id = p.id
            WHERE pm.user_id = ?
        `;
        const params = [userId];

        if (filter === 'image') sql += ` AND pm.media_type LIKE 'image%'`;
        else if (filter === 'video') sql += ` AND pm.media_type LIKE 'video%'`;
        else if (filter === 'unassigned') sql += ` AND pm.project_id IS NULL`;
        else if (filter === 'used') sql += ` AND pm.project_id IS NOT NULL`;
        else if (filter === 'unused') sql += ` AND pm.project_id IS NULL`;

        if (search && search.trim()) {
            sql += ` AND (pm.filename LIKE ? OR pm.title LIKE ? OR pm.description LIKE ?)`;
            const s = `%${search.trim()}%`;
            params.push(s, s, s);
        }

        sql += sort === 'oldest' ? ` ORDER BY pm.created_at ASC` :
               sort === 'name-asc' ? ` ORDER BY pm.title ASC` :
               sort === 'name-desc' ? ` ORDER BY pm.title DESC` :
               sort === 'largest' ? ` ORDER BY pm.file_size DESC` :
               sort === 'smallest' ? ` ORDER BY pm.file_size ASC` :
               ` ORDER BY pm.created_at DESC`;

        const media = db.prepare(sql).all(...params);
        res.json({ success: true, media });

    } catch (error) {
        console.error('Get media error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ---- GET single media ----
const getMediaById = (req, res) => {
    try {
        const userId = req.user.id;
        const mediaId = parseInt(req.params.id);

        // Same safe join
        let projectNameColumn = 'NULL as project_name';
        try {
            const tableInfo = db.prepare(`PRAGMA table_info(projects)`).all();
            const hasName = tableInfo.some(c => c.name === 'name');
            if (hasName) {
                projectNameColumn = 'p.name as project_name';
            }
        } catch (e) {}

        const media = db.prepare(`
            SELECT pm.*, ${projectNameColumn}
            FROM project_media pm
            LEFT JOIN projects p ON pm.project_id = p.id
            WHERE pm.id = ? AND pm.user_id = ?
        `).get(mediaId, userId);

        if (!media) return res.status(404).json({ success: false, message: 'Media not found.' });
        res.json({ success: true, media });

    } catch (error) {
        console.error('Get media by id error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ---- UPLOAD media ----
const uploadMedia = (req, res) => {
    upload(req, res, (err) => {
        try {
            if (err) {
                console.error('Multer error:', err);
                return res.status(400).json({ success: false, message: err.message });
            }
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file selected.' });
            }

            const userId = req.user.id;
            const file = req.file;
            const mediaType = file.mimetype || 'application/octet-stream';
            const mediaUrl = `/uploads/media/${file.filename}`;
            const thumbnailUrl = mediaType.startsWith('image') ? mediaUrl : null;

            const stmt = db.prepare(`
                INSERT INTO project_media (
                    user_id, filename, original_filename, media_type,
                    media_url, thumbnail_url, file_size, title, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);
            const result = stmt.run(
                userId,
                file.filename,
                file.originalname,
                mediaType,
                mediaUrl,
                thumbnailUrl,
                file.size,
                file.originalname
            );

            const media = db.prepare(`SELECT * FROM project_media WHERE id = ?`).get(result.lastInsertRowid);
            res.json({ success: true, media });

        } catch (error) {
            console.error('Upload error:', error);
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (e) {}
            }
            res.status(500).json({ success: false, message: error.message });
        }
    });
};

// ---- UPDATE media ----
const updateMedia = (req, res) => {
    try {
        const userId = req.user.id;
        const mediaId = parseInt(req.params.id);
        const { title, description, project_name, caption, category, tags } = req.body;

        const existing = db.prepare(`SELECT * FROM project_media WHERE id = ? AND user_id = ?`).get(mediaId, userId);
        if (!existing) return res.status(404).json({ success: false, message: 'Media not found.' });

        let projectId = existing.project_id;
        if (project_name !== undefined) {
            if (project_name && project_name.trim()) {
                // Find or create project
                let project = db.prepare(`SELECT id FROM projects WHERE name = ? AND user_id = ?`).get(project_name.trim(), userId);
                if (!project) {
                    const result = db.prepare(`INSERT INTO projects (user_id, name, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)`).run(userId, project_name.trim());
                    projectId = result.lastInsertRowid;
                } else {
                    projectId = project.id;
                }
            } else {
                projectId = null;
            }
        }

        let updates = [], params = [];
        if (title !== undefined) { updates.push('title = ?'); params.push(title); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description); }
        if (caption !== undefined) { updates.push('caption = ?'); params.push(caption); }
        if (category !== undefined) { updates.push('category = ?'); params.push(category); }
        if (tags !== undefined) { updates.push('tags = ?'); params.push(tags); }
        if (project_name !== undefined) { updates.push('project_id = ?'); params.push(projectId); }

        if (updates.length === 0) {
            const media = db.prepare(`SELECT pm.*, p.name as project_name FROM project_media pm LEFT JOIN projects p ON pm.project_id = p.id WHERE pm.id = ?`).get(mediaId);
            return res.json({ success: true, media });
        }

        params.push(mediaId);
        db.prepare(`UPDATE project_media SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const media = db.prepare(`SELECT pm.*, p.name as project_name FROM project_media pm LEFT JOIN projects p ON pm.project_id = p.id WHERE pm.id = ?`).get(mediaId);
        res.json({ success: true, media });

    } catch (error) {
        console.error('Update media error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ---- DELETE media ----
const deleteMedia = (req, res) => {
    try {
        const userId = req.user.id;
        const mediaId = parseInt(req.params.id);

        const media = db.prepare(`SELECT media_url FROM project_media WHERE id = ? AND user_id = ?`).get(mediaId, userId);
        if (!media) return res.status(404).json({ success: false, message: 'Media not found.' });

        const filePath = path.join(__dirname, "../..", media.media_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        db.prepare(`DELETE FROM project_media WHERE id = ? AND user_id = ?`).run(mediaId, userId);
        res.json({ success: true, message: 'Media deleted.' });

    } catch (error) {
        console.error('Delete media error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ---- BULK delete ----
const bulkDeleteMedia = (req, res) => {
    try {
        const userId = req.user.id;
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No media IDs provided.' });
        }

        const placeholders = ids.map(() => '?').join(',');
        const mediaList = db.prepare(`SELECT media_url FROM project_media WHERE id IN (${placeholders}) AND user_id = ?`).all(...ids, userId);
        mediaList.forEach(m => {
            const filePath = path.join(__dirname, "../..", m.media_url);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });

        db.prepare(`DELETE FROM project_media WHERE id IN (${placeholders}) AND user_id = ?`).run(...ids, userId);
        res.json({ success: true, message: 'Media deleted.' });

    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ---- BULK assign ----
const bulkAssignMedia = (req, res) => {
    try {
        const userId = req.user.id;
        const { ids, projectName } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No media IDs provided.' });
        }

        let projectId = null;
        if (projectName && projectName.trim()) {
            let project = db.prepare(`SELECT id FROM projects WHERE name = ? AND user_id = ?`).get(projectName.trim(), userId);
            if (!project) {
                const result = db.prepare(`INSERT INTO projects (user_id, name, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)`).run(userId, projectName.trim());
                projectId = result.lastInsertRowid;
            } else {
                projectId = project.id;
            }
        }

        const placeholders = ids.map(() => '?').join(',');
        db.prepare(`UPDATE project_media SET project_id = ? WHERE id IN (${placeholders}) AND user_id = ?`).run(projectId, ...ids, userId);
        res.json({ success: true, message: 'Media assigned.' });

    } catch (error) {
        console.error('Bulk assign error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getMedia,
    getMediaById,
    uploadMedia,
    updateMedia,
    deleteMedia,
    bulkDeleteMedia,
    bulkAssignMedia
};