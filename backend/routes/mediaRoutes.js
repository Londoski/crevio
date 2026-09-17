// =========================================================
// CREVIO — MEDIA ROUTES
// File: backend/routes/mediaRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const auth = require("../middleware/authMiddleware");
const mediaController = require("../controllers/mediaController");

// =========================================================
// Folder helpers
// =========================================================
function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

const mediaDir  = path.join(__dirname, "..", "..", "uploads", "media");
const thumbsDir = path.join(__dirname, "..", "..", "uploads", "thumbnails");

// =========================================================
// Multer storage — routes file based on field name
// =========================================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        try {
            if (file.fieldname === "thumbnail") {
                cb(null, ensureDir(thumbsDir));
            } else {
                cb(null, ensureDir(mediaDir));
            }
        } catch (err) {
            cb(err);
        }
    },
    filename: function (req, file, cb) {
        const ext  = path.extname(file.originalname).toLowerCase();
        const base = path.basename(file.originalname, ext)
            .replace(/[^a-z0-9_-]/gi, "_")
            .slice(0, 40);
        const prefix = file.fieldname === "thumbnail" ? "thumb" : "media";
        cb(null, prefix + "_" + req.user.id + "_" + Date.now() + "_" + base + ext);
    }
});

const ALLOWED_MEDIA_EXTS = [
    ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg",
    ".mp4", ".webm", ".mov",
    ".mp3", ".wav", ".ogg", ".m4a",
    ".pdf", ".doc", ".docx", ".txt", ".csv", ".zip"
];

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();

        if (file.fieldname === "thumbnail") {
            if ([".jpg", ".jpeg", ".png", ".webp"].indexOf(ext) !== -1) {
                cb(null, true);
            } else {
                cb(new Error("Thumbnail must be an image"));
            }
            return;
        }

        if (ALLOWED_MEDIA_EXTS.indexOf(ext) !== -1) {
            cb(null, true);
        } else {
            cb(new Error("File type not allowed: " + ext));
        }
    }
});

// =========================================================
// Multer wrapper
// =========================================================
function uploadWrapper(req, res, next) {
    upload.fields([
        { name: "file", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ])(req, res, function (err) {
        if (err) {
            console.error("Multer error:", err.message);
            return res.status(400).json({
                success: false,
                message: err.message || "Upload failed",
                code: err.code || null
            });
        }
        next();
    });
}

// =========================================================
// ROUTES
// =========================================================
router.get("/stats",           auth, mediaController.getStats);

router.get("/",                auth, mediaController.getMedia);
router.post("/",               auth, uploadWrapper, mediaController.uploadMedia);

router.post("/:id/thumbnail",  auth, uploadWrapper, mediaController.setThumbnail);

router.get("/:id",             auth, mediaController.getOne);
router.get("/:id/download",    auth, mediaController.downloadMedia);
router.patch("/:id",           auth, mediaController.updateMedia);
router.delete("/:id",          auth, mediaController.deleteMedia);

// =========================================================
// EXPORT
// =========================================================
module.exports = router;