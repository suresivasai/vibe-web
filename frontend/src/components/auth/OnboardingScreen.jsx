// frontend/src/components/auth/OnboardingScreen.jsx
// Simplified: set a good display name. Gender optional for profile only.

import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Prefer not to say' },
]

export default function OnboardingScreen() {
  const { isAuthenticated, isOnboarded, completeOnboarding, user } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [gender, setGender] = useState(user?.gender || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isOnboarded) return <Navigate to="/" replace />

  const handleSave = async () => {
    const name = displayName.trim()
    if (name.length < 2) {
      setError('Pick a name with at least 2 characters')
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
      // interests kept empty — no longer used for matching
      await completeOnboarding({
        display_name: name,
        gender,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Could not save')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-mesh relative overflow-hidden">
      <div className="orb w-[320px] h-[320px] bg-primary/15 -top-20 -right-20 animate-float-slow" />
      <div className="orb w-[240px] h-[240px] bg-accent/10 bottom-0 -left-10 animate-float" />

      <div className="relative z-10 flex-1 flex flex-col px-5 py-8 max-w-md mx-auto w-full safe-top safe-bottom">
        <div className="mb-6">
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500" />
          </div>
          <p className="text-[11px] text-text-muted-dark mt-2.5 font-medium tracking-wide">
            One quick step
          </p>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
          What should we call you?
        </h1>
        <p className="mt-2 text-sm text-text-secondary-dark leading-relaxed">
          Choose a name people will see. Masks are fine — just keep it respectful.
        </p>

        {/* Display name */}
        <label className="mt-8 block">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted-dark">
            Display name
          </span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value.slice(0, 24))
              setError('')
            }}
            placeholder="e.g. Nova, Alex, Pixel"
            maxLength={24}
            className="input-field mt-2"
            autoFocus
          />
          <span className="mt-1.5 block text-[11px] text-text-muted-dark text-right">
            {displayName.trim().length}/24
          </span>
        </label>

        {/* Gender (profile only, not used for matching) */}
        <h2 className="mt-8 text-xs font-semibold uppercase tracking-wider text-text-muted-dark">
          Gender <span className="normal-case font-normal text-text-muted-dark/70">(optional vibe, not for matching)</span>
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {GENDERS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGender(g.value)}
              className={`min-h-[52px] flex items-center justify-center rounded-card border-2 px-2 py-3 text-sm font-medium transition-all duration-200 ${
                gender === g.value
                  ? 'border-primary bg-primary/15 shadow-glow text-white'
                  : 'border-white/5 bg-white/[0.03] hover:border-white/15 text-text-secondary-dark'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-5 text-sm text-danger flex items-center gap-2" role="alert">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}

        <div className="mt-auto pt-10">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || displayName.trim().length < 2 || !gender}
            className="btn-primary w-full py-4 rounded-2xl"
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              'Let’s go'
            )}
          </button>
          <p className="mt-4 text-center text-[11px] text-text-muted-dark">
            Matching is open to everyone · Be kind
          </p>
        </div>
      </div>
    </div>
  )
}
