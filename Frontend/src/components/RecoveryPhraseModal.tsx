import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import "./RecoveryPhraseModal.css";

export default function RecoveryPhraseModal() {
  const { pendingRecoveryPhrase, dismissRecoveryPhrase } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!pendingRecoveryPhrase) return null;
  const words = pendingRecoveryPhrase.split(" ");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(pendingRecoveryPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rpm-overlay">
      <div className="rpm-modal">
        <div className="rpm-icon">🔑</div>
        <h3 className="rpm-title">Save your recovery phrase</h3>
        <p className="rpm-sub">
          Your messages and group chats are now end-to-end encrypted — only you can read them, not even AlphaCircle.
          If you ever forget your password, <strong>this phrase is the only way</strong> to get your encrypted messages back.
          We don't keep a copy of it anywhere.
        </p>

        <div className="rpm-words">
          {words.map((w, i) => (
            <div key={i} className="rpm-word">
              <span className="rpm-word-index">{i + 1}</span>{w}
            </div>
          ))}
        </div>

        <button type="button" className="rpm-copy-btn" onClick={handleCopy}>
          {copied ? "✓ Copied" : "📋 Copy phrase"}
        </button>

        <label className="rpm-confirm">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
          I've saved this phrase somewhere safe (not just in my head)
        </label>

        <button type="button" className="rpm-continue-btn" disabled={!confirmed} onClick={dismissRecoveryPhrase}>
          Continue
        </button>
      </div>
    </div>
  );
}
