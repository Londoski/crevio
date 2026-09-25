// =========================================================
// CREVIO — TESTIMONIAL CONTROLLER
// File: backend/controllers/testimonialController.js
// =========================================================
const db = require("../../database/db");

function sanitize(body, existing) {
    const b = body || {};
    const out = {};
    const trim = (v, max) => String(v == null ? "" : v).trim().slice(0, max);

    if (b.quote !== undefined || !existing) out.quote = trim(b.quote, 500);
    if (b.author_name !== undefined || !existing) out.author_name = trim(b.author_name, 120);
    if (b.author_role !== undefined) out.author_role = trim(b.author_role, 120) || null;
    if (b.author_company !== undefined) out.author_company = trim(b.author_company, 120) || null;
    if (b.author_avatar !== undefined) out.author_avatar = trim(b.author_avatar, 500) || null;
    if (b.display_order !== undefined) out.display_order = parseInt(b.display_order, 10) || 0;
    if (b.is_visible !== undefined) out.is_visible = b.is_visible ? 1 : 0;

    return out;
}

// GET /api/testimonials
exports.list = (req, res) => {
    try {
        const rows = db.prepare(
            "SELECT * FROM testimonials WHERE user_id = ? " +
            "ORDER BY display_order ASC, id ASC"
        ).all(req.user.id);
        res.json({ success: true, testimonials: rows });
    } catch (err) {
        console.error("testimonials.list:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/testimonials
exports.create = (req, res) => {
    try {
        const d = sanitize(req.body, null);
        if (!d.quote || d.quote.length < 4) {
            return res.status(400).json({ success: false, message: "Quote is required (min 4 chars)" });
        }
        if (!d.author_name) {
            return res.status(400).json({ success: false, message: "Author name is required" });
        }
        const r = db.prepare(
            "INSERT INTO testimonials (user_id, quote, author_name, author_role, author_company, author_avatar, display_order, is_visible) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
            req.user.id, d.quote, d.author_name,
            d.author_role || null, d.author_company || null, d.author_avatar || null,
            d.display_order || 0, d.is_visible === 0 ? 0 : 1
        );
        const row = db.prepare("SELECT * FROM testimonials WHERE id = ?").get(r.lastInsertRowid);
        res.json({ success: true, testimonial: row });
    } catch (err) {
        console.error("testimonials.create:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// PATCH /api/testimonials/:id
exports.update = (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const existing = db.prepare(
            "SELECT * FROM testimonials WHERE id = ? AND user_id = ?"
        ).get(id, req.user.id);
        if (!existing) return res.status(404).json({ success: false, message: "Not found" });

        const d = sanitize(req.body, existing);
        const keys = Object.keys(d);
        if (!keys.length) return res.json({ success: true, testimonial: existing });

        const set = keys.map(k => k + " = ?").join(", ");
        const vals = keys.map(k => d[k]);
        vals.push(id, req.user.id);

        db.prepare(
            "UPDATE testimonials SET " + set + ", updated_at = CURRENT_TIMESTAMP " +
            "WHERE id = ? AND user_id = ?"
        ).run(...vals);

        const row = db.prepare("SELECT * FROM testimonials WHERE id = ?").get(id);
        res.json({ success: true, testimonial: row });
    } catch (err) {
        console.error("testimonials.update:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /api/testimonials/:id
exports.remove = (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const r = db.prepare(
            "DELETE FROM testimonials WHERE id = ? AND user_id = ?"
        ).run(id, req.user.id);
        if (!r.changes) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true });
    } catch (err) {
        console.error("testimonials.remove:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};