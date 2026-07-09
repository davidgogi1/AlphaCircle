import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './StockPickerPage.css';

interface Stock {
  _id: string;
  ticker: string;
  name: string;
  sector: string;
  exchange: string;
}

const SECTORS = ['All', 'Technology', 'Finance', 'Healthcare', 'Energy', 'Consumer', 'Industrials', 'ETFs', 'Crypto'];

export default function StockPickerPage() {
  const { token, finishOnboarding } = useAuth();
  const [stocks, setStocks]         = useState<Stock[]>([]);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [sector, setSector]         = useState('All');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    fetch('/api/stocks', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setStocks(d.stocks ?? []))
      .catch(() => setError('Failed to load stocks.'));
  }, [token]);

  const toggle = (ticker: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(ticker) ? next.delete(ticker) : next.add(ticker);
      return next;
    });
  };

  const visible = sector === 'All' ? stocks : stocks.filter(s => s.sector === sector);

  const handleContinue = async () => {
    if (selected.size < 3) return;
    setSubmitting(true);
    setError('');
    try {
      const res  = await fetch('/api/auth/onboard', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ stocks: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Something went wrong'); return; }
      finishOnboarding(data.user);
    } catch {
      setError('Network error, please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sp-outer">
      <div className="sp-card">
        <div className="sp-header">
          <h1 className="sp-title">Pick your stocks</h1>
          <p className="sp-sub">Select at least 3 to personalise your feed.</p>
        </div>

        <div className="sp-sectors">
          {SECTORS.map(s => (
            <button
              key={s}
              className={`sp-sector-btn${sector === s ? ' active' : ''}`}
              onClick={() => setSector(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="sp-grid">
          {visible.map(s => (
            <button
              key={s._id}
              className={`sp-stock-btn${selected.has(s.ticker) ? ' selected' : ''}`}
              onClick={() => toggle(s.ticker)}
            >
              <span className="sp-ticker">{s.ticker}</span>
              <span className="sp-name">{s.name}</span>
              <span className="sp-sector-badge">{s.sector}</span>
            </button>
          ))}
        </div>

        {error && <p className="sp-error">{error}</p>}

        <div className="sp-footer">
          <span className="sp-count">{selected.size} selected</span>
          <button
            className="sp-continue-btn"
            disabled={selected.size < 3 || submitting}
            onClick={handleContinue}
          >
            {submitting ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
