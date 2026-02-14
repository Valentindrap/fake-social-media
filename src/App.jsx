import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Layout from '@/components/layout/Layout';
import LoginPage from '@/pages/LoginPage';
import FeedPage from '@/pages/FeedPage';
import ProfilePage from '@/pages/ProfilePage';
import EditProfilePage from '@/pages/EditProfilePage';
import SearchPage from '@/pages/SearchPage';
import CreatePostPage from '@/pages/CreatePostPage';
import NotificationsPage from '@/pages/NotificationsPage';
import MessagesPage from '@/pages/MessagesPage';
import NotFoundPage from '@/pages/NotFoundPage';

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-papu-coral"></div>
      </div>
    );
  }

  return currentUser ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<FeedPage />} />
            <Route path="profile/:username" element={<ProfilePage />} />
            <Route path="edit-profile" element={<EditProfilePage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="create" element={<CreatePostPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
