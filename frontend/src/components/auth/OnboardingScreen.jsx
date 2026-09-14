// frontend/src/components/auth/OnboardingScreen.jsx
// Simple onboarding — display name + gender. Production polish + animations.

import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Logo from '../shared/Logo'

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Prefer not to say' },
]

export default function OnboardingScreen() {
  const { isAuthenticated, isOnboarded, completeOnboarding, user } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [gender, setGender] = useState(user?.gender && user.gender !== 'other' ? user.gender : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isOnboarded) return <Navigate to="/" replace />

  const handleSave = async () => {
    const name = displayName.trim()
    if (name.length < 2) {
      setError('Name needs at least 2 characters')
      return
    }
    if (name.length > 24) {
      setError('Name max 24 characters')
      return
    }
    if (!gender) {
      setError('Please select an option')
      return
    }
    setLoading(true)
    setError('')
    try {
      await completeOnboarding({ display_name: name, gender })
      navigate('/', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : err.message || 'Could not save')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#0c0e10] flex flex-col safe-top safe-bottom">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/15 blur-[90px] animate-float-slow" />
        <div className="absolute bottom-20 -left-20 h-56 w-56 rounded-full bg-accent/10 blur-[80px] animate-float" />
      </div>

      <header className="relative z-10 px-5 py-5 sm:px-8">
        <Logo size={32} />
      </header>

      <main className="relative z-10 flex flex-1 flex-col px-5 pb-8">
        <div className="mx-auto w-full max-w-md flex-1 flex flex-col animate-fade-up">
          <div className="mb-8">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500" />
            </div>
            <p className="mt-2.5 text-[11px] font-medium tracking-wide text-zinc-500">
              One quick step
            </p>
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            What should we call you?
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            This is how others will see you. You can change it later.
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-zinc-400">
                <span>Display name</span>
                <span className="tabular-nums text-zinc-600">{displayName.trim().length}/24</span>
              </label>
              <input
                className="input-clean"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 24))}
                placeholder="Nova, Alex, Pixel…"
                maxLength={24}
                autoFocus
                autoComplete="nickname"
              />
            </div>

            <div>
              <p className="mb-2.5 text-xs font-medium text-zinc-400">
                Gender <span className="font-normal text-zinc-600">(for your profile only)</span>
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {GENDERS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`min-h-[52px] rounded-xl border-2 px-2 py-3 text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
                      gender === g.value
                        ? 'border-primary bg-primary/15 text-white shadow-[0_0_24px_-6px_rgba(255,112,95,0.35)]'
                        : 'border-white/5 bg-white/[0.03] text-zinc-400 hover:border-white/15 hover:text-zinc-200'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger animate-fade-in" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="mt-auto pt-10">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || displayName.trim().length < 2 || !gender}
              className="btn-primary w-full !py-4 !rounded-2xl"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving…
                </span>
              ) : (
                "Let's go"
              )}
            </button>
            <p className="mt-4 text-center text-[11px] text-zinc-600">
              Matching is open to everyone · Be kind
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
