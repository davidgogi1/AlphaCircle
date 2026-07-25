import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useGroupNotifications } from "../../contexts/GroupNotificationsContext";
import { useMessageNotifications } from "../../contexts/MessageNotificationsContext";
import UserAvatar from "../UserAvatar";
import "./Sidebar.css";

const navItems = [
  { label: "Feed", icon: "⊞", path: "/" },
  { label: "My Page", icon: "🧑", path: "/my-page" },
  { label: "Members", icon: "👥", path: "/members" },
  { label: "Messages", icon: "✉️", path: "/messages", badge: "messages" },
  { label: "Discussions", icon: "💬", path: "/discussions" },
  { label: "Chat Groups", icon: "🗨️", path: "/chat-groups", badge: "chat" },
  { label: "News", icon: "📰", path: "/news" },
  { label: "Short Videos", icon: "▶", path: "/videos" },
  { label: "Saved", icon: "🔖", path: "/saved" },
  { label: "Buyside Consensus", icon: "🤝", path: "/consensus" },
];

const bottomNavItems = [
  { label: "Feed", icon: "⊞", path: "/" },
  { label: "Discuss", icon: "💬", path: "/discussions" },
  { label: "My Page", icon: "🧑", path: "/my-page" },
  { label: "Messages", icon: "✉️", path: "/messages", badge: "messages" },
];

const drawerItems = [
  { label: "Members", icon: "👥", path: "/members" },
  { label: "Chat Groups", icon: "🗨️", path: "/chat-groups", badge: true },
  { label: "News", icon: "📰", path: "/news" },
  { label: "Short Videos", icon: "▶", path: "/videos" },
  { label: "Saved", icon: "🔖", path: "/saved" },
  { label: "BuySide Consensus", icon: "🤝", path: "/consensus" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pendingCount, transferOfferCount, totalUnread } =
    useGroupNotifications();
  const { totalUnread: totalUnreadMessages } = useMessageNotifications();
  const chatBadge = totalUnread + pendingCount + transferOfferCount;
  const badgeCounts: Record<string, number> = { chat: chatBadge, messages: totalUnreadMessages };
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerNav = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">📊</div>
          <div>
            <div className="logo-name">AlphaCircle</div>
            <div className="logo-sub">INVESTOR NETWORK</div>
          </div>
        </div>

        <div className="go-pro-banner">
          <span className="go-pro-crown">👑</span>
          <div>
            <div className="go-pro-title">Go Pro</div>
            <div className="go-pro-sub">
              Access premium insights &amp; member tools
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ label, icon, path, badge }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `nav-item${isActive ? " active" : ""}`
              }
            >
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
              {badge && badgeCounts[badge] > 0 && (
                <span className="nav-badge">{badgeCounts[badge]}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <UserAvatar
            username={user?.username ?? ""}
            avatar={user?.avatar}
            size={36}
          />
          <div className="user-info">
            <div className="user-name">{user?.username}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <button className="logout-btn" onClick={logout} title="Log out">
            ⏻
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav className="bottom-nav">
        {bottomNavItems.map(({ label, icon, path, badge }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) => `bn-item${isActive ? " active" : ""}`}
          >
            <span className="bn-icon">
              {icon}
              {badge && badgeCounts[badge] > 0 && (
                <span className="nav-badge bn-badge">{badgeCounts[badge]}</span>
              )}
            </span>
            <span className="bn-label">{label}</span>
          </NavLink>
        ))}
        <button className="bn-new-post" onClick={() => navigate("/new-post")}>
          ✏
        </button>
        <button
          className={`bn-item${drawerOpen ? " active" : ""}`}
          onClick={() => setDrawerOpen((o) => !o)}
        >
          <span className="bn-icon">☰</span>
          <span className="bn-label">More</span>
        </button>
      </nav>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="bn-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="bn-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="bn-drawer-handle" />

            <div className="bn-drawer-user">
              <UserAvatar
                username={user?.username ?? ""}
                avatar={user?.avatar}
                size={36}
              />
              <div className="user-info">
                <div className="user-name">{user?.username}</div>
                <div className="user-email">{user?.email}</div>
              </div>
            </div>

            <div className="bn-drawer-nav">
              {drawerItems.map(({ label, icon, path, badge }) => (
                <button
                  key={path}
                  className="bn-drawer-item"
                  onClick={() => handleDrawerNav(path)}
                >
                  <span className="bn-drawer-icon">{icon}</span>
                  <span>{label}</span>
                  {badge && pendingCount > 0 && (
                    <span className="nav-badge">{pendingCount}</span>
                  )}
                </button>
              ))}
            </div>

            <button
              className="bn-drawer-logout"
              onClick={() => {
                setDrawerOpen(false);
                logout();
              }}
            >
              ⏻ Log out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
