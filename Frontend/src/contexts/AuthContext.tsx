import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface User {
  id:              string;
  username:        string;
  email:           string;
  profileComplete: boolean;
  investingSince?: number;
  role?:           string;
  strategy?:       string;
  aum?:            string;
  bio?:            string;
  avatar?:         string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, inviteToken: string) => Promise<void>;
  logout: () => void;
  finishProfile: (updated: User) => void;
  updateAvatar:  (avatar: string) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.user) setUser(data.user); else clearAuth(); })
      .catch(clearAuth)
      .finally(() => setLoading(false));
  }, []);

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    window.location.replace('/');
  };

  const persist = (token: string, user: User) => {
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
  };

  const login = async (email: string, password: string) => {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    persist(data.token, data.user);
  };

  const register = async (username: string, email: string, password: string, inviteToken: string) => {
    const res  = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, inviteToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    persist(data.token, data.user);
  };

  const logout = clearAuth;

  const finishProfile = (updated: User) => setUser(updated);
  const updateAvatar  = (avatar: string) => setUser(u => u ? { ...u, avatar } : u);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, finishProfile, updateAvatar, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
