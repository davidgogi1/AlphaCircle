import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../api';

interface SavedContextType {
  savedPostIds:   Set<string>;
  savedThreadIds: Set<string>;
  togglePost:     (id: string) => Promise<void>;
  toggleThread:   (id: string) => Promise<void>;
}

const SavedContext = createContext<SavedContextType | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const [savedPostIds,   setSavedPostIds]   = useState<Set<string>>(new Set());
  const [savedThreadIds, setSavedThreadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get('/saved/ids').then(d => {
      setSavedPostIds(new Set(d.savedPostIds));
      setSavedThreadIds(new Set(d.savedThreadIds));
    }).catch(() => {});
  }, []);

  const togglePost = useCallback(async (id: string) => {
    // Optimistic
    setSavedPostIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
    try {
      await api.post(`/saved/posts/${id}`, {});
    } catch {
      // Revert on failure
      setSavedPostIds(prev => {
        const s = new Set(prev);
        s.has(id) ? s.delete(id) : s.add(id);
        return s;
      });
    }
  }, []);

  const toggleThread = useCallback(async (id: string) => {
    setSavedThreadIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
    try {
      await api.post(`/saved/threads/${id}`, {});
    } catch {
      setSavedThreadIds(prev => {
        const s = new Set(prev);
        s.has(id) ? s.delete(id) : s.add(id);
        return s;
      });
    }
  }, []);

  return (
    <SavedContext.Provider value={{ savedPostIds, savedThreadIds, togglePost, toggleThread }}>
      {children}
    </SavedContext.Provider>
  );
}

export const useSaved = () => {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used within SavedProvider');
  return ctx;
};
