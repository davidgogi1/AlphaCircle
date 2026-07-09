import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { api } from '../api';

interface GroupNotificationsContextType {
  pendingCount:        number;
  setPendingCount:     React.Dispatch<React.SetStateAction<number>>;
  transferOfferCount:  number;
  unreadCounts:        Record<string, number>;
  totalUnread:         number;
  markRead:            (groupId: string) => void;
  refresh:             () => void;
  socket:              Socket | null;
}

const GroupNotificationsContext = createContext<GroupNotificationsContextType | null>(null);

export function GroupNotificationsProvider({ children }: { children: ReactNode }) {
  const [pendingCount,       setPendingCount]       = useState(0);
  const [transferOfferCount, setTransferOfferCount] = useState(0);
  const [unreadCounts,       setUnreadCounts]       = useState<Record<string, number>>({});
  const socketRef = useRef<Socket | null>(null);
  const [socket,  setSocket] = useState<Socket | null>(null);

  const totalUnread = Object.values(unreadCounts).filter(c => c > 0).length;

  const refresh = useCallback(() => {
    api.get('/groups').then(d => {
      setPendingCount(d.pending.length);
      setTransferOfferCount((d.pendingTransfers ?? []).length);
      const counts: Record<string, number> = {};
      for (const g of d.accepted) {
        if (g.unreadCount > 0) counts[g._id] = g.unreadCount;
      }
      setUnreadCounts(counts);
    }).catch(() => {});
  }, []);

  const markRead = useCallback((groupId: string) => {
    setUnreadCounts(prev => {
      if (!prev[groupId]) return prev;
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
    api.post(`/groups/${groupId}/read`, {}).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();

    const token = localStorage.getItem('token');
    const s = io({ auth: { token } });
    socketRef.current = s;
    setSocket(s);

    s.on('group_invite',          () => refresh());
    s.on('group_message',         () => refresh());
    s.on('admin_transfer_offer',  () => refresh());
    s.on('admin_transfer_response', () => refresh());

    return () => { s.disconnect(); socketRef.current = null; setSocket(null); };
  }, [refresh]);

  return (
    <GroupNotificationsContext.Provider value={{
      pendingCount, setPendingCount,
      transferOfferCount,
      unreadCounts, totalUnread,
      markRead, refresh, socket,
    }}>
      {children}
    </GroupNotificationsContext.Provider>
  );
}

export const useGroupNotifications = () => {
  const ctx = useContext(GroupNotificationsContext);
  if (!ctx) throw new Error('useGroupNotifications must be used within GroupNotificationsProvider');
  return ctx;
};
