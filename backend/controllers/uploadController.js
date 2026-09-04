// =========================================================
// CREVIO — UPLOAD CONTROLLER (Thumbnails)
// =========================================================

const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Ensure uploads/thumbnails directory exists
const thumbnailUploadDir = path.join(__dirname, "../../uploads/thumbnails");
if (!fs.existsSync(thumbnailUploadDir)) {
    fs.mkdirSync(thumbnailUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, thumbnailUploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `thumbnail_${req.user.id}_${Date.now()}${ext}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Unsupported image format. Use JPG, PNG, or WebP.'), false);
    }
};

const uploadThumbnail = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('thumbnail');

const uploadThumbnailFile = (req, res) => {
    uploadThumbnail(req, res, (err) => {
        try {
            if (err) {
                console.error('Multer error:', err);
                return res.status(400).json({
                    success: false,
                    message: err.message || 'File upload failed.'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select an image file.'
                });
            }

            // Build URL for the uploaded file
            const imageUrl = `/uploads/thumbnails/${req.file.filename}`;

            res.json({
                success: true,
                message: 'Thumbnail uploaded successfully.',
                thumbnail_url: imageUrl
            });

        } catch (error) {
            console.error('Upload thumbnail error:', error);
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (e) {}
            }
            res.status(500).json({
                success: false,
                message: 'Unable to upload thumbnail.'
            });
        }
    });
};

module.exports = {
    uploadThumbnailFile
};