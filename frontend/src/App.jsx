// frontend/src/App.jsx
// React Router + layout with improved desktop support

import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/shared/ProtectedRoute'
import LoginScreen from './components/auth/LoginScreen'
import OnboardingScreen from './components/auth/OnboardingScreen'
import AuthCallback from './components/auth/AuthCallback'
import ErrorBoundary from './components/shared/ErrorBoundary'
import HomeScreen from './components/match/HomeScreen'
import WaitingScreen from './components/match/WaitingScreen'
import ChatScreen from './components/chat/ChatScreen'
import FriendsTab from './components/friends/FriendsTab'
import FriendChat from './components/friends/FriendChat'
import ProfileTab from './components/profile/ProfileTab'
import SettingsScreen from './components/profile/SettingsScreen'
import BottomNav from './components/shared/BottomNav'
import LandingPage from './components/landing/LandingPage'
import LegalPage from './components/landing/LegalPage'
import { useAuthStore } from './store/authStore'
import NotificationCenter from './components/shared/NotificationCenter'

function AppLayout({ children }) {
  return (
    <div className="min-h-dvh flex flex-col bg-mesh">
      <main className="flex-1 pb-20 md:pb-0 md:pt-20">{children}</main>
      <BottomNav />
    </div>
  )
}

function RootRoute() {
  const { isAuthenticated, isOnboarded } = useAuthStore()
  if (!isAuthenticated) return <LandingPage />
  if (!isOnboarded) return <Navigate to="/onboarding" replace />
  return <AppLayout><HomeScreen /></AppLayout>
}

export default function App() {
  return (
    <ErrorBoundary>
      <NotificationCenter />
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/about" element={<LegalPage />} />
        <Route path="/privacy" element={<LegalPage />} />
        <Route path="/terms" element={<LegalPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route
          path="/onboarding"
          element={
            <ProtectedRoute requireOnboarding={false}>
              <OnboardingScreen />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={<RootRoute />}
        />
        <Route
          path="/waiting"
          element={
            <ProtectedRoute>
              <WaitingScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:sessionId"
          element={
            <ProtectedRoute>
              <ChatScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <AppLayout>
                <FriendsTab />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends/:friendId"
          element={
            <ProtectedRoute>
              <FriendChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ProfileTab />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsScreen />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
