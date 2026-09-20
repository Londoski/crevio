// =========================================================
// CREVIO — AUTH ROUTES
// File: backend/routes/authRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/authMiddleware");

router.post ("/register",      authController.register);
router.post ("/login",         authController.login);
router.post ("/logout",        authController.logout);
router.post ("/set-password",  authController.setPassword);
router.patch("/email",         auth, authController.changeEmail);
router.patch("/password",      auth, authController.changePassword);

router.post("/device-status",         authController.deviceStatus);
router.get("/trust-device-status",    auth, authController.trustDeviceStatus);
router.post("/trust-current-device",  auth, authController.trustCurrentDevice);
router.post("/untrust-current-device", auth, authController.untrustCurrentDevice);

router.post("/verify-2fa", authController.verify2FALogin);

module.exports = router;