// =========================================================
// CREVIO — MEDIA CONTROLLER (real storage, no hardcoding)
// File: backend/controllers/mediaController.js
// =========================================================

const db = require("../../database/db");
const path = require("path");
const fs = require("fs");

// =========================================================
// HELPERS
// =========================================================
function safeGet(sql, ...params) {
    try { return db.prepare(sql).get(...params); }
    catch (e) { return null; }
}
function safeAll(sql, ...params) {
    try { return db.prepare(sql).all(...params); }
    catch (e) { return []; }
}

// Categorize a MIME type into a group
function categorize(mime) {
    mime = (mime || "").toLowerCase();
    if (mime.startsWith("image/"))     return "image";
    if (mime.startsWith("video/"))     return "video";
    if (mime.startsWith("audio/"))     return "audio";
    if (mime === "application/pdf")    return "document";
    if (mime.startsWith("application/")) return "document";
    if (mime.startsWith("text/"))      return "document";
    return "other";
}

// Add `category_group` and `used_in_count` to each row
function enrich(row) {
    if (!row) return row;
    const cat = categorize(row.media_type);
    const usedIn = safeGet(
        "SELECT COUNT(*) AS c FROM service_projects WHERE project_id = ?",
        row.project_id
    )?.c || 0;

    return {
        ...row,
        category_group: cat,
        used_in_count: row.project_id ? 1 : 0, // MVP: 1 if linked to a project
        display_name: row.title || row.original_filename || row.filename || "Untitled"
    };
}

// =========================================================
// GET /api/media — list with search/filter/sort
// =========================================================
exports.getMedia = (req, res) => {
    try {
        const userId = req.user.id;
        const search = (req.query.search || "").trim().toLowerCase();
        const filter = (req.query.filter || "all").toLowerCase();
        const sort   = (req.query.sort   || "newest").toLowerCase();

        let sql = "SELECT * FROM project_media WHERE user_id = ?";
        const params = [userId];

        // Filter by category_group (computed in JS after query)
        if (search) {
            sql += ` AND (
                LOWER(COALESCE(title, ''))             LIKE ? OR
                LOWER(COALESCE(original_filename, '')) LIKE ? OR
                LOWER(COALESCE(filename, ''))          LIKE ? OR
                LOWER(COALESCE(description, ''))       LIKE ? OR
                LOWER(COALESCE(tags, ''))              LIKE ?
            )`;
            const like = `%${search}%`;
            params.push(like, like, like, like, like);
        }

        // Sort
        switch (sort) {
            case "oldest":  sql += " ORDER BY created_at ASC"; break;
            case "updated": sql += " ORDER BY COALESCE(updated_at, created_at) DESC"; break;
            case "az":      sql += " ORDER BY LOWER(COALESCE(title, original_filename, filename)) ASC"; break;
            case "za":      sql += " ORDER BY LOWER(COALESCE(title, original_filename, filename)) DESC"; break;
            case "largest": sql += " ORDER BY COALESCE(file_size, 0) DESC"; break;
            case "smallest":sql += " ORDER BY COALESCE(file_size, 0) ASC"; break;
            case "newest":
            default:        sql += " ORDER BY created_at DESC";
        }

        let rows = safeAll(sql, ...params);

        // Filter by category_group
        if (filter !== "all") {
            rows = rows.filter(r => categorize(r.media_type) === filter);
        }

        const media = rows.map(enrich);
        res.json({ success: true, media });
    } catch (err) {
        console.error("List media error:", err);
        res.status(500).json({ success: false, message: "Failed to load media", error: err.message });
    }
};

