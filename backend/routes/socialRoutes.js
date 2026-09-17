const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const db = require("../../database/db");

// =========================================================
// LIST all social accounts for current user
// =========================================================
router.get("/", auth, (req, res) => {
    try {
        const socials = db.prepare(`
            SELECT * FROM social_accounts
            WHERE user_id = ?
            ORDER BY created_at DESC
        `).all(req.user.id);

        res.json({ success: true, socials });
    } catch (err) {
        console.error("List socials error:", err);
        res.status(500).json({ success: false, message: "Failed to load social accounts", error: err.message });
    }
});

// =========================================================
// CREATE
// =========================================================
router.post("/", auth, (req, res) => {
    try {
        const { platform, url, display_name } = req.body;
        if (!platform || !url) {
            return res.status(400).json({ success: false, message: "Platform and URL are required" });
        }

        const result = db.prepare(`
            INSERT INTO social_accounts
                (user_id, platform, url, display_name, created_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(req.user.id, platform, url, display_name || "");

        const social = db.prepare("SELECT * FROM social_accounts WHERE id = ?").get(result.lastInsertRowid);
        res.json({ success: true, message: "Social account added", social });
    } catch (err) {
        console.error("Create social error:", err);
        res.status(500).json({ success: false, message: "Failed to add social account", error: err.message });
    }
});

// =========================================================
// UPDATE
// =========================================================
router.patch("/:id", auth, (req, res) => {
    try {
        const { platform, url, display_name } = req.body;

        const existing = db.prepare(
            "SELECT * FROM social_accounts WHERE id = ? AND user_id = ?"
        ).get(req.params.id, req.user.id);
        if (!existing) return res.status(404).json({ success: false, message: "Not found" });

        db.prepare(`
            UPDATE social_accounts SET
                platform = ?, url = ?, display_name = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `).run(
            platform     ?? existing.platform,
            url          ?? existing.url,
            display_name ?? existing.display_name,
            req.params.id,
            req.user.id
        );

        const social = db.prepare("SELECT * FROM social_accounts WHERE id = ?").get(req.params.id);
        res.json({ success: true, message: "Updated", social });
    } catch (err) {
        console.error("Update social error:", err);
        res.status(500).json({ success: false, message: "Failed to update", error: err.message });
    }
});

// =========================================================
// DELETE
// =========================================================
router.delete("/:id", auth, (req, res) => {
    try {
        const result = db.prepare(
            "DELETE FROM social_accounts WHERE id = ? AND user_id = ?"
        ).run(req.params.id, req.user.id);
        if (result.changes === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Removed" });
    } catch (err) {
        console.error("Delete social error:", err);
        res.status(500).json({ success: false, message: "Failed to delete", error: err.message });
    }
});

module.exports = router;