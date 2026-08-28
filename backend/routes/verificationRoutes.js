// =========================================================
// CREVIO — VERIFICATION ROUTES
// =========================================================

const express =
    require("express");


const verificationController =
    require(
        "../controllers/verificationController"
    );


const authMiddleware =
    require(
        "../middleware/authMiddleware"
    );


const router =
    express.Router();


// =========================================================
// SECURITY STATUS
// =========================================================

router.get(
    "/security",
    authMiddleware,
    verificationController.getSecurityStatus
);


// =========================================================
// EMAIL VERIFICATION
// =========================================================

router.post(
    "/email/start",
    authMiddleware,
    verificationController.startEmailVerification
);


router.post(
    "/email/verify",
    authMiddleware,
    verificationController.verifyEmail
);


// =========================================================
// PHONE
// =========================================================

router.put(
    "/phone",
    authMiddleware,
    verificationController.setPhone
);


router.post(
    "/phone/start",
    authMiddleware,
    verificationController.startPhoneVerification
);


router.post(
    "/phone/verify",
    authMiddleware,
    verificationController.verifyPhone
);


module.exports =
    router;