// frontend/src/components/auth/LoginScreen.jsx
// Simple, clean auth UI with smooth animations — mobile + desktop

import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Logo from '../shared/Logo'
import TurnstileWidget from './TurnstileWidget'

export default function LoginScreen() {
  const { isAuthenticated, isOnboarded, signInWithGoogle, signInWithEmail, register } = useAuth()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const requested = searchParams.get('mode')
    if (requested === 'signup' || requested === 'login') setMode(requested)
    if (searchParams.get('error') === 'oauth') {
      setError('Google sign-in didn’t complete. Please try again.')
    }
  }, [searchParams])

  if (isAuthenticated) {
    return <Navigate to={isOnboarded ? '/' : '/onboarding'} replace />
  }

  const changeMode = (next) => {
    setMode(next)
    setError('')
  }

  const handleGoogle = async () => {
    if (!agreed) {
      setError('Please confirm you are 18 or older.')
      return
    }
    if (import.meta.env.VITE_TURNSTILE_SITE_KEY && !captchaToken) {
      setError('Please complete the security verification.')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (captchaToken) sessionStorage.setItem('vibe-captcha-token', captchaToken)
      sessionStorage.setItem('vibe-age-confirmed', '1')
      await signInWithGoogle()
      // redirect happens — no need to setLoading(false)
    } catch (err) {
      sessionStorage.removeItem('vibe-captcha-token')
      sessionStorage.removeItem('vibe-age-confirmed')
      setError(err.message || 'Google sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!agreed) {
      setError('Please confirm you are 18 or older.')
      return
    }
    if (mode === 'signup' && displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters.')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password, captchaToken)
      } else {
        await register(email, password, displayName, captchaToken)
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg || d).join(', ')
            : err.message || 'Authentication failed.'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#0c0e10] flex flex-col safe-top">
      {/* subtle animated gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-primary/20 blur-[100px] animate-float-slow" />
        <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-accent/15 blur-[90px] animate-float" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <Logo size={36} />
        </Link>
        <Link
          to="/privacy"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Privacy
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-10">
        <div className="w-full max-w-[400px] animate-fade-up">
          {/* Hero text */}
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {mode === 'login' ? 'Welcome back' : 'Join Vibe'}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {mode === 'login'
                ? 'Sign in to continue chatting'
                : 'Create an account in seconds'}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm sm:p-7">
            {/* Google first (primary path) */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3.5 text-sm font-semibold text-zinc-900 transition-all duration-200 hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-60"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-zinc-500">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Toggle email form */}
            {!showForm ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="w-full rounded-xl border border-white/10 py-3 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.04] active:scale-[0.98]"
              >
                Continue with email
              </button>
            ) : (
              <div className="animate-fade-in space-y-4">
                {/* Mode tabs */}
                <div className="flex rounded-lg bg-white/[0.04] p-1">
                  <button
                    type="button"
                    onClick={() => changeMode('login')}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                      mode === 'login'
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => changeMode('signup')}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                      mode === 'signup'
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Register
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {mode === 'signup' && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                        Display name
                      </label>
                      <input
                        className="input-clean"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        maxLength={24}
                        placeholder="Nova, Alex…"
                        autoComplete="nickname"
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                      Email
                    </label>
                    <input
                      className="input-clean"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                      Password
                    </label>
                    <input
                      className="input-clean"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      name="adult-confirmation"
                      autoComplete="off"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-white/20 bg-white/5 ring-offset-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-checked:border-primary peer-checked:bg-primary peer-checked:after:block peer-checked:after:mx-auto peer-checked:after:mt-0.5 peer-checked:after:h-2 peer-checked:after:w-1 peer-checked:after:rotate-45 peer-checked:after:border-b-2 peer-checked:after:border-r-2 peer-checked:after:border-white"><span className="sr-only">Age confirmation checkbox</span></span><span className="text-xs leading-relaxed text-zinc-400">
                      I am 18+ and agree to the{' '}
                      <Link to="/privacy" className="text-primary-300 underline-offset-2 hover:underline">
                        Privacy Policy
                      </Link>{' '}
                      &{' '}
                      <Link to="/terms" className="text-primary-300 underline-offset-2 hover:underline">
                        Terms
                      </Link>
                    </span>
                  </label>

                  {error && (
                    <p
                      className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger animate-fade-in"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full !py-3.5"
                  >
                    {loading
                      ? 'Please wait…'
                      : mode === 'login'
                        ? 'Log in'
                        : 'Create account'}
                  </button>
                </form>
              </div>
            )}

            <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              <TurnstileWidget onToken={setCaptchaToken} onError={setError} />
            </div>

            {/* Age notice when form hidden */}
            {!showForm && (
              <label className="mt-5 flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  name="adult-confirmation-hidden"
                  autoComplete="off"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-white/20 bg-white/5 ring-offset-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-checked:border-primary peer-checked:bg-primary peer-checked:after:block peer-checked:after:mx-auto peer-checked:after:mt-0.5 peer-checked:after:h-2 peer-checked:after:w-1 peer-checked:after:rotate-45 peer-checked:after:border-b-2 peer-checked:after:border-r-2 peer-checked:after:border-white"><span className="sr-only">Age confirmation checkbox</span></span><span className="text-xs leading-relaxed text-zinc-500">
                  I am 18 or older and agree to the{' '}
                  <Link to="/privacy" className="text-primary-300 hover:underline">
                    Privacy Policy
                  </Link>{' '}
                  &{' '}
                  <Link to="/terms" className="text-primary-300 hover:underline">
                    Terms
                  </Link>
                </span>
              </label>
            )}

            {error && !showForm && (
              <p
                className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger animate-fade-in"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-zinc-600">
            You can change your display name later in settings.
          </p>
        </div>
      </main>
    </div>
  )
}
