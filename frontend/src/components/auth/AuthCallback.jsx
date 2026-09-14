// frontend/src/components/auth/AuthCallback.jsx
// Purpose: Handle Supabase OAuth redirect — robust exchange for Vibe JWTs
// Iteration: 3 — retry, clear hash, better errors, no stale cache

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeGoogleSession, clearAuthState } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'

export default function AuthCallback() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Completing sign-in…')

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        setStatus('Verifying Google account…')
        const data = await exchangeGoogleSession()
        if (cancelled) return

        login(data.user, data.access_token, data.refresh_token)

        // Remove OAuth params from URL
        window.history.replaceState({}, document.title, '/auth/callback')

        const onboarded = useAuthStore.getState().isOnboarded
        navigate(onboarded ? '/' : '/onboarding', { replace: true })
      } catch (err) {
        console.error('[AuthCallback]', err)
        if (cancelled) return

        // Wipe any partial / stale state so user can retry cleanly
        await clearAuthState()

        const message =
          err?.response?.data?.detail ||
          err?.message ||
          'Sign-in failed. Please try again.'
        setError(typeof message === 'string' ? message : 'Sign-in failed. Please try again.')
        setStatus('')

        setTimeout(() => {
          if (!cancelled) navigate('/login?error=oauth', { replace: true })
        }, 2800)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [login, navigate])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-[#0c0e10]">
      <div className="w-full max-w-sm text-center animate-fade-in">
        {error ? (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-danger/15 text-danger">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <p className="text-base font-medium text-white mb-2">Sign-in failed</p>
            <p className="text-sm text-zinc-400 leading-relaxed" role="alert">
              {error}
            </p>
            <p className="mt-4 text-xs text-zinc-500">Redirecting to login…</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-base font-medium text-white">{status}</p>
            <p className="mt-2 text-sm text-zinc-500">This only takes a moment</p>
          </>
        )}
      </div>
    </div>
  )
}
