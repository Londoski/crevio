import { useState } from 'react';
import { MoreVertical } from 'lucide-react';

export default function NotificationItem({ notification, onRead, onUnread, onArchive }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleClick = () => {
    if (!notification.is_read) {
      onRead(notification.id);
    }
    // Navigate based on reference
    // Example: window.location.href = `/messages/${notification.reference_id}`;
    // You can implement a mapping of actionType to routes.
  };

  return (
    <div
      className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
      onClick={handleClick}
      style={{ cursor: 'pointer', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          {!notification.is_read && (
            <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '18px' }}>●</span>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>{notification.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{notification.message}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {new Date(notification.created_at).toLocaleString()}
            </div>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '4px 0',
                zIndex: 10,
                boxShadow: 'var(--shadow)',
                minWidth: '140px'
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  notification.is_read ? onUnread(notification.id) : onRead(notification.id);
                  setMenuOpen(false);
                }}
                style={{
                  display: 'block',
                  padding: '6px 12px',
                  background: 'none',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: 'var(--text-primary)'
                }}
              >
                {notification.is_read ? 'Mark as unread' : 'Mark as read'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(notification.id);
                  setMenuOpen(false);
                }}
                style={{
                  display: 'block',
                  padding: '6px 12px',
                  background: 'none',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: 'var(--text-primary)'
                }}
              >
                Archive
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}