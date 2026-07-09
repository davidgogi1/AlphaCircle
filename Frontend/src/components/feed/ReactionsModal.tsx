import { useEffect, useState } from 'react';
import { api } from '../../api';
import { REACTIONS, EMOJI } from './reactions';
import './ReactionsModal.css';

interface ReactorUser {
  user: { _id: string; username: string };
  type: string;
}

interface Props {
  reactionsUrl: string;
  onClose: () => void;
}

export default function ReactionsModal({ reactionsUrl, onClose }: Props) {
  const [reactions, setReactions] = useState<ReactorUser[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('all');

  useEffect(() => {
    api.get(reactionsUrl)
      .then(d => setReactions(d.reactions))
      .finally(() => setLoading(false));
  }, [reactionsUrl]);

  const tabs = [
    { key: 'all', label: `All ${reactions.length}` },
    ...REACTIONS
      .map(r => ({ key: r.type, label: `${r.emoji} ${reactions.filter(x => x.type === r.type).length}` }))
      .filter(t => reactions.some(x => x.type === t.key)),
  ];

  const visible = tab === 'all' ? reactions : reactions.filter(r => r.type === tab);

  return (
    <div className="rm-overlay" onClick={onClose}>
      <div className="rm-modal" onClick={e => e.stopPropagation()}>
        <div className="rm-header">
          <span className="rm-title">Reactions</span>
          <button className="rm-close" onClick={onClose}>✕</button>
        </div>

        <div className="rm-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`rm-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="rm-list">
          {loading && <div className="rm-status">Loading…</div>}
          {!loading && visible.length === 0 && <div className="rm-status">No reactions yet.</div>}
          {visible.map((r, i) => (
            <div key={i} className="rm-row">
              <div className="rm-avatar">{r.user.username.slice(0, 2).toUpperCase()}</div>
              <span className="rm-username">{r.user.username}</span>
              <span className="rm-emoji">{EMOJI[r.type]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
