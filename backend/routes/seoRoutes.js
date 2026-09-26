// =========================================================
// CREVIO — SEO ROUTES
// File: backend/routes/seoRoutes.js
// =========================================================
// GET /sitemap.xml  — dynamically built from published portfolios
// GET /robots.txt   — crawler directives
//
// Mounted BEFORE express.static so our dynamic files win over
// any accidental public/robots.txt or public/sitemap.xml.
// =========================================================
const express = require("express");
const router = express.Router();
const db = require("../../database/db");

function escapeXml(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function baseUrlFromReq(req) {
    const envUrl = process.env.SITE_URL;
    if (envUrl) return String(envUrl).replace(/\/$/, "");
    return req.protocol + "://" + req.get("host");
}

function fmtDate(v) {
    if (!v) return null;
    const s = String(v).replace(" ", "T");
    return s.slice(0, 10);
}

// ---------------------------------------------------------
// GET /sitemap.xml
// ---------------------------------------------------------
router.get("/sitemap.xml", function (req, res) {
    try {
        const base = baseUrlFromReq(req);

        const rows = db.prepare(
            "SELECT u.username, pc.last_published_at, " +
            "  (SELECT COUNT(*) FROM testimonials t " +
            "   WHERE t.user_id = u.id AND t.is_visible = 1) AS testimonial_count " +
            "FROM users u " +
            "INNER JOIN portfolio_config pc ON pc.user_id = u.id " +
            "WHERE pc.published = 1 " +
            "  AND u.username IS NOT NULL " +
            "  AND u.username != '' " +
            "  AND (u.suspended IS NULL OR u.suspended = 0) " +
            "ORDER BY CASE WHEN pc.last_published_at IS NULL THEN 1 ELSE 0 END, " +
            "         pc.last_published_at DESC"
        ).all();

        const parts = [];
        parts.push("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        parts.push("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");

        rows.forEach(function (r) {
            const slug = encodeURIComponent(String(r.username).toLowerCase());
            const lastmod = fmtDate(r.last_published_at);

            // Main portfolio page
            parts.push("  <url>");
            parts.push("    <loc>" + escapeXml(base + "/p/" + slug) + "</loc>");
            if (lastmod) parts.push("    <lastmod>" + lastmod + "</lastmod>");
            parts.push("    <changefreq>weekly</changefreq>");
            parts.push("    <priority>1.0</priority>");
            parts.push("  </url>");

            // Dedicated testimonials page (only if the user has visible testimonials)
            if (r.testimonial_count > 0) {
                parts.push("  <url>");
                parts.push("    <loc>" + escapeXml(base + "/p/" + slug + "/testimonials") + "</loc>");
                if (lastmod) parts.push("    <lastmod>" + lastmod + "</lastmod>");
                parts.push("    <changefreq>monthly</changefreq>");
                parts.push("    <priority>0.7</priority>");
                parts.push("  </url>");
            }
        });

        parts.push("</urlset>");

        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.send(parts.join("\n") + "\n");
    } catch (err) {
        console.error("sitemap error:", err);
        res.status(500).type("text/plain").send("Sitemap generation failed");
    }
});

// ---------------------------------------------------------
// GET /robots.txt
// ---------------------------------------------------------
router.get("/robots.txt", function (req, res) {
    try {
        const base = baseUrlFromReq(req);
        const lines = [
            "User-agent: *",
            "Allow: /p/",
            "Allow: /uploads/",
            "Allow: /sitemap.xml",
            "Disallow: /dashboard/",
            "Disallow: /api/",
            "Disallow: /admin/",
            "",
            "Sitemap: " + base + "/sitemap.xml"
        ];
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.send(lines.join("\n") + "\n");
    } catch (err) {
        console.error("robots error:", err);
        res.status(500).type("text/plain").send("robots.txt generation failed");
    }
});

module.exports = router;