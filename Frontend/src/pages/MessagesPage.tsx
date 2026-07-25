import { useEffect, useRef, useState, type FormEvent, type ClipboardEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useMessageNotifications } from "../contexts/MessageNotificationsContext";
import { api, apiUpload } from "../api";
import ReactionPicker from "../components/feed/ReactionPicker";
import { EMOJI } from "../components/feed/reactions";
import { extractConsensusLinkId } from "../utils/consensusLink";
import "./MessagesPage.css";

function MessageContent({ content }: { content: string }) {
  return (
    <>
      {content.split("\n").map((line, i) => {
        const consensusId = extractConsensusLinkId(line);
        if (consensusId) {
          return (
            <Link key={i} to={`/consensus/${consensusId}`} className="mp-consensus-link">
              📊 Open Consensus Poll →
            </Link>
          );
        }
        return <span key={i} className="mp-bubble-line">{line}</span>;
      })}
    </>
  );
}

interface OtherUser {
  _id: string;
  username: string;
}

interface Conversation {
  conversationId: string;
  otherUser: OtherUser;
  content: string;
  attachment?: { originalname: string };
  sender: string;
  createdAt: string;
  unreadCount: number;
}

interface Attachment { filename: string; originalname: string; mimetype: string; size: number; }
interface Reaction { user: string; type: string; }
interface ReplyPreview { _id: string; content: string; sender: { _id: string; username: string }; }
interface Message {
  _id: string;
  sender: { _id: string; username: string };
  recipient: { _id: string; username: string };
  content: string;
  attachment?: Attachment;
  reactions: Reaction[];
  replyTo?: ReplyPreview | null;
  createdAt: string;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentView({ attachment, mine }: { attachment: Attachment; mine: boolean }) {
  const url = `/uploads/${attachment.filename}`;
  if (attachment.mimetype.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mp-att-img-link">
        <img src={url} alt={attachment.originalname} className="mp-att-img" />
      </a>
    );
  }
  const ext = attachment.originalname.split(".").pop()?.toUpperCase() ?? "FILE";
  return (
    <a href={url} download={attachment.originalname} className={`mp-att-doc ${mine ? "mine" : "theirs"}`}>
      <span className="mp-att-doc-icon">📄</span>
      <div className="mp-att-doc-info">
        <span className="mp-att-doc-name">{attachment.originalname}</span>
        <span className="mp-att-doc-meta">{ext} · {formatBytes(attachment.size)}</span>
      </div>
      <span className="mp-att-doc-dl">↓</span>
    </a>
  );
}

