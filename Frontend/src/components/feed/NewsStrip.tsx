import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import './NewsStrip.css';

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

function timeAgo(unix: number): string {
  const h = (Date.now() - unix * 1000) / 3_600_000;
  if (h < 1)  return `${Math.round(h * 60)}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function NewsStrip() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    api.get('/news?category=general')
      .then(d => setArticles((d.articles as Article[]).slice(0, 6)))
      .catch(() => {});
  }, []);

  if (articles.length === 0) return null;

  return (
    <div className="ns-wrap">
      <div className="ns-header">
        <button className="ns-title" onClick={() => navigate('/news')}>
          📰 Latest News
        </button>
        <button className="ns-see-all" onClick={() => navigate('/news')}>
          See all →
        </button>
      </div>

      <div className="ns-strip">
        {articles.map(a => (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ns-card"
          >
            {a.image && (
              <img
                className="ns-img"
                src={a.image}
                alt=""
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="ns-body">
              <div className="ns-meta">
                <span className="ns-source">{a.source}</span>
                <span className="ns-time">{timeAgo(a.datetime)}</span>
              </div>
              <div className="ns-headline">{a.headline}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
