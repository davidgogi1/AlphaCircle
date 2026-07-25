import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { api } from '../api';
import { useAuth } from './AuthContext';

interface MessageNotificationsContextType {
  unreadCounts: Record<string, number>;
  totalUnread:  number;
  markRead:     (otherUserId: string) => void;
  refresh:      () => void;
  socket:       Socket | null;
}

const MessageNotificationsContext = createContext<MessageNotificationsContextType | null>(null);

export function MessageNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  const refresh = useCallback(() => {
    api.get('/messages/conversations').then(d => {
      const counts: Record<string, number> = {};
      for (const c of d.conversations) {
        if (c.unreadCount > 0) counts[c.otherUser._id] = c.unreadCount;
      }
      setUnreadCounts(counts);
    }).catch(() => {});
  }, []);

  const markRead = useCallback((otherUserId: string) => {
    setUnreadCounts(prev => {
      if (!prev[otherUserId]) return prev;
      const next = { ...prev };
      delete next[otherUserId];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCounts({});
      return;
    }

    refresh();

    const token = localStorage.getItem('token');
    const s = io({ auth: { token } });
    socketRef.current = s;
    setSocket(s);

    s.on('new_message', () => refresh());

    return () => { s.disconnect(); socketRef.current = null; setSocket(null); };
  }, [user?.id, refresh]);

  return (
    <MessageNotificationsContext.Provider value={{ unreadCounts, totalUnread, markRead, refresh, socket }}>
      {children}
    </MessageNotificationsContext.Provider>
  );
}

export const useMessageNotifications = () => {
  const ctx = useContext(MessageNotificationsContext);
  if (!ctx) throw new Error('useMessageNotifications must be used within MessageNotificationsProvider');
  return ctx;
};
