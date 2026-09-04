const { db } = require('../database/schema'); // adjust to your DB client

class NotificationService {
  async createNotification({ userId, type, category, priority, title, message, referenceType, referenceId, actionType }) {
    const result = await db.query(
      `INSERT INTO notifications 
       (user_id, type, category, priority, title, message, reference_type, reference_id, action_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, type, category, priority, title, message, referenceType, referenceId, actionType]
    );
    return result.rows[0];
  }

  async getNotifications(userId, { limit = 20, offset = 0, unreadOnly = false, category = null, period = null }) {
    let query = `SELECT * FROM notifications WHERE user_id = $1 AND archived_at IS NULL`;
    const params = [userId];
    let idx = 2;
    if (unreadOnly) {
      query += ` AND is_read = false`;
    }
    if (category) {
      query += ` AND category = $${idx}`;
      params.push(category);
      idx++;
    }
    if (period === 'today') {
      query += ` AND created_at >= CURRENT_DATE`;
    } else if (period === 'week') {
      query += ` AND created_at >= CURRENT_DATE - INTERVAL '7 days'`;
    } else if (period === 'month') {
      query += ` AND created_at >= CURRENT_DATE - INTERVAL '30 days'`;
    } else if (period === 'older') {
      query += ` AND created_at < CURRENT_DATE - INTERVAL '30 days'`;
    }
    query += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);
    const result = await db.query(query, params);
    return result.rows;
  }

  async getUnreadCount(userId) {
    const result = await db.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false AND archived_at IS NULL`,
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  async markAsRead(userId, notificationId) {
    const result = await db.query(
      `UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND archived_at IS NULL
       RETURNING *`,
      [notificationId, userId]
    );
    return result.rows[0];
  }

  async markAsUnread(userId, notificationId) {
    const result = await db.query(
      `UPDATE notifications SET is_read = false, read_at = NULL
       WHERE id = $1 AND user_id = $2 AND archived_at IS NULL
       RETURNING *`,
      [notificationId, userId]
    );
    return result.rows[0];
  }

  async markAllAsRead(userId) {
    await db.query(
      `UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = false AND archived_at IS NULL`,
      [userId]
    );
  }

  async archive(userId, notificationId) {
    const result = await db.query(
      `UPDATE notifications SET archived_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND archived_at IS NULL
       RETURNING *`,
      [notificationId, userId]
    );
    return result.rows[0];
  }
}

module.exports = new NotificationService();