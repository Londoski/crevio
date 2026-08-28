const socialLinksModel =
    require("../models/socialLinksModel");


// ==========================================
// CREATE SOCIAL LINK
// ==========================================

const createSocialLink = (req, res) => {

    try {

        const user_id = req.user.id;

        const {
            platform,
            handle,
            url,
            display_order,
            is_visible
        } = req.body;


        // ------------------------------------------
        // Validate platform
        // ------------------------------------------

        if (!platform || !platform.trim()) {

            return res.status(400).json({

                success: false,

                message:
                    "Social media platform is required."

            });

        }


        // ------------------------------------------
        // Validate URL
        // ------------------------------------------

        if (!url || !url.trim()) {

            return res.status(400).json({

                success: false,

                message:
                    "Social media URL is required."

            });

        }


        // ------------------------------------------
        // Create social link
        // ------------------------------------------

        const socialLink =
            socialLinksModel.create({

                user_id,

                platform:
                    platform.trim(),

                handle:
                    handle
                        ? handle.trim()
                        : null,

                url:
                    url.trim(),

                display_order:
                    Number.isInteger(
                        Number(display_order)
                    )
                        ? Number(display_order)
                        : 0,

                is_visible:
                    is_visible === false ||
                    is_visible === 0 ||
                    is_visible === "0"
                        ? 0
                        : 1

            });


        return res.status(201).json({

            success: true,

            message:
                "Social media link added successfully.",

            socialLink

        });


    } catch (error) {

        console.error(
            "Create social link error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to add social media link."

        });

    }

};



// ==========================================
// GET SOCIAL LINKS
// ==========================================

const getSocialLinks = (req, res) => {

    try {

        const user_id = req.user.id;


        const socialLinks =
            socialLinksModel.findByUserId(
                user_id
            );


        return res.json({

            success: true,

            count:
                socialLinks.length,

            socialLinks

        });


    } catch (error) {

        console.error(
            "Get social links error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to retrieve social media links."

        });

    }

};



// ==========================================
// UPDATE SOCIAL LINK
// ==========================================

const updateSocialLink = (req, res) => {

    try {

        const user_id = req.user.id;

        const socialLinkId =
            Number(req.params.id);


        // ------------------------------------------
        // Validate ID
        // ------------------------------------------

        if (
            !Number.isInteger(
                socialLinkId
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid social media ID."

            });

        }


        // ------------------------------------------
        // Find social link
        // ------------------------------------------

        const socialLink =
            socialLinksModel.findById(
                socialLinkId
            );


        if (!socialLink) {

            return res.status(404).json({

                success: false,

                message:
                    "Social media link not found."

            });

        }


        // ------------------------------------------
        // Security check
        // ------------------------------------------

        if (
            socialLink.user_id !==
            user_id
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "You do not have permission to modify this social media link."

            });

        }


        const {
            platform,
            handle,
            url,
            display_order,
            is_visible
        } = req.body;


        // ------------------------------------------
        // Validate platform
        // ------------------------------------------

        if (
            !platform ||
            !platform.trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Social media platform is required."

            });

        }


        // ------------------------------------------
        // Validate URL
        // ------------------------------------------

        if (
            !url ||
            !url.trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Social media URL is required."

            });

        }


        // ------------------------------------------
        // Update
        // ------------------------------------------

        const updatedSocialLink =
            socialLinksModel.update(

                socialLinkId,

                {

                    platform:
                        platform.trim(),

                    handle:
                        handle
                            ? handle.trim()
                            : null,

                    url:
                        url.trim(),

                    display_order:
                        Number.isInteger(
                            Number(display_order)
                        )
                            ? Number(display_order)
                            : 0,

                    is_visible:
                        is_visible === false ||
                        is_visible === 0 ||
                        is_visible === "0"
                            ? 0
                            : 1

                }

            );


        return res.json({

            success: true,

            message:
                "Social media link updated successfully.",

            socialLink:
                updatedSocialLink

        });


    } catch (error) {

        console.error(
            "Update social link error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to update social media link."

        });

    }

};



// ==========================================
// DELETE SOCIAL LINK
// ==========================================

