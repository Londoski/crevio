const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const db = require("../../database/db");

// LIST
router.get("/", auth, (req, res) => {
    try {
        const services = db.prepare(
            "SELECT * FROM services WHERE user_id = ? ORDER BY created_at DESC"
        ).all(req.user.id);
        res.json({ success: true, services });
    } catch (err) {
        console.error("List services error:", err);
        res.status(500).json({ success: false, message: "Failed to load services" });
    }
});

// GET SINGLE
router.get("/:id", auth, (req, res) => {
    try {
        const service = db.prepare(
            "SELECT * FROM services WHERE id = ? AND user_id = ?"
        ).get(req.params.id, req.user.id);
        if (!service) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, service });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to load service" });
    }
});

// CREATE
router.post("/", auth, (req, res) => {
    try {
        const { title, description, price, delivery_time, category, status } = req.body;
        if (!title) return res.status(400).json({ success: false, message: "Title is required" });

        const result = db.prepare(`
            INSERT INTO services (user_id, title, description, price, delivery_time, category, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
            req.user.id,
            title,
            description || "",
            price || 0,
            delivery_time || "",
            category || "design",
            status || "active"
        );

        const service = db.prepare("SELECT * FROM services WHERE id = ?").get(result.lastInsertRowid);
        res.json({ success: true, message: "Service created", service });
    } catch (err) {
        console.error("Create service error:", err);
        res.status(500).json({ success: false, message: "Failed to create service", error: err.message });
    }
});

// UPDATE
router.patch("/:id", auth, (req, res) => {
    try {
        const { title, description, price, delivery_time, category, status } = req.body;
        const existing = db.prepare(
            "SELECT * FROM services WHERE id = ? AND user_id = ?"
        ).get(req.params.id, req.user.id);
        if (!existing) return res.status(404).json({ success: false, message: "Not found" });

        db.prepare(`
            UPDATE services SET
                title = ?, description = ?, price = ?,
                delivery_time = ?, category = ?, status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `).run(
            title         ?? existing.title,
            description   ?? existing.description,
            price         ?? existing.price,
            delivery_time ?? existing.delivery_time,
            category      ?? existing.category,
            status        ?? existing.status,
            req.params.id,
            req.user.id
        );

        const service = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
        res.json({ success: true, message: "Service updated", service });
    } catch (err) {
        console.error("Update service error:", err);
        res.status(500).json({ success: false, message: "Failed to update service", error: err.message });
    }
});

// DELETE
router.delete("/:id", auth, (req, res) => {
    try {
        const result = db.prepare(
            "DELETE FROM services WHERE id = ? AND user_id = ?"
        ).run(req.params.id, req.user.id);
        if (result.changes === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Service deleted" });
    } catch (err) {
        console.error("Delete service error:", err);
        res.status(500).json({ success: false, message: "Failed to delete service", error: err.message });
    }
});

module.exports = router;