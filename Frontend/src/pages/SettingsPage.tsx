import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './SettingsPage.css';

export default function SettingsPage() {
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);

  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
        <p className="settings-subtitle">Manage your account security</p>
      </div>

      <div className="settings-card">
        <h3 className="settings-card-title">Change Password</h3>

        <form className="settings-form" onSubmit={handleSubmit}>
          <div className="settings-field">
            <label>Current password</label>
            <div className="settings-password-wrap">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button type="button" className="settings-toggle-eye" onClick={() => setShowCurrent(v => !v)}>
                {showCurrent ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div className="settings-field">
            <label>New password</label>
            <div className="settings-password-wrap">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Min. 6 characters"
                required
              />
              <button type="button" className="settings-toggle-eye" onClick={() => setShowNew(v => !v)}>
                {showNew ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div className="settings-field">
            <label>Confirm new password</label>
            <input
              type={showNew ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {error && <div className="settings-error">{error}</div>}
          {success && <div className="settings-success">✓ {success}</div>}

          <button className="settings-submit" type="submit" disabled={loading}>
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
