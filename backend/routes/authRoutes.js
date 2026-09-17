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

module.exports = router;