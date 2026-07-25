import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiUpload } from '../api';
import { EMOJI } from '../components/feed/reactions';
import { useSaved } from '../contexts/SavedContext';
import AttachmentBadge from '../components/feed/AttachmentBadge';
import './DiscussionsPage.css';

const MAX_TAGS = 5;

interface Tag {
  _id:         string;
  name:        string;
  slug:        string;
  icon:        string;
  type:        'sector' | 'topic' | 'company';
  description: string;
}

interface Thread {
  _id:          string;
  title:        string;
  content:      string;
  author:       { _id: string; username: string; bio?: string };
  tags?:        Tag[];
  reactions?:   { user: string; type: string }[];
  commentCount: number;
  attachment?:  { filename: string; originalName: string; mimetype: string; size: number };
  createdAt:    string;
}

function timeAgo(date: string) {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60)    return 'just now';
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

const TYPE_LABEL: Record<string, string> = {
  sector:  'Sectors',
  topic:   'Topics',
  company: 'Companies',
};

export default function DiscussionsPage() {
  const navigate = useNavigate();
  const { savedThreadIds, toggleThread } = useSaved();

  const [sectors,   setSectors]   = useState<Tag[]>([]);
  const [topics,    setTopics]    = useState<Tag[]>([]);
  const [companies, setCompanies] = useState<Tag[]>([]);
  const [threads,   setThreads]   = useState<Thread[]>([]);
  const [trending,  setTrending]  = useState<Thread[]>([]);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [loading,   setLoading]   = useState(true);

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle,   setNewTitle]   = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags,    setNewTags]    = useState<Set<string>>(new Set());
  const [newFile,    setNewFile]    = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get('/discussions/tags').then(d => {
      setSectors(d.sectors);
      setTopics(d.topics);
      setCompanies(d.companies);
    });
  }, []);

  // Load threads + trending whenever selection changes
  useEffect(() => {
    setLoading(true);
    const qs = selected.size ? `?tagIds=${Array.from(selected).join(',')}` : '';

    const threadsFetch = api.get(`/discussions/threads${qs}`)
      .then(d => setThreads(d.threads))
      .catch(() => {});

    // Only fetch trending when no filter is active
    const trendingFetch = selected.size === 0
      ? api.get('/discussions/trending').then(d => setTrending(d.threads ?? [])).catch(() => {})
      : Promise.resolve(setTrending([]));

    Promise.all([threadsFetch, trendingFetch]).finally(() => setLoading(false));
  }, [selected]);

  const toggleTag = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleSection = (type: string) =>
    setCollapsed(prev => { const s = new Set(prev); s.has(type) ? s.delete(type) : s.add(type); return s; });

  const toggleNewTag = (id: string) =>
    setNewTags(prev => {
      const s = new Set(prev);
      if (s.has(id)) { s.delete(id); return s; }
      if (s.size >= MAX_TAGS) return prev;
      s.add(id); return s;
    });

  const handleCreate = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!newTitle.trim())   { setFormError('Title is required'); return; }
    if (!newContent.trim()) { setFormError('Content is required'); return; }
    setSubmitting(true); setFormError('');
    try {
      const fd = new FormData();
      fd.append('title',   newTitle.trim());
      fd.append('content', newContent.trim());
      Array.from(newTags).forEach(id => fd.append('tagIds', id));
      if (newFile) fd.append('file', newFile);
      const data = await apiUpload('POST', '/discussions/threads', fd);
      setThreads(prev => [data.thread, ...prev]);
      setShowCreate(false);
      setNewTitle(''); setNewContent(''); setNewTags(new Set()); setNewFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  const allTags = [...sectors, ...topics, ...companies];

  // Trending IDs so we can exclude them from the main list
  const trendingIds = new Set(trending.map(t => t._id));

  const mainThreads = selected.size > 0
    ? threads
    : threads.filter(t => !trendingIds.has(t._id));

  const renderChip = (tag: Tag, isActive: boolean, onClick: () => void, disabled = false) => (
    <button
      key={tag._id}
      type="button"
      className={`disc-chip disc-chip-${tag.type}${isActive ? ' active' : ''}${disabled ? ' disabled' : ''}`}
      onClick={onClick}
      title={disabled ? `Max ${MAX_TAGS} tags` : tag.description}
      disabled={disabled}
    >
      <span>{tag.icon}</span> {tag.name}
    </button>
  );

  const renderSection = (type: 'sector' | 'topic' | 'company', tags: Tag[]) => (
    <div key={type} className="disc-filter-section">
      <button className="disc-filter-heading" onClick={() => toggleSection(type)}>
        <span>{TYPE_LABEL[type]}</span>
        <span className="disc-filter-caret">{collapsed.has(type) ? '›' : '∨'}</span>
      </button>
      {!collapsed.has(type) && (
        <div className="disc-filter-chips">
          {tags.map(t => renderChip(t, selected.has(t._id), () => toggleTag(t._id)))}
        </div>
      )}
    </div>
  );

  const renderThreadCard = (t: Thread, badge?: string) => {
    const reactionCounts = (t.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.type] = (acc[r.type] ?? 0) + 1; return acc;
    }, {});
    return (
      <div
        key={t._id}
        className={`disc-thread-card${badge ? ' disc-thread-card--trending' : ''}`}
        onClick={() => navigate(`/discussions/thread/${t._id}`)}
      >
        {badge && <span className="disc-trending-badge">{badge}</span>}
        <div className="disc-thread-meta">
          <span className="disc-thread-author">{t.author.username}</span>
          {t.author.bio && <span className="disc-thread-bio">{t.author.bio}</span>}
          <span className="disc-thread-time">{timeAgo(t.createdAt)}</span>
        </div>
        <h3 className="disc-thread-title">{t.title}</h3>
        <p className="disc-thread-preview">
          {t.content.length > 140 ? t.content.slice(0, 140) + '…' : t.content}
        </p>
        {(t.tags ?? []).length > 0 && (
          <div className="disc-thread-tags">
            {(t.tags ?? []).map(tag => (
              <span
                key={tag._id}
                className={`disc-thread-tag disc-chip-${tag.type}`}
              >
                {tag.icon} {tag.name}
              </span>
            ))}
          </div>
        )}
        {t.attachment && <AttachmentBadge attachment={t.attachment} />}
        <div className="disc-thread-footer">
          <span className="disc-thread-comments">💬 {t.commentCount}</span>
          {Object.entries(reactionCounts).map(([type, count]) => (
            <span key={type} className="disc-thread-reaction">{EMOJI[type]} {count}</span>
          ))}
          <button
            type="button"
            className={`disc-thread-save${savedThreadIds.has(t._id) ? ' saved' : ''}`}
            onClick={e => { e.stopPropagation(); toggleThread(t._id); }}
          >
            🔖 {savedThreadIds.has(t._id) ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="disc-shell">
      {/* ── Left filter panel ── */}
      <aside className="disc-sidebar">
        <div className="disc-sidebar-header">
          <span className="disc-sidebar-title">Filter</span>
          {selected.size > 0 && (
            <button className="disc-clear-btn" onClick={() => setSelected(new Set())}>
              Clear all
            </button>
          )}
        </div>
        {renderSection('sector',  sectors)}
        {renderSection('topic',   topics)}
        {renderSection('company', companies)}
      </aside>

      {/* ── Main thread feed ── */}
      <div className="disc-main">
        <div className="disc-main-header">
          <div>
            <h2 className="disc-main-title">Discussions</h2>
            {selected.size > 0 && (
              <div className="disc-active-filters">
                {Array.from(selected).map(id => {
                  const tag = allTags.find(t => t._id === id);
                  return tag ? (
                    <span key={id} className={`disc-filter-tag disc-chip-${tag.type}`}>
                      {tag.icon} {tag.name}
                      <button onClick={() => toggleTag(id)}>✕</button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
          <button className="disc-new-btn" onClick={() => setShowCreate(true)}>+ New Thread</button>
        </div>

        {loading && <div className="disc-status">Loading…</div>}

        {!loading && (
          <>
            {/* Trending section — only when no filter active */}
            {selected.size === 0 && trending.length > 0 && (
              <div className="disc-section">
                <div className="disc-section-label">🔥 Trending</div>
                <div className="disc-thread-list disc-thread-list--trending">
                  {trending.slice(0, 4).map(t => renderThreadCard(t, '🔥'))}
                </div>
              </div>
            )}

            {/* Latest threads */}
            <div className="disc-section">
              {selected.size === 0 && mainThreads.length > 0 && (
                <div className="disc-section-label">Latest</div>
              )}
              {mainThreads.length === 0 && selected.size > 0 && (
                <div className="disc-status">No threads match these filters.</div>
              )}
              {mainThreads.length === 0 && selected.size === 0 && trending.length === 0 && (
                <div className="disc-status">No threads yet. Start the conversation!</div>
              )}
              <div className="disc-thread-list">
                {mainThreads.map(t => renderThreadCard(t))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Create thread modal ── */}
      {showCreate && (
        <div className="disc-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="disc-modal" onClick={e => e.stopPropagation()}>
            <div className="disc-modal-header">
              <h3>New Thread</h3>
              <button className="disc-modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <input
                className="disc-modal-input"
                placeholder="Thread title…"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                maxLength={200}
                autoFocus
              />
              <textarea
                className="disc-modal-textarea"
                placeholder="What's on your mind?"
                rows={5}
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                maxLength={2000}
              />

              <div className="disc-modal-tags-wrap">
                <div className="disc-modal-tag-header">
                  <span className="disc-modal-tag-hint">Tags (optional — max {MAX_TAGS})</span>
                  <span className={`disc-modal-tag-count${newTags.size >= MAX_TAGS ? ' at-limit' : ''}`}>
                    {newTags.size}/{MAX_TAGS}
                  </span>
                </div>
                {(['sector', 'topic', 'company'] as const).map(type => {
                  const list = type === 'sector' ? sectors : type === 'topic' ? topics : companies;
                  return (
                    <div key={type} className="disc-modal-tag-section">
                      <div className="disc-modal-tag-label">{TYPE_LABEL[type]}</div>
                      <div className="disc-filter-chips">
                        {list.map(t => renderChip(
                          t,
                          newTags.has(t._id),
                          () => toggleNewTag(t._id),
                          !newTags.has(t._id) && newTags.size >= MAX_TAGS,
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="disc-modal-file-row">
                <label className="disc-modal-file-label">
                  📎 Attach file
                  <input
                    ref={fileRef}
                    type="file"
                    className="disc-modal-file-hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    onChange={e => setNewFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {newFile && (
                  <span className="disc-modal-file-name">
                    {newFile.name}
                    <button type="button" onClick={() => { setNewFile(null); if (fileRef.current) fileRef.current.value = ''; }}>✕</button>
                  </span>
                )}
              </div>

              {formError && <div className="disc-modal-error">{formError}</div>}
              <button className="disc-modal-submit" type="submit" disabled={submitting}>
                {submitting ? 'Posting…' : 'Post Thread'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
