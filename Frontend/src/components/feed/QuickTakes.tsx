import "./QuickTakes.css";

const videos = [
  {
    title: "ECB Decision: What It Means for Markets",
    author: "AlphaCircle",
    duration: "1:38",
  },
  {
    title: "ASML: The Hidden Gem in EU Tech?",
    author: "Elena Rossi",
    duration: "2:15",
  },
  {
    title: "Nordic Markets Weekly Wrap",
    author: "Thomas Müller",
    duration: "3:08",
  },
  {
    title: "ESG Investing: 2024 Outlook",
    author: "Sophie Laurent",
    duration: "1:45",
  },
];

export default function QuickTakes() {
  return (
    <section className="quick-takes">
      <div className="section-header">
        <span className="section-title">▶ Quick Takes</span>
        <span className="see-all">See All</span>
      </div>
      <div className="video-grid">
        {videos.map((v, i) => (
          <div key={i} className="video-card">
            <div className="video-thumb">
              <div className="play-btn">▶</div>
              <span className="video-duration">⏱ {v.duration}</span>
            </div>
            <div className="video-info">
              <div className="video-title">{v.title}</div>
              <div className="video-author">{v.author}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
