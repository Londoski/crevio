// =========================================================
// CREVIO — SOCIAL LINKS CONTROLLER
// File: backend/controllers/socialLinksController.js
// Real schema: social_links
//   id, user_id, platform, handle, url, display_order, is_visible, created_at, updated_at
// =========================================================

const db = require("../../database/db");

// =========================================================
// Platform validation — allow broad set, not rigid
// =========================================================
const ALLOWED_PLATFORMS = [
    "instagram", "youtube", "linkedin", "tiktok", "facebook",
    "twitter", "x", "behance", "dribbble", "github",
    "website", "other"
];

function normalizePlatform(p) {
    if (!p) return null;
    const clean = String(p).trim().toLowerCase();
    if (clean === "twitter") return "x"; // normalize twitter → x
    return ALLOWED_PLATFORMS.includes(clean) ? clean : "other";
}

// =========================================================
// URL validation — safe protocols only
// =========================================================
function validateUrl(url) {
    if (!url || typeof url !== "string") return { ok: false, reason: "URL is required" };
    const trimmed = url.trim();
    if (trimmed.length === 0) return { ok: false, reason: "URL is required" };
    if (trimmed.length > 500) return { ok: false, reason: "URL is too long (max 500 chars)" };

    let parsed;
    try { parsed = new URL(trimmed); }
    catch (e) { return { ok: false, reason: "Invalid URL format" }; }

    // Only allow http and https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { ok: false, reason: "Only http:// and https:// URLs are allowed" };
    }
    // Must have a host
    if (!parsed.hostname || parsed.hostname.length < 2) {
        return { ok: false, reason: "Invalid URL host" };
    }
    return { ok: true, clean: trimmed };
}

// =========================================================
// GET /api/socials — list current user's social links
// =========================================================
exports.getSocialLinks = (req, res) => {
    try {
        const links = db.prepare(`
            SELECT * FROM social_links
            WHERE user_id = ?
            ORDER BY COALESCE(display_order, 0) ASC, id ASC
        `).all(req.user.id);

        res.json({ success: true, socials: links, socialLinks: links });
    } catch (err) {
        console.error("List socials error:", err);
        res.status(500).json({ success: false, message: "Failed to load social links", error: err.message });
    }
};

// =========================================================
// GET /api/socials/stats — quick stats for header cards
// =========================================================
exports.getStats = (req, res) => {
    try {
        const userId = req.user.id;
        const row = db.prepare(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN is_visible = 1 THEN 1 ELSE 0 END) AS visible,
                SUM(CASE WHEN is_visible = 0 OR is_visible IS NULL THEN 1 ELSE 0 END) AS hidden
            FROM social_links WHERE user_id = ?
        `).get(userId);

        res.json({
            success: true,
            stats: {
                total:   row?.total   || 0,
                visible: row?.visible || 0,
                hidden:  row?.hidden  || 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/socials — create
// =========================================================
exports.createSocialLink = (req, res) => {
    try {
        const userId = req.user.id;
        const { platform, handle, url, is_visible } = req.body;

        // Validate URL
        const urlCheck = validateUrl(url);
        if (!urlCheck.ok) {
            return res.status(400).json({ success: false, message: urlCheck.reason });
        }

        // Normalize platform
        const platformNorm = normalizePlatform(platform);
        if (!platformNorm) {
            return res.status(400).json({ success: false, message: "Platform is required" });
        }

        // Next display_order = max + 1
        const maxOrder = db.prepare(
            "SELECT COALESCE(MAX(display_order), -1) AS m FROM social_links WHERE user_id = ?"
        ).get(userId)?.m ?? -1;

        const r = db.prepare(`
            INSERT INTO social_links
                (user_id, platform, handle, url, display_order, is_visible, created_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
            userId,
            platformNorm,
            (handle || "").trim().slice(0, 100),
            urlCheck.clean,
            maxOrder + 1,
            is_visible === false ? 0 : 1
        );

        const link = db.prepare("SELECT * FROM social_links WHERE id = ?").get(r.lastInsertRowid);
        res.json({ success: true, message: "Added", social: link, socialLink: link });
    } catch (err) {
        console.error("Create social error:", err);
        res.status(500).json({ success: false, message: "Failed to add", error: err.message });
    }
};

