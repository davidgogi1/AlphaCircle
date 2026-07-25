import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import PostItem, { type Post } from '../components/feed/PostItem';
import './HashtagPage.css';

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();

  const [tagged,   setTagged]   = useState<Post[]>([]);
  const [mentioned, setMentioned] = useState<Post[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!tag) return;
    setLoading(true);
    api.get(`/posts/hashtag/${encodeURIComponent(tag)}`)
      .then(d => { setTagged(d.tagged); setMentioned(d.mentioned); })
      .catch(() => setError('Could not load posts for this hashtag.'))
      .finally(() => setLoading(false));
  }, [tag]);

  const updatePost = (updated: Post) => {
    setTagged(prev => prev.map(p => (p._id === updated._id ? updated : p)));
    setMentioned(prev => prev.map(p => (p._id === updated._id ? updated : p)));
  };
  const deletePost = (id: string) => {
    setTagged(prev => prev.filter(p => p._id !== id));
    setMentioned(prev => prev.filter(p => p._id !== id));
  };

  const total = tagged.length + mentioned.length;

  return (
    <div className="hp-page">
      <h2 className="hp-heading">#{tag}</h2>

      {loading && <div className="hp-status">Loading…</div>}
      {error && <div className="hp-status error">{error}</div>}

      {!loading && !error && total === 0 && (
        <div className="hp-status">No posts tagged or mentioning "{tag}" yet.</div>
      )}

      {!loading && !error && (
        <>
          {tagged.length > 0 && (
            <section className="hp-section">
              <div className="hp-section-label">Tagged #{tag}</div>
              <div className="hp-posts">
                {tagged.map(p => (
                  <PostItem key={p._id} post={p} onUpdate={updatePost} onDelete={deletePost} />
                ))}
              </div>
            </section>
          )}

          {mentioned.length > 0 && (
            <section className="hp-section">
              <div className="hp-section-label">Mentions "{tag}"</div>
              <div className="hp-posts">
                {mentioned.map(p => (
                  <PostItem key={p._id} post={p} onUpdate={updatePost} onDelete={deletePost} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
