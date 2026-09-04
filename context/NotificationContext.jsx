import { createContext, useContext, useState, useEffect } from 'react';
import { getUnreadCount } from '../api/notifications';

const NotificationContext = createContext();

export const useNotificationCount = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshCount = async () => {
    try {
      const res = await getUnreadCount();
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  useEffect(() => {
    refreshCount();
    // Optional: set up polling every 30 seconds
    const interval = setInterval(refreshCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshCount }}>
      {children}
    </NotificationContext.Provider>
  );
}