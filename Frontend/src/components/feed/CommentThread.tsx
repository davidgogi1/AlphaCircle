import { useState, type FormEvent } from 'react';
import ReactionPicker from './ReactionPicker';
import { EMOJI } from './reactions';
import './CommentThread.css';

export interface CommentNode {
  _id: string;
  content: string;
  author: { _id: string; username: string };
  createdAt: string;
  parent: string | null;
  reactions?: { user: string; type: string }[];
  replies: CommentNode[];
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
  onReply:          (parentId: string, content: string) => Promise<void>;
  onDelete:         (commentId: string) => void;
  onReactToComment: (commentId: string, type: string) => Promise<void>;
}

function CommentItem({ node, depth, postAuthorId, currentUserId, currentUsername, onReply, onDelete, onReactToComment }: ItemProps) {
  const [showReply,     setShowReply]     = useState(false);
  const [replyContent,  setReplyContent]  = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canDelete  = currentUserId === node.author._id || currentUserId === postAuthorId;
  const initials   = node.author.username.slice(0, 2).toUpperCase();
  const selfInit   = (currentUsername ?? '?').slice(0, 2).toUpperCase();

  const reactions     = node.reactions ?? [];
  const userReaction  = reactions.find(r => r.user === currentUserId)?.type ?? null;
  const reactionCounts = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1; return acc;
  }, {});

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onReply(node._id, replyContent.trim());
      setReplyContent('');
      setShowReply(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ct-item" style={{ marginLeft: depth > 0 ? `${Math.min(depth, 5) * 20}px` : 0 }}>
      {depth > 0 && <div className="ct-line" />}
      <div className="ct-body">
        <div className="ct-header">
          <div className="ct-avatar">{initials}</div>
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

        <p className="ct-content">{node.content}</p>

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
              <div className="ct-self-avatar">{selfInit}</div>
              <input
                className="ct-reply-input"
                placeholder={`Reply to ${node.author.username}…`}
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                maxLength={500}
                autoFocus
              />
              <button className="ct-reply-submit" type="submit"
                disabled={submitting || !replyContent.trim()}>
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
  onReply:           (parentId: string, content: string) => Promise<void>;
  onDelete:          (commentId: string) => void;
  onReactToComment:  (commentId: string, type: string) => Promise<void>;
}

export default function CommentThread({ nodes, depth, postAuthorId, currentUserId, currentUsername, onReply, onDelete, onReactToComment }: ThreadProps) {
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
          onReply={onReply}
          onDelete={onDelete}
          onReactToComment={onReactToComment}
        />
      ))}
    </div>
  );
}
