const request = require('supertest');
const app = require('../app');

describe('Notifications API', () => {
  let token;

  beforeAll(async () => {
    // Replace with your actual login endpoint and credentials
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    token = res.body.token;
  });

  test('GET /api/notifications returns user notifications', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.notifications)).toBe(true);
  });

  test('GET /api/notifications/unread-count returns number', async () => {
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.count).toBe('number');
  });

  test('PATCH /api/notifications/:id/read marks as read', async () => {
    // Get a notification id first
    const list = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    const id = list.body.notifications[0]?.id;
    if (id) {
      const res = await request(app)
        .patch(`/api/notifications/${id}/read`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.notification.is_read).toBe(true);
    }
  });

  test('PATCH /api/notifications/:id/unread marks as unread', async () => {
    const list = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    const id = list.body.notifications[0]?.id;
    if (id) {
      const res = await request(app)
        .patch(`/api/notifications/${id}/unread`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.notification.is_read).toBe(false);
    }
  });

  test('PATCH /api/notifications/read-all marks all as read', async () => {
    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Verify count is 0
    const countRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`);
    expect(countRes.body.count).toBe(0);
  });

  test('PATCH /api/notifications/:id/archive archives notification', async () => {
    const list = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    const id = list.body.notifications[0]?.id;
    if (id) {
      const res = await request(app)
        .patch(`/api/notifications/${id}/archive`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.notification.archived_at).not.toBeNull();
    }
  });
});