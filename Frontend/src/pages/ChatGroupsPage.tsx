import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGroupNotifications } from '../contexts/GroupNotificationsContext';
import { api, apiUpload } from '../api';
import './ChatGroupsPage.css';

interface Member       { user: { _id: string; username: string }; status: string; _id: string; }
interface Group        { _id: string; name: string; creator: { _id: string; username: string }; members: Member[]; pendingAdminTransfer?: string; createdAt: string; }
interface Attachment   { filename: string; originalname: string; mimetype: string; size: number; }
interface GroupMessage { _id: string; sender: { _id: string; username: string }; content: string; attachment?: Attachment; createdAt: string; group?: string; }
interface UserRow      { _id: string; username: string; }

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentView({ attachment, mine }: { attachment: Attachment; mine: boolean }) {
  const url = `/uploads/${attachment.filename}`;
  if (attachment.mimetype.startsWith('image/')) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="cg-att-img-link">
        <img src={url} alt={attachment.originalname} className="cg-att-img" />
      </a>
    );
  }
  const ext = attachment.originalname.split('.').pop()?.toUpperCase() ?? 'FILE';
  return (
    <a href={url} download={attachment.originalname} className={`cg-att-doc ${mine ? 'mine' : 'theirs'}`}>
      <span className="cg-att-doc-icon">📄</span>
      <div className="cg-att-doc-info">
        <span className="cg-att-doc-name">{attachment.originalname}</span>
        <span className="cg-att-doc-meta">{ext} · {formatBytes(attachment.size)}</span>
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
  const { user }                             = useAuth();
  const { refresh, setPendingCount, unreadCounts, markRead, socket, transferOfferCount } = useGroupNotifications();

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

    const onMessage = (msg: GroupMessage) => {
      if (msg.sender._id === user?.id) return;
      if ((msg.group ?? '') === activeGroupRef.current) {
        setMessages(prev => [...prev, msg]);
        // Auto-mark-read since the user is actively watching this group
        markRead(activeGroupRef.current!);
      }
      // Context's own socket listener handles the unread count refresh
    };

    socket.on('group_message', onMessage);
    return () => { socket.off('group_message', onMessage); };
  }, [socket, user?.id, markRead]);

  useEffect(() => {
    if (!activeGroup) { setMessages([]); return; }
    setLoadingMsgs(true);
    markRead(activeGroup._id);
    api.get(`/groups/${activeGroup._id}/messages`)
      .then(d => setMessages(d.messages))
      .finally(() => setLoadingMsgs(false));
  }, [activeGroup, markRead]);

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

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !pendingFile) || sending || !activeGroup) return;
    setSending(true);
    const text = input.trim();
    const file = pendingFile;
    setInput('');
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    try {
      let data;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        if (text) fd.append('content', text);
        data = await apiUpload('POST', `/groups/${activeGroup._id}/messages`, fd);
      } else {
        data = await api.post(`/groups/${activeGroup._id}/messages`, { content: text });
      }
      setMessages(prev => [...prev, data.message]);
    } catch {} finally {
      setSending(false);
    }
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
                return (
                  <div key={m._id} className={`cg-bubble-row ${mine ? 'mine' : 'theirs'}`}>
                    {!mine && (
                      <div className="cg-bubble-avatar">
                        {m.sender.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="cg-bubble-wrap">
                      {!mine && <span className="cg-bubble-sender">{m.sender.username}</span>}
                      <div className={`cg-bubble ${mine ? 'mine' : 'theirs'}`}>
                        {m.attachment && <AttachmentView attachment={m.attachment} mine={mine} />}
                        {m.content && <span>{m.content}</span>}
                      </div>
                      <span className="cg-bubble-time">{timeLabel(m.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

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
                  placeholder={pendingFile ? 'Add a caption… (optional)' : 'Message the group…'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
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
