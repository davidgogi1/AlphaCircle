import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../api";
import { buildConsensusLink } from "../../utils/consensusLink";
import type { ConsensusEvent } from "./ConsensusEventCard";
import "./ShareConsensusModal.css";

interface Recipient {
  kind: "dm" | "group";
  id: string;
  label: string;
}

interface Props {
  ev: ConsensusEvent;
  onClose: () => void;
}

export default function ShareConsensusModal({ ev, onClose }: Props) {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Recipient | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/messages/conversations").catch(() => ({ conversations: [] })),
      api.get("/groups").catch(() => ({ accepted: [] })),
      api.get("/users").catch(() => ({ users: [] })),
    ]).then(([msgData, groupData, userData]) => {
      const dms: Recipient[] = msgData.conversations.map((c: any) => ({
        kind: "dm", id: c.otherUser._id, label: c.otherUser.username,
      }));
      const dmIds = new Set(dms.map((d) => d.id));
      const groups: Recipient[] = groupData.accepted.map((g: any) => ({
        kind: "group", id: g._id, label: g.name,
      }));
      const otherUsers: Recipient[] = userData.users
        .filter((u: any) => u._id !== user?.id && !dmIds.has(u._id))
        .map((u: any) => ({ kind: "dm", id: u._id, label: u.username }));
      setRecipients([...dms, ...groups, ...otherUsers]);
      setLoading(false);
    });
  }, [user?.id]);

  const filtered = recipients.filter((r) => r.label.toLowerCase().includes(search.toLowerCase()));

  const handleSend = async () => {
    if (!selected || sending) return;
    setSending(true);
    const content = `📊 Shared a consensus poll: ${ev.company} (${ev.ticker}) — ${ev.period} ${ev.eventType}\n${buildConsensusLink(ev._id)}`;
    try {
      if (selected.kind === "dm") {
        await api.post(`/messages/${selected.id}`, { content });
      } else {
        await api.post(`/groups/${selected.id}/messages`, { content });
      }
      setSent(true);
      setTimeout(onClose, 1200);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="scm-overlay" onClick={onClose}>
      <div className="scm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scm-header">
          <h3>Share Consensus Poll</h3>
          <button className="scm-close" onClick={onClose}>✕</button>
        </div>

        <div className="scm-poll-preview">
          <span className="scm-poll-ticker">{ev.ticker}</span>
          <span className="scm-poll-name">{ev.company} — {ev.period} {ev.eventType}</span>
        </div>

        {sent ? (
          <div className="scm-sent">✓ Sent!</div>
        ) : (
          <>
            <input
              className="scm-search"
              placeholder="Search people or groups…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="scm-list">
              {loading && <div className="scm-empty">Loading…</div>}
              {!loading && filtered.length === 0 && <div className="scm-empty">No conversations or groups found.</div>}
              {filtered.map((r) => (
                <button
                  type="button"
                  key={`${r.kind}-${r.id}`}
                  className={`scm-row ${selected?.id === r.id && selected?.kind === r.kind ? "selected" : ""}`}
                  onClick={() => setSelected(r)}
                >
                  <span className="scm-row-icon">{r.kind === "dm" ? "👤" : "👥"}</span>
                  <span className="scm-row-label">{r.label}</span>
                  {selected?.id === r.id && selected?.kind === r.kind && <span className="scm-row-check">✓</span>}
                </button>
              ))}
            </div>

            <button className="scm-send-btn" disabled={!selected || sending} onClick={handleSend}>
              {sending ? "Sending…" : "Send"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
