// =========================================================
// CREVIO — ACCOUNT MANAGEMENT ROUTES
// =========================================================

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/accountController");

router.get("/info", authMiddleware, controller.getAccountInfo);
router.post("/deactivate", authMiddleware, controller.deactivateAccount);
router.post("/reactivate", controller.reactivateAccount);
router.post("/request-deletion", authMiddleware, controller.requestDeletion);
router.post("/cancel-deletion", authMiddleware, controller.cancelDeletion);

module.exports = router;