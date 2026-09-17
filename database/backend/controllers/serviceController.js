// =========================================================
// CREVIO — SERVICE CONTROLLER
// File: backend/controllers/serviceController.js
// Matches real schema: id, user_id, title, slug, description, category,
//   image_url, pricing_type, price, min_price, max_price, currency,
//   delivery_time, revisions, availability, status, featured,
//   show_on_portfolio, cta_type, cta_label, cta_url, created_at, updated_at
// =========================================================

const db = require("../../database/db");

function cols(table) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name); }
    catch (e) { return []; }
}

function tableExists(name) {
    try {
        return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
    } catch (e) { return false; }
}

// =========================================================
// GET /api/services — list all
// =========================================================
exports.getServices = (req, res) => {
    try {
        const services = db.prepare(
            "SELECT * FROM services WHERE user_id = ? ORDER BY created_at DESC"
        ).all(req.user.id);
        res.json({ success: true, services });
    } catch (err) {
        console.error("List services error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/services/:id — single, with sub-resources
// =========================================================
exports.getService = (req, res) => {
    try {
        const service = db.prepare(
            "SELECT * FROM services WHERE id = ? AND user_id = ?"
        ).get(req.params.id, req.user.id);
        if (!service) return res.status(404).json({ success: false, message: "Not found" });

        // Sub-resources (best-effort)
        service.included_items = tableExists("service_included_items")
            ? (db.prepare("SELECT * FROM service_included_items WHERE service_id = ? ORDER BY sort_order").all(service.id) || [])
            : [];
        service.faqs = tableExists("service_faqs")
            ? (db.prepare("SELECT * FROM service_faqs WHERE service_id = ? ORDER BY sort_order").all(service.id) || [])
            : [];
        service.projects = tableExists("service_projects")
            ? (db.prepare(`
                SELECT p.id, p.name AS title
                FROM service_projects sp
                JOIN projects p ON p.id = sp.project_id
                WHERE sp.service_id = ?
              `).all(service.id) || [])
            : [];

        res.json({ success: true, service });
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
        if (!b.title)       return res.status(400).json({ success: false, message: "Title is required" });
        if (!b.description) return res.status(400).json({ success: false, message: "Description is required" });

        const c = cols("services");
        const has = (n) => c.includes(n);

        const fields = ["user_id", "title", "description"];
        const placeholders = ["?", "?", "?"];
        const values = [req.user.id, b.title, b.description];

        // Slug (auto)
        if (has("slug")) {
            const slug = String(b.title).toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .slice(0, 60) + "-" + Date.now().toString(36);
            fields.push("slug"); placeholders.push("?"); values.push(slug);
        }

        const optional = {
            category:          b.category || null,
            image_url:         b.image_url || null,
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
            fields.push("created_at");
            placeholders.push("CURRENT_TIMESTAMP");
        }

        const sql = `INSERT INTO services (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`;
        const r = db.prepare(sql).run(...values);

        const service = db.prepare("SELECT * FROM services WHERE id = ?").get(r.lastInsertRowid);
        res.json({ success: true, message: "Service created", service });
    } catch (err) {
        console.error("Create service error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PATCH /api/services/:id — update
// =========================================================
exports.updateService = (req, res) => {
    try {
        const existing = db.prepare(
            "SELECT * FROM services WHERE id = ? AND user_id = ?"
        ).get(req.params.id, req.user.id);
        if (!existing) return res.status(404).json({ success: false, message: "Not found" });

        const c = cols("services");
        const allowed = [
            "title", "description", "category", "image_url",
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
            return res.json({ success: true, message: "Nothing to update", service: existing });
        }

        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
        const values = [...Object.values(updates)];

        let sql = `UPDATE services SET ${setClauses}`;
        if (c.includes("updated_at")) sql += ", updated_at = CURRENT_TIMESTAMP";
        sql += " WHERE id = ? AND user_id = ?";
        values.push(req.params.id, req.user.id);

        db.prepare(sql).run(...values);

        const service = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
        res.json({ success: true, message: "Service updated", service });
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

        // Cleanup sub-resources (best-effort)
        try { if (tableExists("service_included_items")) db.prepare("DELETE FROM service_included_items WHERE service_id = ?").run(req.params.id); } catch (e) {}
        try { if (tableExists("service_faqs"))           db.prepare("DELETE FROM service_faqs WHERE service_id = ?").run(req.params.id); } catch (e) {}
        try { if (tableExists("service_projects"))       db.prepare("DELETE FROM service_projects WHERE service_id = ?").run(req.params.id); } catch (e) {}

        res.json({ success: true, message: "Deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PUT /api/services/:id/included-items — replace all
// =========================================================
exports.saveIncludedItems = (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items)) return res.status(400).json({ success: false, message: "items must be an array" });

        const svc = db.prepare("SELECT id FROM services WHERE id = ? AND user_id = ?")
                      .get(req.params.id, req.user.id);
        if (!svc) return res.status(404).json({ success: false, message: "Service not found" });

        if (!tableExists("service_included_items")) {
            return res.json({ success: true, message: "Table missing — skipped" });
        }

        db.prepare("DELETE FROM service_included_items WHERE service_id = ?").run(req.params.id);

        const c = cols("service_included_items");
        const textCol = c.includes("item") ? "item" : c.includes("text") ? "text" : c.includes("name") ? "name" : null;
        if (!textCol) return res.json({ success: true, message: "No text column — skipped" });

        const hasOrder = c.includes("sort_order");
        const sql = hasOrder
            ? `INSERT INTO service_included_items (service_id, ${textCol}, sort_order) VALUES (?, ?, ?)`
            : `INSERT INTO service_included_items (service_id, ${textCol}) VALUES (?, ?)`;
        const stmt = db.prepare(sql);

        items.forEach((it, i) => {
            if (hasOrder) stmt.run(req.params.id, String(it), i);
            else          stmt.run(req.params.id, String(it));
        });

        res.json({ success: true, message: "Items saved" });
    } catch (err) {
        console.error("Save included items error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PUT /api/services/:id/faqs — replace all
// =========================================================
exports.saveFaqs = (req, res) => {
    try {
        const { faqs } = req.body;
        if (!Array.isArray(faqs)) return res.status(400).json({ success: false, message: "faqs must be an array" });

        const svc = db.prepare("SELECT id FROM services WHERE id = ? AND user_id = ?")
                      .get(req.params.id, req.user.id);
        if (!svc) return res.status(404).json({ success: false, message: "Service not found" });

        if (!tableExists("service_faqs")) {
            return res.json({ success: true, message: "Table missing — skipped" });
        }

        db.prepare("DELETE FROM service_faqs WHERE service_id = ?").run(req.params.id);

        const c = cols("service_faqs");
        const hasOrder = c.includes("sort_order");
        const sql = hasOrder
            ? "INSERT INTO service_faqs (service_id, question, answer, sort_order) VALUES (?, ?, ?, ?)"
            : "INSERT INTO service_faqs (service_id, question, answer) VALUES (?, ?, ?)";
        const stmt = db.prepare(sql);

        faqs.forEach((f, i) => {
            if (hasOrder) stmt.run(req.params.id, f.question, f.answer, i);
            else          stmt.run(req.params.id, f.question, f.answer);
        });

        res.json({ success: true, message: "FAQs saved" });
    } catch (err) {
        console.error("Save FAQs error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PUT /api/services/:id/projects — replace all
// =========================================================
exports.saveProjects = (req, res) => {
    try {
        const { projectIds } = req.body;
        if (!Array.isArray(projectIds)) return res.status(400).json({ success: false, message: "projectIds must be an array" });

        const svc = db.prepare("SELECT id FROM services WHERE id = ? AND user_id = ?")
                      .get(req.params.id, req.user.id);
        if (!svc) return res.status(404).json({ success: false, message: "Service not found" });

        if (!tableExists("service_projects")) {
            return res.json({ success: true, message: "Table missing — skipped" });
        }

        db.prepare("DELETE FROM service_projects WHERE service_id = ?").run(req.params.id);
        const stmt = db.prepare("INSERT INTO service_projects (service_id, project_id) VALUES (?, ?)");
        projectIds.forEach(pid => stmt.run(req.params.id, pid));

        res.json({ success: true, message: "Projects saved" });
    } catch (err) {
        console.error("Save projects error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};