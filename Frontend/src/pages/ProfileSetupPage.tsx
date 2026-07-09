import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './ProfileSetupPage.css';

const ROLES = [
  'Junior Analyst',
  'Senior Analyst',
  'Sub-Portfolio Manager',
  'Portfolio Manager',
  'Chief Investment Officer',
];

const STRATEGIES = [
  'Long-only',
  'Fundamental Long/Short',
  'Quantitative',
  'Macro',
  'Other',
];

const AUM_BUCKETS = [
  '$0 – $100M',
  '$100M – $300M',
  '$300M – $1B',
  '$1B+',
];

const ROLE_SHORT: Record<string, string> = {
  'Junior Analyst':           'Junior Analyst',
  'Senior Analyst':           'Senior Analyst',
  'Sub-Portfolio Manager':    'Sub-PM',
  'Portfolio Manager':        'PM',
  'Chief Investment Officer': 'CIO',
};

const STRATEGY_SHORT: Record<string, string> = {
  'Long-only':              'Long-only',
  'Fundamental Long/Short': 'Fundamental L/S',
  'Quantitative':           'Quant',
  'Macro':                  'Macro',
  'Other':                  '',
};

function generateBio(role: string, strategy: string, aum: string, investingSince: number): string {
  const years     = new Date().getFullYear() - investingSince;
  const roleShort = ROLE_SHORT[role]     ?? role;
  const stratShort= STRATEGY_SHORT[strategy] ?? strategy;
  const parts = [roleShort];
  if (aum)       parts.push(`${aum} AUM`);
  if (stratShort) parts.push(stratShort);
  if (years > 0)  parts.push(`${years}yr exp`);
  return parts.join(' | ');
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1969 }, (_, i) => currentYear - i);

export default function ProfileSetupPage() {
  const { token, finishProfile } = useAuth();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile,   setAvatarFile]   = useState<File | null>(null);
  const [avatarPreview,setAvatarPreview]= useState('');

  const [investingSince, setInvestingSince] = useState<number>(currentYear - 5);
  const [role,           setRole]           = useState('');
  const [strategy,       setStrategy]       = useState('');
  const [aum,            setAum]            = useState('');
  const [bio,            setBio]            = useState('');
  const [bioEdited,      setBioEdited]      = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState('');

  // Auto-generate bio whenever inputs change, unless user manually edited it
  useEffect(() => {
    if (bioEdited) return;
    if (role && strategy && aum && investingSince) {
      setBio(generateBio(role, strategy, aum, investingSince));
    }
  }, [role, strategy, aum, investingSince, bioEdited]);

  const handleBioChange = (val: string) => {
    setBio(val);
    setBioEdited(true);
  };

  const resetBio = () => {
    setBioEdited(false);
    setBio(generateBio(role, strategy, aum, investingSince));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!role || !strategy || !aum) { setError('Please fill in all fields'); return; }
    setSubmitting(true); setError('');
    try {
      const fd = new FormData();
      fd.append('investingSince', String(investingSince));
      fd.append('role',     role);
      fd.append('strategy', strategy);
      fd.append('aum',      aum);
      fd.append('bio',      bio);
      if (avatarFile) fd.append('avatar', avatarFile);

      const res  = await fetch('/api/auth/profile', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Something went wrong'); return; }
      finishProfile(data.user);
    } catch {
      setError('Network error, please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const yearsExp = currentYear - investingSince;

  return (
    <div className="psp-outer">
      <div className="psp-card">
        <div className="psp-header">
          <div className="psp-logo">📊 AlphaCircle</div>
          <h1 className="psp-title">Complete your profile</h1>
          <p className="psp-sub">Help others understand your background. This takes 30 seconds.</p>
        </div>

        <div className="psp-fields">

          {/* Avatar upload */}
          <div className="psp-field psp-avatar-field">
            <label className="psp-label">Profile photo <span className="psp-optional">(optional)</span></label>
            <div className="psp-avatar-row">
              <div
                className="psp-avatar-preview"
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarPreview
                  ? <img src={avatarPreview} alt="preview" className="psp-avatar-img" />
                  : <span className="psp-avatar-placeholder">📷</span>
                }
                <div className="psp-avatar-overlay">Change</div>
              </div>
              <div className="psp-avatar-hint">
                <p>JPG, PNG or WebP — max 5 MB</p>
                <button
                  type="button"
                  className="psp-avatar-btn"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarPreview ? 'Change photo' : 'Upload photo'}
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    className="psp-avatar-remove"
                    onClick={() => { setAvatarFile(null); setAvatarPreview(''); if (avatarInputRef.current) avatarInputRef.current.value = ''; }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="psp-avatar-hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>

          {/* Years of experience */}
          <div className="psp-field">
            <label className="psp-label">I started investing in</label>
            <div className="psp-row">
              <select
                className="psp-select psp-select-year"
                value={investingSince}
                onChange={e => setInvestingSince(Number(e.target.value))}
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <span className="psp-years-badge">
                {yearsExp <= 0 ? 'less than 1 year' : `${yearsExp} year${yearsExp === 1 ? '' : 's'} of experience`}
              </span>
            </div>
          </div>

          {/* Role */}
          <div className="psp-field">
            <label className="psp-label">Investment role</label>
            <div className="psp-chip-group">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  className={`psp-chip${role === r ? ' selected' : ''}`}
                  onClick={() => setRole(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy */}
          <div className="psp-field">
            <label className="psp-label">Investment strategy</label>
            <div className="psp-chip-group">
              {STRATEGIES.map(s => (
                <button
                  key={s}
                  type="button"
                  className={`psp-chip${strategy === s ? ' selected' : ''}`}
                  onClick={() => setStrategy(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* AUM */}
          <div className="psp-field">
            <label className="psp-label">Assets under management (AUM)</label>
            <div className="psp-chip-group">
              {AUM_BUCKETS.map(a => (
                <button
                  key={a}
                  type="button"
                  className={`psp-chip${aum === a ? ' selected' : ''}`}
                  onClick={() => setAum(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div className="psp-field">
            <div className="psp-bio-header">
              <label className="psp-label">Short bio</label>
              {bioEdited && (
                <button type="button" className="psp-bio-reset" onClick={resetBio}>
                  ↺ Auto-generate
                </button>
              )}
            </div>
            <input
              className="psp-bio-input"
              maxLength={160}
              value={bio}
              onChange={e => handleBioChange(e.target.value)}
              placeholder="Shown next to your username throughout the app"
            />
            <span className="psp-bio-count">{bio.length} / 160</span>
          </div>

        </div>

        {error && <div className="psp-error">{error}</div>}

        <button
          className="psp-submit"
          onClick={handleSubmit}
          disabled={submitting || !role || !strategy || !aum}
        >
          {submitting ? 'Saving…' : 'Enter AlphaCircle →'}
        </button>
      </div>
    </div>
  );
}
