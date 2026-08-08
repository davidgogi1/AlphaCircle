import { useEffect, useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import PostItem, { type Post } from '../components/feed/PostItem';
import UserAvatar from '../components/UserAvatar';
import './MyPage.css';

export default function MyPage() {
  const { user, token, updateAvatar } = useAuth();
  const navigate  = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [posts,   setPosts]   = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res  = await fetch('/api/auth/avatar', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok) updateAvatar(data.user.avatar);
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Invite panel
  const [inviteEmail,   setInviteEmail]   = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteMsg,     setInviteMsg]     = useState<{ text: string; ok: boolean } | null>(null);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    setInviteMsg(null);
    try {
      await api.post('/invites', { email: inviteEmail.trim() });
      setInviteMsg({ text: `Invite sent to ${inviteEmail.trim()}`, ok: true });
      setInviteEmail('');
    } catch (err: unknown) {
      setInviteMsg({ text: err instanceof Error ? err.message : 'Failed to send invite', ok: false });
    } finally {
      setInviteSending(false);
    }
  };

  useEffect(() => {
    api.get('/posts/mine')
      .then(data => setPosts(data.posts))
      .catch(() => setError('Failed to load posts'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = (updated: Post) =>
    setPosts(prev => prev.map(p => p._id === updated._id ? updated : p));

  const handleDelete = (id: string) =>
    setPosts(prev => prev.filter(p => p._id !== id));

  return (
    <div className="my-page">
      <div className="my-page-header">
        <div
          className="my-page-avatar-wrap"
          onClick={() => avatarInputRef.current?.click()}
          title="Change profile photo"
        >
          <UserAvatar username={user?.username ?? ''} avatar={user?.avatar} size={56} />
          <div className="my-page-avatar-overlay">
            {avatarUploading ? '…' : '📷'}
          </div>
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={handleAvatarChange}
        />
        <div>
          <h2 className="my-page-username">{user?.username}</h2>
          <p className="my-page-email">{user?.email}</p>
        </div>
      </div>

      <div className="my-page-section">
        <div className="my-page-section-header">
          <h3>Invite Someone</h3>
        </div>
        <form className="invite-form" onSubmit={handleInvite}>
          <input
            type="email"
            className="invite-input"
            placeholder="friend@example.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
          />
          <button className="invite-btn" type="submit" disabled={inviteSending}>
            {inviteSending ? (
              'Sending…'
            ) : (
              <>
                <svg className="btn-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 6-10 7L2 6" />
                </svg>
                Send Invite
              </>
            )}
          </button>
        </form>
        {inviteMsg && (
          <div className={`invite-msg ${inviteMsg.ok ? 'ok' : 'err'}`}>
            {inviteMsg.ok ? '✓' : '✕'} {inviteMsg.text}
          </div>
        )}
      </div>

      <div className="my-page-section">
        <div className="my-page-section-header">
          <h3>My Posts</h3>
          <button className="my-page-new-btn" onClick={() => navigate('/new-post')}>
            + New Post
          </button>
        </div>

        {loading && <div className="my-page-status">Loading…</div>}
        {error   && <div className="my-page-status error">{error}</div>}
        {!loading && !error && posts.length === 0 && (
          <div className="my-page-status">
            You haven't posted anything yet.{' '}
            <span onClick={() => navigate('/new-post')}>Create your first post →</span>
          </div>
        )}

        <div className="my-page-posts">
          {posts.map(post => (
            <PostItem
              key={post._id}
              post={post}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
