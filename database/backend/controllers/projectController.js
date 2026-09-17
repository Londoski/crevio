// =========================================================
// CREVIO — PROJECT CONTROLLER
// File: backend/controllers/projectController.js
// Matches real schema: id, user_id, name, description, category,
//                      thumbnail_url, published, slug, created_at, updated_at
// =========================================================

const db = require("../../database/db");

function projectCols() {
    try { return db.prepare("PRAGMA table_info(projects)").all().map(c => c.name); }
    catch (e) { return []; }
}

// =========================================================
// GET /api/projects
// =========================================================
exports.getProjects = (req, res) => {
    try {
        const projects = db.prepare(
            "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC"
        ).all(req.user.id);
        res.json({ success: true, projects });
    } catch (err) {
        console.error("List projects error:", err);
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
        res.json({ success: true, project });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/projects
// Accepts frontend payload { title, description, url, category, status, thumbnail }
// Maps to real columns: name, thumbnail_url, published
// =========================================================
exports.createProject = (req, res) => {
    try {
        const b = req.body;
        const name = (b.title || b.name || "").trim();
        if (!name) return res.status(400).json({ success: false, message: "Project name is required" });

        const cols = projectCols();
        const has = (n) => cols.includes(n);

        const fields = ["user_id", "name"];
        const placeholders = ["?", "?"];
        const values = [req.user.id, name];

        // description
        if (has("description")) {
            fields.push("description");
            placeholders.push("?");
            values.push(b.description || "");
        }

        // category
        if (has("category")) {
            fields.push("category");
            placeholders.push("?");
            values.push(b.category || "other");
        }

        // thumbnail_url (frontend sends "thumbnail")
        if (has("thumbnail_url")) {
            fields.push("thumbnail_url");
            placeholders.push("?");
            values.push(b.thumbnail || b.thumbnail_url || null);
        }

        // published (frontend sends "status": "draft"|"published")
        if (has("published")) {
            fields.push("published");
            placeholders.push("?");
            values.push(b.status === "published" ? 1 : 0);
        }

        // slug (auto-generate from name)
        if (has("slug")) {
            const slug = name.toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .slice(0, 60) + "-" + Date.now().toString(36);
            fields.push("slug");
            placeholders.push("?");
            values.push(slug);
        }

        // url — projects table has no `url` column. Store in description if needed? Skip.

        if (has("created_at")) {
            fields.push("created_at");
            placeholders.push("CURRENT_TIMESTAMP");
        }

        const sql = `INSERT INTO projects (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`;
        const result = db.prepare(sql).run(...values);

        const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(result.lastInsertRowid);
        res.json({ success: true, message: "Project created", project });
    } catch (err) {
        console.error("Create project error:", err);
        res.status(500).json({ success: false, message: "Failed to create project", error: err.message });
    }
};

// =========================================================
// PATCH /api/projects/:id
// =========================================================
exports.updateProject = (req, res) => {
    try {
        const existing = db.prepare(
            "SELECT * FROM projects WHERE id = ? AND user_id = ?"
        ).get(req.params.id, req.user.id);
        if (!existing) return res.status(404).json({ success: false, message: "Not found" });

        const cols = projectCols();
        const has = (n) => cols.includes(n);

        const updates = {};

        // name (from frontend "title" or "name")
        const newName = req.body.title ?? req.body.name;
        if (newName !== undefined && has("name")) updates.name = newName;

        if (req.body.description !== undefined && has("description")) {
            updates.description = req.body.description;
        }
        if (req.body.category !== undefined && has("category")) {
            updates.category = req.body.category;
        }
        // thumbnail (frontend "thumbnail" or "thumbnail_url")
        const thumb = req.body.thumbnail ?? req.body.thumbnail_url;
        if (thumb !== undefined && has("thumbnail_url")) {
            updates.thumbnail_url = thumb;
        }
        // status → published (0/1)
        if (req.body.status !== undefined && has("published")) {
            updates.published = req.body.status === "published" ? 1 : 0;
        }

        if (!Object.keys(updates).length) {
            return res.json({ success: true, message: "Nothing to update", project: existing });
        }

        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
        const values = [...Object.values(updates)];

        let sql = `UPDATE projects SET ${setClauses}`;
        if (has("updated_at")) sql += ", updated_at = CURRENT_TIMESTAMP";
        sql += " WHERE id = ? AND user_id = ?";
        values.push(req.params.id, req.user.id);

        db.prepare(sql).run(...values);

        const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
        res.json({ success: true, message: "Project updated", project });
    } catch (err) {
        console.error("Update project error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// DELETE /api/projects/:id
// =========================================================
exports.deleteProject = (req, res) => {
    try {
        const result = db.prepare(
            "DELETE FROM projects WHERE id = ? AND user_id = ?"
        ).run(req.params.id, req.user.id);
        if (result.changes === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};