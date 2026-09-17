// =========================================================
// CREVIO — SERVICE CONTROLLER
// File: backend/controllers/serviceController.js
// Full CRUD + relationships + stats + public
// =========================================================

const db = require("../../database/db");

function cols(table) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name); }
    catch (e) { return []; }
}

function tableExists(name) {
    try { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name); }
    catch (e) { return false; }
}

function safeGet(sql, ...params) {
    try { return db.prepare(sql).get(...params); } catch (e) { return null; }
}

function safeAll(sql, ...params) {
    try { return db.prepare(sql).all(...params); } catch (e) { return []; }
}

// =========================================================
// HELPER — load full service with relationships
// =========================================================
function hydrateService(service) {
    if (!service) return null;

    // Deliverables
    service.included_items = tableExists("service_included_items")
        ? safeAll("SELECT * FROM service_included_items WHERE service_id = ? ORDER BY display_order", service.id)
        : [];

    // FAQs
    service.faqs = tableExists("service_faqs")
        ? safeAll("SELECT * FROM service_faqs WHERE service_id = ? ORDER BY display_order", service.id)
        : [];

    // Process steps
    service.process = tableExists("service_process")
        ? safeAll("SELECT * FROM service_process WHERE service_id = ? ORDER BY display_order", service.id)
        : [];

    // Related projects
    service.projects = tableExists("service_projects")
        ? safeAll(`
            SELECT p.id, p.name AS title, p.description, p.category,
                   p.thumbnail_url, p.project_year
            FROM service_projects sp
            JOIN projects p ON p.id = sp.project_id
            WHERE sp.service_id = ?
        `, service.id)
        : [];

    // Related skills
    service.skills = tableExists("service_skills")
        ? safeAll(`
            SELECT s.id, s.name AS name
            FROM service_skills ss
            JOIN skills s ON s.id = ss.skill_id
            WHERE ss.service_id = ?
        `, service.id)
        : [];

    return service;
}

