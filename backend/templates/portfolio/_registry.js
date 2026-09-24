// =========================================================
// CREVIO — PORTFOLIO TEMPLATE REGISTRY
// File: backend/templates/portfolio/_registry.js
// =========================================================
// Scans the portfolio templates folder and syncs each
// folder's meta.json into the `templates` DB table.
// Runs on server boot. Idempotent — safe to call repeatedly.
// =========================================================
const fs = require("fs");
const path = require("path");
const db = require("../../../database/db");

const TEMPLATES_ROOT = __dirname;

// ---------- Scan the folder ----------
function scanFolders() {
    if (!fs.existsSync(TEMPLATES_ROOT)) return [];
    const out = [];
    fs.readdirSync(TEMPLATES_ROOT).forEach(function (name) {
        if (name.startsWith("_")) return;      // skip _engine.js, _registry.js
        if (name.startsWith(".")) return;      // skip .DS_Store etc.
        const dir = path.join(TEMPLATES_ROOT, name);
        if (!fs.statSync(dir).isDirectory()) return;

        const metaPath = path.join(dir, "meta.json");
        if (!fs.existsSync(metaPath)) return;
        try {
            const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
            meta.slug = meta.slug || name;
            out.push(meta);
        } catch (e) {
            console.warn("[templateRegistry] invalid meta.json in " + name + ": " + e.message);
        }
    });
    return out;
}

// ---------- Sync one template to DB ----------
function upsertTemplate(meta) {
    const slug = meta.slug;
    const name = meta.name || slug;
    const description = meta.description || "";
    const category = meta.category || "general";
    const previewImage = meta.preview_image || "";
    const isActive = meta.is_active === false ? 0 : 1;
    const defaults = JSON.stringify(meta.default_theme_settings || {});

    const existing = db.prepare("SELECT id FROM templates WHERE slug = ? LIMIT 1").get(slug);
    if (existing) {
        db.prepare(
            "UPDATE templates SET name = ?, description = ?, category = ?, " +
            "preview_image = ?, is_active = ?, default_theme_settings = ?, " +
            "updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(name, description, category, previewImage, isActive, defaults, existing.id);
        return { action: "updated", id: existing.id, slug: slug };
    }
    const r = db.prepare(
        "INSERT INTO templates (name, slug, description, category, preview_image, is_active, default_theme_settings) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(name, slug, description, category, previewImage, isActive, defaults);
    return { action: "inserted", id: r.lastInsertRowid, slug: slug };
}

// ---------- Sync all ----------
function syncAll() {
    const folders = scanFolders();
    const results = [];
    folders.forEach(function (meta) {
        try { results.push(upsertTemplate(meta)); }
        catch (e) { console.error("[templateRegistry] sync failed for " + meta.slug + ": " + e.message); }
    });
    return results;
}

module.exports = {
    scanFolders: scanFolders,
    syncAll: syncAll,
    upsertTemplate: upsertTemplate
};