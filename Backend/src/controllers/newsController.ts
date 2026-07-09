import { Request, Response } from 'express';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY!;
const CACHE_TTL   = 10 * 60 * 1000; // 10 minutes

interface Article {
  id:       number;
  headline: string;
  summary:  string;
  url:      string;
  image:    string;
  source:   string;
  datetime: number;
  category: string;
  related:  string;
}

const cache: Record<string, { data: Article[]; ts: number }> = {};

const VALID_CATEGORIES = ['general', 'forex', 'crypto', 'merger'];


export const getNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = VALID_CATEGORIES.includes(req.query.category as string)
      ? (req.query.category as string)
      : 'general';

    const now = Date.now();
    if (cache[category] && now - cache[category].ts < CACHE_TTL) {
      res.json({ articles: cache[category].data, cached: true });
      return;
    }

    const url = `https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      res.status(502).json({ message: 'Failed to fetch news from Finnhub' });
      return;
    }

    const articles: Article[] = await response.json();
    // Filter out articles with no headline or URL
    const filtered = articles.filter(a => a.headline && a.url && a.source === 'CNBC');

    cache[category] = { data: filtered, ts: now };
    res.json({ articles: filtered, cached: false });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