const deleteSocialLink = (req, res) => {

    try {

        const user_id = req.user.id;

        const socialLinkId =
            Number(req.params.id);


        // ------------------------------------------
        // Validate ID
        // ------------------------------------------

        if (
            !Number.isInteger(
                socialLinkId
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid social media ID."

            });

        }


        // ------------------------------------------
        // Find social link
        // ------------------------------------------

        const socialLink =
            socialLinksModel.findById(
                socialLinkId
            );


        if (!socialLink) {

            return res.status(404).json({

                success: false,

                message:
                    "Social media link not found."

            });

        }


        // ------------------------------------------
        // Security check
        // ------------------------------------------

        if (
            socialLink.user_id !==
            user_id
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "You do not have permission to delete this social media link."

            });

        }


        // ------------------------------------------
        // Delete
        // ------------------------------------------

        const deleted =
            socialLinksModel.delete(
                socialLinkId
            );


        if (!deleted) {

            return res.status(500).json({

                success: false,

                message:
                    "Unable to delete social media link."

            });

        }


        return res.json({

            success: true,

            message:
                "Social media link deleted successfully."

        });


    } catch (error) {

        console.error(
            "Delete social link error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to delete social media link."

        });

    }

};



// ==========================================
// TOGGLE VISIBILITY
// ==========================================

const toggleSocialLinkVisibility = (
    req,
    res
) => {

    try {

        const user_id = req.user.id;

        const socialLinkId =
            Number(req.params.id);


        // ------------------------------------------
        // Validate ID
        // ------------------------------------------

        if (
            !Number.isInteger(
                socialLinkId
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid social media ID."

            });

        }


        // ------------------------------------------
        // Find social link
        // ------------------------------------------

        const socialLink =
            socialLinksModel.findById(
                socialLinkId
            );


        if (!socialLink) {

            return res.status(404).json({

                success: false,

                message:
                    "Social media link not found."

            });

        }


        // ------------------------------------------
        // Security check
        // ------------------------------------------

        if (
            socialLink.user_id !==
            user_id
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "You do not have permission to modify this social media link."

            });

        }


        // ------------------------------------------
        // Toggle visibility
        // ------------------------------------------

        const newVisibility =
            socialLink.is_visible === 1
                ? 0
                : 1;


        const updatedSocialLink =
            socialLinksModel.setVisibility(

                socialLinkId,

                newVisibility

            );


        return res.json({

            success: true,

            message:
                newVisibility === 1
                    ? "Social media link is now visible."
                    : "Social media link is now hidden.",

            socialLink:
                updatedSocialLink

        });


    } catch (error) {

        console.error(
            "Toggle social link visibility error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to change social media visibility."

        });

    }

};



// ==========================================
// UPDATE SOCIAL LINK ORDER
// ==========================================

const updateSocialLinkOrder = (
    req,
    res
) => {

    try {

        const user_id = req.user.id;

        const socialLinkId =
            Number(req.params.id);

        const display_order =
            Number(
                req.body.display_order
            );


        // ------------------------------------------
        // Validate ID
        // ------------------------------------------

        if (
            !Number.isInteger(
                socialLinkId
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid social media ID."

            });

        }


        // ------------------------------------------
        // Validate order
        // ------------------------------------------

        if (
            !Number.isInteger(
                display_order
            ) ||
            display_order < 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Display order must be a valid positive number."

            });

        }


        // ------------------------------------------
        // Find social link
        // ------------------------------------------

        const socialLink =
            socialLinksModel.findById(
                socialLinkId
            );


        if (!socialLink) {

            return res.status(404).json({

                success: false,

                message:
                    "Social media link not found."

            });

        }


        // ------------------------------------------
        // Security check
        // ------------------------------------------

        if (
            socialLink.user_id !==
            user_id
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "You do not have permission to modify this social media link."

            });

        }


        // ------------------------------------------
        // Update order
        // ------------------------------------------

        const updatedSocialLink =
            socialLinksModel.updateOrder(

                socialLinkId,

                display_order

            );


        return res.json({

            success: true,

            message:
                "Social media order updated successfully.",

            socialLink:
                updatedSocialLink

        });


    } catch (error) {

        console.error(
            "Update social link order error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to update social media order."

        });

    }

};



// ==========================================
// EXPORTS
// ==========================================

module.exports = {

    createSocialLink,

    getSocialLinks,

    updateSocialLink,

    deleteSocialLink,

    toggleSocialLinkVisibility,

    updateSocialLinkOrder

};