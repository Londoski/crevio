const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const projectMediaController =
    require("../controllers/projectMediaController");

const authMiddleware =
    require("../middleware/authMiddleware");


// ==========================================
// UPLOAD DIRECTORY
// ==========================================

const uploadDirectory =
    path.join(
        __dirname,
        "../../uploads/projects"
    );


// Create upload directory if it doesn't exist

if (
    !fs.existsSync(
        uploadDirectory
    )
) {

    fs.mkdirSync(
        uploadDirectory,
        {
            recursive: true
        }
    );

}


// ==========================================
// MULTER STORAGE
// ==========================================

const storage =
    multer.diskStorage({

        destination: (
            req,
            file,
            cb
        ) => {

            cb(
                null,
                uploadDirectory
            );

        },


        filename: (
            req,
            file,
            cb
        ) => {

            const extension =
                path.extname(
                    file.originalname
                ).toLowerCase();


            const originalName =
                path.basename(
                    file.originalname,
                    extension
                )
                .replace(
                    /[^a-zA-Z0-9-_]/g,
                    "-"
                )
                .replace(
                    /-+/g,
                    "-"
                )
                .toLowerCase();


            const timestamp =
                Date.now();


            const random =
                Math.round(
                    Math.random() * 1E9
                );


            const filename =
                `${originalName}-${timestamp}-${random}${extension}`;


            cb(
                null,
                filename
            );

        }

    });


// ==========================================
// FILE FILTER
// ==========================================

const fileFilter = (
    req,
    file,
    cb
) => {

    const allowedTypes = [

        // Images
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",

        // Videos
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-msvideo"

    ];


    if (
        allowedTypes.includes(
            file.mimetype
        )
    ) {

        cb(
            null,
            true
        );

    } else {

        cb(
            new Error(
                "Only image and video files are allowed."
            ),
            false
        );

    }

};


// ==========================================
// MULTER CONFIGURATION
// ==========================================

const upload =
    multer({

        storage,

        fileFilter,

        limits: {

            // Maximum file size:
            // 500 MB
            fileSize:
                500 * 1024 * 1024

        }

    });


// ==========================================
// PROJECT MEDIA ROUTES
// ==========================================


// ------------------------------------------
// UPLOAD MEDIA FILE
// ------------------------------------------

router.post(

    "/projects/:id/media/upload",

    authMiddleware,

    upload.single("media"),

    projectMediaController.uploadMedia

);


// ------------------------------------------
// ADD MEDIA USING URL
// ------------------------------------------

router.post(

    "/projects/:id/media",

    authMiddleware,

    projectMediaController.addMedia

);


// ------------------------------------------
// GET PROJECT MEDIA
// ------------------------------------------

router.get(

    "/projects/:id/media",

    authMiddleware,

    projectMediaController.getProjectMedia

);


// ------------------------------------------
// UPDATE MEDIA
// ------------------------------------------

router.put(

    "/projects/:id/media/:mediaId",

    authMiddleware,

    projectMediaController.updateMedia

);


// ------------------------------------------
// UPDATE MEDIA ORDER
// ------------------------------------------

router.put(

    "/projects/:id/media/:mediaId/order",

    authMiddleware,

    projectMediaController.updateMediaOrder

);


// ------------------------------------------
// DELETE MEDIA
// ------------------------------------------

router.delete(

    "/projects/:id/media/:mediaId",

    authMiddleware,

    projectMediaController.deleteMedia

);


// ==========================================
// MULTER ERROR HANDLER
// ==========================================

router.use(

    (
        error,
        req,
        res,
        next
    ) => {


        // ----------------------------------
        // MULTER ERROR
        // ----------------------------------

        if (
            error instanceof
            multer.MulterError
        ) {


            // File too large

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "File is too large. Maximum allowed size is 500 MB."

                    });

            }


            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        error.message ||
                        "File upload failed."

                });

        }


        // ----------------------------------
        // NORMAL ERROR
        // ----------------------------------

        if (error) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        error.message ||
                        "File upload failed."

                });

        }


        next();

    }

);


// ==========================================
// EXPORT
// ==========================================

module.exports = router;