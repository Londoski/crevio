const express = require("express");

const router = express.Router();

const socialLinksController =
    require("../controllers/socialLinksController");

const authMiddleware =
    require("../middleware/authMiddleware");


// ==========================================
// SOCIAL LINKS ROUTES
// ==========================================


// ==========================================
// GET ALL SOCIAL LINKS
// ==========================================

router.get(

    "/",

    authMiddleware,

    socialLinksController.getSocialLinks

);


// ==========================================
// CREATE SOCIAL LINK
// ==========================================

router.post(

    "/",

    authMiddleware,

    socialLinksController.createSocialLink

);


// ==========================================
// UPDATE SOCIAL LINK
// ==========================================

router.put(

    "/:id",

    authMiddleware,

    socialLinksController.updateSocialLink

);


// ==========================================
// DELETE SOCIAL LINK
// ==========================================

router.delete(

    "/:id",

    authMiddleware,

    socialLinksController.deleteSocialLink

);


// ==========================================
// TOGGLE VISIBILITY
// ==========================================

router.patch(

    "/:id/visibility",

    authMiddleware,

    socialLinksController.toggleSocialLinkVisibility

);


// ==========================================
// UPDATE DISPLAY ORDER
// ==========================================

router.patch(

    "/:id/order",

    authMiddleware,

    socialLinksController.updateSocialLinkOrder

);


// ==========================================
// EXPORT
// ==========================================

module.exports = router;