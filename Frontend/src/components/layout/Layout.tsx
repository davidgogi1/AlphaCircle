import { Outlet, useNavigate } from "react-router-dom";
import TickerBar from "./TickerBar";
import Sidebar from "./Sidebar";
import SearchBar from "./SearchBar";
//import RightSidebar from "./RightSidebar";
import { useAuth } from "../../contexts/AuthContext";
import RecoveryPhraseModal from "../RecoveryPhraseModal";
import UserAvatar from "../UserAvatar";
import "./Layout.css";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <TickerBar />
      <div className="app-body">
        <Sidebar />
        <div className="main-area">
          <div className="topbar">
            <SearchBar />
            <button
              className="new-post-btn"
              onClick={() => navigate("/new-post")}
            >
              <svg className="btn-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              New Post
            </button>
            <div className="topbar-user">
              <UserAvatar
                username={user?.username ?? ''}
                avatar={user?.avatar}
                size={32}
              />
              <span className="topbar-username">{user?.username}</span>
              <button
                className="topbar-settings"
                onClick={() => navigate("/settings")}
                title="Settings"
              >
                ⚙
              </button>
              <button
                className="topbar-logout"
                onClick={logout}
                title="Log out"
              >
                Log out
              </button>
            </div>
          </div>
          <main className="main-content">
            <Outlet />
          </main>
        </div>
        {/* <RightSidebar /> */}
      </div>
      <RecoveryPhraseModal />
    </div>
  );
}
