import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import NewsStrip from "../components/feed/NewsStrip";
import PostItem, { type Post } from "../components/feed/PostItem";
import "./FeedPage.css";

export default function FeedPage() {
  const navigate = useNavigate();
  const [trending, setTrending] = useState<Post[]>([]);
  const [followed, setFollowed] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/posts/trending"), api.get("/posts")])
      .then(([t, f]) => {
        setTrending(t.posts);
        setFollowed(f.posts);
      })
      .catch(() => setError("Failed to load posts"))
      .finally(() => setLoading(false));
  }, []);

  const updatePost = (updated: Post) => {
    setTrending((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    setFollowed((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  };

  const deletePost = (id: string) => {
    setTrending((prev) => prev.filter((p) => p._id !== id));
    setFollowed((prev) => prev.filter((p) => p._id !== id));
  };

  // Exclude trending post IDs from the followed feed to avoid duplication
  const trendingIds = new Set(trending.map((p) => p._id));
  const followedFeed = followed.filter((p) => !trendingIds.has(p._id));

  return (
    <div>
      <NewsStrip />

      {loading && <div className="feed-status">Loading…</div>}
      {error && <div className="feed-status error">{error}</div>}

      {!loading && !error && (
        <div className="feed-posts">
          {/* ── Trending ───────────────────────────────────────────── */}
          {trending.length > 0 && (
            <section className="feed-section">
              <h3 className="feed-section-title">Trending</h3>
              <div className="feed-trending-grid">
                {trending.slice(0, 4).map((post) => (
                  <PostItem
                    key={post._id}
                    post={post}
                    onUpdate={updatePost}
                    onDelete={deletePost}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Following feed ─────────────────────────────────────── */}
          <section className="feed-section">
            <h3 className="feed-section-title">From people you follow</h3>

            {followedFeed.length === 0 ? (
              <div className="feed-empty">
                <div className="feed-empty-icon">📭</div>
                <h3>Nothing here yet</h3>
                <p>Follow more members to see their posts here.</p>
                <button
                  className="feed-empty-btn"
                  onClick={() => navigate("/members")}
                >
                  Browse Members
                </button>
              </div>
            ) : (
              followedFeed.map((post) => (
                <PostItem
                  key={post._id}
                  post={post}
                  onUpdate={updatePost}
                  onDelete={deletePost}
                />
              ))
            )}
          </section>
        </div>
      )}
    </div>
  );
}
