// =========================================================
// CREVIO — TWO FACTOR ROUTES
// File: backend/routes/twoFactorRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const twoFactorController = require("../controllers/twoFactorController");

router.post("/setup",   auth, twoFactorController.setup);
router.post("/disable", auth, twoFactorController.disable);
router.post("/verify",  auth, twoFactorController.verify);
router.get("/status",   auth, twoFactorController.status);

module.exports = router;