// =========================================================
// CREVIO — PORTFOLIO TEMPLATE ENGINE
// File: backend/templates/portfolio/_engine.js
// =========================================================
// Renders a portfolio template. Supports:
//   {{ var.path }}         escaped output
//   {{{ raw.path }}}       unescaped output
//   {{#path}}...{{/path}}  loop (array) OR conditional (truthy)
//
// Uses a proper tokenizer (not regex) so nested blocks work
// reliably. No external dependencies. No code execution.
// =========================================================
const fs = require("fs");
const path = require("path");

const TEMPLATES_ROOT = __dirname;
const _cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

// ---------- HTML escaping ----------
function escapeHtml(v) {
    if (v === null || v === undefined) return "";
    return String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ---------- Dot-path resolver ----------
function resolvePath(obj, pathStr) {
    if (!obj || !pathStr) return undefined;
    const parts = String(pathStr).split(".");
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
        if (cur === null || cur === undefined) return undefined;
        cur = cur[parts[i]];
    }
    return cur;
}

// ---------- Tokenizer ----------
// Produces a nested tree of nodes: text, var, block
function parse(template) {
    const tokens = [];
    const stack = [{ type: "root", children: tokens }];
    let i = 0;
    const src = String(template || "");

    while (i < src.length) {
        const openIdx = src.indexOf("{{", i);

        if (openIdx === -1) {
            if (i < src.length) {
                stack[stack.length - 1].children.push({ type: "text", value: src.slice(i) });
            }
            break;
        }

        // Text before the tag
        if (openIdx > i) {
            stack[stack.length - 1].children.push({ type: "text", value: src.slice(i, openIdx) });
        }

        // ---- Raw var: {{{ path }}} ----
        if (src.startsWith("{{{", openIdx)) {
            const closeIdx = src.indexOf("}}}", openIdx + 3);
            if (closeIdx === -1) { i = openIdx + 3; continue; }
            const p = src.slice(openIdx + 3, closeIdx).trim();
            stack[stack.length - 1].children.push({ type: "var", path: p, raw: true });
            i = closeIdx + 3;
            continue;
        }

        // ---- Block start: {{#key}} ----
        if (src.startsWith("{{#", openIdx)) {
            const closeIdx = src.indexOf("}}", openIdx + 3);
            if (closeIdx === -1) { i = openIdx + 3; continue; }
            const key = src.slice(openIdx + 3, closeIdx).trim();
            const block = { type: "block", key: key, children: [] };
            stack[stack.length - 1].children.push(block);
            stack.push(block);
            i = closeIdx + 2;
            continue;
        }

        // ---- Block end: {{/key}} ----
        if (src.startsWith("{{/", openIdx)) {
            const closeIdx = src.indexOf("}}", openIdx + 3);
            if (closeIdx === -1) { i = openIdx + 3; continue; }
            const key = src.slice(openIdx + 3, closeIdx).trim();
            if (stack.length > 1 && stack[stack.length - 1].key === key) {
                stack.pop();
            }
            i = closeIdx + 2;
            continue;
        }

        // ---- Escaped var: {{ path }} ----
        const closeIdx = src.indexOf("}}", openIdx + 2);
        if (closeIdx === -1) { i = openIdx + 2; continue; }
        const p = src.slice(openIdx + 2, closeIdx).trim();
        stack[stack.length - 1].children.push({ type: "var", path: p, raw: false });
        i = closeIdx + 2;
    }

    return tokens;
}

// ---------- Renderer (walks the tree) ----------
function renderNodes(nodes, data) {
    let out = "";
    for (let n = 0; n < nodes.length; n++) {
        const node = nodes[n];

        if (node.type === "text") {
            out += node.value;
        } else if (node.type === "var") {
            const v = resolvePath(data, node.path);
            if (v === undefined || v === null) continue;
            out += node.raw ? String(v) : escapeHtml(v);
        } else if (node.type === "block") {
            const val = resolvePath(data, node.key);
            if (Array.isArray(val)) {
                for (let k = 0; k < val.length; k++) {
                    const item = val[k];
                    const scoped = Object.assign({}, data, item);
                    out += renderNodes(node.children, scoped);
                }
            } else if (val) {
                out += renderNodes(node.children, data);
            }
            // Falsy → skip
        }
    }
    return out;
}

// ---------- Loader (caches parsed tree) ----------
function loadTemplate(slug) {
    slug = String(slug || "minimal").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const cached = _cache.get(slug);
    if (cached && (Date.now() - cached.loadedAt) < CACHE_TTL_MS) return cached;

    const dir = path.join(TEMPLATES_ROOT, slug);
    if (!fs.existsSync(dir)) return null;

    let html = "", css = "", meta = {};
    try { html = fs.readFileSync(path.join(dir, "template.html"), "utf8"); } catch (e) { return null; }
    try { css  = fs.readFileSync(path.join(dir, "template.css"), "utf8"); } catch (e) { css = ""; }
    try { meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8")); } catch (e) { meta = { name: slug, slug: slug }; }

    const tree = parse(html);
    const entry = { slug: slug, html: html, css: css, meta: meta, tree: tree, dir: dir, loadedAt: Date.now() };
    _cache.set(slug, entry);
    return entry;
}

function invalidate(slug) {
    if (slug) _cache.delete(slug);
    else _cache.clear();
}

// ---------- Compute colors from theme.mode ----------
function computeThemeColors(theme) {
    theme = theme || {};
    const dark = theme.mode === "dark";
    if (dark) {
        return { bg: "#0F172A", fg: "#F1F5F9", muted: "#94A3B8", border: "#334155" };
    }
    return { bg: "#FFFFFF", fg: "#0F172A", muted: "#475569", border: "#E2E8F0" };
}

// ---------- Main render ----------
function render(templateSlug, data) {
    const tpl = loadTemplate(templateSlug);
    if (!tpl) return null;

    const scope = Object.assign({}, data || {});
    scope.meta = Object.assign({}, tpl.meta, scope.meta || {});
    scope.css = tpl.css;
    scope.slug = templateSlug;
    scope.theme = Object.assign({ mode: "light", accent: "#2563EB", font: "Inter" }, scope.theme || {});
    scope.themeColors = scope.themeColors || computeThemeColors(scope.theme);

    return renderNodes(tpl.tree, scope);
}

// ---------- Render string directly (for tests) ----------
function renderString(input, data) {
    return renderNodes(parse(input), data || {});
}

module.exports = {
    loadTemplate: loadTemplate,
    render: render,
    renderString: renderString,
    invalidate: invalidate,
    escapeHtml: escapeHtml,
    computeThemeColors: computeThemeColors,
    TEMPLATES_ROOT: TEMPLATES_ROOT
};