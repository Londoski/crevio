// =========================================================
// CREVIO — PROJECT MEDIA ROUTES
// (Upload, delete, reorder media inside a project)
// =========================================================

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const projectMediaController = require("../controllers/projectMediaController");

// =========================================================
// UPLOAD DIRECTORY
// =========================================================

const uploadDirectory = path.join(__dirname, "../../uploads/projects");

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

// =========================================================
// MULTER STORAGE
// =========================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDirectory),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const base = path.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9-_]/g, "-")
            .replace(/-+/g, "-")
            .toLowerCase();
        const filename = `${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, filename);
    }
});

// =========================================================
// FILE FILTER
// =========================================================

const fileFilter = (req, file, cb) => {
    const allowed = ["image/jpeg","image/png","image/webp","image/gif",
                     "video/mp4","video/webm","video/quicktime","video/x-msvideo"];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only image and video files are allowed."), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 500 * 1024 * 1024 } // 500 MB
});

// =========================================================
// ROUTES (all require authentication)
// =========================================================

// Upload a media file to a project
router.post(
    "/projects/:id/media/upload",
    authMiddleware,
    upload.single("media"),
    projectMediaController.uploadMedia
);

// Add media using a URL
router.post(
    "/projects/:id/media",
    authMiddleware,
    projectMediaController.addMedia
);

// Get all media for a project
router.get(
    "/projects/:id/media",
    authMiddleware,
    projectMediaController.getProjectMedia
);

// Update media details
router.put(
    "/projects/:id/media/:mediaId",
    authMiddleware,
    projectMediaController.updateMedia
);

// Update media order
router.put(
    "/projects/:id/media/:mediaId/order",
    authMiddleware,
    projectMediaController.updateMediaOrder
);

// Delete media
router.delete(
    "/projects/:id/media/:mediaId",
    authMiddleware,
    projectMediaController.deleteMedia
);

// =========================================================
// MULTER ERROR HANDLER
// =========================================================

router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "File is too large. Maximum allowed size is 500 MB."
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message || "File upload failed."
        });
    }
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "File upload failed."
        });
    }
    next();
});

module.exports = router;