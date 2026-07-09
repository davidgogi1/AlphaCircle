import './AttachmentBadge.css';

interface Attachment {
  filename:     string;
  originalName: string;
  mimetype:     string;
  size:         number;
}

const MIME_ICON: Record<string, string> = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/vnd.ms-powerpoint': '📊',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📊',
  'text/plain': '📋',
};

function fmtSize(bytes: number): string {
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentBadge({ attachment }: { attachment: Attachment }) {
  const icon = MIME_ICON[attachment.mimetype] ?? '📎';
  const url  = `/uploads/${attachment.filename}`;

  return (
    <div className="att-badge" onClick={e => e.stopPropagation()}>
      <span className="att-icon">{icon}</span>
      <div className="att-info">
        <span className="att-name">{attachment.originalName}</span>
        <span className="att-size">{fmtSize(attachment.size)}</span>
      </div>
      <div className="att-actions">
        <a
          className="att-action-btn"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="View"
        >
          ↗
        </a>
        <a
          className="att-action-btn"
          href={url}
          download={attachment.originalName}
          title="Download"
        >
          ↓
        </a>
      </div>
    </div>
  );
}
