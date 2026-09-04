const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/authMiddleware');

// Public route (no auth)
router.post('/inquiry', messageController.submitInquiry);

// All other routes require authentication
router.use(authenticate);

router.get('/', messageController.getConversations);
router.get('/:id', messageController.getConversation);
router.post('/', messageController.createConversation);
router.post('/:id/messages', messageController.sendMessage);
router.put('/:id', messageController.updateConversation);
router.delete('/:id', messageController.deleteConversation);

module.exports = router;