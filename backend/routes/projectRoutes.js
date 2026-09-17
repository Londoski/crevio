// =========================================================
// CREVIO — PROJECT ROUTES
// File: backend/routes/projectRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const auth = require("../middleware/authMiddleware");
const projectController = require("../controllers/projectController");

// =========================================================
// Cover uploads — folder created ON DEMAND at upload time
// =========================================================
function ensureCoversDir() {
    const dir = path.join(__dirname, "..", "..", "uploads", "covers");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const dir = ensureCoversDir();
            console.log("📁 Writing cover to:", dir);
            cb(null, dir);
        } catch (err) {
            console.error("❌ Could not create covers dir:", err);
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = `cover_${req.user.id}_${Date.now()}${ext}`;
        console.log("📝 Filename:", name);
        cb(null, name);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error("Only images (jpg, png, webp, gif) allowed"));
    }
});

// =========================================================
// Upload wrapper — returns clean JSON on any multer error
// =========================================================
function uploadCover(req, res, next) {
    upload.single("cover")(req, res, (err) => {
        if (err) {
            console.error("❌ Multer error:", err);
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
// ROUTES (specific routes BEFORE :id)
// =========================================================
router.get("/stats",         auth, projectController.getStats);
router.post("/upload-cover", auth, uploadCover, projectController.uploadCover);

router.get("/",                  auth, projectController.getProjects);
router.post("/",                 auth, projectController.createProject);
router.get("/:id",               auth, projectController.getProject);
router.patch("/:id",             auth, projectController.updateProject);
router.post("/:id/publish",      auth, projectController.publishProject);
router.post("/:id/unpublish",    auth, projectController.unpublishProject);
router.post("/:id/duplicate",    auth, projectController.duplicateProject);
router.delete("/:id",            auth, projectController.deleteProject);

module.exports = router;