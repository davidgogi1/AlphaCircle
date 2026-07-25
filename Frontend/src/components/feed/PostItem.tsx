import { useState, useRef, type ClipboardEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSaved } from '../../contexts/SavedContext';
import { api, apiUpload } from '../../api';
import ReactionPicker from './ReactionPicker';
import ReactionsModal from './ReactionsModal';
import CommentThread, { type CommentNode } from './CommentThread';
import { EMOJI } from './reactions';
import AttachmentBadge from './AttachmentBadge';
import UserAvatar from '../UserAvatar';
import './PostItem.css';

export interface Post {
  _id: string;
  title?: string;
  content: string;
  author: { _id: string; username: string; avatar?: string };
  createdAt: string;
  reactions?: { user: string; type: string }[];
  commentCount?: number;
  attachment?: { filename: string; originalName: string; mimetype: string; size: number };
}

interface FlatComment {
  _id: string;
  content: string;
  author: { _id: string; username: string };
  createdAt: string;
  parent: string | null;
  reactions?: { user: string; type: string }[];
  attachment?: { filename: string; originalName: string; mimetype: string; size: number };
}

interface Props {
  post: Post;
  onUpdate?: (updated: Post) => void;
  onDelete?:  (id: string) => void;
}

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60)    return 'just now';
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function renderContent(content: string, onHashtagClick: (tag: string) => void) {
  return content.split(/(#\w+)/g).map((part, i) =>
    /^#\w+$/.test(part) ? (
      <span
        key={i}
        className="pi-hashtag"
        onClick={(e) => { e.stopPropagation(); onHashtagClick(part.slice(1).toLowerCase()); }}
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function buildTree(flat: FlatComment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of flat) map.set(c._id, { ...c, replies: [] });

  for (const c of flat) {
    const node = map.get(c._id)!;
    if (c.parent && map.has(c.parent)) {
      map.get(c.parent)!.replies.push(node);
    } else {
      roots.push(node);
    }
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

export default function PostItem({ post, onUpdate, onDelete }: Props) {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const { savedPostIds, togglePost } = useSaved();
  const isAuthor  = user?.id === post.author._id;

  // edit / delete
  const editFileRef   = useRef<HTMLInputElement>(null);
  const [mode,        setMode]        = useState<'view' | 'edit' | 'confirmDelete'>('view');
  const [editTitle,   setEditTitle]   = useState(post.title ?? '');
  const [editContent, setEditContent] = useState(post.content);
  const [editFile,    setEditFile]    = useState<File | null>(null);
  const [removeAtt,   setRemoveAtt]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [postError,   setPostError]   = useState('');

  // reactions
  const initReactions = post.reactions ?? [];
  const [reactions,    setReactions]    = useState(initReactions);
  const [userReaction, setUserReaction] = useState<string | null>(
    initReactions.find(r => r.user === user?.id)?.type ?? null
  );
  const [showModal, setShowModal] = useState(false);

  // comments
  const [showComments,    setShowComments]    = useState(false);
  const [flatComments,    setFlatComments]    = useState<FlatComment[]>([]);
  const [commentsLoaded,  setCommentsLoaded]  = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentCount,    setCommentCount]    = useState(post.commentCount ?? 0);
  const [rootInput,       setRootInput]       = useState('');
  const [rootFile,        setRootFile]        = useState<File | null>(null);
  const [submittingRoot,  setSubmittingRoot]  = useState(false);
  const rootFileInputRef = useRef<HTMLInputElement>(null);

  // ── Reactions ──────────────────────────────────────────────────────────────
  const reactionCounts = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});

  const handleReact = async (type: string) => {
    const prev = [...reactions];
    const prevReaction = userReaction;
    const isSame = userReaction === type;

    const next = reactions.filter(r => r.user !== user?.id);
    if (!isSame) next.push({ user: user?.id ?? '', type });
    setReactions(next);
    setUserReaction(isSame ? null : type);

    try {
      const data = await api.post(`/posts/${post._id}/react`, { type });
      setReactions(data.reactions);
      setUserReaction(data.userReaction);
    } catch {
      setReactions(prev);
      setUserReaction(prevReaction);
    }
  };

  // ── Comments ───────────────────────────────────────────────────────────────
  const toggleComments = async () => {
    if (!showComments && !commentsLoaded) {
      setCommentsLoading(true);
      try {
        const data = await api.get(`/posts/${post._id}/comments`);
        setFlatComments(data.comments);
        setCommentsLoaded(true);
      } finally {
        setCommentsLoading(false);
      }
    }
    setShowComments(v => !v);
  };

  // Root-level comment submit
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
        data = await apiUpload('POST', `/posts/${post._id}/comments`, fd);
      } else {
        data = await api.post(`/posts/${post._id}/comments`, { content: text });
      }
      setFlatComments(prev => [...prev, data.comment]);
      setCommentCount(c => c + 1);
      setRootInput('');
      setRootFile(null);
      if (rootFileInputRef.current) rootFileInputRef.current.value = '';
    } finally {
      setSubmittingRoot(false);
    }
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

  // Reply to a specific comment
  const handleReply = async (parentId: string, content: string, file?: File) => {
    let data;
    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('parentId', parentId);
      if (content) fd.append('content', content);
      data = await apiUpload('POST', `/posts/${post._id}/comments`, fd);
    } else {
      data = await api.post(`/posts/${post._id}/comments`, { content, parentId });
    }
    setFlatComments(prev => [...prev, data.comment]);
    setCommentCount(c => c + 1);
  };

  // React to a comment (optimistic)
  const handleCommentReact = async (commentId: string, type: string) => {
    const prev = [...flatComments];
    setFlatComments(comments => comments.map(c => {
      if (c._id !== commentId) return c;
      const filtered = (c.reactions ?? []).filter(r => r.user !== user?.id);
      const isSame   = (c.reactions ?? []).find(r => r.user === user?.id)?.type === type;
      return { ...c, reactions: isSame ? filtered : [...filtered, { user: user?.id ?? '', type }] };
    }));
    try {
      const data = await api.post(`/posts/${post._id}/comments/${commentId}/react`, { type });
      setFlatComments(comments => comments.map(c =>
        c._id === commentId ? { ...c, reactions: data.reactions } : c
      ));
    } catch {
      setFlatComments(prev);
    }
  };

  // Delete comment + cascade
  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/posts/${post._id}/comments/${commentId}`);
      const descendants = allDescendantIds(flatComments, commentId);
      const toRemove = new Set([commentId, ...descendants]);
      setFlatComments(prev => prev.filter(c => !toRemove.has(c._id)));
      setCommentCount(c => Math.max(0, c - toRemove.size));
    } catch { /* ignore */ }
  };

  // ── Edit / Delete ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editContent.trim()) { setPostError('Content cannot be empty'); return; }
    setSaving(true); setPostError('');
    try {
      const fd = new FormData();
      fd.append('content', editContent.trim());
      if (editTitle.trim()) fd.append('title', editTitle.trim());
      if (editFile)         fd.append('file', editFile);
      else if (removeAtt)   fd.append('removeAttachment', 'true');
      const data = await apiUpload('PUT', `/posts/${post._id}`, fd);
      onUpdate?.(data.post);
      setEditFile(null);
      setRemoveAtt(false);
      setMode('view');
    } catch (err: unknown) {
      setPostError(err instanceof Error ? err.message : 'Failed to update');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/posts/${post._id}`);
      onDelete?.(post._id);
    } catch {
      setPostError('Failed to delete post');
      setMode('view');
    }
  };

  const cancelEdit = () => {
    setEditTitle(post.title ?? '');
    setEditContent(post.content);
    setEditFile(null);
    setRemoveAtt(false);
    setPostError('');
    setMode('view');
  };

  const commentTree = buildTree(flatComments);

  return (
    <div className="post-item">
      {/* Header */}
      <div className="pi-header">
        <UserAvatar
          username={post.author.username}
          avatar={post.author.avatar}
          size={38}
          onClick={() => navigate(`/members/${post.author._id}`)}
        />
        <div className="pi-meta">
          <span
            className="pi-username pi-username-link"
            onClick={() => navigate(`/members/${post.author._id}`)}
          >
            {post.author.username}
          </span>
          <span className="pi-time">{timeAgo(post.createdAt)}</span>
        </div>
        {isAuthor && mode === 'view' && (
          <div className="pi-actions">
            <button className="pi-action-btn edit"   onClick={() => setMode('edit')}>Edit</button>
            <button className="pi-action-btn delete" onClick={() => setMode('confirmDelete')}>Delete</button>
          </div>
        )}
      </div>

      {/* Edit form */}
      {mode === 'edit' && (
        <div className="pi-edit-form">
          <input className="pi-edit-input" placeholder="Title (optional)"
            value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={200} />
          <textarea className="pi-edit-textarea" rows={5}
            value={editContent} onChange={e => setEditContent(e.target.value)} maxLength={1000} />

          {/* Attachment section */}
          <div className="pi-edit-att">
            {/* Show existing attachment unless removed */}
            {post.attachment && !removeAtt && !editFile && (
              <div className="pi-edit-att-current">
                <span className="pi-edit-att-name">📎 {post.attachment.originalName}</span>
                <button type="button" className="pi-edit-att-remove" onClick={() => setRemoveAtt(true)}>Remove</button>
              </div>
            )}

            {/* New file chosen */}
            {editFile && (
              <div className="pi-edit-att-current">
                <span className="pi-edit-att-name">📎 {editFile.name} <span className="pi-edit-att-new">(new)</span></span>
                <button type="button" className="pi-edit-att-remove" onClick={() => { setEditFile(null); if (editFileRef.current) editFileRef.current.value = ''; }}>Remove</button>
              </div>
            )}

            {/* File picker — shown when no current attachment, it was removed, or to replace */}
            {(!post.attachment || removeAtt || editFile) && (
              <label className="pi-edit-att-label">
                📎 {editFile ? 'Change file' : 'Attach file'}
                <input
                  ref={editFileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  className="pi-edit-att-hidden"
                  onChange={e => { setEditFile(e.target.files?.[0] ?? null); setRemoveAtt(false); }}
                />
              </label>
            )}

            {/* Replace button when attachment exists and not yet removed */}
            {post.attachment && !removeAtt && !editFile && (
              <label className="pi-edit-att-label">
                🔄 Replace file
                <input
                  ref={editFileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  className="pi-edit-att-hidden"
                  onChange={e => setEditFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          {postError && <div className="pi-error">{postError}</div>}
          <div className="pi-edit-btns">
            <button className="pi-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="pi-cancel-btn" onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {mode === 'confirmDelete' && (
        <div className="pi-confirm-delete">
          <span>Delete this post? This cannot be undone.</span>
          <div className="pi-confirm-btns">
            <button className="pi-confirm-yes" onClick={handleDelete}>Yes, delete</button>
            <button className="pi-confirm-no"  onClick={() => setMode('view')}>Cancel</button>
          </div>
        </div>
      )}

      {/* Post body */}
      {mode === 'view' && (
        <>
          {post.title && <h3 className="pi-title">{post.title}</h3>}
          <p className="pi-content">{renderContent(post.content, tag => navigate(`/hashtag/${tag}`))}</p>
          {post.attachment && <AttachmentBadge attachment={post.attachment} />}

          {Object.keys(reactionCounts).length > 0 && (
            <div className="pi-reaction-summary" onClick={() => setShowModal(true)}>
              {Object.entries(reactionCounts).map(([type, count]) => (
                <span key={type} className="pi-reaction-chip">{EMOJI[type]} {count}</span>
              ))}
            </div>
          )}

          <div className="pi-bar">
            <ReactionPicker userReaction={userReaction} onReact={handleReact} />
            <button className="pi-bar-btn" onClick={toggleComments}>
              💬 {commentCount > 0 && <span>{commentCount}</span>}
              <span className="pi-bar-label">{showComments ? 'Hide' : 'Comment'}</span>
            </button>
            <button
              className={`pi-bar-btn pi-save-btn${savedPostIds.has(post._id) ? ' saved' : ''}`}
              onClick={() => togglePost(post._id)}
            >
              🔖 <span className="pi-bar-label">{savedPostIds.has(post._id) ? 'Saved' : 'Save'}</span>
            </button>
          </div>

          {/* Comment section */}
          {showComments && (
            <div className="pi-comments">
              {commentsLoading && <div className="pi-comments-loading">Loading…</div>}

              {!commentsLoading && commentTree.length === 0 && (
                <div className="pi-no-comments">No comments yet. Be the first!</div>
              )}

              {commentTree.length > 0 && (
                <CommentThread
                  nodes={commentTree}
                  depth={0}
                  postAuthorId={post.author._id}
                  currentUserId={user?.id}
                  currentUsername={user?.username}
                  onReply={handleReply}
                  onDelete={handleDeleteComment}
                  onReactToComment={handleCommentReact}
                />
              )}

              {/* Root-level comment form */}
              <form className="pi-comment-form" onSubmit={handleRootComment}>
                <div className="pi-comment-input-row">
                  <div className="pi-comment-self-avatar">
                    {user?.username.slice(0, 2).toUpperCase()}
                  </div>
                  <input
                    ref={rootFileInputRef}
                    type="file"
                    className="pi-comment-file-input"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    onChange={e => setRootFile(e.target.files?.[0] ?? null)}
                  />
                  <button type="button" className="pi-comment-attach-btn" onClick={() => rootFileInputRef.current?.click()} title="Attach file">📎</button>
                  <div className="pi-comment-input-wrap">
                    {rootFile && (
                      <div className="pi-comment-file-preview">
                        <span className="pi-comment-file-preview-name">{rootFile.name}</span>
                        <button type="button" className="pi-comment-file-preview-remove" onClick={() => { setRootFile(null); if (rootFileInputRef.current) rootFileInputRef.current.value = ''; }}>✕</button>
                      </div>
                    )}
                    <input
                      className="pi-comment-input"
                      placeholder={rootFile ? 'Add a caption… (optional)' : 'Write a comment… (paste a screenshot to attach it)'}
                      value={rootInput}
                      onChange={e => setRootInput(e.target.value)}
                      onPaste={handleRootPaste}
                      maxLength={500}
                    />
                  </div>
                  <button className="pi-comment-submit" type="submit"
                    disabled={submittingRoot || (!rootInput.trim() && !rootFile)}>
                    {submittingRoot ? '…' : 'Post'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {showModal && (
        <ReactionsModal reactionsUrl={`/posts/${post._id}/reactions`} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
