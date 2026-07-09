import './UserAvatar.css';

interface Props {
  username: string;
  avatar?:  string;
  size?:    number;
  onClick?: () => void;
}

export default function UserAvatar({ username, avatar, size = 38, onClick }: Props) {
  const initials = username.slice(0, 2).toUpperCase();
  const style    = { width: size, height: size, fontSize: Math.round(size * 0.35) };

  if (avatar) {
    return (
      <img
        src={`/uploads/${avatar}`}
        alt={username}
        className={`ua-img${onClick ? ' ua-clickable' : ''}`}
        style={{ width: size, height: size }}
        onClick={onClick}
      />
    );
  }

  return (
    <div
      className={`ua-initials${onClick ? ' ua-clickable' : ''}`}
      style={style}
      onClick={onClick}
    >
      {initials}
    </div>
  );
}
