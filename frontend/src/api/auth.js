// frontend/src/api/auth.js
// Purpose: Auth API helpers (Google via Supabase, local email, refresh, logout)
// Iteration: 3 — robust OAuth exchange + cache clear on failure

import api from './axios'
import { createClient } from '@supabase/supabase-js'
import { useAuthStore } from '../store/authStore'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

/**
 * Start Google OAuth via Supabase (redirect flow).
 * redirectTo must be allow-listed in Supabase Auth → URL Configuration.
 */
export async function loginWithGoogle() {
  const redirectTo = `${window.location.origin}/auth/callback`
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      scopes: 'openid email profile',
    },
  })
  if (error) throw error
  return data
}

/**
 * Wait until Supabase has a valid session after OAuth redirect.
 * Retries a few times because hash/query parsing can lag on some browsers / Firebase hosting.
 */
async function waitForSession(maxAttempts = 8, delayMs = 250) {
  for (let i = 0; i < maxAttempts; i++) {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    if (session?.access_token || session?.provider_token) {
      return session
    }
    if (error) {
      console.warn('[auth] getSession attempt', i + 1, error.message)
    }
    await new Promise((r) => setTimeout(r, delayMs))
  }
  // Last resort: try getUser (forces network)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) return session
  }
  throw new Error(error?.message || 'No session after Google login. Please try again.')
}

/**
 * After OAuth redirect: exchange Supabase session for Vibe backend JWTs.
 * Tries (in order):
 * 1. provider_token (Google access token) → userinfo
 * 2. id_token if present
 * 3. session.access_token (Supabase JWT) as last fallback
 */
export async function exchangeGoogleSession() {
  const session = await waitForSession()

  const candidates = [
    session.provider_token,
    session.id_token,
    session.access_token,
  ].filter(Boolean)

  if (candidates.length === 0) {
    throw new Error('Google session missing tokens. Please try signing in again.')
  }

  let lastError = null
  for (const token of candidates) {
    try {
      const { data } = await api.post('/auth/google', { id_token: token })
      return data
    } catch (err) {
      lastError = err
      const status = err.response?.status
      // 401/403 from backend → try next token type
      if (status === 401 || status === 403) continue
      // Other errors (network, 500) → surface immediately
      throw err
    }
  }

  const detail = lastError?.response?.data?.detail
  const message =
    typeof detail === 'string'
      ? detail
      : detail?.reason || lastError?.message || 'Could not verify Google account'
  throw new Error(message)
}

export async function loginWithEmail(email, password) {
  const { data } = await api.post('/auth/login', {
    email: email.trim().toLowerCase(),
    password,
  })
  return data
}

export async function registerWithEmail(email, password, displayName) {
  const { data } = await api.post('/auth/register', {
    email: email.trim().toLowerCase(),
    password,
    display_name: displayName.trim(),
  })
  return data
}

export async function refreshToken(refreshTokenValue) {
  const { data } = await api.post('/auth/refresh', {
    refresh_token: refreshTokenValue,
  })
  return data
}

export async function logout(refreshTokenValue) {
  try {
    if (refreshTokenValue) {
      await api.delete('/auth/logout', {
        data: { refresh_token: refreshTokenValue },
      })
    }
  } catch {
    // ignore network errors on logout
  }
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // ignore
  }
  // Clear any stale Zustand + localStorage cache
  useAuthStore.getState().logout()
}

export async function getMe() {
  const { data } = await api.get('/users/me')
  return data
}

export async function updateMe(payload) {
  const { data } = await api.patch('/users/me', payload)
  return data
}

export async function deleteMe() {
  const { data } = await api.delete('/users/me')
  return data
}

/** Hard clear of all auth state (call on fatal OAuth / login errors) */
export async function clearAuthState() {
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // ignore
  }
  useAuthStore.getState().logout()
  try {
    localStorage.removeItem('vibe-auth')
  } catch {
    // ignore
  }
}
