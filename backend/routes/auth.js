const express = require('express');
const router = express.Router();

// Minimal auth for testing – replace with your actual auth later
router.post('/login', (req, res) => {
  // Dummy login – just return a token for testing
  res.json({
    success: true,
    token: 'dummy-token-for-testing',
    user: { id: 1, display_name: 'Test User', email: 'test@example.com' }
  });
});

// A protected route example
router.get('/me', (req, res) => {
  // In real auth, you'd verify token and return user
  res.json({ success: true, user: { id: 1, display_name: 'Test User' } });
});

module.exports = router;