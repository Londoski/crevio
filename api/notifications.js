import api from './api'; // your configured fetch client with auth header

export const getNotifications = (params) => api.get('/notifications', { params });
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markAsRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAsUnread = (id) => api.patch(`/notifications/${id}/unread`);
export const markAllAsRead = () => api.patch('/notifications/read-all');
export const archiveNotification = (id) => api.patch(`/notifications/${id}/archive`);