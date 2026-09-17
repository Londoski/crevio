// =========================================================
// CREVIO — ACCOUNT ROUTES
// File: backend/routes/accountRoutes.js
// =========================================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const accountController = require("../controllers/accountController");

router.get("/overview",         auth, accountController.getOverview);
router.post("/deactivate",      auth, accountController.deactivate);
router.post("/reactivate",      auth, accountController.reactivate);
router.post("/delete",          auth, accountController.deleteAccount);
router.post("/cancel-deletion", auth, accountController.cancelDeletion);
router.get("/export",           auth, accountController.exportData);

module.exports = router;