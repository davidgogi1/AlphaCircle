import { Request, Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';
import Thread from '../models/Thread';

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

// Builds a regex from individual words so "ASML bookings" matches even if one word misses
function contentRegex(q: string): RegExp {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

// Also build a word-split OR regex as fallback
function looseRegex(q: string): RegExp {
  const words = q.split(/\s+/).filter(w => w.length >= 2)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(words.join('|'), 'i');
}

export const search = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = ((req.query.q as string) ?? '').trim();
    if (q.length < 2) { res.json({ users: [], posts: [], threads: [] }); return; }

    const limit = Math.min(Number(req.query.limit) || 5, 30);
    const ql    = q.toLowerCase();

    // ── Users: exact regex + fuzzy Levenshtein ─────────────────────────────
    const allUsers = await User.find({}).select('username email bio avatar').lean();
    const maxDist  = Math.floor(ql.length / 4) + 1; // 1 for ≤4 chars, 2 for 5-8, etc.
    const scoredUsers = allUsers
      .map(u => ({ u, dist: levenshtein(u.username.toLowerCase(), ql) }))
      .filter(({ u, dist }) =>
        dist <= maxDist ||
        u.username.toLowerCase().includes(ql) ||
        levenshtein(u.username.toLowerCase().slice(0, ql.length), ql) <= maxDist,
      )
      .sort((a, b) => a.dist - b.dist)
      .slice(0, limit)
      .map(({ u }) => u);

    // ── Posts: exact match + word-level loose match ─────────────────────────
    const exactRx = contentRegex(q);
    const looseRx = looseRegex(q);
    const posts = await Post.find({
      $or: [
        { title: exactRx }, { content: exactRx },
        { title: looseRx }, { content: looseRx },
      ],
    })
      .populate('author', 'username')
      .select('title content author createdAt reactions commentCount')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // ── Threads: same, populate tags instead of (deleted) topic ────────────
    const rawThreads = await Thread.find({
      $or: [
        { title: exactRx }, { content: exactRx },
        { title: looseRx }, { content: looseRx },
      ],
    })
      .populate('author', 'username')
      .populate('tags', 'name slug icon type')
      .select('title content author tags createdAt commentCount')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Normalise: attach firstTag so frontend has a consistent shape
    const threads = rawThreads.map((t: any) => ({
      ...t,
      firstTag: (t.tags ?? [])[0] ?? null,
    }));

    res.json({ users: scoredUsers, posts, threads });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
