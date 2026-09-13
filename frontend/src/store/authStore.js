// frontend/src/store/authStore.js
// Purpose: Zustand store for auth state (user, tokens)
// Onboarding: display name set + gender chosen (interests no longer required)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function computeOnboarded(user) {
  if (!user) return false
  // Complete when user has a real display name and has chosen gender
  const hasName = !!(user.display_name && user.display_name.trim().length >= 2)
  const hasGender = !!user.gender
  // Placeholder state from first Google login often has empty-ish profile
  if (!hasName || !hasGender) return false
  return true
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isOnboarded: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isOnboarded: computeOnboarded(user),
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      login: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isOnboarded: computeOnboarded(user),
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isOnboarded: false,
        }),

      updateUser: (partial) => {
        const current = get().user
        if (!current) return
        const updated = { ...current, ...partial }
        set({
          user: updated,
          isOnboarded: computeOnboarded(updated),
        })
      },
    }),
    {
      name: 'vibe-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isOnboarded: state.isOnboarded,
      }),
    }
  )
)
