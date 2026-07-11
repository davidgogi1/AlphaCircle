import { useState, useRef, useEffect } from 'react';
import { REACTIONS } from './reactions';
import './ReactionPicker.css';

interface Props {
  userReaction: string | null;
  onReact: (type: string) => void;
  compact?: boolean;
}

export default function ReactionPicker({ userReaction, onReact, compact }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const handleReact = (type: string) => {
    onReact(type);
    setOpen(false);
  };

  return (
    <div className={`rp-wrap${compact ? ' rp-compact' : ''}`} ref={wrapRef}>
      <button
        className={`rp-trigger ${userReaction ? 'reacted' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <span className="rp-default-icon">👍</span>&nbsp;
        <span>React</span>
      </button>
      <div className={`rp-picker${open ? ' open' : ''}`}>
        {REACTIONS.map(r => (
          <button
            key={r.type}
            className={`rp-emoji ${userReaction === r.type ? 'active' : ''}`}
            onClick={() => handleReact(r.type)}
            title={r.label}
          >
            {r.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
