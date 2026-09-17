// =========================================================
// CREVIO — USER ROUTES
// File: backend/routes/userRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const auth = require("../middleware/authMiddleware");
const userController = require("../controllers/userController");

// =========================================================
// Multer for avatar uploads
// =========================================================
const uploadsDir = path.join(__dirname, "..", "..", "uploads", "profiles");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `profile_${req.user.id}_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error("Only image files allowed"));
    }
});

// =========================================================
// Routes
// =========================================================
router.get("/me",         auth, userController.getMe);
router.patch("/me",       auth, userController.updateMe);
router.post("/me/avatar", auth, upload.single("avatar"), userController.uploadAvatar);
router.get("/:id",        userController.getUserById);

module.exports = router;