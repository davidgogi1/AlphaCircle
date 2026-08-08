import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSaved } from '../contexts/SavedContext';
import { api, apiUpload } from '../api';
import ReactionPicker from '../components/feed/ReactionPicker';
import ReactionsModal from '../components/feed/ReactionsModal';
import CommentThread, { type CommentNode } from '../components/feed/CommentThread';
import { EMOJI } from '../components/feed/reactions';
import AttachmentBadge from '../components/feed/AttachmentBadge';
import './ThreadPage.css';

interface Thread {
  _id:          string;
  title:        string;
  content:      string;
  author:       { _id: string; username: string };
  topic:        { _id: string; name: string; slug: string; icon: string };
  reactions?:   { user: string; type: string }[];
  commentCount: number;
  attachment?:  { filename: string; originalName: string; mimetype: string; size: number };
  createdAt:    string;
}

interface FlatComment {
  _id: string; content: string;
  author: { _id: string; username: string };
  createdAt: string; parent: string | null;
  reactions?: { user: string; type: string }[];
  attachment?: { filename: string; originalName: string; mimetype: string; size: number };
}

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60)    return 'just now';
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function buildTree(flat: FlatComment[]): CommentNode[] {
  const map   = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  for (const c of flat) map.set(c._id, { ...c, replies: [] });
  for (const c of flat) {
    const node = map.get(c._id)!;
    if (c.parent && map.has(c.parent)) map.get(c.parent)!.replies.push(node);
    else roots.push(node);
  }
  return roots;
}

function allDescendantIds(flat: FlatComment[], parentId: string): string[] {
  const children = flat.filter(c => c.parent === parentId);
  return [
    ...children.map(c => c._id),
    ...children.flatMap(c => allDescendantIds(flat, c._id)),
  ];
}

