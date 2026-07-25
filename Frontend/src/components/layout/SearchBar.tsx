import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import './SearchBar.css';

interface SearchUser   { _id: string; username: string; }
interface SearchPost   { _id: string; title?: string; content: string; author: { username: string }; matchType?: 'semantic'; }
interface SearchTag    { _id: string; name: string; slug: string; icon: string; }
interface SearchThread { _id: string; title: string; author: { username: string }; firstTag: SearchTag | null; matchType?: 'semantic'; }
interface SearchPoll   { _id: string; company: string; ticker: string; period: string; eventType: string; }

interface Results {
  users:   SearchUser[];
  posts:   SearchPost[];
  threads: SearchThread[];
  polls:   SearchPoll[];
}

export default function SearchBar() {
  const navigate     = useNavigate();
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<Results | null>(null);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const data = await api.get(`/search?q=${encodeURIComponent(q)}&limit=4`);
        setResults(data);
        setOpen(true);
      } catch { /* ignore */ } finally { setLoading(false); }
    }, 280);
  }, []);

  useEffect(() => { doSearch(query); }, [query, doSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMobileExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (mobileExpanded) inputRef.current?.focus();
  }, [mobileExpanded]);

  const handleMobileClose = () => {
    setOpen(false);
    setMobileExpanded(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      setOpen(false);
      setMobileExpanded(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
    if (e.key === 'Escape') { setOpen(false); setMobileExpanded(false); }
  };

  const go = (path: string) => { setOpen(false); setMobileExpanded(false); setQuery(''); navigate(path); };

  const threadPath = (t: SearchThread) =>
    t.firstTag ? `/discussions/${t.firstTag.slug}/${t._id}` : `/discussions/general/${t._id}`;

  const hasResults = results &&
    (results.users.length > 0 || results.posts.length > 0 || results.threads.length > 0 || results.polls.length > 0);

  return (
    <div className={`sb-wrap${mobileExpanded ? ' sb-wrap--mobile-expanded' : ''}`} ref={containerRef}>
      <button
        type="button"
        className="sb-mobile-toggle"
        onClick={() => setMobileExpanded(true)}
        aria-label="Search"
      >
        🔍
      </button>

      <input
        ref={inputRef}
        className="search-input"
        placeholder="Search discussions, posts, members, polls…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { if (hasResults) setOpen(true); }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {mobileExpanded && (
        <button
          type="button"
          className="sb-mobile-close"
          onClick={handleMobileClose}
          aria-label="Close search"
        >
          ✕
        </button>
      )}

      {open && results && (
        <div className="sb-dropdown">
          {!hasResults && !loading && (
            <div className="sb-empty">No results for "{query}"</div>
          )}

          {results.users.length > 0 && (
            <div className="sb-section">
              <div className="sb-section-label">Members</div>
              {results.users.map(u => (
                <button key={u._id} className="sb-item" onClick={() => go(`/members/${u._id}`)}>
                  <span className="sb-item-icon">👤</span>
                  <span className="sb-item-main">{u.username}</span>
                </button>
              ))}
            </div>
          )}

          {results.posts.length > 0 && (
            <div className="sb-section">
              <div className="sb-section-label">Posts</div>
              {results.posts.map(p => (
                <button key={p._id} className="sb-item" onClick={() => go('/')}>
                  <span className="sb-item-icon">📝</span>
                  <div className="sb-item-body">
                    <span className="sb-item-main">{p.title || p.content.slice(0, 60)}</span>
                    <span className="sb-item-sub">
                      by {p.author.username}
                      {p.matchType === 'semantic' && <span className="sb-ai-badge" title="Matched by meaning, not exact keywords"> · ✨ AI match</span>}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.threads.length > 0 && (
            <div className="sb-section">
              <div className="sb-section-label">Discussions</div>
              {results.threads.map(t => (
                <button key={t._id} className="sb-item" onClick={() => go(threadPath(t))}>
                  <span className="sb-item-icon">{t.firstTag?.icon ?? '💬'}</span>
                  <div className="sb-item-body">
                    <span className="sb-item-main">{t.title}</span>
                    <span className="sb-item-sub">
                      {t.firstTag?.name ?? 'Discussion'} · {t.author.username}
                      {t.matchType === 'semantic' && <span className="sb-ai-badge" title="Matched by meaning, not exact keywords"> · ✨ AI match</span>}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.polls.length > 0 && (
            <div className="sb-section">
              <div className="sb-section-label">Polls</div>
              {results.polls.map(p => (
                <button key={p._id} className="sb-item" onClick={() => go('/consensus')}>
                  <span className="sb-item-icon">🤝</span>
                  <div className="sb-item-body">
                    <span className="sb-item-main">{p.ticker} · {p.company}</span>
                    <span className="sb-item-sub">{p.period} · {p.eventType}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {hasResults && (
            <button
              className="sb-see-all"
              onClick={() => go(`/search?q=${encodeURIComponent(query.trim())}`)}
            >
              See all results for "{query}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
