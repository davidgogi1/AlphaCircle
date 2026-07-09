import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import './TrendingPage.css';

interface TrendingPost {
  _id:          string;
  content:      string;
  commentCount: number;
  reactions:    { type: string }[];
  createdAt:    string;
  score:        number;
  author:       { _id: string; username: string };
}

interface TrendingThread {
  _id:          string;
  title:        string;
  commentCount: number;
  reactions:    { type: string }[];
  createdAt:    string;
  score:        number;
  author:       { username: string };
  topic:        { name: string; slug: string; icon: string };
}

function timeAgo(date: string): string {
  const h = (Date.now() - new Date(date).getTime()) / 3_600_000;
  if (h < 1)  return `${Math.round(h * 60)}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function TrendingPage() {
  const [posts,    setPosts]    = useState<TrendingPost[]>([]);
  const [threads,  setThreads]  = useState<TrendingThread[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/posts/trending'),
      api.get('/discussions/trending'),
    ]).then(([p, d]) => {
      setPosts(p.posts);
      setThreads(d.threads);
    }).catch(() => {
      setError('Failed to load trending. Make sure the backend is running.');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="tr-status">Loading…</div>;
  if (error)   return <div className="tr-status" style={{ color: 'var(--red)' }}>{error}</div>;

  return (
    <div className="tr-page">
      <div className="tr-header">
        <h2>Trending</h2>
        <p className="tr-sub">What everyone is talking about right now.</p>
      </div>

      {/* ── Trending Posts ── */}
      <section>
        <div className="tr-section-label">🔥 Trending Posts</div>
        <div className="tr-list">
          {posts.map((p, i) => (
            <div key={p._id} className="tr-post-card">
              <span className="tr-rank">#{i + 1}</span>
              <div className="tr-body">
                <div className="tr-meta">
                  <span className="tr-author">@{p.author.username}</span>
                  <span className="tr-time">{timeAgo(p.createdAt)}</span>
                </div>
                <p className="tr-content">{p.content}</p>
                <div className="tr-stats">
                  <span>💬 {p.commentCount}</span>
                  <span>👍 {p.reactions.length}</span>
                </div>
              </div>
            </div>
          ))}
          {posts.length === 0 && <div className="tr-empty">No trending posts yet.</div>}
        </div>
      </section>

      {/* ── Trending Discussions ── */}
      <section>
        <div className="tr-section-label">💬 Trending Discussions</div>
        <div className="tr-list">
          {threads.map((t, i) => (
            <button
              key={t._id}
              className="tr-thread-card"
              onClick={() => navigate(`/discussions/${t.topic.slug}/${t._id}`)}
            >
              <span className="tr-rank">#{i + 1}</span>
              <div className="tr-body">
                <div className="tr-meta">
                  <span className="tr-topic-badge">{t.topic.icon} {t.topic.name}</span>
                  <span className="tr-time">{timeAgo(t.createdAt)}</span>
                </div>
                <div className="tr-title">{t.title}</div>
                <div className="tr-stats">
                  <span>💬 {t.commentCount}</span>
                  <span>👍 {t.reactions.length}</span>
                  <span className="tr-by">by {t.author.username}</span>
                </div>
              </div>
            </button>
          ))}
          {threads.length === 0 && <div className="tr-empty">No trending discussions yet.</div>}
        </div>
      </section>
    </div>
  );
}
