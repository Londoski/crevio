const path = require("path");
const fs = require("fs");

const projectModel = require("../models/projectModel");
const projectMediaModel = require("../models/projectMediaModel");


// ==========================================
// UPLOAD MEDIA TO PROJECT
// ==========================================

const uploadMedia = (req, res) => {
    try {

        const user_id = req.user.id;
        const project_id = Number(req.params.id);

        // ------------------------------------------
        // Validate project ID
        // ------------------------------------------

        if (!Number.isInteger(project_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });
        }


        // ------------------------------------------
        // Find project
        // ------------------------------------------

        const project =
            projectModel.findById(project_id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found."
            });
        }


        // ------------------------------------------
        // Security check
        // ------------------------------------------

        if (project.user_id !== user_id) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to modify this project."
            });
        }


        // ------------------------------------------
        // Check uploaded file
        // ------------------------------------------

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select an image or video file."
            });
        }


        // ------------------------------------------
        // Get form fields
        // ------------------------------------------

        const {
            title,
            description,
            sort_order
        } = req.body;


        // ------------------------------------------
        // Determine media type
        // ------------------------------------------

        let media_type;

        if (req.file.mimetype.startsWith("image/")) {
            media_type = "image";
        }

        else if (req.file.mimetype.startsWith("video/")) {
            media_type = "video";
        }

        else {

            // Remove uploaded file if unsupported
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(400).json({
                success: false,
                message: "Only image and video files are allowed."
            });
        }


        // ------------------------------------------
        // Create URL for browser
        // ------------------------------------------

        const media_url =
            `/uploads/projects/${req.file.filename}`;


        // ------------------------------------------
        // Create database record
        // ------------------------------------------

        const media =
            projectMediaModel.create({
                project_id,
                media_type,
                media_url,
                title,
                description,
                sort_order: sort_order
                    ? Number(sort_order)
                    : 0
            });


        // ------------------------------------------
        // Response
        // ------------------------------------------

        return res.status(201).json({
            success: true,
            message: "Media uploaded successfully.",
            media
        });


    } catch (error) {

        console.error(
            "Upload media error:",
            error
        );


        // Try to remove uploaded file
        if (
            req.file &&
            req.file.path &&
            fs.existsSync(req.file.path)
        ) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (deleteError) {
                console.error(
                    "Unable to remove uploaded file:",
                    deleteError
                );
            }
        }


        return res.status(500).json({
            success: false,
            message: "Unable to upload media."
        });

    }
};



// ==========================================
// ADD MEDIA USING URL
// ==========================================

const addMedia = (req, res) => {

    try {

        const user_id = req.user.id;
        const project_id = Number(req.params.id);


        if (!Number.isInteger(project_id)) {

            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });

        }


        const project =
            projectModel.findById(project_id);


        if (!project) {

            return res.status(404).json({
                success: false,
                message: "Project not found."
            });

        }


        if (project.user_id !== user_id) {

            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to modify this project."
            });

        }


        const {
            media_type,
            media_url,
            title,
            description,
            sort_order
        } = req.body;


        if (
            !media_type ||
            !["image", "video"].includes(media_type)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Media type must be either image or video."
            });

        }


        if (!media_url) {

            return res.status(400).json({
                success: false,
                message:
                    "Media URL is required."
            });

        }


        const media =
            projectMediaModel.create({
                project_id,
                media_type,
                media_url,
                title,
                description,
                sort_order
            });


        return res.status(201).json({
            success: true,
            message: "Media added successfully.",
            media
        });


    } catch (error) {

        console.error(
            "Add media error:",
            error
        );


        return res.status(500).json({
            success: false,
            message:
                "Unable to add media."
        });

    }

};



// ==========================================
// GET PROJECT MEDIA
// ==========================================

const getProjectMedia = (req, res) => {

    try {

        const user_id = req.user.id;
        const project_id = Number(req.params.id);


        if (!Number.isInteger(project_id)) {

            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });

        }


        const project =
            projectModel.findById(project_id);


        if (!project) {

            return res.status(404).json({
                success: false,
                message: "Project not found."
            });

        }


        if (project.user_id !== user_id) {

            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to access this project."
            });

        }


        const media =
            projectMediaModel.findByProjectId(
                project_id
            );


        return res.json({
            success: true,
            count: media.length,
            media
        });


    } catch (error) {

        console.error(
            "Get project media error:",
            error
        );


        return res.status(500).json({
            success: false,
            message:
                "Unable to retrieve project media."
        });

    }

};



// ==========================================
// UPDATE MEDIA
// ==========================================

