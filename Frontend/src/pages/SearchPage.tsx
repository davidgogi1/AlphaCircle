import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import './SearchPage.css';

interface SearchUser   { _id: string; username: string; email: string; }
interface SearchPost   { _id: string; title?: string; content: string; author: { username: string }; createdAt: string; }
interface SearchTag    { _id: string; name: string; slug: string; icon: string; }
interface SearchThread { _id: string; title: string; content: string; author: { username: string }; firstTag: SearchTag | null; commentCount: number; createdAt: string; }

type Tab = 'all' | 'posts' | 'threads' | 'users';

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60)    return 'just now';
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function Mark({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? <mark key={i} className="sp-mark">{part}</mark> : part
      )}
    </>
  );
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const q              = searchParams.get('q') ?? '';

  const [tab,     setTab]     = useState<Tab>('all');
  const [users,   setUsers]   = useState<SearchUser[]>([]);
  const [posts,   setPosts]   = useState<SearchPost[]>([]);
  const [threads, setThreads] = useState<SearchThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (q.length < 2) return;
    setLoading(true); setError('');
    api.get(`/search?q=${encodeURIComponent(q)}&limit=20`)
      .then(d => { setUsers(d.users); setPosts(d.posts); setThreads(d.threads); })
      .catch(() => setError('Search failed. Try again.'))
      .finally(() => setLoading(false));
  }, [q]);

  const total = users.length + posts.length + threads.length;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all',     label: 'All',         count: total },
    { key: 'posts',   label: 'Posts',       count: posts.length },
    { key: 'threads', label: 'Discussions', count: threads.length },
    { key: 'users',   label: 'Members',    count: users.length },
  ];

  if (!q || q.length < 2) {
    return <div className="sp-status">Enter at least 2 characters to search.</div>;
  }

  return (
    <div className="sp-page">
      <div className="sp-header">
        <h2 className="sp-heading">Results for <span className="sp-query">"{q}"</span></h2>
        {!loading && <span className="sp-total">{total} result{total !== 1 ? 's' : ''}</span>}
      </div>

      <div className="sp-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`sp-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.count > 0 && <span className="sp-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading && <div className="sp-status">Searching…</div>}
      {error   && <div className="sp-status sp-error">{error}</div>}

      {!loading && !error && total === 0 && (
        <div className="sp-status">No results found for "{q}".</div>
      )}

      {!loading && !error && (
        <div className="sp-results">
          {/* Creators */}
          {(tab === 'all' || tab === 'users') && users.length > 0 && (
            <section className="sp-section">
              {tab === 'all' && <div className="sp-section-label">Members</div>}
              {users.map(u => (
                <div key={u._id} className="sp-user-card">
                  <div className="sp-user-avatar">{u.username.slice(0, 2).toUpperCase()}</div>
                  <div className="sp-user-info">
                    <span className="sp-user-name"><Mark text={u.username} q={q} /></span>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Posts */}
          {(tab === 'all' || tab === 'posts') && posts.length > 0 && (
            <section className="sp-section">
              {tab === 'all' && <div className="sp-section-label">Posts</div>}
              {posts.map(p => (
                <div key={p._id} className="sp-card">
                  <div className="sp-card-meta">
                    <span className="sp-card-author">{p.author.username}</span>
                    <span className="sp-card-time">{timeAgo(p.createdAt)}</span>
                  </div>
                  {p.title && (
                    <h4 className="sp-card-title"><Mark text={p.title} q={q} /></h4>
                  )}
                  <p className="sp-card-content">
                    <Mark text={p.content.slice(0, 200)} q={q} />
                    {p.content.length > 200 ? '…' : ''}
                  </p>
                </div>
              ))}
            </section>
          )}

          {/* Discussions */}
          {(tab === 'all' || tab === 'threads') && threads.length > 0 && (
            <section className="sp-section">
              {tab === 'all' && <div className="sp-section-label">Discussions</div>}
              {threads.map(t => (
                <div
                  key={t._id}
                  className="sp-card sp-card-link"
                  onClick={() => navigate(
                    t.firstTag
                      ? `/discussions/${t.firstTag.slug}/${t._id}`
                      : `/discussions/general/${t._id}`
                  )}
                >
                  <div className="sp-card-meta">
                    {t.firstTag && (
                      <span className="sp-topic-badge">{t.firstTag.icon} {t.firstTag.name}</span>
                    )}
                    <span className="sp-card-author">{t.author.username}</span>
                    <span className="sp-card-time">{timeAgo(t.createdAt)}</span>
                  </div>
                  <h4 className="sp-card-title"><Mark text={t.title} q={q} /></h4>
                  <p className="sp-card-content">
                    <Mark text={t.content.slice(0, 160)} q={q} />
                    {t.content.length > 160 ? '…' : ''}
                  </p>
                  <div className="sp-card-footer">💬 {t.commentCount}</div>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
