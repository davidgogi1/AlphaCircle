import { Outlet, useNavigate } from "react-router-dom";
import TickerBar from "./TickerBar";
import Sidebar from "./Sidebar";
import SearchBar from "./SearchBar";
//import RightSidebar from "./RightSidebar";
import { useAuth } from "../../contexts/AuthContext";
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
              ✏ New Post
            </button>
            <div className="topbar-user">
              <div className="topbar-avatar">
                {user?.username.slice(0, 2).toUpperCase()}
              </div>
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
    </div>
  );
}