// =========================================================
// PATCH /api/socials/:id — update
// =========================================================
exports.updateSocialLink = (req, res) => {
    try {
        const userId = req.user.id;
        const existing = db.prepare(
            "SELECT * FROM social_links WHERE id = ? AND user_id = ?"
        ).get(req.params.id, userId);
        if (!existing) return res.status(404).json({ success: false, message: "Not found" });

        const updates = {};

        if (req.body.platform !== undefined) {
            const p = normalizePlatform(req.body.platform);
            if (!p) return res.status(400).json({ success: false, message: "Invalid platform" });
            updates.platform = p;
        }

        if (req.body.handle !== undefined) {
            updates.handle = String(req.body.handle).trim().slice(0, 100);
        }

        if (req.body.url !== undefined) {
            const urlCheck = validateUrl(req.body.url);
            if (!urlCheck.ok) return res.status(400).json({ success: false, message: urlCheck.reason });
            updates.url = urlCheck.clean;
        }

        if (req.body.is_visible !== undefined) {
            updates.is_visible = req.body.is_visible ? 1 : 0;
        }

        if (req.body.display_order !== undefined) {
            updates.display_order = parseInt(req.body.display_order, 10) || 0;
        }

        if (!Object.keys(updates).length) {
            return res.json({ success: true, message: "Nothing to update", social: existing });
        }

        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
        const values = [...Object.values(updates)];

        let sql = `UPDATE social_links SET ${setClauses}`;
        // Add updated_at if the column exists
        const cols = db.prepare("PRAGMA table_info(social_links)").all().map(c => c.name);
        if (cols.includes("updated_at")) sql += ", updated_at = CURRENT_TIMESTAMP";
        sql += " WHERE id = ? AND user_id = ?";
        values.push(req.params.id, userId);

        db.prepare(sql).run(...values);

        const link = db.prepare("SELECT * FROM social_links WHERE id = ?").get(req.params.id);
        res.json({ success: true, message: "Updated", social: link, socialLink: link });
    } catch (err) {
        console.error("Update social error:", err);
        res.status(500).json({ success: false, message: "Failed to update", error: err.message });
    }
};

// =========================================================
// DELETE /api/socials/:id
// =========================================================
exports.deleteSocialLink = (req, res) => {
    try {
        const r = db.prepare(
            "DELETE FROM social_links WHERE id = ? AND user_id = ?"
        ).run(req.params.id, req.user.id);
        if (r.changes === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete", error: err.message });
    }
};

// =========================================================
// PATCH /api/socials/:id/visibility — toggle
// =========================================================
exports.toggleVisibility = (req, res) => {
    try {
        const userId = req.user.id;
        const existing = db.prepare(
            "SELECT * FROM social_links WHERE id = ? AND user_id = ?"
        ).get(req.params.id, userId);
        if (!existing) return res.status(404).json({ success: false, message: "Not found" });

        const newVal = existing.is_visible ? 0 : 1;
        db.prepare("UPDATE social_links SET is_visible = ? WHERE id = ? AND user_id = ?")
          .run(newVal, req.params.id, userId);

        res.json({ success: true, visible: !!newVal, is_visible: !!newVal });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PUT /api/socials/reorder — persist drag order
// Body: { order: [id1, id2, id3, ...] }
// =========================================================
exports.reorder = (req, res) => {
    try {
        const userId = req.user.id;
        const { order } = req.body;
        if (!Array.isArray(order)) return res.status(400).json({ success: false, message: "order[] required" });

        const stmt = db.prepare("UPDATE social_links SET display_order = ? WHERE id = ? AND user_id = ?");
        order.forEach((id, i) => {
            stmt.run(i, parseInt(id, 10), userId);
        });

        res.json({ success: true, message: "Reordered" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};