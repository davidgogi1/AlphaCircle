import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import PostItem, { type Post } from '../components/feed/PostItem';
import UserAvatar from '../components/UserAvatar';
import './UserProfilePage.css';

interface ProfileUser {
  _id:           string;
  username:      string;
  bio:           string;
  role:          string;
  strategy:      string;
  aum:           string;
  avatar:        string;
  yearsExp:      number | null;
  createdAt:     string;
  followerCount: number;
  followingCount:number;
  isFollowing:   boolean;
  isSelf:        boolean;
}

export default function UserProfilePage() {
  const { userId }  = useParams<{ userId: string }>();
  const navigate    = useNavigate();

  const [profile,    setProfile]    = useState<ProfileUser | null>(null);
  const [posts,      setPosts]      = useState<Post[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [following,  setFollowing]  = useState(false);
  const [followPend, setFollowPend] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.get(`/users/${userId}`)
      .then(d => {
        setProfile(d.user);
        setFollowing(d.user.isFollowing);
        setPosts(d.posts);
      })
      .catch(() => setError('Could not load profile.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleFollow = async () => {
    if (followPend) return;
    setFollowPend(true);
    setFollowing(f => !f);
    setProfile(p => p ? { ...p, followerCount: p.followerCount + (following ? -1 : 1) } : p);
    try {
      const data = await api.post(`/users/${userId}/follow`, {});
      setFollowing(data.following);
      setProfile(p => p ? { ...p, followerCount: p.followerCount + (data.following ? 1 : -1) } : p);
    } catch {
      setFollowing(f => !f);
    } finally {
      setFollowPend(false);
    }
  };

  if (loading) return <div className="up-status">Loading…</div>;
  if (error || !profile) return <div className="up-status error">{error || 'User not found.'}</div>;

  return (
    <div className="up-page">
      <button className="up-back" onClick={() => navigate(-1)}>← Back</button>

      {/* Profile header */}
      <div className="up-header">
        <UserAvatar username={profile.username} avatar={profile.avatar} size={64} />
        <div className="up-header-info">
          <h2 className="up-username">{profile.username}</h2>
          {profile.bio && <p className="up-bio">{profile.bio}</p>}
          <div className="up-stats">
            <span><strong>{profile.followerCount}</strong> followers</span>
            <span><strong>{profile.followingCount}</strong> following</span>
          </div>
        </div>
        {!profile.isSelf && (
          <button
            className={`up-follow-btn${following ? ' following' : ''}`}
            onClick={handleFollow}
            disabled={followPend}
          >
            {following ? 'Unfollow' : 'Follow'}
          </button>
        )}
        {profile.isSelf && (
          <button className="up-follow-btn self" onClick={() => navigate('/my-page')}>
            My Page
          </button>
        )}
      </div>

      {/* Profile details */}
      {(profile.role || profile.strategy || profile.aum || profile.yearsExp !== null) && (
        <div className="up-details">
          {profile.role     && <div className="up-detail-chip">{profile.role}</div>}
          {profile.strategy && <div className="up-detail-chip">{profile.strategy}</div>}
          {profile.aum      && <div className="up-detail-chip">{profile.aum} AUM</div>}
          {profile.yearsExp !== null && (
            <div className="up-detail-chip">{profile.yearsExp}yr exp</div>
          )}
        </div>
      )}

      {/* Posts */}
      <h3 className="up-section-title">Posts</h3>

      {posts.length === 0 && (
        <div className="up-status">No posts yet.</div>
      )}

      <div className="up-posts">
        {posts.map(p => (
          <PostItem
            key={p._id}
            post={p}
            onUpdate={updated => setPosts(prev => prev.map(x => x._id === updated._id ? updated : x))}
            onDelete={id => setPosts(prev => prev.filter(x => x._id !== id))}
          />
        ))}
      </div>
    </div>
  );
}