const updateMedia = (req, res) => {

    try {

        const user_id = req.user.id;

        const project_id =
            Number(req.params.id);

        const media_id =
            Number(req.params.mediaId);


        if (
            !Number.isInteger(project_id) ||
            !Number.isInteger(media_id)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid project or media ID."
            });

        }


        const project =
            projectModel.findById(project_id);


        if (!project) {

            return res.status(404).json({
                success: false,
                message:
                    "Project not found."
            });

        }


        if (project.user_id !== user_id) {

            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to modify this project."
            });

        }


        const media =
            projectMediaModel.findById(
                media_id
            );


        if (
            !media ||
            media.project_id !== project_id
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Media not found."
            });

        }


        const {
            media_type,
            media_url,
            title,
            description,
            sort_order
        } = req.body;


        if (
            !media_type ||
            !["image", "video"].includes(media_type)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Media type must be either image or video."
            });

        }


        if (!media_url) {

            return res.status(400).json({
                success: false,
                message:
                    "Media URL is required."
            });

        }


        const updatedMedia =
            projectMediaModel.update(
                media_id,
                {
                    media_type,
                    media_url,
                    title,
                    description,
                    sort_order
                }
            );


        return res.json({
            success: true,
            message:
                "Media updated successfully.",
            media: updatedMedia
        });


    } catch (error) {

        console.error(
            "Update media error:",
            error
        );


        return res.status(500).json({
            success: false,
            message:
                "Unable to update media."
        });

    }

};



// ==========================================
// DELETE MEDIA
// ==========================================

const deleteMedia = (req, res) => {

    try {

        const user_id = req.user.id;

        const project_id =
            Number(req.params.id);

        const media_id =
            Number(req.params.mediaId);


        if (
            !Number.isInteger(project_id) ||
            !Number.isInteger(media_id)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid project or media ID."
            });

        }


        const project =
            projectModel.findById(project_id);


        if (!project) {

            return res.status(404).json({
                success: false,
                message:
                    "Project not found."
            });

        }


        if (project.user_id !== user_id) {

            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to modify this project."
            });

        }


        const media =
            projectMediaModel.findById(
                media_id
            );


        if (
            !media ||
            media.project_id !== project_id
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Media not found."
            });

        }


        // ------------------------------------------
        // Delete physical file if locally uploaded
        // ------------------------------------------

        if (
            media.media_url &&
            media.media_url.startsWith(
                "/uploads/projects/"
            )
        ) {

            const fileName =
                path.basename(
                    media.media_url
                );


            const filePath =
                path.join(
                    __dirname,
                    "../../uploads/projects",
                    fileName
                );


            if (fs.existsSync(filePath)) {

                try {

                    fs.unlinkSync(
                        filePath
                    );

                } catch (fileError) {

                    console.error(
                        "Unable to delete media file:",
                        fileError
                    );

                }

            }

        }


        // ------------------------------------------
        // Delete database record
        // ------------------------------------------

        const deleted =
            projectMediaModel.delete(
                media_id
            );


        if (!deleted) {

            return res.status(500).json({
                success: false,
                message:
                    "Unable to delete media."
            });

        }


        return res.json({
            success: true,
            message:
                "Media deleted successfully."
        });


    } catch (error) {

        console.error(
            "Delete media error:",
            error
        );


        return res.status(500).json({
            success: false,
            message:
                "Unable to delete media."
        });

    }

};
// ==========================================
// UPDATE MEDIA ORDER
// ==========================================

const updateMediaOrder = (req, res) => {

    try {

        const user_id = req.user.id;

        const project_id =
            Number(req.params.id);

        const media_id =
            Number(req.params.mediaId);

        const { sort_order } = req.body;


        if (
            !Number.isInteger(project_id) ||
            !Number.isInteger(media_id)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid project or media ID."
            });

        }


        const project =
            projectModel.findById(project_id);


        if (!project) {

            return res.status(404).json({
                success: false,
                message:
                    "Project not found."
            });

        }


        if (project.user_id !== user_id) {

            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to modify this project."
            });

        }


        const media =
            projectMediaModel.findById(
                media_id
            );


        if (
            !media ||
            media.project_id !== project_id
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Media not found."
            });

        }


        const updatedMedia =
            projectMediaModel.updateOrder(
                media_id,
                sort_order
            );


        return res.json({
            success: true,
            message:
                "Media order updated successfully.",
            media: updatedMedia
        });


    } catch (error) {

        console.error(
            "Update media order error:",
            error
        );


        return res.status(500).json({
            success: false,
            message:
                "Unable to update media order."
        });

    }

};


// ==========================================
// EXPORTS
// ==========================================

module.exports = {

    uploadMedia,

    addMedia,

    getProjectMedia,

    updateMedia,

    deleteMedia,

    updateMediaOrder   // <--- Add this!

};