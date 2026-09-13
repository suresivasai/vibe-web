// frontend/src/components/auth/AuthCallback.jsx
// Purpose: Handle Supabase OAuth redirect — exchange session for Spark JWTs
// Iteration: 2 (critical fix for login flow)

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeGoogleSession } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'

export default function AuthCallback() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        // Give Supabase a moment to parse the URL hash/query
        await new Promise((r) => setTimeout(r, 300))
        const data = await exchangeGoogleSession()
        if (cancelled) return
        login(data.user, data.access_token, data.refresh_token)
        navigate(useAuthStore.getState().isOnboarded ? '/' : '/onboarding', { replace: true })
      } catch (err) {
        console.error('Auth callback failed', err)
        if (!cancelled) {
          setError(err.message || 'Sign-in failed. Please try again.')
          setTimeout(() => navigate('/login', { replace: true }), 2500)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [login, navigate])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-bg-light dark:bg-bg-dark">
      {error ? (
        <p className="text-danger text-center" role="alert">
          {error}
        </p>
      ) : (
        <>
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-text-secondary-light dark:text-text-secondary-dark">
            Completing sign-in…
          </p>
        </>
      )}
    </div>
  )
}
