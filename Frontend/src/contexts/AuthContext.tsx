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

export interface LoginResult {
  verificationRequired: boolean;
  pendingLoginId?: string;
}

export interface ResetResult {
  done: boolean;
  sameAsCurrentPassword?: boolean;
  message: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyLogin: (pendingLoginId: string, code: string) => Promise<void>;
  register: (username: string, email: string, password: string, inviteToken: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string, confirmSame?: boolean) => Promise<ResetResult>;
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

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    if (data.verificationRequired) {
      return { verificationRequired: true, pendingLoginId: data.pendingLoginId };
    }
    persist(data.token, data.user);
    return { verificationRequired: false };
  };

  const verifyLogin = async (pendingLoginId: string, code: string) => {
    const res  = await fetch('/api/auth/verify-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pendingLoginId, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Verification failed');
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

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res  = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update password');
  };

  const forgotPassword = async (email: string): Promise<string> => {
    const res  = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Something went wrong');
    return data.message as string;
  };

  const resetPassword = async (resetToken: string, newPassword: string, confirmSame?: boolean): Promise<ResetResult> => {
    const res  = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword, confirmSame }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to reset password');
    return { done: !data.sameAsCurrentPassword, sameAsCurrentPassword: !!data.sameAsCurrentPassword, message: data.message };
  };

  const logout = clearAuth;

  const finishProfile = (updated: User) => setUser(updated);
  const updateAvatar  = (avatar: string) => setUser(u => u ? { ...u, avatar } : u);

  return (
    <AuthContext.Provider value={{ user, token, login, verifyLogin, register, changePassword, forgotPassword, resetPassword, logout, finishProfile, updateAvatar, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
