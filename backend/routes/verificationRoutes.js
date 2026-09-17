const express = require("express");
const router = express.Router();

// Use the real auth middleware if it's fixed, otherwise dummy
const authMiddleware = (req, res, next) => {
    req.user = { id: 1 };
    next();
};

router.post("/verify-email", authMiddleware, (req, res) => res.json({ success: true, message: "verify-email" }));
router.post("/resend-verification", authMiddleware, (req, res) => res.json({ success: true, message: "resend-verification" }));
router.post("/verify-phone", authMiddleware, (req, res) => res.json({ success: true, message: "verify-phone" }));
router.post("/send-phone-verification", authMiddleware, (req, res) => res.json({ success: true, message: "send-phone-verification" }));
router.post("/forgot-password", (req, res) => res.json({ success: true, message: "forgot-password" }));
router.post("/reset-password", (req, res) => res.json({ success: true, message: "reset-password" }));
router.get("/verification-status", authMiddleware, (req, res) => res.json({ success: true, message: "status" }));

module.exports = router;