import { Request, Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';
import Thread from '../models/Thread';
import ConsensusEvent from '../models/ConsensusEvent';
import { embedText, cosineSimilarity } from '../services/embeddingService';

// Below this cosine similarity, matches are noise rather than genuine semantic relevance
// (unrelated short texts with text-embedding-3-small typically land at 0.0–0.3)
const SEMANTIC_THRESHOLD = 0.35;

async function semanticMatches<T extends { _id: unknown; embedding?: number[] }>(
  queryEmbedding: number[],
  docs: T[],
  limit: number,
): Promise<(Omit<T, 'embedding'> & { matchType: 'semantic' })[]> {
  return docs
    .filter(d => d.embedding && d.embedding.length > 0)
    .map(d => ({ doc: d, score: cosineSimilarity(queryEmbedding, d.embedding!) }))
    .filter(({ score }) => score >= SEMANTIC_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ doc }) => {
      const { embedding, ...rest } = doc;
      return { ...rest, matchType: 'semantic' as const };
    });
}

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

// Common words excluded from the loose OR-match — without this, filler words like
// "with" or "for" turn looseRegex into an accidental match-almost-anything query,
// which starves out genuine semantic-only results (they'd already be "keyword" matches).
const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one',
  'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old',
  'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too',
  'use', 'that', 'this', 'with', 'have', 'from', 'they', 'will', 'what', 'when',
  'make', 'like', 'time', 'just', 'over', 'than', 'then', 'them', 'into', 'more',
  'some', 'about', 'there', 'their', 'would', 'could', 'should', 'these', 'those',
  'were', 'been', 'being', 'does', 'doing', 'here', 'very', 'each', 'both', 'ever',
]);

// Also build a word-split OR regex as fallback
function looseRegex(q: string): RegExp {
  const words = q.split(/\s+/).filter(w => w.length >= 4 && !STOPWORDS.has(w.toLowerCase()))
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (words.length === 0) return /$^/; // no meaningful words left — match nothing
  return new RegExp(words.join('|'), 'i');
}

export const search = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = ((req.query.q as string) ?? '').trim();
    if (q.length < 2) { res.json({ users: [], posts: [], threads: [], polls: [] }); return; }

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
    const keywordPosts = await Post.find({
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
    const rawKeywordThreads = await Thread.find({
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
    const keywordThreads = rawKeywordThreads.map((t: any) => ({
      ...t,
      firstTag: (t.tags ?? [])[0] ?? null,
    }));

    // ── AI search: fills in conceptually related posts/threads that the
    // regex pass above missed entirely (e.g. no literal keyword overlap).
    // Reserved slots, not leftovers — the loose keyword regex above OR-matches on
    // any word ≥2 chars, so it alone often fills `limit` and would otherwise starve
    // out every semantic-only result.
    // Brute-force cosine similarity is fine at this dataset size — no vector DB needed.
    const SEMANTIC_EXTRA_SLOTS = 3;
    let posts: any[] = keywordPosts;
    let threads: any[] = keywordThreads;
    try {
      const queryEmbedding = await embedText(q);
      const seenPostIds = new Set(keywordPosts.map(p => p._id.toString()));
      const seenThreadIds = new Set(keywordThreads.map(t => t._id.toString()));

      const allPosts = await Post.find({ embedding: { $exists: true } })
        .populate('author', 'username')
        .select('title content author createdAt reactions commentCount embedding')
        .lean();
      const postCandidates = allPosts.filter(p => !seenPostIds.has(p._id.toString()));
      posts = [...keywordPosts, ...await semanticMatches(queryEmbedding, postCandidates, SEMANTIC_EXTRA_SLOTS)];

      const allThreads = await Thread.find({ embedding: { $exists: true } })
        .populate('author', 'username')
        .populate('tags', 'name slug icon type')
        .select('title content author tags createdAt commentCount embedding')
        .lean();
      const threadCandidates = allThreads
        .filter((t: any) => !seenThreadIds.has(t._id.toString()))
        .map((t: any) => ({ ...t, firstTag: (t.tags ?? [])[0] ?? null }));
      threads = [...keywordThreads, ...await semanticMatches(queryEmbedding, threadCandidates, SEMANTIC_EXTRA_SLOTS)];
    } catch (err: any) {
      console.error('Semantic search skipped:', err.message);
    }

    // ── Polls (BuySide Consensus events): same regular match ───────────────
    const polls = await ConsensusEvent.find({
      $or: [
        { company: exactRx }, { ticker: exactRx }, { period: exactRx },
        { company: looseRx }, { ticker: looseRx }, { period: looseRx },
      ],
    })
      .select('company ticker period eventType eventDate')
      .sort({ eventDate: -1 })
      .limit(limit)
      .lean();

    res.json({ users: scoredUsers, posts, threads, polls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
