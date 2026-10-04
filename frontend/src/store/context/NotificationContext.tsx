import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Notification } from '../../util/types';
import { api } from '../../helpers/apiClient';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function getCurrentUserId(): string {
  try {
    const raw = localStorage.getItem('tricareer_user') || localStorage.getItem('user');
    const u = raw ? JSON.parse(raw) : null;
    return String(u?.Id ?? u?.id ?? u?.userId ?? u?.User_Id ?? '');
  } catch {
    return '';
  }
}

// Convertit la notification backend (NotificationId, Message, Timestamp, IsRead, UserId)
// vers le type utilisé par l'UI.
function mapNotification(n: any): Notification {
  const msg = n.message ?? n.Message ?? '';
  return {
    id: String(n.notificationId ?? n.NotificationId ?? n.id ?? ''),
    userId: String(n.userId ?? n.UserId ?? ''),
    type: 'info',
    title: 'Notification',
    message: msg,
    read: (n.isRead ?? n.IsRead ?? false) === true,
    createdAt: n.timestamp ?? n.Timestamp ?? new Date().toISOString(),
    link: undefined,
  } as Notification;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) { setNotifications([]); return; }
    try {
      const data = await api.get<any[]>(`/api/Notification/user/${userId}`);
      if (Array.isArray(data)) {
        setNotifications(data.map(mapNotification));
      }
    } catch {
      // silencieux : on garde l'état courant
    }
  }, []);

  // Chargement initial + rafraîchissement automatique (quasi temps réel)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 12000);
    // recharge aussi quand l'onglet reprend le focus
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString(),
    } as Notification;
    setNotifications((prev) => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    api.put(`/api/Notification/${id}/read`, {}).catch(() => {});
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const userId = getCurrentUserId();
    if (userId) api.put(`/api/Notification/user/${userId}/read-all`, {}).catch(() => {});
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    api.delete(`/api/Notification/${id}`).catch(() => {});
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        unreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
