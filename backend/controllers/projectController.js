// =========================================================
// CREVIO — PROJECT CONTROLLER
// File: backend/controllers/projectController.js
// Full CRUD + search + filter + sort + duplicate + stats
// Ownership enforced on every query.
// =========================================================

const db = require("../../database/db");
const notificationService = require("../services/notificationService");
const path = require("path");
const fs = require("fs");

function cols(table) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name); }
    catch (e) { return []; }
}

// =========================================================
// GET /api/projects — list with search/filter/sort
// Query params: ?search=&filter=all|published|draft&sort=updated|newest|oldest|az
// =========================================================
exports.getProjects = (req, res) => {
    try {
        const userId  = req.user.id;
        const search  = (req.query.search || "").trim();
        const filter  = (req.query.filter || "all").toLowerCase();
        const sort    = (req.query.sort || "updated").toLowerCase();

        let sql = "SELECT * FROM projects WHERE user_id = ?";
        const params = [userId];

        // Filter
        if (filter === "published") sql += " AND published = 1";
        else if (filter === "draft") sql += " AND (published = 0 OR published IS NULL)";

        // Search
        if (search) {
            sql += ` AND (
                LOWER(name)        LIKE ? OR
                LOWER(description) LIKE ? OR
                LOWER(category)    LIKE ? OR
                LOWER(client_name) LIKE ?
            )`;
            const like = `%${search.toLowerCase()}%`;
            params.push(like, like, like, like);
        }

        // Sort
        switch (sort) {
            case "newest": sql += " ORDER BY created_at DESC"; break;
            case "oldest": sql += " ORDER BY created_at ASC";  break;
            case "az":     sql += " ORDER BY LOWER(name) ASC"; break;
            case "updated":
            default:       sql += " ORDER BY COALESCE(updated_at, created_at) DESC";
        }

        const projects = db.prepare(sql).all(...params);

        res.json({ success: true, projects });
    } catch (err) {
        console.error("List projects error:", err);
        res.status(500).json({ success: false, message: "Failed to load projects", error: err.message });
    }
};

