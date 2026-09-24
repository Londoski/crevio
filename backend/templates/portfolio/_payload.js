// =========================================================
// CREVIO — PORTFOLIO PAYLOAD BUILDER
// File: backend/templates/portfolio/_payload.js
// =========================================================
// Converts real DB rows into the shape templates expect.
// No hardcoded content. Empty sections yield empty arrays
// and has* flags for the template to handle.
// =========================================================
const db = require("../../../database/db");
const entitlementService = require("../../services/entitlementService");

// ---------- Helpers ----------
function cols(table) {
    try { return db.prepare("PRAGMA table_info(" + table + ")").all().map(function (c) { return c.name; }); }
    catch (e) { return []; }
}
function hasCol(table, col) { return cols(table).indexOf(col) !== -1; }
function safeAll(sql, ...params) {
    try { return db.prepare(sql).all(...params); } catch (e) { return []; }
}
function safeGet(sql, ...params) {
    try { return db.prepare(sql).get(...params); } catch (e) { return null; }
}
function isNonEmpty(v) { return v !== null && v !== undefined && String(v).trim() !== ""; }

// ---------- Profile ----------
function buildProfile(user) {
    if (!user) return null;
    const headline = user.primary_profession || user.specialties || null;
    const image = user.profile_image || null;
    return {
        name: user.display_name || user.username || "Unnamed",
        username: user.username || null,
        headline: headline,
        bio: user.bio || null,
        image: image,
        location: user.location || null,
        email: user.email || null
    };
}

// ---------- Projects ----------
function buildProjects(userId) {
    // Respect plan cap (same logic as public portfolio route)
    const cap = entitlementService.limitFor(userId, "projects");
    const capNum = entitlementService.isUnlimited(cap) ? 9999 : cap;

    const rows = safeAll(
        "SELECT id, name, description, category, thumbnail_url, created_at " +
        "FROM projects WHERE user_id = ? AND published = 1 " +
        "ORDER BY created_at DESC LIMIT ?",
        userId, capNum
    );

    return rows.map(function (p) {
        return {
            id: p.id,
            title: p.name || "Untitled",
            description: p.description || null,
            category: p.category || null,
            thumbnail: p.thumbnail_url || null,
            url: "/dashboard/pages/project-edit.html?id=" + p.id, // placeholder, replaced in Phase 1C
            date: p.created_at || null
        };
    });
}

// ---------- Services ----------
function buildServices(userId) {
    const cap = entitlementService.limitFor(userId, "services");
    const capNum = entitlementService.isUnlimited(cap) ? 9999 : cap;

    // Some installs use `status = 'published'`, some use `is_active = 1`.
    // Detect and adapt.
    const serviceCols = cols("services");
    const hasStatus = serviceCols.indexOf("status") !== -1;
    const hasIsActive = serviceCols.indexOf("is_active") !== -1;

    let where = "user_id = ?";
    if (hasStatus) where += " AND status = 'published'";
    else if (hasIsActive) where += " AND is_active = 1";

    const hasName = serviceCols.indexOf("name") !== -1;
    const nameField = hasName ? "name" : (serviceCols.indexOf("title") !== -1 ? "title" : "name");

    const rows = safeAll(
        "SELECT id, " + nameField + " AS svc_name, description FROM services " +
        "WHERE " + where + " LIMIT ?",
        userId, capNum
    );

    return rows.map(function (s) {
        return {
            id: s.id,
            name: s.svc_name || "Untitled service",
            description: s.description || null,
            url: "/dashboard/pages/service-edit.html?id=" + s.id // placeholder
        };
    });
}

// ---------- Skills ----------
function buildSkills(userId) {
    // Try creator_skills first (join table), then skills.
    const csCols = cols("creator_skills");
    const sCols = cols("skills");

    // 1. creator_skills (per-user join table)
    if (csCols.length && csCols.indexOf("user_id") !== -1) {
        // Might have a `name` column directly, or a `skill_id` FK
        if (csCols.indexOf("name") !== -1) {
            return safeAll(
                "SELECT name FROM creator_skills WHERE user_id = ? ORDER BY name",
                userId
            ).map(function (r) { return { name: r.name }; });
        }
        if (csCols.indexOf("skill_id") !== -1 && sCols.length) {
            return safeAll(
                "SELECT s.name FROM creator_skills cs " +
                "JOIN skills s ON s.id = cs.skill_id " +
                "WHERE cs.user_id = ? ORDER BY s.name",
                userId
            ).map(function (r) { return { name: r.name }; });
        }
    }

    // 2. skills table with user_id
    if (sCols.length && sCols.indexOf("user_id") !== -1) {
        const nameField = sCols.indexOf("name") !== -1 ? "name" : "title";
        return safeAll(
            "SELECT " + nameField + " AS name FROM skills WHERE user_id = ? ORDER BY " + nameField,
            userId
        ).map(function (r) { return { name: r.name }; });
    }

    return [];
}

