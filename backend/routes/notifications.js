const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');

// Auth middleware (adapt to your actual auth)
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Notifications router is working!' });
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 20, offset = 0, unread = false, category, period } = req.query;
    const notifications = await notificationService.getNotifications(
      req.user.id,
      { limit: parseInt(limit), offset: parseInt(offset), unreadOnly: unread === 'true', category, period }
    );
    res.json({ success: true, notifications });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ success: true, count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.user.id, req.params.id);
    if (!notification) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, notification });
  } catch (err) {
    console.error('Error marking as read:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/:id/unread', authenticate, async (req, res) => {
  try {
    const notification = await notificationService.markAsUnread(req.user.id, req.params.id);
    if (!notification) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, notification });
  } catch (err) {
    console.error('Error marking as unread:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking all as read:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/:id/archive', authenticate, async (req, res) => {
  try {
    const notification = await notificationService.archive(req.user.id, req.params.id);
    if (!notification) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, notification });
  } catch (err) {
    console.error('Error archiving:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;