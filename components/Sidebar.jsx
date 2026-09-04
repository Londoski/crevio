import { useNotificationCount } from '../context/NotificationContext';
// ... other imports

function Sidebar() {
  const { unreadCount } = useNotificationCount();

  return (
    <aside className="sidebar">
      {/* ... other nav items */}
      <a href="/dashboard/notifications" className="nav-item">
        <i data-lucide="bell" className="icon"></i>
        Notifications
        {unreadCount > 0 && (
          <span className="badge" style={{ marginLeft: 'auto' }}>{unreadCount}</span>
        )}
      </a>
      {/* ... */}
    </aside>
  );
}