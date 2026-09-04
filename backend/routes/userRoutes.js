const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/me', userController.getMe);
router.put('/me', userController.updateMe);
router.get('/profile', userController.getProfile);

module.exports = router;