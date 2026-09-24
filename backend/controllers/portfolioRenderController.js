// =========================================================
// CREVIO — PORTFOLIO RENDER CONTROLLER (server-side)
// File: backend/controllers/portfolioRenderController.js
// =========================================================
// Replaces the client-rendered portfolio.html when the user
// has picked a template. Falls through (calls next()) if:
//   - user not found
//   - portfolio not published
//   - no template chosen
//   - engine or payload throws
// Result: existing legacy portfolio.html is the safety net.
// =========================================================
const db = require("../../database/db");
const engine = require("../templates/portfolio/_engine");
const payloadBuilder = require("../templates/portfolio/_payload");

function safeGet(sql, ...params) {
    try { return db.prepare(sql).get(...params); } catch (e) { return null; }
}

function resolveTemplateSlug(config) {
    if (!config || !config.theme_settings) return null;
    let settings = config.theme_settings;
    if (typeof settings === "string") {
        try { settings = JSON.parse(settings); } catch (e) { return null; }
    }
    return (settings && settings.template) || null;
}

exports.renderPublicPortfolio = (req, res, next) => {
    try {
        const slug = req.params.slug;
        if (!slug) return next();

        const user = safeGet(
            "SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)",
            slug
        );
        if (!user) return next();

        const config = safeGet(
            "SELECT * FROM portfolio_config WHERE user_id = ? LIMIT 1",
            user.id
        );
        if (!config || !config.published) return next();

        const templateSlug = resolveTemplateSlug(config);
        if (!templateSlug) return next();

        const tpl = engine.loadTemplate(templateSlug);
        if (!tpl) {
            console.warn("[portfolioRender] template not found: " + templateSlug);
            return next();
        }

        const data = payloadBuilder.build(user.id, { templateMeta: tpl.meta });
        if (!data) return next();

        const html = engine.render(templateSlug, data);
        if (!html) return next();

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=60");
        return res.send(html);
    } catch (e) {
        console.error("[portfolioRender] failed:", e.message);
        return next();
    }
};