// ---------- Social ----------
function buildSocial(userId) {
    const sCols = cols("social_links");
    if (!sCols.length) return [];

    const hasVisible = sCols.indexOf("is_visible") !== -1;
    const hasOrder   = sCols.indexOf("display_order") !== -1;

    let where = "user_id = ?";
    if (hasVisible) where += " AND is_visible = 1";
    let order = "";
    if (hasOrder) order = " ORDER BY display_order";
    else if (sCols.indexOf("created_at") !== -1) order = " ORDER BY created_at";

    const platformField = sCols.indexOf("platform") !== -1 ? "platform"
        : (sCols.indexOf("network") !== -1 ? "network" : "platform");

    const rows = safeAll(
        "SELECT " + platformField + " AS platform, url FROM social_links " +
        "WHERE " + where + order,
        userId
    );

    return rows.map(function (s) {
        return {
            platform: s.platform || "Link",
            url: s.url || null
        };
    }).filter(function (s) { return s.url; });
}

// ---------- Theme ----------
// Parse the portfolio_config.theme_settings JSON + merge defaults.
function buildTheme(config, templateMeta) {
    const defaults = (templateMeta && templateMeta.default_theme_settings) || {};
    let settings = {};
    if (config && config.theme_settings) {
        try {
            settings = typeof config.theme_settings === "string"
                ? JSON.parse(config.theme_settings)
                : config.theme_settings;
        } catch (e) { settings = {}; }
    }

    return {
        mode: settings.mode || defaults.mode || "light",
        accent: settings.primary_color || settings.accent || defaults.accent || "#2563EB",
        font: settings.font_family || settings.font || defaults.font || "Inter",
        background: settings.background_color || null
    };
}

// ---------- Meta / SEO ----------
function buildMeta(config, profile, templateMeta) {
    let settings = {};
    if (config && config.theme_settings) {
        try {
            settings = typeof config.theme_settings === "string"
                ? JSON.parse(config.theme_settings)
                : config.theme_settings;
        } catch (e) { settings = {}; }
    }
    const title = settings.title || (profile.name + (profile.headline ? " — " + profile.headline : ""));
    const description = settings.meta_description || settings.tagline || profile.bio || "";
    return { title: title, description: description };
}

// ---------- Main entry ----------
function build(userId, opts) {
    opts = opts || {};
    const templateMeta = opts.templateMeta || null;

    const user = safeGet(
        "SELECT id, username, display_name, email, bio, profile_image, location, " +
        "primary_profession, specialties FROM users WHERE id = ?",
        userId
    );
    if (!user) return null;

    const config = safeGet(
        "SELECT * FROM portfolio_config WHERE user_id = ? LIMIT 1",
        userId
    );

    const profile   = buildProfile(user);
    const projects  = buildProjects(userId);
    const services  = buildServices(userId);
    const skills    = buildSkills(userId);
    const social    = buildSocial(userId);
    const theme     = buildTheme(config, templateMeta);
    const meta      = buildMeta(config, profile, templateMeta);

    return {
        profile: profile,
        hasProfile: !!(profile && (profile.name || profile.headline || profile.bio)),

        projects: projects,
        hasProjects: projects.length > 0,

        services: services,
        hasServices: services.length > 0,

        skills: skills,
        hasSkills: skills.length > 0,

        social: social,
        hasSocial: social.length > 0,

        theme: theme,
        meta: meta,

        config: config ? { published: !!config.published, last_published_at: config.last_published_at } : null
    };
}

module.exports = {
    build: build,
    // exported for testing
    _buildProjects: buildProjects,
    _buildServices: buildServices,
    _buildSkills: buildSkills,
    _buildSocial: buildSocial
};