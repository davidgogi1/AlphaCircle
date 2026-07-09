import { useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUpload } from '../api';
import './NewPostPage.css';

const MAX = 1000;
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';

export default function NewPostPage() {
  const navigate  = useNavigate();
  const fileRef   = useRef<HTMLInputElement>(null);
  const [title,   setTitle]   = useState('');
  const [content, setContent] = useState('');
  const [file,    setFile]    = useState<File | null>(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) { setError('Post content cannot be empty'); return; }
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('content', content.trim());
      if (title.trim()) fd.append('title', title.trim());
      if (file)         fd.append('file', file);
      await apiUpload('POST', '/posts', fd);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="np-wrap">
      <div className="np-card">
        <div className="np-header">
          <h2>New Post</h2>
          <button className="np-cancel" onClick={() => navigate(-1)}>✕ Cancel</button>
        </div>

        <form onSubmit={handleSubmit} className="np-form">
          <div className="np-field">
            <label>Title <span className="np-optional">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. ASML: Why I'm adding to my position"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="np-field">
            <label>Content <span className="np-required">*</span></label>
            <textarea
              placeholder="Share your analysis, thesis, or market take..."
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={MAX}
              rows={7}
              required
            />
            <span className={`np-count ${content.length > MAX * 0.9 ? 'warn' : ''}`}>
              {content.length} / {MAX}
            </span>
          </div>

          <div className="np-field">
            <label>Attachment <span className="np-optional">(optional · PDF, Word, Excel, PPT, TXT · max 10 MB)</span></label>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="np-file-input"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <div className="np-file-chosen">
                📎 {file.name}
                <button type="button" className="np-file-remove" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}>✕</button>
              </div>
            )}
          </div>

          {error && <div className="np-error">{error}</div>}

          <button className="np-submit" type="submit" disabled={loading || !content.trim()}>
            {loading ? 'Publishing…' : 'Publish Post'}
          </button>
        </form>
      </div>
    </div>
  );
}
