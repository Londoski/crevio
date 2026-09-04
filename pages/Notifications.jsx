import { useEffect, useState, useCallback } from 'react';
import { getNotifications, markAsRead, markAsUnread, archiveNotification, markAllAsRead, getUnreadCount } from '../api/notifications';
import NotificationItem from '../components/NotificationItem';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      const params = {
        limit: 20,
        offset: reset ? 0 : page * 20,
        unread: filter === 'unread',
        category: categoryFilter || undefined
      };
      const res = await getNotifications(params);
      const newList = res.data.notifications;
      setNotifications(prev => reset ? newList : [...prev, ...newList]);
      setHasMore(newList.length === 20);
      if (reset) setPage(0);
      // Refresh unread count
      const countRes = await getUnreadCount();
      setUnreadCount(countRes.data.count);
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [filter, categoryFilter, page]);

  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  const loadMore = () => {
    setPage(prev => prev + 1);
    fetchNotifications(false);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    fetchNotifications(true);
    const countRes = await getUnreadCount();
    setUnreadCount(countRes.data.count);
  };

  const handleRead = async (id) => {
    await markAsRead(id);
    fetchNotifications(true);
  };

  const handleUnread = async (id) => {
    await markAsUnread(id);
    fetchNotifications(true);
  };

  const handleArchive = async (id) => {
    await archiveNotification(id);
    fetchNotifications(true);
  };

  // Group notifications by date
  const groupNotifications = (list) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const groups = {};
    list.forEach(n => {
      const date = new Date(n.created_at);
      let key;
      if (date >= today) key = 'Today';
      else if (date >= yesterday) key = 'Yesterday';
      else if (date >= weekStart) key = 'This week';
      else key = 'Older';
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    // Preserve order
    const order = ['Today', 'Yesterday', 'This week', 'Older'];
    const sorted = {};
    order.forEach(k => { if (groups[k]) sorted[k] = groups[k]; });
    return sorted;
  };

  const grouped = groupNotifications(notifications);

  if (loading && notifications.length === 0) {
    return (
      <div className="notifications-page" style={{ padding: '20px' }}>
        <h1>Notifications</h1>
        <div style={{ marginTop: '20px' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: '60px', background: 'var(--bg-secondary)', marginBottom: '8px', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
        <style>{`
          @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notifications-page" style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Notifications</h1>
        <div style={{ color: 'var(--danger)', marginTop: '20px' }}>
          <p>Something went wrong.</p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{error}</p>
          <button
            onClick={() => fetchNotifications(true)}
            style={{
              marginTop: '12px',
              padding: '8px 20px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page" style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>Notifications</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Stay up to date with activity on your Crevio account.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="primary-button"
            style={{
              padding: '8px 16px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Mark all as read
          </button>
        )}
      </header>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
          style={{
            padding: '6px 16px',
            borderRadius: '999px',
            border: '1px solid var(--border-color)',
            background: filter === 'all' ? 'var(--accent)' : 'transparent',
            color: filter === 'all' ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          All
        </button>
        <button
          className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
          style={{
            padding: '6px 16px',
            borderRadius: '999px',
            border: '1px solid var(--border-color)',
            background: filter === 'unread' ? 'var(--accent)' : 'transparent',
            color: filter === 'unread' ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Unread
        </button>
        {/* Category filter dropdown can be added here */}
      </div>

      <div className="notification-feed">
        {Object.keys(grouped).length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>You're all caught up.</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
              Important updates about your account, portfolio, billing and activity will appear here.
            </p>
          </div>
        )}
        {Object.entries(grouped).map(([label, items]) => (
          <div key={label}>
            <h3 style={{ margin: '16px 0 8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>
              {label}
            </h3>
            {items.map(notif => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onRead={handleRead}
                onUnread={handleUnread}
                onArchive={handleArchive}
              />
            ))}
          </div>
        ))}
        {hasMore && (
          <button
            onClick={loadMore}
            style={{
              margin: '16px auto',
              display: 'block',
              padding: '8px 20px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}