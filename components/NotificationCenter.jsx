import { useEffect, useState } from 'react';
import { getNotifications, markAsRead } from '../api/notifications';
import { useNavigate } from 'react-router-dom';

export default function NotificationCenter({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getNotifications({ limit: 5, unread: false });
        setNotifications(res.data.notifications);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleRead = async (id) => {
    await markAsRead(id);
    const res = await getNotifications({ limit: 5 });
    setNotifications(res.data.notifications);
  };

  const handleViewAll = () => {
    navigate('/dashboard/notifications');
    onClose();
  };

  if (loading) {
    return (
      <div style={{ width: '360px', padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', boxShadow: 'var(--shadow)' }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading…</div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '360px',
        maxHeight: '400px',
        overflowY: 'auto',
        background: 'var(--bg-card)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow)',
        padding: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Notifications</h3>
        <button
          onClick={handleViewAll}
          style={{
            fontSize: '13px',
            color: 'var(--accent)',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          View all
        </button>
      </div>
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No new notifications</div>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            style={{
              padding: '8px 0',
              borderBottom: '1px solid var(--border-color)',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (!n.is_read) handleRead(n.id);
              // Navigate based on reference (you can extend this)
              // e.g., navigate(`/messages/${n.reference_id}`);
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: n.is_read ? 'normal' : '600', color: 'var(--text-primary)' }}>
                {n.title}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {new Date(n.created_at).toLocaleTimeString()}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {n.message}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
