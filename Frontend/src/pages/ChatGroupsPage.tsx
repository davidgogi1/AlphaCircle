import { useEffect, useRef, useState, type FormEvent, type ClipboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGroupNotifications } from '../contexts/GroupNotificationsContext';
import { api, apiUpload } from '../api';
import ReactionPicker from '../components/feed/ReactionPicker';
import UserAvatar from '../components/UserAvatar';
import { EMOJI } from '../components/feed/reactions';
import { extractConsensusLinkId } from '../utils/consensusLink';
import {
  importPublicKey, generateSessionKeyForRecipients, unwrapSessionKey,
  encryptContentWithKey, decryptContentWithKey, encryptFileWithKey, decryptFileWithKey,
  b64ToBuf, bufToB64,
} from '../utils/crypto';
import './ChatGroupsPage.css';

function MessageContent({ content }: { content: string }) {
  return (
    <>
      {content.split('\n').map((line, i) => {
        const consensusId = extractConsensusLinkId(line);
        if (consensusId) {
          return (
            <Link key={i} to={`/consensus/${consensusId}`} className="cg-consensus-link">
              📊 Open Consensus Poll →
            </Link>
          );
        }
        return <span key={i} className="cg-bubble-line">{line}</span>;
      })}
    </>
  );
}

interface Member       { user: { _id: string; username: string }; status: string; _id: string; }
interface Group        { _id: string; name: string; creator: { _id: string; username: string }; members: Member[]; pendingAdminTransfer?: string; createdAt: string; }
interface Attachment   { filename: string; originalname: string; mimetype: string; size: number; }
interface Reaction     { user: string; type: string; }
interface ReplyPreview {
  _id: string; content: string; sender: { _id: string; username: string };
  encrypted?: boolean; cipherText?: string; iv?: string; encryptedKeys?: Record<string, string>;
}
interface GroupMessage {
  _id: string; sender: { _id: string; username: string; avatar?: string }; content: string; attachment?: Attachment;
  encrypted?: boolean; cipherText?: string; iv?: string; encryptedKeys?: Record<string, string>;
  encryptedAttachment?: { filename: string; size: number; iv: string; encryptedMeta: string; encryptedMetaIv: string };
  reactions: Reaction[]; replyTo?: ReplyPreview | null; createdAt: string; group?: string;
  decryptedAttachmentUrl?: string; decryptedAttachmentName?: string; decryptedAttachmentMimetype?: string;
}
interface UserRow      { _id: string; username: string; }

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentViewProps { url: string; name: string; mimetype: string; size: number; mine: boolean; }
function AttachmentView({ url, name, mimetype, size, mine }: AttachmentViewProps) {
  if (mimetype.startsWith('image/')) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="cg-att-img-link">
        <img src={url} alt={name} className="cg-att-img" />
      </a>
    );
  }
  const ext = name.split('.').pop()?.toUpperCase() ?? 'FILE';
  return (
    <a href={url} download={name} className={`cg-att-doc ${mine ? 'mine' : 'theirs'}`}>
      <span className="cg-att-doc-icon">📄</span>
      <div className="cg-att-doc-info">
        <span className="cg-att-doc-name">{name}</span>
        <span className="cg-att-doc-meta">{ext} · {formatBytes(size)}</span>
      </div>
      <span className="cg-att-doc-dl">↓</span>
    </a>
  );
}