export default function ThreadPage() {
  const { threadId } = useParams<{ slug: string; threadId: string }>();
  const { user } = useAuth();
  const { savedThreadIds, toggleThread } = useSaved();
  const navigate = useNavigate();

  const [thread,       setThread]       = useState<Thread | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  // reactions
  const [reactions,    setReactions]    = useState<{ user: string; type: string }[]>([]);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [showModal,    setShowModal]    = useState(false);

  // edit / delete
  const [mode,        setMode]        = useState<'view' | 'edit' | 'confirmDelete'>('view');
  const [editTitle,   setEditTitle]   = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [editError,   setEditError]   = useState('');

  // comments
  const [flatComments,    setFlatComments]    = useState<FlatComment[]>([]);
  const [commentCount,    setCommentCount]    = useState(0);
  const [rootInput,       setRootInput]       = useState('');
  const [rootFile,        setRootFile]        = useState<File | null>(null);
  const [submittingRoot,  setSubmittingRoot]  = useState(false);
  const rootFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!threadId) return;
    api.get(`/discussions/threads/${threadId}`)
      .then(d => {
        const t: Thread = d.thread;
        setThread(t);
        setReactions(t.reactions ?? []);
        setUserReaction(t.reactions?.find(r => r.user === user?.id)?.type ?? null);
        setCommentCount(t.commentCount);
        setEditTitle(t.title);
        setEditContent(t.content);
      })
      .catch(() => setError('Thread not found.'))
      .finally(() => setLoading(false));

    api.get(`/discussions/threads/${threadId}/comments`)
      .then(d => setFlatComments(d.comments));
  }, [threadId, user?.id]);

  // ── Reactions ──────────────────────────────────────────────────────────
  const reactionCounts = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1; return acc;
  }, {});

  const handleReact = async (type: string) => {
    const prev = [...reactions]; const prevR = userReaction;
    const isSame = userReaction === type;
    const next = reactions.filter(r => r.user !== user?.id);
    if (!isSame) next.push({ user: user?.id ?? '', type });
    setReactions(next); setUserReaction(isSame ? null : type);
    try {
      const data = await api.post(`/discussions/threads/${threadId}/react`, { type });
      setReactions(data.reactions); setUserReaction(data.userReaction);
    } catch {
      setReactions(prev); setUserReaction(prevR);
    }
  };

  // ── Comments ───────────────────────────────────────────────────────────
  const handleRootComment = async (e: FormEvent) => {
    e.preventDefault();
    if ((!rootInput.trim() && !rootFile) || submittingRoot) return;
    setSubmittingRoot(true);
    const text = rootInput.trim();
    const file = rootFile;
    try {
      let data;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        if (text) fd.append('content', text);
        data = await apiUpload('POST', `/discussions/threads/${threadId}/comments`, fd);
      } else {
        data = await api.post(`/discussions/threads/${threadId}/comments`, { content: text });
      }
      setFlatComments(prev => [...prev, data.comment]);
      setCommentCount(c => c + 1);
      setRootInput('');
      setRootFile(null);
      if (rootFileInputRef.current) rootFileInputRef.current.value = '';
    } finally { setSubmittingRoot(false); }
  };

  const handleRootPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setRootFile(file);
        }
        break;
      }
    }
  };

  const handleReply = async (parentId: string, content: string, file?: File) => {
    let data;
    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('parentId', parentId);
      if (content) fd.append('content', content);
      data = await apiUpload('POST', `/discussions/threads/${threadId}/comments`, fd);
    } else {
      data = await api.post(`/discussions/threads/${threadId}/comments`, { content, parentId });
    }
    setFlatComments(prev => [...prev, data.comment]);
    setCommentCount(c => c + 1);
  };

  const handleCommentReact = async (commentId: string, type: string) => {
    const prev = [...flatComments];
    setFlatComments(comments => comments.map(c => {
      if (c._id !== commentId) return c;
      const filtered = (c.reactions ?? []).filter(r => r.user !== user?.id);
      const isSame   = (c.reactions ?? []).find(r => r.user === user?.id)?.type === type;
      return { ...c, reactions: isSame ? filtered : [...filtered, { user: user?.id ?? '', type }] };
    }));
    try {
      const data = await api.post(`/discussions/threads/${threadId}/comments/${commentId}/react`, { type });
      setFlatComments(comments => comments.map(c =>
        c._id === commentId ? { ...c, reactions: data.reactions } : c
      ));
    } catch {
      setFlatComments(prev);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/discussions/threads/${threadId}/comments/${commentId}`);
      const descendants = allDescendantIds(flatComments, commentId);
      const toRemove    = new Set([commentId, ...descendants]);
      setFlatComments(prev => prev.filter(c => !toRemove.has(c._id)));
      setCommentCount(c => Math.max(0, c - toRemove.size));
    } catch { /* ignore */ }
  };

  // ── Edit / Delete ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editTitle.trim())   { setEditError('Title cannot be empty');   return; }
    if (!editContent.trim()) { setEditError('Content cannot be empty'); return; }
    setSaving(true); setEditError('');
    try {
      const data = await api.put(`/discussions/threads/${threadId}`, {
        title: editTitle.trim(), content: editContent.trim(),
      });
      setThread(data.thread); setMode('view');
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/discussions/threads/${threadId}`);
      navigate(`/discussions/${thread?.topic?.slug ?? ''}`);
    } catch { setEditError('Failed to delete'); setMode('view'); }
  };

  if (loading) return <div className="thp-status">Loading…</div>;
  if (error)   return <div className="thp-status error">{error}</div>;
  if (!thread) return null;

  const isAuthor      = user?.id === thread.author._id;
  const commentTree   = buildTree(flatComments);
  const initials      = thread.author.username.slice(0, 2).toUpperCase();

  return (
    <div className="thp-page">
      {/* Breadcrumb */}
      <div className="thp-breadcrumb">
        <button onClick={() => navigate('/discussions')} className="thp-back">← Discussions</button>
      </div>

      <div className="thp-card">
        {/* Header */}
        <div className="thp-header">
          <div className="thp-avatar">{initials}</div>
          <div className="thp-meta">
            <span className="thp-username">{thread.author.username}</span>
            <span className="thp-time">{timeAgo(thread.createdAt)}</span>
          </div>
          {isAuthor && mode === 'view' && (
            <div className="thp-actions">
              <button className="thp-action-btn edit"   onClick={() => setMode('edit')}>Edit</button>
              <button className="thp-action-btn delete" onClick={() => setMode('confirmDelete')}>Delete</button>
            </div>
          )}
        </div>

        {/* Edit form */}
        {mode === 'edit' && (
          <div className="thp-edit-form">
            <input className="thp-edit-input" value={editTitle}
              onChange={e => setEditTitle(e.target.value)} maxLength={200} />
            <textarea className="thp-edit-textarea" rows={6}
              value={editContent} onChange={e => setEditContent(e.target.value)} maxLength={2000} />
            {editError && <div className="thp-error">{editError}</div>}
            <div className="thp-edit-btns">
              <button className="thp-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="thp-cancel-btn" onClick={() => { setMode('view'); setEditError(''); }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {mode === 'confirmDelete' && (
          <div className="thp-confirm-delete">
            <span>Delete this thread? This cannot be undone.</span>
            <div className="thp-confirm-btns">
              <button className="thp-confirm-yes" onClick={handleDelete}>Yes, delete</button>
              <button className="thp-confirm-no"  onClick={() => setMode('view')}>Cancel</button>
            </div>
          </div>
        )}

        {/* Body */}
        {mode === 'view' && (
          <>
            <h2 className="thp-title">{thread.title}</h2>
            <p className="thp-content">{thread.content}</p>
            {thread.attachment && <AttachmentBadge attachment={thread.attachment} />}

            {Object.keys(reactionCounts).length > 0 && (
              <div className="thp-reaction-summary" onClick={() => setShowModal(true)}>
                {Object.entries(reactionCounts).map(([type, count]) => (
                  <span key={type} className="thp-reaction-chip">{EMOJI[type]} {count}</span>
                ))}
              </div>
            )}

            <div className="thp-bar">
              <ReactionPicker userReaction={userReaction} onReact={handleReact} />
              <span className="thp-comment-count">💬 {commentCount}</span>
              <button
                className={`thp-bookmark-btn${savedThreadIds.has(thread._id) ? ' saved' : ''}`}
                onClick={() => toggleThread(thread._id)}
              >
                🔖 {savedThreadIds.has(thread._id) ? 'Saved' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Comments */}
      <div className="thp-comments">
        {commentTree.length > 0 && (
          <CommentThread
            nodes={commentTree}
            depth={0}
            postAuthorId={thread.author._id}
            currentUserId={user?.id}
            currentUsername={user?.username}
            currentUserAvatar={user?.avatar}
            onReply={handleReply}
            onDelete={handleDeleteComment}
            onReactToComment={handleCommentReact}
          />
        )}

        {commentTree.length === 0 && (
          <div className="thp-no-comments">No comments yet. Be the first!</div>
        )}

        <form className="thp-comment-form" onSubmit={handleRootComment}>
          <div className="thp-comment-row">
            <div className="thp-self-avatar">
              {user?.username.slice(0, 2).toUpperCase()}
            </div>
            <input
              ref={rootFileInputRef}
              type="file"
              className="thp-comment-file-input"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              onChange={e => setRootFile(e.target.files?.[0] ?? null)}
            />
            <button type="button" className="thp-comment-attach-btn" onClick={() => rootFileInputRef.current?.click()} title="Attach file">📎</button>
            <div className="thp-comment-input-wrap">
              {rootFile && (
                <div className="thp-comment-file-preview">
                  <span className="thp-comment-file-preview-name">{rootFile.name}</span>
                  <button type="button" className="thp-comment-file-preview-remove" onClick={() => { setRootFile(null); if (rootFileInputRef.current) rootFileInputRef.current.value = ''; }}>✕</button>
                </div>
              )}
              <input
                className="thp-comment-input"
                placeholder={rootFile ? 'Add a caption… (optional)' : 'Write a comment… (paste a screenshot to attach it)'}
                value={rootInput}
                onChange={e => setRootInput(e.target.value)}
                onPaste={handleRootPaste}
                maxLength={500}
                autoFocus
              />
            </div>
            <button className="thp-comment-submit" type="submit"
              disabled={submittingRoot || (!rootInput.trim() && !rootFile)}>
              {submittingRoot ? '…' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {showModal && (
        <ReactionsModal
          reactionsUrl={`/discussions/threads/${threadId}/reactions`}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
