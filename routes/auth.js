const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../db'); // your database client
const notificationService = require('../services/notificationService');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // 2. Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Device detection
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || '0.0.0.0';

    // Check if this device (userAgent + IP) has been seen before for this user
    const sessionCheck = await db.query(
      `SELECT id FROM sessions 
       WHERE user_id = $1 AND user_agent = $2 AND ip_address = $3`,
      [user.id, userAgent, ipAddress]
    );
    const isNewDevice = sessionCheck.rows.length === 0;

    // 5. Create a session record (always store this login)
    const sessionResult = await db.query(
      `INSERT INTO sessions (user_id, user_agent, ip_address, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id`,
      [user.id, userAgent, ipAddress]
    );
    const sessionId = sessionResult.rows[0].id;

    // 6. If new device, create a security notification
    if (isNewDevice) {
      await notificationService.createNotification({
        userId: user.id,
        type: 'NEW_LOGIN',
        category: 'Security',
        priority: 'CRITICAL',
        title: 'New login detected',
        message: `A new device signed into your Crevio account.`,
        referenceType: 'session',
        referenceId: sessionId,
        actionType: 'review_security'
      });
    }

    // 7. Return token and user data
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        display_name: user.display_name,
        email: user.email,
        profile_image: user.profile_image
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;