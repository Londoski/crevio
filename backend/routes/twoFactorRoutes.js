// =========================================================
// CREVIO — TWO FACTOR ROUTES
// =========================================================

const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/twoFactorController");
const authController = require("../controllers/authController");

const router = express.Router();

// =========================================================
// AUTHENTICATOR SETUP
// =========================================================

router.post("/setup", authMiddleware, controller.setupAuthenticator);

// =========================================================
// VERIFY SETUP
// =========================================================

router.post("/verify-setup", authMiddleware, controller.verifyAuthenticatorSetup);

// =========================================================
// DISABLE 2FA
// =========================================================

router.post("/disable", authMiddleware, controller.disableTwoFactor);

// =========================================================
// RECOVERY CODES
// =========================================================

router.post("/recovery-codes/regenerate", authMiddleware, controller.regenerateRecoveryCodes);

// =========================================================
// VERIFY 2FA CHALLENGE (LOGIN)
// =========================================================

router.post("/verify-challenge", authController.verifyTwoFactorChallenge);

module.exports = router;

// =========================================================
// AUTHENTICATOR SETUP
// =========================================================

router.post(
    "/setup",
    authMiddleware,
    controller.setupAuthenticator
);


// =========================================================
// VERIFY SETUP
// =========================================================

router.post(
    "/verify-setup",
    authMiddleware,
    controller.verifyAuthenticatorSetup
);


// =========================================================
// DISABLE 2FA
// =========================================================

router.post(
    "/disable",
    authMiddleware,
    controller.disableTwoFactor
);


// =========================================================
// RECOVERY CODES
// =========================================================

router.post(
    "/recovery-codes/regenerate",
    authMiddleware,
    controller.regenerateRecoveryCodes
);


module.exports =
    router;