// =========================================================
// GET /api/services/stats
// =========================================================
exports.getStats = (req, res) => {
    try {
        const row = safeGet(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
                SUM(CASE WHEN status = 'draft' OR status IS NULL THEN 1 ELSE 0 END) AS drafts
            FROM services WHERE user_id = ?
        `, req.user.id);

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
// GET /api/services — list with search/filter/sort
// =========================================================
exports.getServices = (req, res) => {
    try {
        const userId = req.user.id;
        const search = (req.query.search || "").trim().toLowerCase();
        const filter = (req.query.filter || "all").toLowerCase();
        const sort   = (req.query.sort   || "updated").toLowerCase();

        let sql = "SELECT * FROM services WHERE user_id = ?";
        const params = [userId];

        if (filter === "published") sql += " AND status = 'published'";
        else if (filter === "draft") sql += " AND (status = 'draft' OR status IS NULL)";

        if (search) {
            sql += ` AND (
                LOWER(COALESCE(title, ''))       LIKE ? OR
                LOWER(COALESCE(description, '')) LIKE ? OR
                LOWER(COALESCE(category, ''))    LIKE ?
            )`;
            const like = `%${search}%`;
            params.push(like, like, like);
        }

        switch (sort) {
            case "newest":  sql += " ORDER BY created_at DESC"; break;
            case "oldest":  sql += " ORDER BY created_at ASC";  break;
            case "az":      sql += " ORDER BY LOWER(title) ASC"; break;
            case "za":      sql += " ORDER BY LOWER(title) DESC"; break;
            case "updated":
            default:        sql += " ORDER BY COALESCE(updated_at, created_at) DESC";
        }

        const rows = safeAll(sql, ...params);

        // Enrich each with relationship counts
        const services = rows.map(s => {
            const projectCount = tableExists("service_projects")
                ? safeGet("SELECT COUNT(*) AS c FROM service_projects WHERE service_id = ?", s.id)?.c || 0
                : 0;
            const skillCount = tableExists("service_skills")
                ? safeGet("SELECT COUNT(*) AS c FROM service_skills WHERE service_id = ?", s.id)?.c || 0
                : 0;
            return { ...s, project_count: projectCount, skill_count: skillCount };
        });

        res.json({ success: true, services });
    } catch (err) {
        console.error("List services error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/services/:id — with full relationships
// =========================================================
exports.getService = (req, res) => {
    try {
        const service = safeGet(
            "SELECT * FROM services WHERE id = ? AND user_id = ?",
            req.params.id, req.user.id
        );
        if (!service) return res.status(404).json({ success: false, message: "Not found" });

        res.json({ success: true, service: hydrateService(service) });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/services — create
// =========================================================
exports.createService = (req, res) => {
    try {
        const b = req.body;
        if (!b.title || !b.title.trim()) {
            return res.status(400).json({ success: false, message: "Service name is required" });
        }

        const c = cols("services");
        const has = (n) => c.includes(n);

        const fields = ["user_id", "title"];
        const placeholders = ["?", "?"];
        const values = [req.user.id, b.title.trim()];

        if (has("slug")) {
            const slug = b.title.toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .slice(0, 60) + "-" + Date.now().toString(36);
            fields.push("slug"); placeholders.push("?"); values.push(slug);
        }

        const optional = {
            description:       b.description || null,
            category:          b.category || null,
            problem:           b.problem || null,
            outcome:           b.outcome || null,
            pricing_type:      b.pricing_type || "fixed",
            price:             b.price ?? null,
            min_price:         b.min_price ?? null,
            max_price:         b.max_price ?? null,
            currency:          b.currency || "USD",
            delivery_time:     b.delivery_time || null,
            revisions:         b.revisions ?? null,
            availability:      b.availability ?? 1,
            status:            b.status || "draft",
            featured:          b.featured ?? 0,
            show_on_portfolio: b.show_on_portfolio ?? 1,
            cta_type:          b.cta_type || "quote",
            cta_label:         b.cta_label || null,
            cta_url:           b.cta_url || null
        };

        for (const [k, v] of Object.entries(optional)) {
            if (has(k)) { fields.push(k); placeholders.push("?"); values.push(v); }
        }
        if (has("created_at")) {
            fields.push("created_at"); placeholders.push("CURRENT_TIMESTAMP");
        }

        const sql = `INSERT INTO services (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`;
        const r = db.prepare(sql).run(...values);

        const service = db.prepare("SELECT * FROM services WHERE id = ?").get(r.lastInsertRowid);
        res.json({ success: true, message: "Service created", service: hydrateService(service) });
    } catch (err) {
        console.error("Create service error:", err);
        res.status(500).json({ success: false, message: "Failed to create", error: err.message });
    }
};

// =========================================================
// PATCH /api/services/:id — update
// =========================================================
exports.updateService = (req, res) => {
    try {
        const existing = safeGet(
            "SELECT * FROM services WHERE id = ? AND user_id = ?",
            req.params.id, req.user.id
        );
        if (!existing) return res.status(404).json({ success: false, message: "Not found" });

        const c = cols("services");
        const allowed = [
            "title", "description", "category", "problem", "outcome",
            "pricing_type", "price", "min_price", "max_price", "currency",
            "delivery_time", "revisions", "availability", "status",
            "featured", "show_on_portfolio",
            "cta_type", "cta_label", "cta_url"
        ];

        const updates = {};
        for (const k of allowed) {
            if (req.body[k] !== undefined && c.includes(k)) updates[k] = req.body[k];
        }

        if (!Object.keys(updates).length) {
            return res.json({ success: true, message: "Nothing to update", service: hydrateService(existing) });
        }

        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
        const values = [...Object.values(updates)];

        let sql = `UPDATE services SET ${setClauses}`;
        if (c.includes("updated_at")) sql += ", updated_at = CURRENT_TIMESTAMP";
        sql += " WHERE id = ? AND user_id = ?";
        values.push(req.params.id, req.user.id);

        db.prepare(sql).run(...values);

        const service = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
        res.json({ success: true, message: "Service updated", service: hydrateService(service) });
    } catch (err) {
        console.error("Update service error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// DELETE /api/services/:id
// =========================================================
exports.deleteService = (req, res) => {
    try {
        const r = db.prepare("DELETE FROM services WHERE id = ? AND user_id = ?")
                    .run(req.params.id, req.user.id);
        if (r.changes === 0) return res.status(404).json({ success: false, message: "Not found" });

        // Cleanup relationships
        ["service_included_items", "service_faqs", "service_projects", "service_skills", "service_process"].forEach(t => {
            if (tableExists(t)) {
                try { db.prepare(`DELETE FROM ${t} WHERE service_id = ?`).run(req.params.id); } catch (e) {}
            }
        });

        res.json({ success: true, message: "Deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PUT /api/services/:id/included-items
// =========================================================
exports.saveIncludedItems = (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items)) return res.status(400).json({ success: false, message: "items must be array" });

        const svc = safeGet("SELECT id FROM services WHERE id = ? AND user_id = ?", req.params.id, req.user.id);
        if (!svc) return res.status(404).json({ success: false, message: "Not found" });

        db.prepare("DELETE FROM service_included_items WHERE service_id = ?").run(req.params.id);
        const stmt = db.prepare("INSERT INTO service_included_items (service_id, item, display_order) VALUES (?, ?, ?)");
        items.forEach((it, i) => stmt.run(req.params.id, String(it).slice(0, 150), i));

        res.json({ success: true, message: "Saved" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PUT /api/services/:id/faqs
// =========================================================
exports.saveFaqs = (req, res) => {
    try {
        const { faqs } = req.body;
        if (!Array.isArray(faqs)) return res.status(400).json({ success: false, message: "faqs must be array" });

        const svc = safeGet("SELECT id FROM services WHERE id = ? AND user_id = ?", req.params.id, req.user.id);
        if (!svc) return res.status(404).json({ success: false, message: "Not found" });

        db.prepare("DELETE FROM service_faqs WHERE service_id = ?").run(req.params.id);
        const stmt = db.prepare("INSERT INTO service_faqs (service_id, question, answer, display_order) VALUES (?, ?, ?, ?)");
        faqs.forEach((f, i) => stmt.run(req.params.id, f.question, f.answer, i));

        res.json({ success: true, message: "Saved" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PUT /api/services/:id/projects
// =========================================================
exports.saveProjects = (req, res) => {
    try {
        const { projectIds } = req.body;
        if (!Array.isArray(projectIds)) return res.status(400).json({ success: false, message: "projectIds must be array" });

        const svc = safeGet("SELECT id FROM services WHERE id = ? AND user_id = ?", req.params.id, req.user.id);
        if (!svc) return res.status(404).json({ success: false, message: "Not found" });

        db.prepare("DELETE FROM service_projects WHERE service_id = ?").run(req.params.id);

        // Only allow projects that belong to this user
        const stmt = db.prepare("INSERT INTO service_projects (service_id, project_id) VALUES (?, ?)");
        projectIds.forEach(pid => {
            const owner = safeGet("SELECT user_id FROM projects WHERE id = ?", pid);
            if (owner && owner.user_id === req.user.id) {
                try { stmt.run(req.params.id, pid); } catch (e) {}
            }
        });

        res.json({ success: true, message: "Saved" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PUT /api/services/:id/skills
// =========================================================
exports.saveSkills = (req, res) => {
    try {
        const { skillIds } = req.body;
        if (!Array.isArray(skillIds)) return res.status(400).json({ success: false, message: "skillIds must be array" });

        const svc = safeGet("SELECT id FROM services WHERE id = ? AND user_id = ?", req.params.id, req.user.id);
        if (!svc) return res.status(404).json({ success: false, message: "Not found" });

        if (!tableExists("service_skills")) {
            return res.json({ success: true, message: "Table missing — skipped" });
        }

        db.prepare("DELETE FROM service_skills WHERE service_id = ?").run(req.params.id);

        // Only allow skills owned by user (via creator_skills)
        const stmt = db.prepare("INSERT INTO service_skills (service_id, skill_id) VALUES (?, ?)");
        skillIds.forEach(sid => {
            const owned = safeGet("SELECT 1 AS ok FROM creator_skills WHERE user_id = ? AND skill_id = ?", req.user.id, sid);
            if (owned) {
                try { stmt.run(req.params.id, sid); } catch (e) {}
            }
        });

        res.json({ success: true, message: "Saved" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PUT /api/services/:id/process
// =========================================================
exports.saveProcess = (req, res) => {
    try {
        const { steps } = req.body;
        if (!Array.isArray(steps)) return res.status(400).json({ success: false, message: "steps must be array" });

        const svc = safeGet("SELECT id FROM services WHERE id = ? AND user_id = ?", req.params.id, req.user.id);
        if (!svc) return res.status(404).json({ success: false, message: "Not found" });

        if (!tableExists("service_process")) {
            return res.json({ success: true, message: "Table missing — skipped" });
        }

        db.prepare("DELETE FROM service_process WHERE service_id = ?").run(req.params.id);
        const stmt = db.prepare("INSERT INTO service_process (service_id, step_title, step_description, display_order) VALUES (?, ?, ?, ?)");
        steps.forEach((s, i) => stmt.run(req.params.id, s.title || "Step", s.description || null, i));

        res.json({ success: true, message: "Saved" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/services/public/:slug/:serviceId — public view
// =========================================================
exports.getPublicService = (req, res) => {
    try {
        const user = safeGet("SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)", req.params.slug);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const service = safeGet(
            "SELECT * FROM services WHERE id = ? AND user_id = ? AND status = 'published'",
            req.params.serviceId, user.id
        );
        if (!service) return res.status(404).json({ success: false, message: "Service not found or not published" });

        res.json({ success: true, service: hydrateService(service) });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};