function timeLabel(date: string) {
  const d = new Date(date), now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatGroupsPage() {
  const { user, privateKey }                 = useAuth();
  const { refresh, setPendingCount, unreadCounts, markRead, socket } = useGroupNotifications();

  const [accepted,          setAccepted]          = useState<Group[]>([]);
  const [pending,           setPending]           = useState<Group[]>([]);
  const [pendingTransfers,  setPendingTransfers]  = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [messages,    setMessages]    = useState<GroupMessage[]>([]);
  const [input,       setInput]       = useState('');
  const [sending,     setSending]     = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDragging,  setIsDragging]  = useState(false);
  const [replyingTo,  setReplyingTo]  = useState<GroupMessage | null>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const [showCreate, setShowCreate] = useState(false);
  const [groupName,  setGroupName]  = useState('');
  const [allUsers,   setAllUsers]   = useState<UserRow[]>([]);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [creating,   setCreating]   = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Manage members panel
  const [showManage,       setShowManage]       = useState(false);
  const [manageSearch,     setManageSearch]     = useState('');
  const [inviteSelected,   setInviteSelected]   = useState<Set<string>>(new Set());
  const [inviting,         setInviting]         = useState(false);
  const [transferTarget,   setTransferTarget]   = useState('');
  const [transferring,     setTransferring]     = useState(false);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const activeGroupRef = useRef<string | null>(null);

  useEffect(() => { activeGroupRef.current = activeGroup?._id ?? null; }, [activeGroup]);

  // Decrypts a single group message (and its reply-quote, and any attachment)
  // in place. Never touches the server — everything here runs in the browser.
  const decryptMessage = async (msg: GroupMessage): Promise<GroupMessage> => {
    let out = msg;

    if (msg.replyTo?.encrypted && privateKey && user?.id) {
      try {
        const wrapped = msg.replyTo.encryptedKeys![user.id];
        const replyKey = await unwrapSessionKey(wrapped, privateKey);
        const decryptedReplyContent = await decryptContentWithKey(msg.replyTo.cipherText!, msg.replyTo.iv!, replyKey);
        out = { ...out, replyTo: { ...msg.replyTo, content: decryptedReplyContent } };
      } catch {
        out = { ...out, replyTo: { ...msg.replyTo, content: '🔒 Unable to decrypt' } };
      }
    }

    if (!msg.encrypted) return out;
    if (!privateKey || !user?.id) return { ...out, content: '🔒 Locked — log in again to unlock' };

    try {
      // Unwrap the session key ONCE — the same key encrypted both the text
      // and any attachment, so it's reused for both.
      const wrappedKey = msg.encryptedKeys![user.id];
      const sessionKey = await unwrapSessionKey(wrappedKey, privateKey);
      const content = await decryptContentWithKey(msg.cipherText!, msg.iv!, sessionKey);
      out = { ...out, content };

      if (msg.encryptedAttachment) {
        try {
          const res = await fetch(`/uploads/${msg.encryptedAttachment.filename}`);
          const ciphertextBuf = await res.arrayBuffer();
          const { blob, name, mimetype } = await decryptFileWithKey({
            ciphertext: bufToB64(ciphertextBuf),
            iv: msg.encryptedAttachment.iv,
            meta: msg.encryptedAttachment.encryptedMeta,
            metaIv: msg.encryptedAttachment.encryptedMetaIv,
          }, sessionKey);
          out = {
            ...out,
            decryptedAttachmentUrl: URL.createObjectURL(blob),
            decryptedAttachmentName: name,
            decryptedAttachmentMimetype: mimetype,
          };
        } catch (err) {
          console.error('Attachment decrypt failed:', err);
        }
      }
    } catch (err) {
      console.error('Message decrypt failed:', err);
      out = { ...out, content: '🔒 Unable to decrypt this message' };
    }
    return out;
  };

  const decryptMessages = (msgs: GroupMessage[]) => Promise.all(msgs.map(decryptMessage));

  const loadGroups = () => {
    api.get('/groups').then(d => {
      setAccepted(d.accepted);
      setPending(d.pending);
      setPendingCount(d.pending.length);
      setPendingTransfers(d.pendingTransfers ?? []);
    }).catch(() => {});
  };

  useEffect(() => {
    loadGroups();
  }, []);

  // Attach group_message listener to the shared socket
  useEffect(() => {
    if (!socket) return;

    const onMessage = async (msg: GroupMessage) => {
      if (msg.sender._id === user?.id) return;
      if ((msg.group ?? '') === activeGroupRef.current) {
        const decrypted = await decryptMessage(msg);
        setMessages(prev => [...prev, decrypted]);
        // Auto-mark-read since the user is actively watching this group
        markRead(activeGroupRef.current!);
      }
      // Context's own socket listener handles the unread count refresh
    };

    socket.on('group_message', onMessage);

    const onReaction = ({ messageId, group, reactions }: { messageId: string; group: string; reactions: Reaction[] }) => {
      if (group !== activeGroupRef.current) return;
      setMessages(prev => prev.map(m => (m._id === messageId ? { ...m, reactions } : m)));
    };
    socket.on('group_message_reaction', onReaction);

    return () => {
      socket.off('group_message', onMessage);
      socket.off('group_message_reaction', onReaction);
    };
  }, [socket, user?.id, markRead, privateKey]);

  useEffect(() => {
    setReplyingTo(null);
    if (!activeGroup) { setMessages([]); return; }
    setLoadingMsgs(true);
    markRead(activeGroup._id);
    api.get(`/groups/${activeGroup._id}/messages`)
      .then(async d => setMessages(await decryptMessages(d.messages)))
      .finally(() => setLoadingMsgs(false));
  }, [activeGroup, markRead, privateKey]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (showCreate && allUsers.length === 0) {
      api.get('/users').then(d => setAllUsers(d.users)).catch(() => {});
    }
  }, [showCreate]);

  const handleRespond = async (groupId: string, action: 'accept' | 'ignore') => {
    try {
      await api.post(`/groups/${groupId}/respond`, { action });
      if (action === 'accept') socket?.emit('join_group', groupId);
      loadGroups();
      refresh();
    } catch {}
  };

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || creating) return;
    setCreating(true);
    try {
      const data = await api.post('/groups', { name: groupName.trim(), memberIds: Array.from(selected) });
      setShowCreate(false);
      setGroupName('');
      setSelected(new Set());
      setUserSearch('');
      loadGroups();
      setActiveGroup(data.group);
    } catch {} finally {
      setCreating(false);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
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
    if ((!input.trim() && !pendingFile) || sending || !activeGroup) return;
    setSending(true);
    const text = input.trim();
    const file = pendingFile;
    const replyToId = replyingTo?._id;
    setInput('');
    setPendingFile(null);
    setReplyingTo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    try {
      // Encrypt only if EVERY current accepted member has encryption set up —
      // otherwise fall back to plain text exactly as before.
      let recipients: { userId: string; publicKey: CryptoKey }[] | null = null;
      if (privateKey && user?.id) {
        try {
          const memberIds = activeGroup.members.filter(m => m.status === 'accepted').map(m => m.user._id);
          const { keys } = await api.post('/users/public-keys', { userIds: memberIds });
          if (memberIds.every(id => keys[id])) {
            recipients = await Promise.all(memberIds.map(async id => ({ userId: id, publicKey: await importPublicKey(keys[id]) })));
          }
        } catch { /* fall back to plaintext below */ }
      }

      let data;
      if (recipients) {
        // One shared session key encrypts BOTH the text and the attachment
        // (if any) — the same wrapped keys unlock both.
        const { sessionKey, keys } = await generateSessionKeyForRecipients(recipients);
        const { ciphertext, iv } = await encryptContentWithKey(text, sessionKey);
        if (file) {
          const fileEnvelope = await encryptFileWithKey(file, sessionKey);
          const fd = new FormData();
          fd.append('file', new Blob([b64ToBuf(fileEnvelope.ciphertext)]), 'encrypted.bin');
          fd.append('encrypted', 'true');
          fd.append('cipherText', ciphertext);
          fd.append('iv', iv);
          fd.append('encryptedKeys', JSON.stringify(keys));
          fd.append('encryptedAttachmentIv', fileEnvelope.iv);
          fd.append('encryptedAttachmentMeta', fileEnvelope.meta);
          fd.append('encryptedAttachmentMetaIv', fileEnvelope.metaIv);
          if (replyToId) fd.append('replyTo', replyToId);
          data = await apiUpload('POST', `/groups/${activeGroup._id}/messages`, fd);
        } else {
          data = await api.post(`/groups/${activeGroup._id}/messages`, {
            encrypted: true, cipherText: ciphertext, iv,
            encryptedKeys: JSON.stringify(keys), replyTo: replyToId,
          });
        }
      } else if (file) {
        const fd = new FormData();
        fd.append('file', file);
        if (text) fd.append('content', text);
        if (replyToId) fd.append('replyTo', replyToId);
        data = await apiUpload('POST', `/groups/${activeGroup._id}/messages`, fd);
      } else {
        data = await api.post(`/groups/${activeGroup._id}/messages`, { content: text, replyTo: replyToId });
      }

      const decorated = await decryptMessage(data.message);
      setMessages(prev => [...prev, decorated]);
    } catch {} finally {
      setSending(false);
    }
  };

  const handleReact = async (messageId: string, type: string) => {
    if (!activeGroup) return;
    const msg = messages.find(m => m._id === messageId);
    const isSame = (msg?.reactions ?? []).find(r => r.user === user?.id)?.type === type;
    setMessages(prev => prev.map(m => {
      if (m._id !== messageId) return m;
      const withoutMine = (m.reactions ?? []).filter(r => r.user !== user?.id);
      return { ...m, reactions: isSame ? withoutMine : [...withoutMine, { user: user!.id, type }] };
    }));
    const data = await api.post(`/groups/${activeGroup._id}/messages/${messageId}/react`, { type });
    setMessages(prev => prev.map(m => (m._id === messageId ? { ...m, reactions: data.reactions } : m)));
  };

  const handleLeaveOrDelete = async () => {
    if (!activeGroup) return;
    const isCreator = activeGroup.creator._id === user?.id;
    if (isCreator) {
      if (!confirm(`Delete "${activeGroup.name}"? This cannot be undone.`)) return;
      await api.delete(`/groups/${activeGroup._id}`);
    } else {
      if (!confirm(`Leave "${activeGroup.name}"?`)) return;
      await api.post(`/groups/${activeGroup._id}/leave`, {});
    }
    setActiveGroup(null);
    loadGroups();
  };

  const toggleUser = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const reloadActiveGroup = async (groupId: string) => {
    try {
      const data = await api.get(`/groups/${groupId}`);
      setActiveGroup(data.group);
      setAccepted(prev => prev.map(g => g._id === groupId ? data.group : g));
    } catch {}
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeGroup) return;
    if (!confirm('Remove this member from the group?')) return;
    try {
      await api.delete(`/groups/${activeGroup._id}/members/${memberId}`);
      await reloadActiveGroup(activeGroup._id);
    } catch {}
  };

  const handleManageInvite = async () => {
    if (!activeGroup || inviteSelected.size === 0 || inviting) return;
    setInviting(true);
    try {
      await api.post(`/groups/${activeGroup._id}/invite`, { memberIds: Array.from(inviteSelected) });
      setInviteSelected(new Set());
      setManageSearch('');
      await reloadActiveGroup(activeGroup._id);
    } catch {} finally {
      setInviting(false);
    }
  };

  const handleTransferAdmin = async () => {
    if (!activeGroup || !transferTarget || transferring) return;
    setTransferring(true);
    try {
      await api.post(`/groups/${activeGroup._id}/transfer-admin`, { userId: transferTarget });
      setTransferTarget('');
      await reloadActiveGroup(activeGroup._id);
    } catch {} finally {
      setTransferring(false);
    }
  };

  const handleCancelTransfer = async () => {
    if (!activeGroup) return;
    try {
      await api.delete(`/groups/${activeGroup._id}/transfer-admin`);
      await reloadActiveGroup(activeGroup._id);
    } catch {}
  };

  const handleRespondTransfer = async (groupId: string, action: 'accept' | 'decline') => {
    try {
      await api.post(`/groups/${groupId}/transfer-admin/respond`, { action });
      loadGroups();
      refresh();
      if (action === 'accept' && activeGroup?._id === groupId) {
        await reloadActiveGroup(groupId);
      }
    } catch {}
  };

  const acceptedMembers    = activeGroup?.members.filter(m => m.status === 'accepted') ?? [];
  const filteredUsers      = allUsers.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase()));
  const allGroupMemberIds  = new Set(activeGroup?.members.map(m => m.user._id) ?? []);
  const availableToInvite  = allUsers
    .filter(u => u._id !== user?.id && !allGroupMemberIds.has(u._id))
    .filter(u => u.username.toLowerCase().includes(manageSearch.toLowerCase()));

  return (
    <div className="cg-shell">

      {/* ── Left panel ── */}
      <aside className={`cg-panel ${activeGroup ? 'cg-panel-hidden-mobile' : ''}`}>
        <div className="cg-panel-header">
          <span className="cg-panel-title">Chat Groups</span>
          <button className="cg-create-btn" onClick={() => setShowCreate(true)}>+ New</button>
        </div>

        {pending.length > 0 && (
          <div className="cg-section">
            <div className="cg-section-label">Invitations</div>
            {pending.map(g => (
              <div key={g._id} className="cg-invite-card">
                <div className="cg-invite-name">{g.name}</div>
                <div className="cg-invite-sub">from {g.creator.username}</div>
                <div className="cg-invite-actions">
                  <button className="cg-accept-btn" onClick={() => handleRespond(g._id, 'accept')}>Accept</button>
                  <button className="cg-ignore-btn" onClick={() => handleRespond(g._id, 'ignore')}>Ignore</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pendingTransfers.length > 0 && (
          <div className="cg-section">
            <div className="cg-section-label">Admin Offers</div>
            {pendingTransfers.map(g => (
              <div key={g._id} className="cg-invite-card cg-transfer-card">
                <div className="cg-transfer-icon">👑</div>
                <div className="cg-invite-name">{g.name}</div>
                <div className="cg-invite-sub">{g.creator.username} wants to make you admin</div>
                <div className="cg-invite-actions">
                  <button className="cg-accept-btn" onClick={() => handleRespondTransfer(g._id, 'accept')}>Accept</button>
                  <button className="cg-ignore-btn" onClick={() => handleRespondTransfer(g._id, 'decline')}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="cg-section">
          {accepted.length === 0 && pending.length === 0 && (
            <div className="cg-empty">No groups yet. Create one!</div>
          )}
          {accepted.length > 0 && <div className="cg-section-label">My Groups</div>}
          {accepted.map(g => {
            const unread = unreadCounts[g._id] ?? 0;
            return (
              <button
                key={g._id}
                className={`cg-group-row ${activeGroup?._id === g._id ? 'active' : ''} ${unread > 0 ? 'has-unread' : ''}`}
                onClick={() => setActiveGroup(g)}
              >
                <div className="cg-group-avatar">{g.name.slice(0, 2).toUpperCase()}</div>
                <div className="cg-group-info">
                  <span className="cg-group-name">{g.name}</span>
                  <span className="cg-group-count">
                    {g.members.filter(m => m.status === 'accepted').length} members
                  </span>
                </div>
                {unread > 0 && (
                  <span className="cg-unread-badge">{unread > 99 ? '99+' : unread}</span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Chat area ── */}
      <div
        className={`cg-chat ${!activeGroup ? 'cg-chat-hidden-mobile' : ''}`}
        onDragEnter={e => { e.preventDefault(); dragCounterRef.current++; if (activeGroup) setIsDragging(true); }}
        onDragOver={e => e.preventDefault()}
        onDragLeave={() => { dragCounterRef.current--; if (dragCounterRef.current === 0) setIsDragging(false); }}
        onDrop={e => {
          e.preventDefault();
          dragCounterRef.current = 0;
          setIsDragging(false);
          if (!activeGroup) return;
          const file = e.dataTransfer.files[0];
          if (file) setPendingFile(file);
        }}
      >
        {isDragging && activeGroup && (
          <div className="cg-drop-overlay">
            <div className="cg-drop-box">
              <span className="cg-drop-icon">📎</span>
              <span>Drop to attach</span>
            </div>
          </div>
        )}
        {!activeGroup ? (
          <div className="cg-no-chat">Select a group or create one</div>
        ) : (
          <>
            <div className="cg-chat-header">
              <button className="cg-back-btn" onClick={() => setActiveGroup(null)}>←</button>
              <div className="cg-chat-avatar">{activeGroup.name.slice(0, 2).toUpperCase()}</div>
              <div className="cg-chat-info">
                <span className="cg-chat-name">{activeGroup.name}</span>
                <span className="cg-chat-members">
                  {acceptedMembers.map(m => m.user.username).join(', ')}
                </span>
              </div>
              {activeGroup.creator._id === user?.id && (
                <button
                  className="cg-manage-btn"
                  title="Manage members"
                  onClick={() => {
                    setShowManage(true);
                    if (allUsers.length === 0) api.get('/users').then(d => setAllUsers(d.users)).catch(() => {});
                  }}
                >⚙</button>
              )}
              <button
                className="cg-leave-btn"
                onClick={handleLeaveOrDelete}
                title={activeGroup.creator._id === user?.id ? 'Delete group' : 'Leave group'}
              >✕</button>
            </div>

            <div className="cg-messages">
              {loadingMsgs && <div className="cg-loading">Loading…</div>}
              {!loadingMsgs && messages.length === 0 && (
                <div className="cg-start">No messages yet. Say hello!</div>
              )}
              {messages.map(m => {
                const mine = m.sender._id === user?.id;
                const userReaction = (m.reactions ?? []).find(r => r.user === user?.id)?.type ?? null;
                const reactionCounts = (m.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
                  acc[r.type] = (acc[r.type] ?? 0) + 1;
                  return acc;
                }, {});
                return (
                  <div key={m._id} className={`cg-bubble-row ${mine ? 'mine' : 'theirs'}`}>
                    {!mine && (
                      <UserAvatar
                        username={m.sender.username}
                        avatar={m.sender.avatar}
                        size={28}
                      />
                    )}
                    <div className="cg-bubble-wrap">
                      {!mine && <span className="cg-bubble-sender">{m.sender.username}</span>}
                      <div className={`cg-bubble ${mine ? 'mine' : 'theirs'}`}>
                        {m.replyTo && (
                          <div className="cg-bubble-quote">
                            <span className="cg-bubble-quote-sender">{m.replyTo.sender.username}</span>
                            <span className="cg-bubble-quote-text">{m.replyTo.content || '📎 Attachment'}</span>
                          </div>
                        )}
                        {m.attachment && (
                          <AttachmentView url={`/uploads/${m.attachment.filename}`} name={m.attachment.originalname} mimetype={m.attachment.mimetype} size={m.attachment.size} mine={mine} />
                        )}
                        {m.encryptedAttachment && (
                          m.decryptedAttachmentUrl ? (
                            <AttachmentView
                              url={m.decryptedAttachmentUrl}
                              name={m.decryptedAttachmentName ?? 'file'}
                              mimetype={m.decryptedAttachmentMimetype ?? 'application/octet-stream'}
                              size={m.encryptedAttachment.size}
                              mine={mine}
                            />
                          ) : (
                            <div className="cg-att-decrypting">🔒 Decrypting attachment…</div>
                          )
                        )}
                        {m.content && <MessageContent content={m.content} />}
                      </div>
                      {Object.keys(reactionCounts).length > 0 && (
                        <div className="cg-bubble-reactions">
                          {Object.entries(reactionCounts).map(([type, count]) => (
                            <span key={type} className="cg-bubble-reaction-chip">{EMOJI[type]} {count}</span>
                          ))}
                        </div>
                      )}
                      <div className="cg-bubble-footer">
                        <span className="cg-bubble-time">{timeLabel(m.createdAt)}</span>
                        <div className="cg-bubble-actions">
                          <ReactionPicker
                            userReaction={userReaction}
                            onReact={(type) => handleReact(m._id, type)}
                            compact
                          />
                          <button type="button" className="cg-reply-btn" onClick={() => setReplyingTo(m)}>↩ Reply</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {replyingTo && (
              <div className="cg-reply-preview">
                <div className="cg-reply-preview-info">
                  <span className="cg-reply-preview-label">Replying to {replyingTo.sender._id === user?.id ? 'yourself' : replyingTo.sender.username}</span>
                  <span className="cg-reply-preview-text">{replyingTo.content || '📎 Attachment'}</span>
                </div>
                <button type="button" className="cg-reply-preview-cancel" onClick={() => setReplyingTo(null)}>✕</button>
              </div>
            )}
            <form className="cg-input-bar" onSubmit={handleSend}>
              <input
                ref={fileInputRef}
                type="file"
                className="cg-file-input"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                onChange={e => setPendingFile(e.target.files?.[0] ?? null)}
              />
              <button type="button" className="cg-attach-btn" onClick={() => fileInputRef.current?.click()} title="Attach file">📎</button>
              <div className="cg-input-wrap">
                {pendingFile && (
                  <div className="cg-file-preview">
                    <span className="cg-file-preview-name">{pendingFile.name}</span>
                    <button type="button" className="cg-file-preview-remove" onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>✕</button>
                  </div>
                )}
                <input
                  className="cg-input"
                  placeholder={pendingFile ? 'Add a caption… (optional)' : 'Message the group… (paste a screenshot to attach it)'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onPaste={handlePaste}
                  maxLength={2000}
                />
              </div>
              <button className="cg-send-btn" type="submit" disabled={sending || (!input.trim() && !pendingFile)}>➤</button>
            </form>
          </>
        )}
      </div>

      {/* ── Manage members modal ── */}
      {showManage && activeGroup && (
        <div className="cg-modal-overlay" onClick={() => setShowManage(false)}>
          <div className="cg-modal" onClick={e => e.stopPropagation()}>
            <div className="cg-modal-header">
              <h3>Manage Members</h3>
              <button className="cg-modal-close" onClick={() => setShowManage(false)}>✕</button>
            </div>

            <div className="cg-modal-label">Current Members</div>
            <div className="cg-user-list">
              {activeGroup.members.filter(m => m.status === 'accepted').map(m => (
                <div key={m._id} className="cg-member-row">
                  <span className="cg-member-name">
                    {m.user.username}
                    {m.user._id === activeGroup.creator._id && (
                      <span className="cg-creator-tag"> creator</span>
                    )}
                  </span>
                  {m.user._id !== user?.id && (
                    <button className="cg-remove-btn" onClick={() => handleRemoveMember(m.user._id)}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {activeGroup.members.filter(m => m.status === 'pending').map(m => (
                <div key={m._id} className="cg-member-row">
                  <span className="cg-member-name">{m.user.username}</span>
                  <span className="cg-pending-tag">Pending</span>
                </div>
              ))}
            </div>

            <div className="cg-modal-label">Invite New Members</div>
            <input
              className="cg-modal-search"
              placeholder="Search users…"
              value={manageSearch}
              onChange={e => setManageSearch(e.target.value)}
            />
            <div className="cg-user-list">
              {availableToInvite.length === 0 && (
                <div className="cg-empty">No users to invite</div>
              )}
              {availableToInvite.map(u => (
                <label key={u._id} className={`cg-user-row ${inviteSelected.has(u._id) ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={inviteSelected.has(u._id)}
                    onChange={() => setInviteSelected(prev => {
                      const s = new Set(prev); s.has(u._id) ? s.delete(u._id) : s.add(u._id); return s;
                    })}
                  />
                  <span>{u.username}</span>
                </label>
              ))}
            </div>

            {inviteSelected.size > 0 && (
              <button className="cg-modal-submit" onClick={handleManageInvite} disabled={inviting}>
                {inviting
                  ? 'Inviting…'
                  : `Invite ${inviteSelected.size} user${inviteSelected.size > 1 ? 's' : ''}`}
              </button>
            )}

            <div className="cg-modal-label">Transfer Admin</div>
            {activeGroup.pendingAdminTransfer ? (
              <div className="cg-transfer-pending">
                <span>⏳ Offer sent — waiting for response</span>
                <button className="cg-transfer-cancel" onClick={handleCancelTransfer}>Cancel</button>
              </div>
            ) : (
              <div className="cg-transfer-row">
                <select
                  className="cg-transfer-select"
                  value={transferTarget}
                  onChange={e => setTransferTarget(e.target.value)}
                >
                  <option value="">Select a member…</option>
                  {activeGroup.members
                    .filter(m => m.status === 'accepted' && m.user._id !== user?.id)
                    .map(m => (
                      <option key={m.user._id} value={m.user._id}>{m.user.username}</option>
                    ))}
                </select>
                <button
                  className="cg-transfer-btn"
                  onClick={handleTransferAdmin}
                  disabled={!transferTarget || transferring}
                >
                  {transferring ? '…' : '👑 Offer'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create group modal ── */}
      {showCreate && (
        <div className="cg-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="cg-modal" onClick={e => e.stopPropagation()}>
            <div className="cg-modal-header">
              <h3>Create Group</h3>
              <button className="cg-modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <input
                className="cg-modal-input"
                placeholder="Group name…"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                maxLength={100}
                autoFocus
              />
              <div className="cg-modal-label">Invite members</div>
              <input
                className="cg-modal-search"
                placeholder="Search users…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
              <div className="cg-user-list">
                {filteredUsers.map(u => (
                  <label key={u._id} className={`cg-user-row ${selected.has(u._id) ? 'checked' : ''}`}>
                    <input type="checkbox" checked={selected.has(u._id)} onChange={() => toggleUser(u._id)} />
                    <span>{u.username}</span>
                  </label>
                ))}
                {filteredUsers.length === 0 && <div className="cg-empty">No users found</div>}
              </div>
              {selected.size > 0 && (
                <div className="cg-selected-info">
                  {selected.size} user{selected.size > 1 ? 's' : ''} will be invited
                </div>
              )}
              <button className="cg-modal-submit" type="submit" disabled={!groupName.trim() || creating}>
                {creating ? 'Creating…' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