// =========================================================
// GET /api/projects/stats — summary counts
// =========================================================
exports.getStats = (req, res) => {
    try {
        const userId = req.user.id;
        const row = db.prepare(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN published = 1 THEN 1 ELSE 0 END) AS published,
                SUM(CASE WHEN published = 0 OR published IS NULL THEN 1 ELSE 0 END) AS drafts
            FROM projects WHERE user_id = ?
        `).get(userId);

        res.json({
            success: true,
            stats: {
                total:     row?.total     || 0,
                published: row?.published || 0,
                drafts:    row?.drafts    || 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/projects/:id
// =========================================================
exports.getProject = (req, res) => {
    try {
        const project = db.prepare(
            "SELECT * FROM projects WHERE id = ? AND user_id = ?"
        ).get(req.params.id, req.user.id);
        if (!project) return res.status(404).json({ success: false, message: "Not found" });

        // Attach linked services
        try {
            project.services = db.prepare(`
                SELECT s.id, s.title
                FROM service_projects sp
                JOIN services s ON s.id = sp.service_id
                WHERE sp.project_id = ?
            `).all(project.id) || [];
        } catch (e) { project.services = []; }

        // Attach media
        try {
            project.media = db.prepare(
                "SELECT id, media_url AS url, original_filename AS name FROM project_media WHERE project_id = ?"
            ).all(project.id) || [];
        } catch (e) { project.media = []; }

        res.json({ success: true, project });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/projects — create
// =========================================================
exports.createProject = (req, res) => {
    try {
        const b = req.body;
        const name = (b.name || b.title || "").trim();
        if (!name) return res.status(400).json({ success: false, message: "Project title is required" });

        const c = cols("projects");
        const has = (n) => c.includes(n);

        const fields = ["user_id", "name"];
        const placeholders = ["?", "?"];
        const values = [req.user.id, name];

        // Slug
        if (has("slug")) {
            const slug = name.toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .slice(0, 60) + "-" + Date.now().toString(36);
            fields.push("slug"); placeholders.push("?"); values.push(slug);
        }

        const optional = {
            description:   b.description || "",
            category:      b.category || "",
            thumbnail_url: b.thumbnail_url || b.thumbnail || null,
            client_name:   b.client_name || null,
            role:          b.role || null,
            project_year:  b.project_year || null,
            content:       b.content || null,
            published:     b.published ? 1 : 0,
            published_at:  b.published ? new Date().toISOString() : null
        };

        for (const [k, v] of Object.entries(optional)) {
            if (has(k)) { fields.push(k); placeholders.push("?"); values.push(v); }
        }
        if (has("created_at")) {
            fields.push("created_at"); placeholders.push("CURRENT_TIMESTAMP");
        }
        if (has("updated_at")) {
            fields.push("updated_at"); placeholders.push("CURRENT_TIMESTAMP");
        }

        const sql = `INSERT INTO projects (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`;
        const r = db.prepare(sql).run(...values);

        const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(r.lastInsertRowid);
        res.json({ success: true, message: "Project created", project });
    } catch (err) {
        console.error("Create project error:", err);
        res.status(500).json({ success: false, message: "Failed to create", error: err.message });
    }
};

// =========================================================
// PATCH /api/projects/:id — update
// =========================================================
exports.updateProject = (req, res) => {
    try {
        const existing = db.prepare(
            "SELECT * FROM projects WHERE id = ? AND user_id = ?"
        ).get(req.params.id, req.user.id);
        if (!existing) return res.status(404).json({ success: false, message: "Not found" });

        const c = cols("projects");
        const b = req.body;
        const updates = {};

        // name comes from either field
        if (b.name !== undefined) updates.name = b.name;
        else if (b.title !== undefined) updates.name = b.title;

        const fields = ["description", "category", "thumbnail_url", "client_name", "role", "project_year", "content"];
        for (const f of fields) {
            if (b[f] !== undefined && c.includes(f)) updates[f] = b[f];
        }

        // thumbnail alias
        if (b.thumbnail !== undefined && c.includes("thumbnail_url")) {
            updates.thumbnail_url = b.thumbnail;
        }

        // published toggle
        if (b.published !== undefined && c.includes("published")) {
            updates.published = b.published ? 1 : 0;
            if (b.published && c.includes("published_at")) {
                updates.published_at = new Date().toISOString();
            }
        }

        if (!Object.keys(updates).length) {
            return res.json({ success: true, message: "Nothing to update", project: existing });
        }

        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
        const values = [...Object.values(updates)];

        let sql = `UPDATE projects SET ${setClauses}`;
        if (c.includes("updated_at")) sql += ", updated_at = CURRENT_TIMESTAMP";
        sql += " WHERE id = ? AND user_id = ?";
        values.push(req.params.id, req.user.id);

        db.prepare(sql).run(...values);

        const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
        res.json({ success: true, message: "Project updated", project });
    } catch (err) {
        console.error("Update project error:", err);
        res.status(500).json({ success: false, message: "Failed to update", error: err.message });
    }
};

// =========================================================
// POST /api/projects/:id/publish
// POST /api/projects/:id/unpublish
// =========================================================
exports.publishProject = (req, res) => {
    try {
        const r = db.prepare(`
            UPDATE projects
            SET published = 1, published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `).run(req.params.id, req.user.id);
        if (r.changes === 0) return res.status(404).json({ success: false, message: "Not found" });
        try {
            const __p = db.prepare("SELECT name FROM projects WHERE id = ?").get(req.params.id);
            const __n = (__p && __p.name) ? __p.name : "your project";
            notificationService.create({
                userId: req.user.id,
                type: "system",
                title: "Project published",
                message: '"' + __n + '" is now publicly visible.',
                entityType: "project",
                entityId: Number(req.params.id)
            });
        } catch (e) { /* silent */ }

        res.json({ success: true, message: "Project published" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

exports.unpublishProject = (req, res) => {
    try {
        const r = db.prepare(`
            UPDATE projects
            SET published = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `).run(req.params.id, req.user.id);
        if (r.changes === 0) return res.status(404).json({ success: false, message: "Not found" });
        try {
            const __p = db.prepare("SELECT name FROM projects WHERE id = ?").get(req.params.id);
            const __n = (__p && __p.name) ? __p.name : "your project";
            notificationService.create({
                userId: req.user.id,
                type: "system",
                title: "Project unpublished",
                message: '"' + __n + '" is no longer publicly visible.',
                entityType: "project",
                entityId: Number(req.params.id)
            });
        } catch (e) { /* silent */ }

        res.json({ success: true, message: "Project unpublished" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/projects/:id/duplicate
// =========================================================
exports.duplicateProject = (req, res) => {
    try {
        const src = db.prepare(
            "SELECT * FROM projects WHERE id = ? AND user_id = ?"
        ).get(req.params.id, req.user.id);
        if (!src) return res.status(404).json({ success: false, message: "Not found" });

        const c = cols("projects");
        const has = (n) => c.includes(n);

        const fields = ["user_id", "name"];
        const placeholders = ["?", "?"];
        const values = [req.user.id, `${src.name || "Untitled"} — Copy`];

        if (has("slug")) {
            const slug = (src.name || "project").toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .slice(0, 40) + "-copy-" + Date.now().toString(36);
            fields.push("slug"); placeholders.push("?"); values.push(slug);
        }

        const optional = {
            description:   src.description,
            category:      src.category,
            thumbnail_url: src.thumbnail_url,
            client_name:   src.client_name,
            role:          src.role,
            project_year:  src.project_year,
            content:       src.content,
            published:     0
        };
        for (const [k, v] of Object.entries(optional)) {
            if (has(k)) { fields.push(k); placeholders.push("?"); values.push(v); }
        }
        if (has("created_at")) {
            fields.push("created_at"); placeholders.push("CURRENT_TIMESTAMP");
        }
        if (has("updated_at")) {
            fields.push("updated_at"); placeholders.push("CURRENT_TIMESTAMP");
        }

        const sql = `INSERT INTO projects (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`;
        const r = db.prepare(sql).run(...values);

        const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(r.lastInsertRowid);
        res.json({ success: true, message: "Project duplicated", project });
    } catch (err) {
        console.error("Duplicate project error:", err);
        res.status(500).json({ success: false, message: "Failed to duplicate", error: err.message });
    }
};

// =========================================================
// DELETE /api/projects/:id
// =========================================================
exports.deleteProject = (req, res) => {
    try {
        const r = db.prepare(
            "DELETE FROM projects WHERE id = ? AND user_id = ?"
        ).run(req.params.id, req.user.id);
        if (r.changes === 0) return res.status(404).json({ success: false, message: "Not found" });

        // Cleanup relations (best-effort)
        try { db.prepare("DELETE FROM service_projects WHERE project_id = ?").run(req.params.id); } catch (e) {}
        try { db.prepare("UPDATE project_media SET project_id = NULL WHERE project_id = ?").run(req.params.id); } catch (e) {}

        res.json({ success: true, message: "Project deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/projects/upload-cover — multer file on req.file
// =========================================================
exports.uploadCover = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file received" });
        }

        // Verify the file was actually written
        const fullPath = req.file.path;
        const exists   = fs.existsSync(fullPath);
        const size     = exists ? fs.statSync(fullPath).size : 0;

        console.log(`📥 Cover received: ${req.file.filename} (${size} bytes, exists: ${exists})`);

        if (!exists || size === 0) {
            return res.status(500).json({
                success: false,
                message: "File was received but could not be saved to disk"
            });
        }

        const url = `/uploads/covers/${req.file.filename}`;
        res.json({ success: true, url, size });
    } catch (err) {
        console.error("uploadCover error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};