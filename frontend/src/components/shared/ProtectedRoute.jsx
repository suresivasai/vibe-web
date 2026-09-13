// frontend/src/components/shared/ProtectedRoute.jsx
// Purpose: Redirect to /login if not authenticated; to /onboarding if not onboarded
// Iteration: 2

import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function ProtectedRoute({ children, requireOnboarding = true }) {
  const { isAuthenticated, isOnboarded } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireOnboarding && !isOnboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
