// =========================================================
// CREVIO — UPLOAD ROUTES
// File: backend/routes/uploadRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const auth = require("../middleware/authMiddleware");
const uploadController = require("../controllers/uploadController");

const uploadsDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `file_${req.user.id}_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

router.post("/",           auth, upload.single("file"), uploadController.uploadSingle);
router.post("/multiple",   auth, upload.array("files", 10), uploadController.uploadMultiple);
router.delete("/:filename", auth, uploadController.deleteFile);

module.exports = router;