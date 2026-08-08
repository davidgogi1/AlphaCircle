import { useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import ReactionPicker from './ReactionPicker';
import AttachmentBadge from './AttachmentBadge';
import UserAvatar from '../UserAvatar';
import { EMOJI } from './reactions';
import './CommentThread.css';

export interface CommentAttachment {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

export interface CommentNode {
  _id: string;
  content: string;
  author: { _id: string; username: string; avatar?: string };
  createdAt: string;
  parent: string | null;
  reactions?: { user: string; type: string }[];
  attachment?: CommentAttachment;
  replies: CommentNode[];
}

function CommentAttachmentView({ attachment }: { attachment: CommentAttachment }) {
  const url = `/uploads/${attachment.filename}`;
  if (attachment.mimetype.startsWith('image/')) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="ct-att-img-link">
        <img src={url} alt={attachment.originalName} className="ct-att-img" />
      </a>
    );
  }
  return (
    <div className="ct-att-doc-wrap">
      <AttachmentBadge attachment={attachment} />
    </div>
  );
}

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60)    return 'just now';
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

interface ItemProps {
  node:             CommentNode;
  depth:            number;
  postAuthorId:     string;
  currentUserId:    string | undefined;
  currentUsername:  string | undefined;
  currentUserAvatar?: string;
  onReply:          (parentId: string, content: string, file?: File) => Promise<void>;
  onDelete:         (commentId: string) => void;
  onReactToComment: (commentId: string, type: string) => Promise<void>;
}

function CommentItem({ node, depth, postAuthorId, currentUserId, currentUsername, currentUserAvatar, onReply, onDelete, onReactToComment }: ItemProps) {
  const [showReply,     setShowReply]     = useState(false);
  const [replyContent,  setReplyContent]  = useState('');
  const [replyFile,     setReplyFile]     = useState<File | null>(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const canDelete  = currentUserId === node.author._id || currentUserId === postAuthorId;

  const reactions     = node.reactions ?? [];
  const userReaction  = reactions.find(r => r.user === currentUserId)?.type ?? null;
  const reactionCounts = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1; return acc;
  }, {});

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if ((!replyContent.trim() && !replyFile) || submitting) return;
    setSubmitting(true);
    try {
      await onReply(node._id, replyContent.trim(), replyFile ?? undefined);
      setReplyContent('');
      setReplyFile(null);
      if (replyFileInputRef.current) replyFileInputRef.current.value = '';
      setShowReply(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setReplyFile(file);
        }
        break;
      }
    }
  };

  return (
    <div className="ct-item" style={{ marginLeft: depth > 0 ? `${Math.min(depth, 5) * 20}px` : 0 }}>
      {depth > 0 && <div className="ct-line" />}
      <div className="ct-body">
        <div className="ct-header">
          <UserAvatar username={node.author.username} avatar={node.author.avatar} size={28} />
          <div className="ct-meta">
            <span className="ct-username">{node.author.username}</span>
            <span className="ct-time">{timeAgo(node.createdAt)}</span>
          </div>
          {canDelete && (
            confirmDelete ? (
              <div className="ct-confirm-row">
                <span className="ct-confirm-text">Delete?</span>
                <button className="ct-confirm-yes" onClick={() => onDelete(node._id)}>Yes</button>
                <button className="ct-confirm-no" onClick={() => setConfirmDelete(false)}>No</button>
              </div>
            ) : (
              <button className="ct-delete" onClick={() => setConfirmDelete(true)}>✕</button>
            )
          )}
        </div>

        {node.attachment && <CommentAttachmentView attachment={node.attachment} />}
        {node.content && <p className="ct-content">{node.content}</p>}

        {/* Reaction summary */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className="ct-reaction-summary">
            {Object.entries(reactionCounts).map(([type, count]) => (
              <span key={type} className="ct-reaction-chip">{EMOJI[type]} {count}</span>
            ))}
          </div>
        )}

        <div className="ct-actions">
          {currentUserId && (
            <ReactionPicker
              compact
              userReaction={userReaction}
              onReact={type => onReactToComment(node._id, type)}
            />
          )}
          {currentUserId && (
            <button className="ct-reply-btn" onClick={() => setShowReply(v => !v)}>
              {showReply ? 'Cancel' : '↩ Reply'}
            </button>
          )}
        </div>

        {showReply && (
          <form className="ct-reply-form" onSubmit={handleReply}>
            <div className="ct-reply-row">
              <UserAvatar username={currentUsername ?? '?'} avatar={currentUserAvatar} size={26} />
              <input
                ref={replyFileInputRef}
                type="file"
                className="ct-reply-file-input"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                onChange={e => setReplyFile(e.target.files?.[0] ?? null)}
              />
              <button type="button" className="ct-reply-attach-btn" onClick={() => replyFileInputRef.current?.click()} title="Attach file">📎</button>
              <div className="ct-reply-input-wrap">
                {replyFile && (
                  <div className="ct-reply-file-preview">
                    <span className="ct-reply-file-preview-name">{replyFile.name}</span>
                    <button type="button" className="ct-reply-file-preview-remove" onClick={() => { setReplyFile(null); if (replyFileInputRef.current) replyFileInputRef.current.value = ''; }}>✕</button>
                  </div>
                )}
                <input
                  className="ct-reply-input"
                  placeholder={replyFile ? 'Add a caption… (optional)' : `Reply to ${node.author.username}…`}
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  onPaste={handleReplyPaste}
                  maxLength={500}
                  autoFocus
                />
              </div>
              <button className="ct-reply-submit" type="submit"
                disabled={submitting || (!replyContent.trim() && !replyFile)}>
                {submitting ? '…' : 'Post'}
              </button>
            </div>
          </form>
        )}

        {node.replies.length > 0 && (
          <CommentThread
            nodes={node.replies}
            depth={depth + 1}
            postAuthorId={postAuthorId}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            currentUserAvatar={currentUserAvatar}
            onReply={onReply}
            onDelete={onDelete}
            onReactToComment={onReactToComment}
          />
        )}
      </div>
    </div>
  );
}

interface ThreadProps {
  nodes:             CommentNode[];
  depth:             number;
  postAuthorId:      string;
  currentUserId:     string | undefined;
  currentUsername:   string | undefined;
  currentUserAvatar?: string;
  onReply:           (parentId: string, content: string, file?: File) => Promise<void>;
  onDelete:          (commentId: string) => void;
  onReactToComment:  (commentId: string, type: string) => Promise<void>;
}

export default function CommentThread({ nodes, depth, postAuthorId, currentUserId, currentUsername, currentUserAvatar, onReply, onDelete, onReactToComment }: ThreadProps) {
  return (
    <div className="ct-thread">
      {nodes.map(node => (
        <CommentItem
          key={node._id}
          node={node}
          depth={depth}
          postAuthorId={postAuthorId}
          currentUserId={currentUserId}
          currentUsername={currentUsername}
          currentUserAvatar={currentUserAvatar}
          onReply={onReply}
          onDelete={onDelete}
          onReactToComment={onReactToComment}
        />
      ))}
    </div>
  );
}
