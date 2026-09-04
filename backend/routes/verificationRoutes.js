// =========================================================
// CREVIO — VERIFICATION ROUTES
// =========================================================

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const verificationController = require("../controllers/verificationController");

// ---- Email verification ----
router.post("/verify-email", authMiddleware, verificationController.verifyEmail);
router.post("/resend-verification", authMiddleware, verificationController.resendVerification);

// ---- Phone verification ----
router.post("/verify-phone", authMiddleware, verificationController.verifyPhone);
router.post("/send-phone-verification", authMiddleware, verificationController.sendPhoneVerification);

// ---- Password reset (public) ----
router.post("/forgot-password", verificationController.forgotPassword);
router.post("/reset-password", verificationController.resetPassword);

// ---- Check verification status ----
router.get("/verification-status", authMiddleware, verificationController.getVerificationStatus);

module.exports = router;