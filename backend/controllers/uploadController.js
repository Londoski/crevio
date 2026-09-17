// =========================================================
// CREVIO — UPLOAD CONTROLLER (generic uploads)
// File: backend/controllers/uploadController.js
// =========================================================

const path = require("path");
const fs = require("fs");

// POST /api/upload — single file
exports.uploadSingle = (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
        const url = `/uploads/${req.file.filename}`;
        res.json({ success: true, url, filename: req.file.filename, size: req.file.size });
    } catch (err) {
        res.status(500).json({ success: false, message: "Upload failed", error: err.message });
    }
};

// POST /api/upload/multiple
exports.uploadMultiple = (req, res) => {
    try {
        if (!req.files || !req.files.length) {
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }
        const files = req.files.map(f => ({
            url: `/uploads/${f.filename}`,
            filename: f.filename,
            size: f.size
        }));
        res.json({ success: true, files });
    } catch (err) {
        res.status(500).json({ success: false, message: "Upload failed", error: err.message });
    }
};

// DELETE /api/upload/:filename
exports.deleteFile = (req, res) => {
    try {
        const filename = path.basename(req.params.filename);
        const filePath = path.join(__dirname, "..", "..", "uploads", filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "File not found" });
        }
        fs.unlinkSync(filePath);
        res.json({ success: true, message: "Deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete", error: err.message });
    }
};