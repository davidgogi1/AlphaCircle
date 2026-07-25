import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import UserAvatar from "../components/UserAvatar";
import "./UsersPage.css";

interface UserRow {
  _id: string;
  username: string;
  bio?: string;
  avatar?: string;
  createdAt: string;
  isFollowing: boolean;
}

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [includeBio, setIncludeBio] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get("/users")
      .then((d) => setUsers(d.users))
      .catch(() => setError("Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  const handleFollow = async (userId: string) => {
    if (pending.has(userId)) return;
    setPending((prev) => new Set(prev).add(userId));

    setUsers((prev) =>
      prev.map((u) =>
        u._id === userId ? { ...u, isFollowing: !u.isFollowing } : u,
      ),
    );

    try {
      const data = await api.post(`/users/${userId}/follow`, {});
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, isFollowing: data.following } : u,
        ),
      );
    } catch {
      // revert
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, isFollowing: !u.isFollowing } : u,
        ),
      );
    } finally {
      setPending((prev) => {
        const s = new Set(prev);
        s.delete(userId);
        return s;
      });
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (includeBio && (u.bio ?? "").toLowerCase().includes(q))
    );
  });

  return (
    <div className="users-page">
      <div className="users-header">
        <h2>Members</h2>
        <p className="users-sub">
          Follow members to see their posts in your feed
        </p>
      </div>

      <div className="users-search-row">
        <input
          className="users-search"
          placeholder="Search by a member…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="users-search-bio-toggle">
          <input
            type="checkbox"
            checked={includeBio}
            onChange={(e) => setIncludeBio(e.target.checked)}
          />
          Include bio
        </label>
      </div>

      {loading && <div className="users-status">Loading…</div>}
      {error && <div className="users-status error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="users-status">
          {search ? `No members matching "${search}"` : "No other members yet."}
        </div>
      )}

      <div className="users-grid">
        {filtered.map((u) => (
          <div
            key={u._id}
            className="user-card"
            onClick={() => navigate(`/members/${u._id}`)}
          >
            <UserAvatar username={u.username} avatar={u.avatar} size={46} />
            <div className="uc-info">
              <span className="uc-username">{u.username}</span>
              {u.bio ? (
                <span className="uc-bio">{u.bio}</span>
              ) : (
                <span className="uc-since">
                  Joined{" "}
                  {new Date(u.createdAt).toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            <button
              className="uc-msg-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/messages/${u._id}`);
              }}
            >
              ✉
            </button>
            <button
              className={`uc-follow-btn ${u.isFollowing ? "following" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                handleFollow(u._id);
              }}
              disabled={pending.has(u._id)}
            >
              {u.isFollowing ? "Unfollow" : "Follow"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
