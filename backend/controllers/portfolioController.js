// =========================================================
// CREVIO — PORTFOLIO CONTROLLER
// File: backend/controllers/portfolioController.js
// Real schema: portfolio_config has id, user_id, template_id, theme_settings,
//   published, last_published_at, created_at, updated_at
// templates: id, name, slug, description, category, preview_image,
//   is_active, default_theme_settings, created_at, updated_at
// =========================================================

const db = require("../../database/db");
const notificationService = require("../services/notificationService");

function cols(table) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name); }
    catch (e) { return []; }
}

// Default theme stored as JSON inside theme_settings
function defaultTheme() {
    return {
        title: "",
        tagline: "",
        meta_description: "",
        template: "minimal",
        sections: {
            about: true, projects: true, services: true,
            skills: true, contact: true, social: true,
            _order: ["about", "projects", "services", "skills", "contact", "social"]
        },
        primary_color: "#2563EB",
        background_color: "#0F172A",
        font_family: "Inter"
    };
}

function parseTheme(raw) {
    const base = defaultTheme();
    if (!raw) return base;
    try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return {
            ...base,
            ...parsed,
            sections: { ...base.sections, ...(parsed.sections || {}) }
        };
    } catch (e) { return base; }
}

// =========================================================
// GET /api/portfolio/config
// =========================================================
exports.getConfig = (req, res) => {
    try {
        let row = null;
        try {
            row = db.prepare("SELECT * FROM portfolio_config WHERE user_id = ? LIMIT 1").get(req.user.id);
        } catch (e) { console.warn("portfolio_config query:", e.message); }

        const user = db.prepare("SELECT username FROM users WHERE id = ?").get(req.user.id);
        const theme = row ? parseTheme(row.theme_settings) : defaultTheme();

        const config = {
            user_id: req.user.id,
            slug: (user?.username || "user").toLowerCase().replace(/[^a-z0-9-]/g, ""),
            title: theme.title,
            tagline: theme.tagline,
            meta_description: theme.meta_description,
            template: theme.template,
            sections: JSON.stringify(theme.sections),
            primary_color: theme.primary_color,
            background_color: theme.background_color,
            font_family: theme.font_family,
            template_id: row?.template_id || null,
            status: row?.published ? "published" : "draft",
            last_published_at: row?.last_published_at || null
        };

        res.json({ success: true, config });
    } catch (err) {
        console.error("Get portfolio config error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PUT /api/portfolio/config
// =========================================================
exports.saveConfig = (req, res) => {
    try {
        const b = req.body;
        const c = cols("portfolio_config");
        const has = (n) => c.includes(n);

        // Build theme JSON from payload
        let sectionsObj;
        try {
            sectionsObj = typeof b.sections === "string" ? JSON.parse(b.sections) : (b.sections || {});
        } catch (e) { sectionsObj = {}; }

        // Merge with existing theme so we don't lose fields
        const existing = db.prepare("SELECT * FROM portfolio_config WHERE user_id = ? LIMIT 1").get(req.user.id);
        const currentTheme = existing ? parseTheme(existing.theme_settings) : defaultTheme();

        const theme = {
            ...currentTheme,
            title:            b.title            ?? currentTheme.title,
            tagline:          b.tagline          ?? currentTheme.tagline,
            meta_description: b.meta_description ?? currentTheme.meta_description,
            template:         b.template         ?? currentTheme.template,
            sections:         { ...currentTheme.sections, ...sectionsObj },
            primary_color:    b.primary_color    ?? currentTheme.primary_color,
            background_color: b.background_color ?? currentTheme.background_color,
            font_family:      b.font_family      ?? currentTheme.font_family
        };

        const themeJson = JSON.stringify(theme);

        if (existing) {
            const setClauses = [];
            const values = [];

            if (has("theme_settings")) {
                setClauses.push("theme_settings = ?");
                values.push(themeJson);
            }
            if (has("template_id") && b.template_id !== undefined) {
                setClauses.push("template_id = ?");
                values.push(b.template_id);
            }
            if (has("updated_at")) {
                setClauses.push("updated_at = CURRENT_TIMESTAMP");
            }

            if (!setClauses.length) {
                return res.json({ success: true, message: "Nothing to update" });
            }

            values.push(req.user.id);
            db.prepare(`UPDATE portfolio_config SET ${setClauses.join(", ")} WHERE user_id = ?`).run(...values);
        } else {
            const fields = ["user_id"];
            const placeholders = ["?"];
            const values = [req.user.id];

            if (has("theme_settings")) {
                fields.push("theme_settings");
                placeholders.push("?");
                values.push(themeJson);
            }
            if (has("template_id") && b.template_id !== undefined) {
                fields.push("template_id");
                placeholders.push("?");
                values.push(b.template_id);
            }
            if (has("published")) {
                fields.push("published");
                placeholders.push("?");
                values.push(0);
            }
            if (has("created_at")) {
                fields.push("created_at");
                placeholders.push("CURRENT_TIMESTAMP");
            }

            db.prepare(`INSERT INTO portfolio_config (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`)
              .run(...values);
        }

        res.json({ success: true, message: "Config saved" });
    } catch (err) {
        console.error("Save portfolio config error:", err);
        res.status(500).json({ success: false, message: "Failed to save", error: err.message });
    }
};

// =========================================================
// POST /api/portfolio/publish
// =========================================================
exports.publish = (req, res) => {
    try {
        const { publish } = req.body;
        const c = cols("portfolio_config");
        const has = (n) => c.includes(n);

        if (!has("published")) {
            return res.status(400).json({ success: false, message: "portfolio_config has no published column" });
        }

        const existing = db.prepare("SELECT * FROM portfolio_config WHERE user_id = ?").get(req.user.id);

        if (!existing) {
            const fields = ["user_id", "published"];
            const placeholders = ["?", "?"];
            const values = [req.user.id, publish ? 1 : 0];

            if (has("created_at")) {
                fields.push("created_at");
                placeholders.push("CURRENT_TIMESTAMP");
            }

            db.prepare(`INSERT INTO portfolio_config (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`)
              .run(...values);
        } else {
            const setClauses = ["published = ?"];
            const values = [publish ? 1 : 0];

            if (publish && has("last_published_at")) {
                setClauses.push("last_published_at = CURRENT_TIMESTAMP");
            }
            if (has("updated_at")) {
                setClauses.push("updated_at = CURRENT_TIMESTAMP");
            }

            values.push(req.user.id);
            db.prepare(`UPDATE portfolio_config SET ${setClauses.join(", ")} WHERE user_id = ?`).run(...values);
        }

        if (publish) {
            try {
                notificationService.create({
                    userId: req.user.id,
                    type: "system",
                    title: "Portfolio published",
                    message: "Your portfolio is now publicly available.",
                    entityType: "portfolio",
                    entityId: req.user.id
                });
            } catch (e) { /* silent */ }
        }

        res.json({ success: true, published: publish });
    } catch (err) {
        console.error("Publish error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/portfolio/templates — list available templates
// =========================================================
exports.getTemplates = (req, res) => {
    try {
        let templates = [];
        try {
            templates = db.prepare(`
                SELECT id, name, slug, description, category, preview_image
                FROM templates
                WHERE is_active = 1
                ORDER BY id ASC
            `).all();
        } catch (e) { /* table may not exist */ }

        // Fallback built-in templates if DB is empty
        if (!templates.length) {
            templates = [
                { id: 1, name: "Minimal",      slug: "minimal",      description: "Clean & simple",     category: "minimal",      preview_image: null },
                { id: 2, name: "Bold",         slug: "bold",         description: "Strong typography",  category: "bold",         preview_image: null },
                { id: 3, name: "Gallery",      slug: "gallery",      description: "Image focused",      category: "gallery",      preview_image: null },
                { id: 4, name: "Professional", slug: "professional", description: "Business style",     category: "professional", preview_image: null }
            ];
        }

        res.json({ success: true, templates });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/portfolio/public/:slug — public portfolio
// =========================================================
exports.getPublicPortfolio = (req, res) => {
    try {
        const user = db.prepare(`
            SELECT id, username, display_name, bio, profile_image, location,
                   primary_profession, specialties
            FROM users WHERE LOWER(username) = LOWER(?)
        `).get(req.params.slug);

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const config = db.prepare("SELECT * FROM portfolio_config WHERE user_id = ? LIMIT 1").get(user.id);

        if (!config || !config.published) {
            return res.status(404).json({ success: false, message: "Portfolio not published" });
        }

        const theme = parseTheme(config.theme_settings);

        const safeAll = (sql, ...params) => {
            try { return db.prepare(sql).all(...params); }
            catch (e) { return []; }
        };

        const projects = safeAll("SELECT * FROM projects WHERE user_id = ? AND published = 1 ORDER BY created_at DESC LIMIT 20", user.id);
        const services = safeAll("SELECT * FROM services WHERE user_id = ? AND status = 'published' LIMIT 10", user.id);
        const socials  = safeAll("SELECT * FROM social_links WHERE user_id = ? AND is_visible = 1 ORDER BY display_order LIMIT 20", user.id);

        const normalizedConfig = {
            slug:             user.username,
            title:            theme.title || user.display_name || user.username,
            tagline:          theme.tagline,
            meta_description: theme.meta_description,
            template:         theme.template,
            sections:         JSON.stringify(theme.sections),
            primary_color:    theme.primary_color,
            background_color: theme.background_color,
            font_family:      theme.font_family,
            status:           "published"
        };

        const normalizedProjects = projects.map(p => ({
            id: p.id,
            title: p.name,
            description: p.description,
            category: p.category,
            thumbnail: p.thumbnail_url,
            status: p.published ? "published" : "draft",
            created_at: p.created_at
        }));

        res.json({
            success: true,
            config: normalizedConfig,
            user,
            projects: normalizedProjects,
            services,
            socials
        });
    } catch (err) {
        console.error("Public portfolio error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};