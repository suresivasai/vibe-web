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

  // Use one Google-issued provider token per OAuth exchange. This matters because
  // Cloudflare Turnstile tokens are single-use; retrying multiple token types with
  // the same CAPTCHA token would otherwise turn a valid verification into a replay.
  const token = session.provider_token || session.id_token
  if (!token) {
    throw new Error('Google session missing provider token. Please try signing in again.')
  }

  const captchaToken = sessionStorage.getItem('vibe-captcha-token') || ''
  const { data } = await api.post('/auth/google', {
    id_token: token,
    captcha_token: captchaToken || undefined,
  })

  sessionStorage.removeItem('vibe-captcha-token')
  sessionStorage.removeItem('vibe-age-confirmed')
  return data
}

export async function loginWithEmail(email, password, captchaToken = '') {
  const { data } = await api.post('/auth/login', {
    email: email.trim().toLowerCase(),
    password,
    captcha_token: captchaToken || undefined,
  })
  return data
}

export async function registerWithEmail(email, password, displayName, captchaToken = '') {
  const { data } = await api.post('/auth/register', {
    email: email.trim().toLowerCase(),
    password,
    display_name: displayName.trim(),
    captcha_token: captchaToken || undefined,
  })
  return data
}

export async function refreshToken(refreshTokenValue) {
  const { data } = await api.post('/auth/refresh', {
    refresh_token: refreshTokenValue,
  })
  return data
}

export async function logout(refreshTokenValue, accessTokenValue = '') {
  try {
    if (refreshTokenValue) {
      await api.delete('/auth/logout', {
        data: { refresh_token: refreshTokenValue },
        headers: accessTokenValue ? { Authorization: `Bearer ${accessTokenValue}` } : undefined,
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
