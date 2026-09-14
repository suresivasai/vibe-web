// frontend/src/hooks/useAuth.js
// Purpose: Hook wrapping authStore + Supabase session listener
// Iteration: 2

import { useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import {
  loginWithGoogle,
  exchangeGoogleSession,
  loginWithEmail as apiLoginWithEmail,
  registerWithEmail as apiRegisterWithEmail,
  logout as apiLogout,
  getMe,
  updateMe,
  deleteMe,
  clearAuthState,
  supabase,
} from '../api/auth'
import { disconnectSocket } from './useSocket'

export function useAuth() {
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isOnboarded,
    login,
    logout: storeLogout,
    setUser,
    updateUser,
  } = useAuthStore()

  // Listen for Supabase auth state changes (OAuth redirect)
  // AuthCallback owns the primary exchange after redirect.
  // This only recovers a session if user lands elsewhere with a live Supabase session.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          event === 'SIGNED_IN' &&
          session &&
          !useAuthStore.getState().accessToken &&
          !window.location.pathname.startsWith('/auth/callback')
        ) {
          try {
            const data = await exchangeGoogleSession()
            login(data.user, data.access_token, data.refresh_token)
          } catch (err) {
            console.error('Failed to exchange Google session', err)
            await clearAuthState()
          }
        }
        if (event === 'SIGNED_OUT') {
          storeLogout()
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [login, storeLogout])

  // On mount, if we have tokens, refresh profile
  useEffect(() => {
    if (isAuthenticated && accessToken && !user) {
      getMe()
        .then((u) => setUser(u))
        .catch(() => storeLogout())
    }
  }, [isAuthenticated, accessToken, user, setUser, storeLogout])

  const signInWithGoogle = useCallback(async () => {
    await loginWithGoogle()
  }, [])

  const signInWithEmail = useCallback(async (email, password) => {
    const data = await apiLoginWithEmail(email, password)
    login(data.user, data.access_token, data.refresh_token)
    return data
  }, [login])

  const register = useCallback(async (email, password, displayName) => {
    const data = await apiRegisterWithEmail(email, password, displayName)
    login(data.user, data.access_token, data.refresh_token)
    return data
  }, [login])

  const signOut = useCallback(async () => {
    await apiLogout(refreshToken)
    disconnectSocket()
    storeLogout()
  }, [refreshToken, storeLogout])

  const completeOnboarding = useCallback(
    async (payload) => {
      const updated = await updateMe(payload)
      updateUser(updated)
      return updated
    },
    [updateUser]
  )

  const deleteAccount = useCallback(async () => {
    await deleteMe()
    storeLogout()
  }, [storeLogout])

  return {
    user,
    accessToken,
    isAuthenticated,
    isOnboarded,
    signInWithGoogle,
    signInWithEmail,
    register,
    signOut,
    completeOnboarding,
    deleteAccount,
    updateUser,
    setUser,
  }
}
