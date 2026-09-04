const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');

// --- AUTH MIDDLEWARE (adapt to your actual auth) ---
// This is a placeholder; replace with your real auth middleware that sets req.user
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    // Verify token and attach user to req.user
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// ---- TEST ROUTE to confirm the router is mounted ----
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Notifications router is working!' });
});

// ---- GET /api/notifications ----
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 20, offset = 0, unread = false, category, period } = req.query;
    const notifications = await notificationService.getNotifications(
      req.user.id,
      {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        unreadOnly: unread === 'true',
        category,
        period
      }
    );
    res.json({ success: true, notifications });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to load notifications' });
  }
});

// ---- GET /api/notifications/unread-count ----
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ success: true, count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to get unread count' });
  }
});

// ---- PATCH /api/notifications/:id/read ----
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.user.id, req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    res.json({ success: true, notification });
  } catch (err) {
    console.error('Error marking as read:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to mark as read' });
  }
});

// ---- PATCH /api/notifications/:id/unread ----
router.patch('/:id/unread', authenticate, async (req, res) => {
  try {
    const notification = await notificationService.markAsUnread(req.user.id, req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    res.json({ success: true, notification });
  } catch (err) {
    console.error('Error marking as unread:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to mark as unread' });
  }
});

// ---- PATCH /api/notifications/read-all ----
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking all as read:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to mark all as read' });
  }
});

// ---- PATCH /api/notifications/:id/archive ----
router.patch('/:id/archive', authenticate, async (req, res) => {
  try {
    const notification = await notificationService.archive(req.user.id, req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    res.json({ success: true, notification });
  } catch (err) {
    console.error('Error archiving notification:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to archive notification' });
  }
});

module.exports = router;