const express = require("express");
const router = express.Router();

// Dummy middleware that just calls next() – no auth checks
const dummyAuth = (req, res, next) => {
    req.user = { id: 1 }; // mock user
    next();
};

// All handlers are inline functions – no controller import
router.post("/verify-email", dummyAuth, (req, res) => res.json({ success: true, message: "verify-email" }));
router.post("/resend-verification", dummyAuth, (req, res) => res.json({ success: true, message: "resend-verification" }));
router.post("/verify-phone", dummyAuth, (req, res) => res.json({ success: true, message: "verify-phone" }));
router.post("/send-phone-verification", dummyAuth, (req, res) => res.json({ success: true, message: "send-phone-verification" }));
router.post("/forgot-password", (req, res) => res.json({ success: true, message: "forgot-password" }));
router.post("/reset-password", (req, res) => res.json({ success: true, message: "reset-password" }));
router.get("/verification-status", dummyAuth, (req, res) => res.json({ success: true, message: "status" }));

console.log("✅ verificationRoutes loaded with inline handlers");

module.exports = router;