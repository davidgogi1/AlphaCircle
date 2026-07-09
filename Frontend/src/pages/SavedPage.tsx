import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useSaved } from '../contexts/SavedContext';
import './SavedPage.css';

interface SavedPost {
  _id: string;
  title?: string;
  content: string;
  author: { _id: string; username: string };
  createdAt: string;
}

interface SavedThread {
  _id: string;
  title: string;
  content: string;
  author: { _id: string; username: string };
  topic: { _id: string; name: string; slug: string; icon: string };
  commentCount: number;
  createdAt: string;
}

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60)    return 'just now';
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function SavedPage() {
  const navigate = useNavigate();
  const { togglePost, toggleThread } = useSaved();

  const [posts,   setPosts]   = useState<SavedPost[]>([]);
  const [threads, setThreads] = useState<SavedThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get('/saved')
      .then(d => { setPosts(d.posts); setThreads(d.threads); })
      .catch(() => setError('Failed to load saved items.'))
      .finally(() => setLoading(false));
  }, []);

  const handleUnsavePost = async (id: string) => {
    await togglePost(id);
    setPosts(prev => prev.filter(p => p._id !== id));
  };

  const handleUnsaveThread = async (id: string) => {
    await toggleThread(id);
    setThreads(prev => prev.filter(t => t._id !== id));
  };

  if (loading) return <div className="sv-status">Loading…</div>;
  if (error)   return <div className="sv-status sv-error">{error}</div>;

  return (
    <div className="sv-page">
      <div className="sv-heading-row">
        <h2 className="sv-heading">Saved</h2>
        <span className="sv-count">{posts.length + threads.length} item{posts.length + threads.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Saved Posts */}
      <section className="sv-section">
        <div className="sv-section-label">📌 Saved Posts</div>
        {posts.length === 0 ? (
          <div className="sv-empty">No saved posts yet.</div>
        ) : (
          <div className="sv-list">
            {posts.map(p => (
              <div key={p._id} className="sv-card">
                <div className="sv-card-meta">
                  <span className="sv-card-author">{p.author.username}</span>
                  <span className="sv-card-time">{timeAgo(p.createdAt)}</span>
                  <button className="sv-remove-btn" onClick={() => handleUnsavePost(p._id)}>
                    Remove
                  </button>
                </div>
                {p.title && <h4 className="sv-card-title">{p.title}</h4>}
                <p className="sv-card-content">{p.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Saved Discussions */}
      <section className="sv-section">
        <div className="sv-section-label">💬 Saved Discussions</div>
        {threads.length === 0 ? (
          <div className="sv-empty">No saved discussions yet.</div>
        ) : (
          <div className="sv-list">
            {threads.map(t => (
              <div
                key={t._id}
                className="sv-card sv-card-link"
                onClick={() => navigate(`/discussions/${t.topic.slug}/${t._id}`)}
              >
                <div className="sv-card-meta">
                  <span className="sv-topic-badge">{t.topic.icon} {t.topic.name}</span>
                  <span className="sv-card-author">{t.author.username}</span>
                  <span className="sv-card-time">{timeAgo(t.createdAt)}</span>
                  <button
                    className="sv-remove-btn"
                    onClick={e => { e.stopPropagation(); handleUnsaveThread(t._id); }}
                  >
                    Remove
                  </button>
                </div>
                <h4 className="sv-card-title">{t.title}</h4>
                <p className="sv-card-content">
                  {t.content.length > 150 ? t.content.slice(0, 150) + '…' : t.content}
                </p>
                <div className="sv-card-footer">
                  <span>💬 {t.commentCount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
