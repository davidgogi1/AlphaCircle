import { useEffect, useState } from 'react';
import { api } from '../api';
import './NewsPage.css';

interface Article {
  id:       number;
  headline: string;
  summary:  string;
  url:      string;
  image:    string;
  source:   string;
  datetime: number;
  related:  string;
}

const CATEGORIES = [
  { key: 'general', label: 'General' },
  { key: 'crypto',  label: 'Crypto'  },
  { key: 'forex',   label: 'Forex'   },
  { key: 'merger',  label: 'M&A'     },
];

function timeAgo(unix: number): string {
  const h = (Date.now() - unix * 1000) / 3_600_000;
  if (h < 1)  return `${Math.round(h * 60)}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function NewsPage() {
  const [category, setCategory] = useState('general');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/news?category=${category}`)
      .then(d => setArticles(d.articles))
      .catch(() => setError('Failed to load news.'))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="news-page">
      <div className="news-header">
        <h2>News</h2>
        <p className="news-sub">Live market news powered by Finnhub</p>
      </div>

      <div className="news-tabs">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            className={`news-tab ${category === c.key ? 'active' : ''}`}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && <div className="news-status">Loading…</div>}
      {error   && <div className="news-status error">{error}</div>}

      {!loading && !error && (
        <div className="news-list">
          {articles.map(a => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="news-card"
            >
              {a.image && (
                <img
                  className="news-img"
                  src={a.image}
                  alt=""
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="news-body">
                <div className="news-meta">
                  <span className="news-source">{a.source}</span>
                  <span className="news-time">{timeAgo(a.datetime)}</span>
                  {a.related && <span className="news-ticker">{a.related.split(',')[0]}</span>}
                </div>
                <div className="news-headline">{a.headline}</div>
                {a.summary && <p className="news-summary">{a.summary}</p>}
              </div>
            </a>
          ))}
          {articles.length === 0 && (
            <div className="news-status">No articles found.</div>
          )}
        </div>
      )}
    </div>
  );
}
