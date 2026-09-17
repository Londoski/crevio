// =========================================================
// CREVIO — SECURITY ROUTES
// File: backend/routes/securityRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const securityController = require("../controllers/securityController");

router.post("/change-password",  auth, securityController.changePassword);
router.get("/sessions",          auth, securityController.getSessions);
router.delete("/sessions/:id",   auth, securityController.revokeSession);
router.delete("/sessions",       auth, securityController.revokeAllSessions);
router.post("/2fa",              auth, securityController.toggle2FA);
router.post("/recovery-codes",   auth, securityController.generateRecoveryCodes);

module.exports = router;