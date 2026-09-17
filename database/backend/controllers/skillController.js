// =========================================================
// CREVIO — SKILL CONTROLLER
// File: backend/controllers/skillController.js
// Uses: skills (id, category_id, name, is_global, created_by, created_at)
//       creator_skills (id, user_id, skill_id, created_at)
//       skill_categories (id, name, ...)
// =========================================================

const db = require("../../database/db");

function tableExists(name) {
    try {
        return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
    } catch (e) { return false; }
}

function cols(table) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name); }
    catch (e) { return []; }
}

// =========================================================
// GET /api/skills — list user's skills
// =========================================================
exports.getSkills = (req, res) => {
    try {
        // Try the full join first
        let skills = [];
        try {
            skills = db.prepare(`
                SELECT
                    cs.id         AS id,
                    s.name        AS name,
                    sc.name       AS category,
                    cs.created_at AS created_at
                FROM creator_skills cs
                LEFT JOIN skills           s  ON s.id  = cs.skill_id
                LEFT JOIN skill_categories sc ON sc.id = s.category_id
                WHERE cs.user_id = ?
                ORDER BY cs.id DESC
            `).all(req.user.id);
        } catch (e) {
            // Fallback without category join
            skills = db.prepare(`
                SELECT cs.id AS id, s.name AS name, 'other' AS category, cs.created_at
                FROM creator_skills cs
                LEFT JOIN skills s ON s.id = cs.skill_id
                WHERE cs.user_id = ?
                ORDER BY cs.id DESC
            `).all(req.user.id);
        }

        res.json({ success: true, skills });
    } catch (err) {
        console.error("Get skills error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/skills — add a skill (find or create then link)
// =========================================================
exports.createSkill = (req, res) => {
    try {
        const { name, category } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Skill name is required" });
        }

        const skillName = name.trim();

        // ---- 1. Find or create the skill row ----
        let skill = db.prepare("SELECT * FROM skills WHERE LOWER(name) = LOWER(?)").get(skillName);

        if (!skill) {
            // Find or create the category
            let categoryId = null;

            if (tableExists("skill_categories")) {
                const catName = (category || "other").trim();
                let cat = db.prepare("SELECT * FROM skill_categories WHERE LOWER(name) = LOWER(?)").get(catName);

                if (!cat) {
                    try {
                        const catCols = cols("skill_categories");
                        if (catCols.includes("name")) {
                            const r = db.prepare("INSERT INTO skill_categories (name) VALUES (?)").run(catName);
                            categoryId = r.lastInsertRowid;
                        } else {
                            const r = db.prepare("INSERT INTO skill_categories DEFAULT VALUES").run();
                            categoryId = r.lastInsertRowid;
                        }
                    } catch (e) {
                        console.warn("Could not create category:", e.message);
                    }
                } else {
                    categoryId = cat.id;
                }
            }

            // Create the skill
            const skillCols = cols("skills");
            const fields = ["name"];
            const placeholders = ["?"];
            const values = [skillName];

            if (categoryId !== null && skillCols.includes("category_id")) {
                fields.push("category_id");
                placeholders.push("?");
                values.push(categoryId);
            }
            if (skillCols.includes("is_global")) {
                fields.push("is_global");
                placeholders.push("?");
                values.push(0);
            }
            if (skillCols.includes("created_by")) {
                fields.push("created_by");
                placeholders.push("?");
                values.push(req.user.id);
            }
            if (skillCols.includes("created_at")) {
                fields.push("created_at");
                placeholders.push("CURRENT_TIMESTAMP");
            }

            const sql = `INSERT INTO skills (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`;
            const r = db.prepare(sql).run(...values);
            skill = { id: r.lastInsertRowid, name: skillName };
        }

        // ---- 2. Check if user already has it ----
        const existing = db.prepare(
            "SELECT * FROM creator_skills WHERE user_id = ? AND skill_id = ?"
        ).get(req.user.id, skill.id);

        if (existing) {
            return res.json({
                success: true,
                message: "Skill already added",
                id: existing.id
            });
        }

        // ---- 3. Link it ----
        const result = db.prepare(`
            INSERT INTO creator_skills (user_id, skill_id, created_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `).run(req.user.id, skill.id);

        res.json({
            success: true,
            message: "Skill added",
            id: result.lastInsertRowid
        });
    } catch (err) {
        console.error("Create skill error:", err);
        res.status(500).json({ success: false, message: "Failed to add skill", error: err.message });
    }
};

// =========================================================
// PATCH /api/skills/:id — update skill name
// =========================================================
exports.updateSkill = (req, res) => {
    try {
        const { name } = req.body;

        const existing = db.prepare(
            "SELECT * FROM creator_skills WHERE id = ? AND user_id = ?"
        ).get(req.params.id, req.user.id);
        if (!existing) return res.status(404).json({ success: false, message: "Not found" });

        if (name && name.trim()) {
            db.prepare("UPDATE skills SET name = ? WHERE id = ?")
              .run(name.trim(), existing.skill_id);
        }

        res.json({ success: true, message: "Updated" });
    } catch (err) {
        console.error("Update skill error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// DELETE /api/skills/:id — unlink from user
// =========================================================
exports.deleteSkill = (req, res) => {
    try {
        const result = db.prepare(
            "DELETE FROM creator_skills WHERE id = ? AND user_id = ?"
        ).run(req.params.id, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: "Not found" });
        }
        res.json({ success: true, message: "Skill removed" });
    } catch (err) {
        console.error("Delete skill error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};