import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  setupKeys, unlockWithPassword, unlockWithRecoveryPhrase, rewrapForNewPassword, regenerateRecoveryPhrase,
  persistKey, loadPersistedKey, clearPersistedKey,
} from '../utils/crypto';

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
  encryptionSetUp?: boolean;
}

export interface LoginResult {
  verificationRequired: boolean;
  pendingLoginId?: string;
}

export interface ResetResult {
  done: boolean;
  sameAsCurrentPassword?: boolean;
  needsPhraseConfirmation?: boolean;
  message: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyLogin: (pendingLoginId: string, code: string, password?: string) => Promise<void>;
  register: (username: string, email: string, password: string, inviteToken: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string, confirmSame?: boolean, recoveryPhrase?: string, confirmNoPhrase?: boolean) => Promise<ResetResult>;
  logout: () => void;
  finishProfile: (updated: User) => void;
  updateAvatar:  (avatar: string) => void;
  loading: boolean;
  privateKey: CryptoKey | null;
  pendingRecoveryPhrase: string | null;
  dismissRecoveryPhrase: () => void;
  regenerateRecovery: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [pendingRecoveryPhrase, setPendingRecoveryPhrase] = useState<string | null>(null);

  // Unlocks the user's encryption key with the password they just typed —
  // or, for a user who's never set one up, generates one right now. Either
  // way this never sends the password anywhere; it's used only locally.
  const unlockOrSetupEncryption = async (authToken: string, password: string) => {
    try {
      const res = await fetch('/api/auth/encryption-keys', { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();

      if (data.encryptionSetUp) {
        const key = await unlockWithPassword(password, data.passwordSalt, data.encryptedPrivateKey, data.encryptedPrivateKeyIv);
        setPrivateKey(key);
        await persistKey(key);
      } else {
        const bundle = await setupKeys(password);
        await fetch('/api/auth/encryption-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            publicKey: bundle.publicKey,
            passwordSalt: bundle.passwordSalt,
            encryptedPrivateKey: bundle.encryptedPrivateKey,
            encryptedPrivateKeyIv: bundle.encryptedPrivateKeyIv,
            recoverySalt: bundle.recoverySalt,
            encryptedPrivateKeyRecovery: bundle.encryptedPrivateKeyRecovery,
            encryptedPrivateKeyRecoveryIv: bundle.encryptedPrivateKeyRecoveryIv,
          }),
        });
        setPrivateKey(bundle.privateKey);
        await persistKey(bundle.privateKey);
        setPendingRecoveryPhrase(bundle.recoveryPhrase);
        setUser(u => u ? { ...u, encryptionSetUp: true } : u);
      }
    } catch (err) {
      // Never let a crypto hiccup block login itself — messaging encryption
      // just won't be available this session if this fails.
      console.error('Encryption unlock/setup failed:', err);
    }
  };

  const regenerateRecovery = async () => {
    if (!privateKey || !token) throw new Error('Encryption is not set up yet');
    const bundle = await regenerateRecoveryPhrase(privateKey);
    await fetch('/api/auth/regenerate-recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        recoverySalt: bundle.recoverySalt,
        encryptedPrivateKeyRecovery: bundle.encryptedPrivateKeyRecovery,
        encryptedPrivateKeyRecoveryIv: bundle.encryptedPrivateKeyRecoveryIv,
      }),
    });
    setPendingRecoveryPhrase(bundle.recoveryPhrase);
  };

  const dismissRecoveryPhrase = () => setPendingRecoveryPhrase(null);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.user) setUser(data.user); else clearAuth(); })
      .catch(clearAuth)
      .finally(() => setLoading(false));

    // Restore the already-unlocked private key — stored in localStorage
    // alongside the token, so any tab sharing that login (including ones
    // opened after the fact) has it immediately, no re-login required.
    loadPersistedKey().then(key => { if (key) setPrivateKey(key); }).catch(() => {});
  }, []);

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    setPrivateKey(null);
    clearPersistedKey();
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
    await unlockOrSetupEncryption(data.token, password);
    return { verificationRequired: false };
  };

  const verifyLogin = async (pendingLoginId: string, code: string, password?: string) => {
    const res  = await fetch('/api/auth/verify-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pendingLoginId, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Verification failed');
    persist(data.token, data.user);
    if (password) await unlockOrSetupEncryption(data.token, password);
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
    await unlockOrSetupEncryption(data.token, password);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    // If encryption is set up and the key is unlocked in this session,
    // re-wrap the (unchanged) private key under the new password so it
    // doesn't go stale — otherwise it'd still be locked with the old one.
    let keyFields: Record<string, string> = {};
    if (privateKey) {
      keyFields = await rewrapForNewPassword(privateKey, newPassword);
    }

    const res  = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword, ...keyFields }),
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

  const resetPassword = async (
    resetToken: string, newPassword: string, confirmSame?: boolean, recoveryPhrase?: string, confirmNoPhrase?: boolean,
  ): Promise<ResetResult> => {
    // Find out up front whether this new password is actually different
    // from the current one. If it isn't, nothing about the encryption key
    // needs to change — the existing wrapping is already valid for it — so
    // none of the recovery-phrase logic below should even run.
    const infoRes = await fetch(`/api/auth/reset-recovery-info/${resetToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    const info = await infoRes.json();
    if (!infoRes.ok) throw new Error(info.message || 'This reset link is invalid or has expired.');

    if (info.sameAsCurrentPassword && !confirmSame) {
      return { done: false, sameAsCurrentPassword: true, message: 'This is the same as your current password — are you sure you want to keep it?' };
    }

    let keyFields: Record<string, string> = {};
    let recoveredKey: CryptoKey | null = null;
    let newBundle: Awaited<ReturnType<typeof setupKeys>> | null = null;

    if (!info.sameAsCurrentPassword && info.encryptionSetUp) {
      if (recoveryPhrase?.trim()) {
        try {
          recoveredKey = await unlockWithRecoveryPhrase(recoveryPhrase, info.recoverySalt, info.encryptedPrivateKeyRecovery, info.encryptedPrivateKeyRecoveryIv);
          keyFields = await rewrapForNewPassword(recoveredKey, newPassword);
        } catch {
          throw new Error('That recovery phrase doesn\'t match this account. Double-check the words and try again.');
        }
      } else if (!confirmNoPhrase) {
        // Give the caller a chance to warn before generating a replacement
        // key — this is a one-way door (the old key becomes unrecoverable).
        return { done: false, needsPhraseConfirmation: true, message: '' };
      } else {
        // No recovery phrase to recover the old key with — generate a brand
        // new keypair instead so messages sent/received from now on stay
        // encrypted. Anything wrapped under the old (now-discarded) key is
        // unrecoverable either way, so there's nothing lost by replacing it.
        newBundle = await setupKeys(newPassword);
        keyFields = {
          publicKey: newBundle.publicKey,
          passwordSalt: newBundle.passwordSalt,
          encryptedPrivateKey: newBundle.encryptedPrivateKey,
          encryptedPrivateKeyIv: newBundle.encryptedPrivateKeyIv,
          recoverySalt: newBundle.recoverySalt,
          encryptedPrivateKeyRecovery: newBundle.encryptedPrivateKeyRecovery,
          encryptedPrivateKeyRecoveryIv: newBundle.encryptedPrivateKeyRecoveryIv,
        };
      }
    }

    const res  = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword, confirmSame, ...keyFields }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to reset password');

    if (recoveredKey) {
      setPrivateKey(recoveredKey);
      await persistKey(recoveredKey);
    } else if (newBundle) {
      setPrivateKey(newBundle.privateKey);
      await persistKey(newBundle.privateKey);
      setPendingRecoveryPhrase(newBundle.recoveryPhrase);
    }

    return { done: true, sameAsCurrentPassword: false, message: data.message };
  };

  const logout = clearAuth;

  const finishProfile = (updated: User) => setUser(updated);
  const updateAvatar  = (avatar: string) => setUser(u => u ? { ...u, avatar } : u);

  return (
    <AuthContext.Provider value={{
      user, token, login, verifyLogin, register, changePassword, forgotPassword, resetPassword, logout,
      finishProfile, updateAvatar, loading, privateKey,
      pendingRecoveryPhrase, dismissRecoveryPhrase, regenerateRecovery,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
