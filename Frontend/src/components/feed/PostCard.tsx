import "./PostCard.css";

export default function PostCard() {
  return (
    <section className="post-card-section">
      <div className="top-discussion-badge">📊 TOP DISCUSSION TODAY</div>
      <div className="post-card">
        <div className="post-header">
          <div className="post-avatar">SL</div>
          <div className="post-meta">
            <div className="post-author">
              Stefan Lindqvist
              <span className="post-role">Fund Manager</span>
            </div>
            <div className="post-time">25 min ago</div>
          </div>
          <button className="post-bookmark">🔖</button>
        </div>

        <h2 className="post-title">
          ASML: Why I'm Adding to My Position After Q4 Numbers
        </h2>

        <p className="post-body">
          The bookings number was extraordinary — €9.2B vs €5.6B consensus. The
          China headwinds are real but the leading-edge demand cycle is just
          beginning. Here's my updated thesis with DCF model...
        </p>

        <div className="post-chart-placeholder">
          <span>📊 Interactive chart · ASML 6M performance ↗</span>
        </div>

        <div className="post-tags">
          <span className="tag">ASML</span>
          <span className="tag">Semiconductors</span>
          <span className="tag">EU Tech</span>
        </div>

        <div className="post-actions">
          <button className="action-btn">↑ 142</button>
          <button className="action-btn">💬 38</button>
          <button className="action-share">⤢ Share</button>
        </div>
      </div>
    </section>
  );
}