function timeLabel(date: string) {
  const d = new Date(date);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MessagesPage() {
  const { userId: activeUserId } = useParams<{ userId?: string }>();
  console.log(activeUserId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, markRead } = useMessageNotifications();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDragging,  setIsDragging]  = useState(false);
  const [replyingTo,  setReplyingTo]  = useState<Message | null>(null);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const activeUserIdRef = useRef(activeUserId);

  useEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  // Load conversation list
  const loadConversations = () => {
    api
      .get("/messages/conversations")
      .then((d) => setConversations(d.conversations));
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Attach listeners to the shared notifications socket
  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg: Message) => {
      const myId = user?.id;
      const otherId =
        msg.sender._id === myId ? msg.recipient._id : msg.sender._id;

      // If the message belongs to the active conversation, add it and mark it
      // read immediately — the user is actively watching this conversation.
      if (
        otherId === activeUserIdRef.current ||
        msg.sender._id === activeUserIdRef.current
      ) {
        setMessages((prev) => [...prev, msg]);
        markRead(otherId);
      }

      // Refresh conversation list
      loadConversations();
    };

    const onReaction = ({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) => {
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, reactions } : m)));
    };

    socket.on("new_message", onMessage);
    socket.on("message_reaction", onReaction);

    return () => {
      socket.off("new_message", onMessage);
      socket.off("message_reaction", onReaction);
    };
  }, [socket, user?.id, markRead]);

  // Load messages when active user changes
  useEffect(() => {
    setReplyingTo(null);
    if (!activeUserId) {
      setMessages([]);
      setOtherUser(null);
      return;
    }
    setLoadingMsgs(true);
    api
      .get(`/messages/${activeUserId}`)
      .then((d) => {
        setMessages(d.messages);
        setOtherUser(d.otherUser);
        // The server just marked these as read — reflect that immediately
        // instead of waiting for a remount to notice.
        markRead(activeUserId);
        setConversations((prev) => prev.map((c) =>
          c.otherUser._id === activeUserId ? { ...c, unreadCount: 0 } : c
        ));
      })
      .finally(() => setLoadingMsgs(false));
  }, [activeUserId, markRead]);

  // Scroll to bottom when messages load/arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setPendingFile(file);
        }
        break;
      }
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !pendingFile) || sending || !activeUserId) return;
    setSending(true);
    const text = input.trim();
    const file = pendingFile;
    const replyToId = replyingTo?._id;
    setInput("");
    setPendingFile(null);
    setReplyingTo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    try {
      let data;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        if (text) fd.append("content", text);
        if (replyToId) fd.append("replyTo", replyToId);
        data = await apiUpload("POST", `/messages/${activeUserId}`, fd);
      } else {
        data = await api.post(`/messages/${activeUserId}`, { content: text, replyTo: replyToId });
      }
      setMessages((prev) => [...prev, data.message]);
      loadConversations();
    } finally {
      setSending(false);
    }
  };

  const handleReact = async (messageId: string, type: string) => {
    const msg = messages.find((m) => m._id === messageId);
    const isSame = (msg?.reactions ?? []).find((r) => r.user === user?.id)?.type === type;
    setMessages((prev) => prev.map((m) => {
      if (m._id !== messageId) return m;
      const withoutMine = (m.reactions ?? []).filter((r) => r.user !== user?.id);
      return { ...m, reactions: isSame ? withoutMine : [...withoutMine, { user: user!.id, type }] };
    }));
    const data = await api.post(`/messages/msg/${messageId}/react`, { type });
    setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, reactions: data.reactions } : m)));
  };

  return (
    <div className="mp-shell">
      {/* ── Conversation list ── */}
      <aside
        className={`mp-list ${activeUserId ? "mp-list-hidden-mobile" : ""}`}
      >
        <div className="mp-list-header">
          <h2>Messages</h2>
        </div>

        {conversations.length === 0 && (
          <div className="mp-empty">No conversations yet.</div>
        )}

        {conversations.map((c) => (
          <button
            key={c.conversationId}
            className={`mp-conv ${activeUserId === c.otherUser._id ? "active" : ""}`}
            onClick={() => navigate(`/messages/${c.otherUser._id}`)}
          >
            <div className="mp-conv-avatar">
              {c.otherUser.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="mp-conv-info">
              <div className="mp-conv-top">
                <span className="mp-conv-name">{c.otherUser.username}</span>
                <span className="mp-conv-time">{timeLabel(c.createdAt)}</span>
              </div>
              <div className="mp-conv-preview">
                {c.sender === user?.id ? "You: " : ""}
                {c.content || (c.attachment ? `📎 ${c.attachment.originalname}` : "")}
              </div>
            </div>
            {c.unreadCount > 0 && (
              <span className="mp-unread">{c.unreadCount}</span>
            )}
          </button>
        ))}

        <div className="mp-new-convo">
          <button className="mp-empty-link" onClick={() => navigate('/members')}>
            + Start a new conversation
          </button>
        </div>
      </aside>

      {/* ── Chat area ── */}
      <div
        className={`mp-chat ${!activeUserId ? "mp-chat-hidden-mobile" : ""}`}
        onDragEnter={e => { e.preventDefault(); dragCounterRef.current++; if (activeUserId) setIsDragging(true); }}
        onDragOver={e => e.preventDefault()}
        onDragLeave={() => { dragCounterRef.current--; if (dragCounterRef.current === 0) setIsDragging(false); }}
        onDrop={e => {
          e.preventDefault();
          dragCounterRef.current = 0;
          setIsDragging(false);
          if (!activeUserId) return;
          const file = e.dataTransfer.files[0];
          if (file) setPendingFile(file);
        }}
      >
        {isDragging && activeUserId && (
          <div className="mp-drop-overlay">
            <div className="mp-drop-box">
              <span className="mp-drop-icon">📎</span>
              <span>Drop to attach</span>
            </div>
          </div>
        )}
        {!activeUserId ? (
          <div className="mp-no-chat">
            <span>Select a conversation</span>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="mp-chat-header">
              <button
                className="mp-back-btn"
                onClick={() => navigate("/messages")}
              >
                ←
              </button>
              <div className="mp-chat-avatar">
                {otherUser?.username.slice(0, 2).toUpperCase()}
              </div>
              <span className="mp-chat-name">{otherUser?.username}</span>
            </div>

            {/* Messages */}
            <div className="mp-messages">
              {loadingMsgs && <div className="mp-loading">Loading…</div>}

              {!loadingMsgs && messages.length === 0 && (
                <div className="mp-start">Start the conversation!</div>
              )}

              {messages.map((m) => {
                const mine = m.sender._id === user?.id;
                const userReaction = (m.reactions ?? []).find((r) => r.user === user?.id)?.type ?? null;
                const reactionCounts = (m.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
                  acc[r.type] = (acc[r.type] ?? 0) + 1;
                  return acc;
                }, {});
                return (
                  <div
                    key={m._id}
                    className={`mp-bubble-row ${mine ? "mine" : "theirs"}`}
                  >
                    {!mine && (
                      <div className="mp-bubble-avatar">
                        {m.sender.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="mp-bubble-wrap">
                      <div className={`mp-bubble ${mine ? "mine" : "theirs"}`}>
                        {m.replyTo && (
                          <div className="mp-bubble-quote">
                            <span className="mp-bubble-quote-sender">{m.replyTo.sender.username}</span>
                            <span className="mp-bubble-quote-text">{m.replyTo.content || "📎 Attachment"}</span>
                          </div>
                        )}
                        {m.attachment && <AttachmentView attachment={m.attachment} mine={mine} />}
                        {m.content && <MessageContent content={m.content} />}
                      </div>
                      {Object.keys(reactionCounts).length > 0 && (
                        <div className="mp-bubble-reactions">
                          {Object.entries(reactionCounts).map(([type, count]) => (
                            <span key={type} className="mp-bubble-reaction-chip">{EMOJI[type]} {count}</span>
                          ))}
                        </div>
                      )}
                      <div className="mp-bubble-footer">
                        <span className="mp-bubble-time">
                          {timeLabel(m.createdAt)}
                        </span>
                        <div className="mp-bubble-actions">
                          <ReactionPicker
                            userReaction={userReaction}
                            onReact={(type) => handleReact(m._id, type)}
                            compact
                          />
                          <button
                            type="button"
                            className="mp-reply-btn"
                            onClick={() => setReplyingTo(m)}
                          >
                            ↩ Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            {replyingTo && (
              <div className="mp-reply-preview">
                <div className="mp-reply-preview-info">
                  <span className="mp-reply-preview-label">Replying to {replyingTo.sender._id === user?.id ? "yourself" : replyingTo.sender.username}</span>
                  <span className="mp-reply-preview-text">{replyingTo.content || "📎 Attachment"}</span>
                </div>
                <button type="button" className="mp-reply-preview-cancel" onClick={() => setReplyingTo(null)}>✕</button>
              </div>
            )}
            <form className="mp-input-bar" onSubmit={handleSend}>
              <input
                ref={fileInputRef}
                type="file"
                className="mp-file-input"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
              />
              <button type="button" className="mp-attach-btn" onClick={() => fileInputRef.current?.click()} title="Attach file">📎</button>
              <div className="mp-input-wrap">
                {pendingFile && (
                  <div className="mp-file-preview">
                    <span className="mp-file-preview-name">{pendingFile.name}</span>
                    <button type="button" className="mp-file-preview-remove" onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>✕</button>
                  </div>
                )}
                <input
                  className="mp-input"
                  placeholder={pendingFile ? "Add a caption… (optional)" : "Write a message… (paste a screenshot to attach it)"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handlePaste}
                  maxLength={2000}
                  autoFocus
                />
              </div>
              <button
                className="mp-send-btn"
                type="submit"
                disabled={sending || (!input.trim() && !pendingFile)}
              >
                ➤
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