// =========================================================
// GET /api/media/stats — summary counts
// =========================================================
exports.getStats = (req, res) => {
    try {
        const userId = req.user.id;
        const rows = safeAll("SELECT media_type, file_size FROM project_media WHERE user_id = ?", userId);

        let images = 0, videos = 0, audio = 0, documents = 0, other = 0;
        let totalBytes = 0;

        for (const r of rows) {
            totalBytes += r.file_size || 0;
            const g = categorize(r.media_type);
            if (g === "image")         images++;
            else if (g === "video")    videos++;
            else if (g === "audio")    audio++;
            else if (g === "document") documents++;
            else                       other++;
        }

        res.json({
            success: true,
            stats: {
                total:      rows.length,
                images,
                videos,
                audio,
                documents,
                other,
                totalBytes
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/media/:id — single
// =========================================================
exports.getOne = (req, res) => {
    try {
        const row = safeGet(
            "SELECT * FROM project_media WHERE id = ? AND user_id = ?",
            req.params.id, req.user.id
        );
        if (!row) return res.status(404).json({ success: false, message: "Not found" });

        // Linked projects
        const usedIn = safeAll(`
            SELECT p.id, p.name AS title
            FROM service_projects sp
            JOIN projects p ON p.id = sp.project_id
            WHERE sp.project_id = ?
        `, row.project_id);

        res.json({ success: true, media: enrich(row), usedIn });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/media — record after multer wrote the file
// =========================================================


       exports.uploadMedia = (req, res) => {
    try {
        // Multer .fields() puts files under req.files
        const file      = req.files?.file?.[0];
        const thumbnail = req.files?.thumbnail?.[0];

        if (!file) {
            return res.status(400).json({ success: false, message: "No file received" });
        }

        // Verify main file landed on disk
        if (!fs.existsSync(file.path) || fs.statSync(file.path).size === 0) {
            return res.status(500).json({ success: false, message: "File not written to disk" });
        }

        const url      = `/uploads/media/${file.filename}`;
        const mimeType = file.mimetype || "application/octet-stream";
        const size     = file.size || 0;
        const original = file.originalname || file.filename;

        // Optional thumbnail
        let thumbUrl = null;
        if (thumbnail && fs.existsSync(thumbnail.path) && fs.statSync(thumbnail.path).size > 0) {
            thumbUrl = `/uploads/thumbnails/${thumbnail.filename}`;
            console.log(`🖼️  Thumbnail received: ${thumbnail.filename} (${thumbnail.size} bytes)`);
        }

        const result = db.prepare(`
            INSERT INTO project_media
                (user_id, filename, original_filename, media_type, media_url,
                 thumbnail_url, file_size, title, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
            req.user.id,
            file.filename,
            original,
            mimeType,
            url,
            thumbUrl,
            size,
            original
        );

        const media = db.prepare("SELECT * FROM project_media WHERE id = ?").get(result.lastInsertRowid);
        console.log(`✅ Media saved: id=${media.id} type=${mimeType} size=${size} thumb=${!!thumbUrl}`);

        res.json({ success: true, message: "Uploaded", media: enrich(media) });
    } catch (err) {
        console.error("Upload media error:", err);

        // Best-effort cleanup
        const files = req.files ? Object.values(req.files).flat() : [];
        for (const f of files) {
            if (f && f.path && fs.existsSync(f.path)) {
                try { fs.unlinkSync(f.path); } catch (e) {}
            }
        }
        res.status(500).json({ success: false, message: "Failed to save media", error: err.message });
    }
};

// =========================================================
// POST /api/media/:id/thumbnail — attach a new thumbnail
// Used to regenerate the preview for existing videos
// =========================================================
exports.setThumbnail = (req, res) => {
    try {
        const thumbnail = req.files?.thumbnail?.[0];
        if (!thumbnail) {
            return res.status(400).json({ success: false, message: "No thumbnail file received" });
        }
        if (!fs.existsSync(thumbnail.path) || fs.statSync(thumbnail.path).size === 0) {
            return res.status(500).json({ success: false, message: "Thumbnail file not written to disk" });
        }

        const existing = safeGet(
            "SELECT * FROM project_media WHERE id = ? AND user_id = ?",
            req.params.id, req.user.id
        );
        if (!existing) {
            // Cleanup orphan
            try { fs.unlinkSync(thumbnail.path); } catch (e) {}
            return res.status(404).json({ success: false, message: "Media not found" });
        }

        const thumbUrl = `/uploads/thumbnails/${thumbnail.filename}`;

        // Delete old thumbnail file if it was a generated one (not the original media file)
        if (existing.thumbnail_url && existing.thumbnail_url !== existing.media_url) {
            const oldRel = existing.thumbnail_url.replace(/^\//, "");
            const oldPath = path.join(__dirname, "..", "..", oldRel);
            if (fs.existsSync(oldPath)) {
                try { fs.unlinkSync(oldPath); } catch (e) {}
            }
        }

        db.prepare(`
            UPDATE project_media
            SET thumbnail_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `).run(thumbUrl, req.params.id, req.user.id);

        const media = db.prepare("SELECT * FROM project_media WHERE id = ?").get(req.params.id);
        console.log(`✅ Thumbnail set for media #${req.params.id}: ${thumbUrl}`);

        res.json({ success: true, message: "Thumbnail updated", media: enrich(media) });
    } catch (err) {
        console.error("setThumbnail error:", err);
        res.status(500).json({ success: false, message: "Failed to update thumbnail", error: err.message });
    }
};

// =========================================================
// PATCH /api/media/:id — update metadata
// =========================================================
exports.updateMedia = (req, res) => {
    try {
        const existing = safeGet(
            "SELECT * FROM project_media WHERE id = ? AND user_id = ?",
            req.params.id, req.user.id
        );
        if (!existing) return res.status(404).json({ success: false, message: "Not found" });

        const allowed = ["title", "description", "caption", "category", "tags"];
        const updates = {};
        for (const k of allowed) {
            if (req.body[k] !== undefined) updates[k] = req.body[k];
        }
        if (!Object.keys(updates).length) {
            return res.json({ success: true, message: "Nothing to update", media: enrich(existing) });
        }

        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
        const values = [...Object.values(updates), req.params.id, req.user.id];

        db.prepare(`UPDATE project_media SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND user_id = ?`).run(...values);

        const media = db.prepare("SELECT * FROM project_media WHERE id = ?").get(req.params.id);
        res.json({ success: true, message: "Updated", media: enrich(media) });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// DELETE /api/media/:id — remove row + file
// =========================================================
exports.deleteMedia = (req, res) => {
    try {
        const row = safeGet(
            "SELECT * FROM project_media WHERE id = ? AND user_id = ?",
            req.params.id, req.user.id
        );
        if (!row) return res.status(404).json({ success: false, message: "Not found" });

        // Check project usage
        const inUse = row.project_id ? 1 : 0;

        // Delete physical file
        const rel = (row.media_url || "").replace(/^\//, "");
        if (rel) {
            const filePath = path.join(__dirname, "..", "..", rel);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) { console.warn("Unlink failed:", e.message); }
            }
        }

        db.prepare("DELETE FROM project_media WHERE id = ?").run(req.params.id);
        res.json({ success: true, message: "Deleted", was_in_use: inUse });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/media/:id/download — force download
// =========================================================
exports.downloadMedia = (req, res) => {
    try {
        const row = safeGet(
            "SELECT * FROM project_media WHERE id = ? AND user_id = ?",
            req.params.id, req.user.id
        );
        if (!row) return res.status(404).json({ success: false, message: "Not found" });

        const rel = (row.media_url || "").replace(/^\//, "");
        const filePath = path.join(__dirname, "..", "..", rel);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "File missing on disk" });
        }

        const filename = row.original_filename || row.filename || "media";
        res.download(filePath, filename);
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};