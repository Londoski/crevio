// =========================================================
// CREVIO — SKILL MODEL (Complete)
// =========================================================

const db = require("../../database/db");

const skillModel = {

    // ---- CREATE CUSTOM SKILL ----
    createCustomSkill(userId, name, categoryId = null) {
        if (!categoryId) {
            const other = db.prepare(`SELECT id FROM skill_categories WHERE slug = 'other'`).get();
            if (other) categoryId = other.id;
        }
        const stmt = db.prepare(`
            INSERT INTO skills (category_id, name, is_global, created_by)
            VALUES (?, ?, 0, ?)
        `);
        const result = stmt.run(categoryId, name, userId);
        const skillId = result.lastInsertRowid;
        db.prepare(`INSERT INTO creator_skills (user_id, skill_id) VALUES (?, ?)`).run(userId, skillId);
        return this.findSkillById(skillId);
    },

    // ---- FIND SKILL BY ID ----
    findSkillById(id) {
        return db.prepare(`SELECT * FROM skills WHERE id = ?`).get(id);
    },

    // ---- GET SELECTED SKILLS FOR USER ----
    getSelectedSkills(userId) {
        return db.prepare(`
            SELECT s.id, s.name, c.name as category_name, cs.created_at
            FROM creator_skills cs
            JOIN skills s ON cs.skill_id = s.id
            JOIN skill_categories c ON s.category_id = c.id
            WHERE cs.user_id = ?
            ORDER BY c.display_order, s.name
        `).all(userId);
    },

    // ---- COUNT SELECTED SKILLS ----
    countByUser(userId) {
        const result = db.prepare(`SELECT COUNT(*) as count FROM creator_skills WHERE user_id = ?`).get(userId);
        return result ? result.count : 0;
    },

    // ---- SAVE SELECTED SKILLS (replace all) ----
    saveSelectedSkills(userId, skillIds) {
        db.prepare(`DELETE FROM creator_skills WHERE user_id = ?`).run(userId);
        const insert = db.prepare(`INSERT INTO creator_skills (user_id, skill_id) VALUES (?, ?)`);
        const insertMany = db.transaction((ids) => {
            ids.forEach(id => insert.run(userId, id));
        });
        if (skillIds && skillIds.length) {
            insertMany(skillIds);
        }
        return this.getSelectedSkills(userId);
    },

    // ---- REMOVE SELECTED SKILL ----
    removeSelectedSkill(userId, skillId) {
        db.prepare(`DELETE FROM creator_skills WHERE user_id = ? AND skill_id = ?`).run(userId, skillId);
    },

    // ---- GET ALL GLOBAL SKILLS ----
    getAllGlobalSkills() {
        return db.prepare(`
            SELECT s.id, s.name, c.name as category_name
            FROM skills s
            JOIN skill_categories c ON s.category_id = c.id
            WHERE s.is_global = 1
            ORDER BY c.display_order, s.name
        `).all();
    },

    // ---- GET SKILLS BY CATEGORY ----
    getSkillsByCategory(categoryId) {
        return db.prepare(`SELECT id, name FROM skills WHERE category_id = ? AND is_global = 1 ORDER BY name`).all(categoryId);
    },

    // ---- GET ALL CATEGORIES (simple list) ----
    getAllCategories() {
        return db.prepare(`SELECT id, name, slug, icon FROM skill_categories ORDER BY display_order`).all();
    },

    // ---- GET CATEGORIES WITH USER COUNTS (for "Explore Skill Categories") ----
    getCategoriesWithUserCounts(userId) {
        return db.prepare(`
            SELECT c.id, c.name, c.slug, c.icon, c.display_order,
                   COUNT(DISTINCT cs.skill_id) as user_count,
                   (SELECT COUNT(*) FROM skills WHERE category_id = c.id AND is_global = 1) as total_skills
            FROM skill_categories c
            LEFT JOIN skills s ON s.category_id = c.id AND s.is_global = 1
            LEFT JOIN creator_skills cs ON cs.skill_id = s.id AND cs.user_id = ?
            GROUP BY c.id
            ORDER BY c.display_order
        `).all(userId);
    },

    // ---- SEARCH SKILLS ----
    searchSkills(query) {
        const q = '%' + query + '%';
        return db.prepare(`
            SELECT s.id, s.name, c.name as category_name
            FROM skills s
            JOIN skill_categories c ON s.category_id = c.id
            WHERE s.is_global = 1 AND s.name LIKE ?
            ORDER BY s.name
        `).all(q);
    },

    // ---- GET RECOMMENDED SKILLS ----
    getRecommendedSkills(userId) {
        // Get user's profession; fallback to popular skills
        const user = db.prepare(`SELECT primary_profession FROM users WHERE id = ?`).get(userId);
        if (!user || !user.primary_profession) {
            // fallback: top 20 popular skills
            return db.prepare(`
                SELECT s.id, s.name, COUNT(cs.user_id) as usage_count
                FROM skills s
                LEFT JOIN creator_skills cs ON cs.skill_id = s.id
                WHERE s.is_global = 1
                GROUP BY s.id
                ORDER BY usage_count DESC, s.name
                LIMIT 20
            `).all();
        }
        // Return skills not yet selected, ordered by popularity
        return db.prepare(`
            SELECT s.id, s.name, COUNT(cs2.user_id) as usage_count
            FROM skills s
            LEFT JOIN creator_skills cs ON cs.skill_id = s.id AND cs.user_id = ?
            LEFT JOIN creator_skills cs2 ON cs2.skill_id = s.id
            WHERE s.is_global = 1 AND cs.skill_id IS NULL
            GROUP BY s.id
            ORDER BY usage_count DESC, s.name
            LIMIT 20
        `).all(userId);
    }
};

module.exports = skillModel;