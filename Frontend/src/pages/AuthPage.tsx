import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AuthPage.css';

type Mode = 'login' | 'register';

interface InviteState {
  status: 'idle' | 'checking' | 'valid' | 'invalid';
  email:  string;
  token:  string;
}

export default function AuthPage() {
  const { login, register } = useAuth();

  // Read invite token from URL (AuthPage renders outside BrowserRouter)
  const params      = new URLSearchParams(window.location.search);
  const tokenInUrl  = params.get('invite') ?? '';

  const [mode, setMode]         = useState<Mode>(tokenInUrl ? 'register' : 'login');
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [invite, setInvite] = useState<InviteState>({
    status: tokenInUrl ? 'checking' : 'idle',
    email:  '',
    token:  tokenInUrl,
  });

  // Validate the token if present in URL
  useEffect(() => {
    if (!tokenInUrl) return;
    fetch(`/api/invites/validate/${tokenInUrl}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setInvite({ status: 'valid', email: data.email, token: tokenInUrl });
          setEmail(data.email);
        } else {
          setInvite({ status: 'invalid', email: '', token: tokenInUrl });
        }
      })
      .catch(() => setInvite({ status: 'invalid', email: '', token: tokenInUrl }));
  }, [tokenInUrl]);

  const switchMode = (m: Mode) => { setMode(m); setError(''); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (invite.status !== 'valid') { setError('A valid invite link is required to register'); return; }
      if (!username.trim())          { setError('Username is required'); return; }
      if (password !== confirm)      { setError('Passwords do not match'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(username, email, password, invite.token);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const registerContent = () => {
    if (invite.status === 'checking') {
      return <div className="auth-invite-status checking">Validating your invite link…</div>;
    }

    if (invite.status === 'invalid') {
      return (
        <div className="auth-invite-status invalid">
          <span className="auth-invite-icon">⛔</span>
          <div>
            <div className="auth-invite-title">Invalid invite link</div>
            <div className="auth-invite-sub">This link is expired, already used, or doesn't exist. Ask for a new invitation.</div>
          </div>
        </div>
      );
    }

    if (invite.status === 'idle') {
      return (
        <div className="auth-invite-status idle">
          <span className="auth-invite-icon">✉️</span>
          <div>
            <div className="auth-invite-title">Invitation required</div>
            <div className="auth-invite-sub">AlphaCircle is invite-only. Check your email for an invitation link.</div>
          </div>
        </div>
      );
    }

    // valid — show form
    const hasRealToken = !!invite.token;
    return (
      <>
        {hasRealToken && (
          <div className="auth-invite-status valid">
            <span className="auth-invite-icon">✅</span>
            <div className="auth-invite-sub">Invited as <strong>{invite.email}</strong></div>
          </div>
        )}

        <div className="auth-field">
          <label>Username</label>
          <input
            type="text"
            name="new-username"
            placeholder="e.g. stefan_l"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoComplete="off"
            autoFocus
          />
        </div>

        <div className="auth-field">
          <label>Email</label>
          <input
            type="email"
            name="new-email"
            placeholder="you@example.com"
            value={email}
            onChange={hasRealToken ? undefined : e => setEmail(e.target.value)}
            readOnly={hasRealToken}
            className={hasRealToken ? 'auth-input-readonly' : ''}
            required
            autoComplete={hasRealToken ? 'off' : 'email'}
          />
        </div>

        <div className="auth-field">
          <label>Password</label>
          <input
            type="password"
            name="new-password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="auth-field">
          <label>Confirm Password</label>
          <input
            type="password"
            name="confirm-password"
            placeholder="Repeat your password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </>
    );
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">📊</span>
          <div>
            <div className="auth-logo-name">AlphaCircle</div>
            <div className="auth-logo-sub">INVESTOR NETWORK</div>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Log In
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        {mode === 'login' ? (
          <form key="login" className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                name="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Please wait…' : 'Log In'}
            </button>
          </form>
        ) : (
          <form key="register" className="auth-form" onSubmit={handleSubmit} autoComplete="off">
            {registerContent()}
          </form>
        )}

        {mode === 'login' && (
          <p className="auth-switch">
            Have an invite?{' '}
            <span onClick={() => switchMode('register')}>Register</span>
          </p>
        )}
      </div>
    </div>
  );
}
