import { useEffect, useState, useRef, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, apiUpload } from '../api';
import { useSaved } from '../contexts/SavedContext';
import { EMOJI } from '../components/feed/reactions';
import AttachmentBadge from '../components/feed/AttachmentBadge';
import './TopicPage.css';

interface Topic {
  _id: string; name: string; slug: string; icon: string;
}

interface Tag {
  _id: string; name: string; slug: string; icon: string;
  type: 'sector' | 'topic' | 'company';
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

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60)    return 'just now';
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function TopicPage() {
  const { slug }     = useParams<{ slug: string }>();
  const navigate     = useNavigate();
  const { savedThreadIds, toggleThread } = useSaved();

  const [topic,     setTopic]     = useState<Topic | null>(null);
  const [threads,   setThreads]   = useState<Thread[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  // new thread form
  const fileRef = useRef<HTMLInputElement>(null);
  const [showForm,    setShowForm]    = useState(false);
  const [newTitle,    setNewTitle]    = useState('');
  const [newContent,  setNewContent]  = useState('');
  const [newFile,     setNewFile]     = useState<File | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState('');

  useEffect(() => {
    if (!slug) return;
    api.get(`/discussions/topics/${slug}/threads`)
      .then(d => { setTopic(d.topic); setThreads(d.threads); })
      .catch(() => setError('Could not load threads.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim())   { setFormError('Title is required');   return; }
    if (!newContent.trim()) { setFormError('Content is required'); return; }
    setSubmitting(true); setFormError('');
    try {
      const fd = new FormData();
      fd.append('title',   newTitle.trim());
      fd.append('content', newContent.trim());
      if (newFile) fd.append('file', newFile);
      const data = await apiUpload('POST', `/discussions/topics/${slug}/threads`, fd);
      setThreads(prev => [data.thread, ...prev]);
      setNewTitle(''); setNewContent(''); setNewFile(null); setShowForm(false);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="tp-status">Loading…</div>;
  if (error)   return <div className="tp-status error">{error}</div>;

  return (
    <div className="tp-page">
      {/* Breadcrumb */}
      <div className="tp-breadcrumb">
        <button onClick={() => navigate('/discussions')} className="tp-back">← Discussions</button>
        <span className="tp-sep">/</span>
        <span>{topic?.icon} {topic?.name}</span>
      </div>

      <div className="tp-top">
        <h2 className="tp-title">{topic?.icon} {topic?.name}</h2>
        <button className="tp-new-btn" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ New Thread'}
        </button>
      </div>

      {showForm && (
        <form className="tp-form" onSubmit={handleCreate}>
          <input
            className="tp-form-input"
            placeholder="Thread title…"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            maxLength={200}
          />
          <textarea
            className="tp-form-textarea"
            placeholder="What's on your mind?"
            rows={5}
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            maxLength={2000}
          />
          <div className="tp-form-file-row">
            <label className="tp-form-file-label">
              📎 Attach file
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                className="tp-form-file-hidden"
                onChange={e => setNewFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {newFile && (
              <span className="tp-form-file-name">
                {newFile.name}
                <button type="button" onClick={() => { setNewFile(null); if (fileRef.current) fileRef.current.value = ''; }}>✕</button>
              </span>
            )}
          </div>
          {formError && <div className="tp-form-error">{formError}</div>}
          <button className="tp-form-submit" type="submit" disabled={submitting}>
            {submitting ? 'Posting…' : 'Post Thread'}
          </button>
        </form>
      )}

      {threads.length === 0 && (
        <div className="tp-status">No threads yet. Be the first to start one!</div>
      )}

      <div className="tp-list">
        {threads.map(t => {
          const reactionCounts = (t.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
            acc[r.type] = (acc[r.type] ?? 0) + 1;
            return acc;
          }, {});

          return (
            <div
              key={t._id}
              className="tp-thread-card"
              onClick={() => navigate(`/discussions/${slug}/${t._id}`)}
            >
              <div className="tp-thread-meta">
                <span className="tp-thread-author">{t.author.username}</span>
                {t.author.bio && <span className="tp-thread-bio">{t.author.bio}</span>}
                <span className="tp-thread-time">{timeAgo(t.createdAt)}</span>
              </div>
              <h3 className="tp-thread-title">{t.title}</h3>
              <p className="tp-thread-preview">
                {t.content.length > 120 ? t.content.slice(0, 120) + '…' : t.content}
              </p>
              {(t.tags ?? []).length > 0 && (
                <div className="tp-thread-tags">
                  {(t.tags ?? []).map(tag => (
                    <span key={tag._id} className={`disc-thread-tag disc-chip-${tag.type}`}>
                      {tag.icon} {tag.name}
                    </span>
                  ))}
                </div>
              )}
              {t.attachment && <AttachmentBadge attachment={t.attachment} />}
              <div className="tp-thread-footer">
                <span className="tp-thread-comments">💬 {t.commentCount}</span>
                {Object.entries(reactionCounts).map(([type, count]) => (
                  <span key={type} className="tp-thread-reaction">{EMOJI[type]} {count}</span>
                ))}
                <button
                  className={`tp-save-btn${savedThreadIds.has(t._id) ? ' saved' : ''}`}
                  onClick={e => { e.stopPropagation(); toggleThread(t._id); }}
                >
                  🔖 {savedThreadIds.has(t._id) ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
