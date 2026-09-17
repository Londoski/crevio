// =========================================================
// CREVIO — SKILL CONTROLLER
// File: backend/controllers/skillController.js
// Full CRUD + relationships + stats + search/filter/sort
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
// Enrich a skill with counts + relationships
// =========================================================
function enrichSkill(s) {
    if (!s) return null;

    const serviceCount = tableExists("service_skills")
        ? safeGet("SELECT COUNT(*) AS c FROM service_skills WHERE skill_id = ?", s.id)?.c || 0
        : 0;

    const projectCount = tableExists("skill_projects")
        ? safeGet("SELECT COUNT(*) AS c FROM skill_projects WHERE skill_id = ?", s.id)?.c || 0
        : 0;

    return {
        ...s,
        service_count: serviceCount,
        project_count: projectCount,
        is_linked: (serviceCount + projectCount) > 0
    };
}

// =========================================================
// GET /api/skills/stats
// =========================================================
exports.getStats = (req, res) => {
    try {
        const userId = req.user.id;

        const total = safeGet("SELECT COUNT(*) AS c FROM creator_skills WHERE user_id = ?", userId)?.c || 0;

        let usedInServices = 0;
        let usedInProjects = 0;
        let unlinked = 0;

        if (total > 0 && tableExists("service_skills")) {
            usedInServices = safeGet(`
                SELECT COUNT(DISTINCT cs.skill_id) AS c
                FROM creator_skills cs
                JOIN service_skills ss ON ss.skill_id = cs.skill_id
                JOIN services svc ON svc.id = ss.service_id AND svc.user_id = ?
                WHERE cs.user_id = ?
            `, userId, userId)?.c || 0;
        }

        if (total > 0 && tableExists("skill_projects")) {
            usedInProjects = safeGet(`
                SELECT COUNT(DISTINCT cs.skill_id) AS c
                FROM creator_skills cs
                JOIN skill_projects sp ON sp.skill_id = cs.skill_id
                JOIN projects p ON p.id = sp.project_id AND p.user_id = ?
                WHERE cs.user_id = ?
            `, userId, userId)?.c || 0;
        }

        // Unlinked = skills not in either relationship
        const linkedIds = new Set();
        if (tableExists("service_skills")) {
            safeAll(`
                SELECT DISTINCT cs.skill_id AS id
                FROM creator_skills cs
                JOIN service_skills ss ON ss.skill_id = cs.skill_id
                JOIN services svc ON svc.id = ss.service_id AND svc.user_id = ?
                WHERE cs.user_id = ?
            `, userId, userId).forEach(r => linkedIds.add(r.id));
        }
        if (tableExists("skill_projects")) {
            safeAll(`
                SELECT DISTINCT cs.skill_id AS id
                FROM creator_skills cs
                JOIN skill_projects sp ON sp.skill_id = cs.skill_id
                JOIN projects p ON p.id = sp.project_id AND p.user_id = ?
                WHERE cs.user_id = ?
            `, userId, userId).forEach(r => linkedIds.add(r.id));
        }
        unlinked = total - linkedIds.size;

        res.json({
            success: true,
            stats: { total, usedInServices, usedInProjects, unlinked }
        });
    } catch (err) {
        console.error("Skill stats error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/skills — list with search/filter/sort
// =========================================================
exports.getSkills = (req, res) => {
    try {
        const userId = req.user.id;
        const search = (req.query.search || "").trim().toLowerCase();
        const filter = (req.query.filter || "all").toLowerCase();
        const sort   = (req.query.sort   || "name").toLowerCase();

        let sql = `
            SELECT
                cs.id           AS id,
                cs.skill_id     AS skill_id,
                cs.created_at   AS created_at,
                s.name          AS name,
                s.description   AS description,
                s.category_id   AS category_id,
                sc.name         AS category,
                sc.icon         AS category_icon
            FROM creator_skills cs
            JOIN skills s ON s.id = cs.skill_id
            LEFT JOIN skill_categories sc ON sc.id = s.category_id
            WHERE cs.user_id = ?
        `;
        const params = [userId];

        if (search) {
            sql += ` AND (
                LOWER(COALESCE(s.name, ''))        LIKE ? OR
                LOWER(COALESCE(s.description, '')) LIKE ? OR
                LOWER(COALESCE(sc.name, ''))       LIKE ?
            )`;
            const like = `%${search}%`;
            params.push(like, like, like);
        }

        switch (sort) {
            case "newest": sql += " ORDER BY cs.created_at DESC"; break;
            case "oldest": sql += " ORDER BY cs.created_at ASC";  break;
            case "za":     sql += " ORDER BY LOWER(s.name) DESC"; break;
            case "az":
            default:       sql += " ORDER BY LOWER(s.name) ASC";
        }

        let rows = safeAll(sql, ...params).map(enrichSkill);

        // Filter by relationship state
        if (filter === "services")  rows = rows.filter(r => r.service_count > 0);
        else if (filter === "projects") rows = rows.filter(r => r.project_count > 0);
        else if (filter === "unlinked") rows = rows.filter(r => r.service_count === 0 && r.project_count === 0);

        res.json({ success: true, skills: rows });
    } catch (err) {
        console.error("List skills error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/skills/:id — with relationships
// =========================================================
exports.getSkill = (req, res) => {
    try {
        const userId = req.user.id;
        const skill = safeGet(`
            SELECT
                cs.id AS id, cs.skill_id AS skill_id,
                s.name AS name, s.description AS description,
                s.category_id AS category_id, sc.name AS category
            FROM creator_skills cs
            JOIN skills s ON s.id = cs.skill_id
            LEFT JOIN skill_categories sc ON sc.id = s.category_id
            WHERE cs.id = ? AND cs.user_id = ?
        `, req.params.id, userId);
        if (!skill) return res.status(404).json({ success: false, message: "Not found" });

        skill.services = tableExists("service_skills")
            ? safeAll(`
                SELECT svc.id, svc.title
                FROM service_skills ss
                JOIN services svc ON svc.id = ss.service_id
                WHERE ss.skill_id = ? AND svc.user_id = ?
            `, skill.skill_id, userId)
            : [];

        skill.projects = tableExists("skill_projects")
            ? safeAll(`
                SELECT p.id, p.name AS title
                FROM skill_projects sp
                JOIN projects p ON p.id = sp.project_id
                WHERE sp.skill_id = ? AND p.user_id = ?
            `, skill.skill_id, userId)
            : [];

        res.json({ success: true, skill: enrichSkill(skill) });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/skills — create
// =========================================================
exports.createSkill = (req, res) => {
    try {
        const userId = req.user.id;
        const { name, category, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Skill name is required" });
        }
        const cleanName = name.trim().slice(0, 100);

        // Duplicate check (per user)
        const dup = safeGet(`
            SELECT cs.id FROM creator_skills cs
            JOIN skills s ON s.id = cs.skill_id
            WHERE cs.user_id = ? AND LOWER(s.name) = LOWER(?)
        `, userId, cleanName);
        if (dup) return res.status(400).json({ success: false, message: "You already have this skill" });

        // Find or create category
        let categoryId = null;
        if (category) {
            let cat = safeGet("SELECT id FROM skill_categories WHERE LOWER(name) = LOWER(?)", category);
            if (!cat) {
                const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
                const r = db.prepare("INSERT INTO skill_categories (name, slug) VALUES (?, ?)").run(category, slug);
                categoryId = r.lastInsertRowid;
            } else {
                categoryId = cat.id;
            }
        }

        // Find or create the global skill
        let skill = safeGet("SELECT id FROM skills WHERE LOWER(name) = LOWER(?)", cleanName);
        if (!skill) {
            const c = cols("skills");
            const has = (n) => c.includes(n);
            const fields = ["name"];
            const placeholders = ["?"];
            const values = [cleanName];
            if (has("category_id") && categoryId !== null) { fields.push("category_id"); placeholders.push("?"); values.push(categoryId); }
            if (has("description"))                        { fields.push("description"); placeholders.push("?"); values.push(description || null); }
            if (has("is_global"))                          { fields.push("is_global");   placeholders.push("?"); values.push(0); }
            if (has("created_by"))                         { fields.push("created_by");  placeholders.push("?"); values.push(userId); }
            if (has("created_at"))                         { fields.push("created_at");  placeholders.push("CURRENT_TIMESTAMP"); }

            const r = db.prepare(`INSERT INTO skills (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`).run(...values);
            skill = { id: r.lastInsertRowid };
        } else if (description) {
            // Update description if provided and column exists
            const c = cols("skills");
            if (c.includes("description")) {
                try { db.prepare("UPDATE skills SET description = ? WHERE id = ?").run(description, skill.id); } catch (e) {}
            }
        }

        // Link user
        const r = db.prepare(`
            INSERT INTO creator_skills (user_id, skill_id, created_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `).run(userId, skill.id);

        const newSkill = safeGet(`
            SELECT
                cs.id AS id, cs.skill_id AS skill_id,
                s.name AS name, s.description AS description,
                s.category_id AS category_id, sc.name AS category
            FROM creator_skills cs
            JOIN skills s ON s.id = cs.skill_id
            LEFT JOIN skill_categories sc ON sc.id = s.category_id
            WHERE cs.id = ?
        `, r.lastInsertRowid);

        res.json({ success: true, message: "Skill added", skill: enrichSkill(newSkill) });
    } catch (err) {
        console.error("Create skill error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PATCH /api/skills/:id — update
// =========================================================
exports.updateSkill = (req, res) => {
    try {
        const userId = req.user.id;
        const { name, category, description } = req.body;

        const existing = safeGet(`
            SELECT cs.id, cs.skill_id FROM creator_skills cs
            WHERE cs.id = ? AND cs.user_id = ?
        `, req.params.id, userId);
        if (!existing) return res.status(404).json({ success: false, message: "Not found" });

        const c = cols("skills");
        const has = (n) => c.includes(n);
        const updates = {};

        if (name && name.trim()) {
            updates.name = name.trim().slice(0, 100);
        }
        if (description !== undefined && has("description")) {
            updates.description = description;
        }
        if (category !== undefined && has("category_id")) {
            let categoryId = null;
            if (category) {
                let cat = safeGet("SELECT id FROM skill_categories WHERE LOWER(name) = LOWER(?)", category);
                if (!cat) {
                    const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
                    const r = db.prepare("INSERT INTO skill_categories (name, slug) VALUES (?, ?)").run(category, slug);
                    categoryId = r.lastInsertRowid;
                } else {
                    categoryId = cat.id;
                }
            }
            updates.category_id = categoryId;
        }

        if (Object.keys(updates).length) {
            const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
            const values = [...Object.values(updates), existing.skill_id];
            db.prepare(`UPDATE skills SET ${setClauses} WHERE id = ?`).run(...values);
        }

        const updated = safeGet(`
            SELECT
                cs.id AS id, cs.skill_id AS skill_id,
                s.name AS name, s.description AS description,
                s.category_id AS category_id, sc.name AS category
            FROM creator_skills cs
            JOIN skills s ON s.id = cs.skill_id
            LEFT JOIN skill_categories sc ON sc.id = s.category_id
            WHERE cs.id = ?
        `, req.params.id);

        res.json({ success: true, message: "Updated", skill: enrichSkill(updated) });
    } catch (err) {
        console.error("Update skill error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// DELETE /api/skills/:id — remove user link only
// =========================================================
exports.deleteSkill = (req, res) => {
    try {
        const userId = req.user.id;
        const cs = safeGet(
            "SELECT id, skill_id FROM creator_skills WHERE id = ? AND user_id = ?",
            req.params.id, userId
        );
        if (!cs) return res.status(404).json({ success: false, message: "Not found" });

        // Remove relationship rows for this skill + user
        if (tableExists("service_skills")) {
            try {
                db.prepare(`
                    DELETE FROM service_skills
                    WHERE skill_id = ?
                      AND service_id IN (SELECT id FROM services WHERE user_id = ?)
                `).run(cs.skill_id, userId);
            } catch (e) {}
        }
        if (tableExists("skill_projects")) {
            try {
                db.prepare(`
                    DELETE FROM skill_projects
                    WHERE skill_id = ?
                      AND project_id IN (SELECT id FROM projects WHERE user_id = ?)
                `).run(cs.skill_id, userId);
            } catch (e) {}
        }

        db.prepare("DELETE FROM creator_skills WHERE id = ?").run(req.params.id);

        res.json({ success: true, message: "Skill removed" });
    } catch (err) {
        console.error("Delete skill error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PUT /api/skills/:id/services — replace linked services
// =========================================================
exports.saveServices = (req, res) => {
    try {
        const userId = req.user.id;
        const { serviceIds } = req.body;
        if (!Array.isArray(serviceIds)) return res.status(400).json({ success: false, message: "serviceIds required" });

        const cs = safeGet(
            "SELECT skill_id FROM creator_skills WHERE id = ? AND user_id = ?",
            req.params.id, userId
        );
        if (!cs) return res.status(404).json({ success: false, message: "Not found" });

        if (!tableExists("service_skills")) return res.json({ success: true, message: "Table missing" });

        // Only delete relationships for THIS user's services
        db.prepare(`
            DELETE FROM service_skills
            WHERE skill_id = ?
              AND service_id IN (SELECT id FROM services WHERE user_id = ?)
        `).run(cs.skill_id, userId);

        const stmt = db.prepare("INSERT INTO service_skills (service_id, skill_id) VALUES (?, ?)");
        serviceIds.forEach(sid => {
            const owned = safeGet("SELECT id FROM services WHERE id = ? AND user_id = ?", sid, userId);
            if (owned) { try { stmt.run(sid, cs.skill_id); } catch (e) {} }
        });

        res.json({ success: true, message: "Saved" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PUT /api/skills/:id/projects — replace linked projects
// =========================================================
exports.saveProjects = (req, res) => {
    try {
        const userId = req.user.id;
        const { projectIds } = req.body;
        if (!Array.isArray(projectIds)) return res.status(400).json({ success: false, message: "projectIds required" });

        const cs = safeGet(
            "SELECT skill_id FROM creator_skills WHERE id = ? AND user_id = ?",
            req.params.id, userId
        );
        if (!cs) return res.status(404).json({ success: false, message: "Not found" });

        if (!tableExists("skill_projects")) return res.json({ success: true, message: "Table missing" });

        db.prepare(`
            DELETE FROM skill_projects
            WHERE skill_id = ?
              AND project_id IN (SELECT id FROM projects WHERE user_id = ?)
        `).run(cs.skill_id, userId);

        const stmt = db.prepare("INSERT INTO skill_projects (skill_id, project_id) VALUES (?, ?)");
        projectIds.forEach(pid => {
            const owned = safeGet("SELECT id FROM projects WHERE id = ? AND user_id = ?", pid, userId);
            if (owned) { try { stmt.run(cs.skill_id, pid); } catch (e) {} }
        });

        res.json({ success: true, message: "Saved" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};