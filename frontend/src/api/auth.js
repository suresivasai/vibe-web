// frontend/src/api/auth.js
// Purpose: Auth API helpers (Google via Supabase, refresh, logout)
// Iteration: 2 (fixed: prefer provider_token for Google userinfo)

import api from './axios'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

/**
 * Start Google OAuth via Supabase (redirect flow).
 */
export async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
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
 * After OAuth redirect: take Supabase session and exchange with Spark backend.
 * Uses provider_token (Google access token) first — backend resolves via userinfo.
 * Falls back to session.access_token.
 */
export async function exchangeGoogleSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error || !session) {
    throw new Error(error?.message || 'No session after Google login')
  }

  // provider_token = Google access token (works with userinfo endpoint)
  // Also try to read id_token from session if Supabase exposed it
  // Prefer explicit provider_token
  const idToken = session.provider_token || session.access_token

  const { data } = await api.post('/auth/google', {
    id_token: idToken,
  })
  return data
}

export async function loginWithGoogleIdToken(idToken) {
  const { data } = await api.post('/auth/google', { id_token: idToken })
  return data
}

export async function loginWithEmail(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export async function registerWithEmail(email, password, displayName) {
  const { data } = await api.post('/auth/register', { email, password, display_name: displayName })
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
  await supabase.auth.signOut()
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
