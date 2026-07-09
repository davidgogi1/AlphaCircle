import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { GroupNotificationsProvider } from "./contexts/GroupNotificationsContext";
import { SavedProvider } from "./contexts/SavedContext";
import Layout from "./components/layout/Layout";
import AppLoader from "./components/layout/AppLoader";
import AuthPage from "./pages/AuthPage";
import FeedPage from "./pages/FeedPage";
import DiscussionsPage from "./pages/DiscussionsPage";
import TopicPage from "./pages/TopicPage";
import ThreadPage from "./pages/ThreadPage";
import ChatGroupsPage from "./pages/ChatGroupsPage";
import NewsPage from "./pages/NewsPage";
import ShortVideosPage from "./pages/ShortVideosPage";
import SavedPage from "./pages/SavedPage";
import SearchPage from "./pages/SearchPage";
import ConsensusPage from "./pages/ConsensusPage";
import MyPage from "./pages/MyPage";
import NewPostPage from "./pages/NewPostPage";
import "./styles/globals.css";
import UsersPage from "./pages/UsersPage";
import UserProfilePage from "./pages/UserProfilePage";
import MessagesPage from "./pages/MessagesPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (!user) return <AuthPage />;
  if (!user.profileComplete) return <ProfileSetupPage />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<FeedPage />} />
          <Route path="my-page" element={<MyPage />} />
          <Route path="members" element={<UsersPage />} />
          <Route path="members/:userId" element={<UserProfilePage />} />
          <Route path="new-post" element={<NewPostPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/:userId" element={<MessagesPage />} />
          <Route path="discussions" element={<DiscussionsPage />} />
          <Route path="discussions/:slug" element={<TopicPage />} />
          <Route path="discussions/:slug/:threadId" element={<ThreadPage />} />
          <Route path="chat-groups" element={<ChatGroupsPage />} />
<Route path="news" element={<NewsPage />} />
          <Route path="videos" element={<ShortVideosPage />} />
          <Route path="saved" element={<SavedPage />} />
          <Route path="search"    element={<SearchPage />} />
          <Route path="consensus" element={<ConsensusPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GroupNotificationsProvider>
        <SavedProvider>
          <AppRoutes />
        </SavedProvider>
      </GroupNotificationsProvider>
    </AuthProvider>
  );
}
