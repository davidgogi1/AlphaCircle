import './RightSidebar.css';

const trending = [
  { topic: 'ASML Earnings Beat',     posts: 234, hot: true },
  { topic: 'ECB Rate Decision',      posts: 189, hot: true },
  { topic: 'EU Tech Regulation',     posts: 156, hot: false },
  { topic: 'Novo Nordisk GLP-1 Data',posts: 142, hot: true },
  { topic: 'German PMI Surprise',    posts: 98,  hot: false },
  { topic: 'Spotify Ad Growth',      posts: 87,  hot: false },
  { topic: 'LVMH China Recovery',    posts: 76,  hot: false },
];

const chats = [
  { name: 'EU Tech Stocks', members: '2,340', newMsgs: 45 },
  { name: 'Macro Europe',   members: '1,890', newMsgs: 23 },
];

export default function RightSidebar() {
  return (
    <aside className="right-sidebar">
      <section className="rs-section">
        <div className="rs-header">
          <span className="rs-title">📈 Trending Today</span>
          <span className="rs-live">Live</span>
        </div>
        <div className="trending-list">
          {trending.map((t, i) => (
            <div key={i} className="trending-item">
              <span className="trending-rank">{i + 1}</span>
              <div className="trending-info">
                <span className="trending-topic">
                  {t.topic}{t.hot ? ' 🔥' : ''}
                </span>
                <span className="trending-posts">{t.posts} posts</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rs-section">
        <div className="rs-header">
          <span className="rs-title"># Active Chats</span>
          <span className="rs-link">View All</span>
        </div>
        {chats.map((c, i) => (
          <div key={i} className="chat-item">
            <div className="chat-hash">#</div>
            <div className="chat-info">
              <div className="chat-name">
                {c.name} <span className="chat-dot">●</span>
              </div>
              <div className="chat-meta">
                {c.members} members · <span className="chat-new">{c.newMsgs} new</span>
              </div>
            </div>
          </div>
        ))}
      </section>
    </aside>
  );
}
