import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import RecoveryPhraseModal from '../components/RecoveryPhraseModal';
import './AuthPage.css';

type Mode = 'login' | 'register' | 'forgot';

interface InviteState {
  status: 'idle' | 'checking' | 'valid' | 'invalid';
  email:  string;
  token:  string;
}

export default function AuthPage() {
  const { login, verifyLogin, register, forgotPassword, resetPassword, pendingRecoveryPhrase } = useAuth();

  // AuthPage renders outside BrowserRouter, so URL params are read directly.
  const params       = new URLSearchParams(window.location.search);
  const tokenInUrl   = params.get('invite') ?? '';
  const resetToken   = params.get('reset') ?? '';
  const dismissAlert = params.get('dismissAlert') === '1';

  const [mode, setMode]         = useState<Mode>(tokenInUrl ? 'register' : 'login');
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [pendingLoginId, setPendingLoginId] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const [forgotSent, setForgotSent] = useState('');

  const [resetPass, setResetPass]     = useState('');
  const [resetRecoveryPhrase, setResetRecoveryPhrase] = useState('');
  const [showRecoveryField, setShowRecoveryField] = useState(true);
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetConfirmingSame, setResetConfirmingSame] = useState(false);
  const [resetConfirmingNoPhrase, setResetConfirmingNoPhrase] = useState(false);
  const [resetDone, setResetDone]     = useState(false);

  const [invite, setInvite] = useState<InviteState>({
    status: 'checking',
    email:  '',
    token:  tokenInUrl,
  });

  // After a successful reset, land back on a clean login screen — auto-redirect
  // shortly after, but don't strand anyone waiting on it either.
  useEffect(() => {
    // If a fresh recovery phrase is pending, hold off redirecting until it's
    // been shown and dismissed — otherwise it'd flash by unread.
    if (!resetDone || pendingRecoveryPhrase) return;
    const t = setTimeout(() => { window.location.href = '/'; }, 2500);
    return () => clearTimeout(t);
  }, [resetDone, pendingRecoveryPhrase]);

  // Validate the invite token — always, even with no token in the URL, so
  // that if invite-only registration is temporarily disabled server-side
  // (DISABLE_INVITE_REQUIREMENT), plain visits to the root page can register
  // too, not just links with a real (or placeholder) ?invite= token. When
  // invite-only is enforced normally, a request with no real token still
  // correctly comes back invalid, same as it always did.
  useEffect(() => {
    fetch(`/api/invites/validate/${tokenInUrl || 'none'}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setInvite({ status: 'valid', email: data.email, token: tokenInUrl });
          if (data.email) setEmail(data.email);
        } else {
          setInvite({ status: tokenInUrl ? 'invalid' : 'idle', email: '', token: tokenInUrl });
        }
      })
      .catch(() => setInvite({ status: tokenInUrl ? 'invalid' : 'idle', email: '', token: tokenInUrl }));
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
        const result = await login(email, password);
        if (result.verificationRequired && result.pendingLoginId) {
          setPendingLoginId(result.pendingLoginId);
        }
      } else {
        await register(username, email, password, invite.token);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingLoginId || !code.trim()) return;
    setError('');
    setLoading(true);
    try {
      await verifyLogin(pendingLoginId, code.trim(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const message = await forgotPassword(email);
      setForgotSent(message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: FormEvent, confirmSame = false) => {
    e.preventDefault();
    setError('');
    if (!confirmSame && resetPass !== resetConfirm) { setError('Passwords do not match.'); return; }
    if (resetPass.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const result = await resetPassword(resetToken, resetPass, confirmSame, resetRecoveryPhrase, resetConfirmingNoPhrase);
      if (result.needsPhraseConfirmation) {
        setResetConfirmingNoPhrase(true);
      } else if (result.sameAsCurrentPassword) {
        setResetConfirmingSame(true);
      } else {
        setResetDone(true);
        setResetConfirmingSame(false);
        setResetConfirmingNoPhrase(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
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
    const hasRealToken = !!invite.token && !!invite.email;
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

  // ── Priority screens (email-link driven), before the normal login/register tabs ──

  if (dismissAlert) {
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
          <div className="auth-invite-status valid">
            <span className="auth-invite-icon">✅</span>
            <div>
              <div className="auth-invite-title">Thanks for confirming</div>
              <div className="auth-invite-sub">No action needed — your account is unaffected. You can close this page.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (resetToken) {
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

          {resetDone ? (
            <>
              <div className="auth-invite-status valid">
                <span className="auth-invite-icon">✅</span>
                <div>
                  <div className="auth-invite-title">Password updated</div>
                  <div className="auth-invite-sub">You can now log in with your new password. Redirecting you shortly…</div>
                </div>
              </div>
              <p className="auth-switch">
                <span onClick={() => { window.location.href = '/'; }}>Go to login now →</span>
              </p>
            </>
          ) : resetConfirmingNoPhrase ? (
            <>
              <div className="auth-invite-status idle">
                <span className="auth-invite-icon">⚠️</span>
                <div>
                  <div className="auth-invite-title">Continue without a recovery phrase?</div>
                  <div className="auth-invite-sub">
                    Without it, we'll generate you a brand new encryption key so new messages keep getting encrypted — but everything encrypted under your old key (all messages sent or received before now) stays locked forever. This can't be undone later.
                  </div>
                </div>
              </div>
              {error && <div className="auth-error">{error}</div>}
              <div className="auth-form">
                <button
                  className="auth-submit"
                  disabled={loading}
                  onClick={(e) => handleResetSubmit(e as unknown as FormEvent, resetConfirmingSame)}
                >
                  {loading ? 'Please wait…' : 'Continue anyway'}
                </button>
                <p className="auth-switch">
                  <span onClick={() => setResetConfirmingNoPhrase(false)}>← Go back and enter my phrase</span>
                </p>
              </div>
            </>
          ) : resetConfirmingSame ? (
            <>
              <div className="auth-invite-status idle">
                <span className="auth-invite-icon">🤔</span>
                <div>
                  <div className="auth-invite-title">Same as your current password</div>
                  <div className="auth-invite-sub">Are you sure you want to keep it? Since it's not actually changing, your encrypted messages are unaffected either way.</div>
                </div>
              </div>
              {error && <div className="auth-error">{error}</div>}
              <div className="auth-form">
                <button className="auth-submit" disabled={loading} onClick={(e) => handleResetSubmit(e as unknown as FormEvent, true)}>
                  {loading ? 'Please wait…' : 'Yes, keep this password'}
                </button>
                <p className="auth-switch">
                  <span onClick={() => setResetConfirmingSame(false)}>← Choose a different one</span>
                </p>
              </div>
            </>
          ) : (
            <form key="reset" className="auth-form" onSubmit={handleResetSubmit}>
              <div className="auth-field">
                <label>New password</label>
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={resetPass}
                  onChange={e => setResetPass(e.target.value)}
                  autoComplete="new-password"
                  required
                  autoFocus
                />
              </div>
              <div className="auth-field">
                <label>Confirm new password</label>
                <input
                  type="password"
                  value={resetConfirm}
                  onChange={e => setResetConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              {!showRecoveryField ? (
                <p className="auth-switch">
                  <span onClick={() => setShowRecoveryField(true)}>Have a recovery phrase? Use it to keep your encrypted messages readable →</span>
                </p>
              ) : (
                <div className="auth-field">
                  <label>Recovery phrase (optional)</label>
                  <textarea
                    className="auth-recovery-input"
                    placeholder="Enter your 16-word recovery phrase, separated by spaces"
                    value={resetRecoveryPhrase}
                    onChange={e => { setResetRecoveryPhrase(e.target.value); setResetConfirmingNoPhrase(false); }}
                    rows={2}
                  />
                  <span className="auth-field-hint">
                    Without this, you'll still be able to log in, but any previously encrypted messages will no longer be readable.
                  </span>
                </div>
              )}

              {error && <div className="auth-error">{error}</div>}
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'Please wait…' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
        <RecoveryPhraseModal />
      </div>
    );
  }

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

        {pendingLoginId ? (
          <>
            {/* Deliberately identical regardless of risk tier — whoever is at this
                screen might be the attacker, and shouldn't learn anything about
                whether (or how) detection was tripped. The real detail only ever
                goes to the account owner's email. */}
            <div className="auth-verify-status">
              <span className="auth-invite-icon">🔒</span>
              <div>
                <div className="auth-invite-title">Verify it's you</div>
                <div className="auth-invite-sub">
                  For your security, we need to confirm this sign-in. Enter the code we've sent to the email on file to continue.
                </div>
              </div>
            </div>

            <form key="verify" className="auth-form" onSubmit={handleVerify}>
              <div className="auth-field">
                <label>Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="auth-code-input"
                  placeholder="••••••"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button className="auth-submit" type="submit" disabled={loading || code.length !== 6}>
                {loading ? 'Verifying…' : 'Verify & Log In'}
              </button>
              <p className="auth-switch">
                <span onClick={() => { setPendingLoginId(null); setCode(''); setError(''); }}>
                  ← Back to login
                </span>
              </p>
            </form>
          </>
        ) : mode === 'forgot' ? (
          <>
            {forgotSent ? (
              <div className="auth-invite-status valid">
                <span className="auth-invite-icon">✅</span>
                <div className="auth-invite-sub">{forgotSent}</div>
              </div>
            ) : (
              <form key="forgot" className="auth-form" onSubmit={handleForgotSubmit}>
                <div className="auth-field">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {error && <div className="auth-error">{error}</div>}
                <button className="auth-submit" type="submit" disabled={loading}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            )}
            <p className="auth-switch">
              <span onClick={() => { switchMode('login'); setForgotSent(''); }}>← Back to login</span>
            </p>
          </>
        ) : (
        <>
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
              <span className="auth-forgot-link" onClick={() => switchMode('forgot')}>Forgot password?</span>
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
        </>
        )}
      </div>
    </div>
  );
}
