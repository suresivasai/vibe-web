import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Logo from '../shared/Logo'

export default function LoginScreen() {
  const { isAuthenticated, isOnboarded, signInWithGoogle, signInWithEmail, register } = useAuth()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const requestedMode = searchParams.get('mode')
    if (requestedMode === 'signup' || requestedMode === 'login') setMode(requestedMode)
  }, [searchParams])

  if (isAuthenticated) return <Navigate to={isOnboarded ? '/' : '/onboarding'} replace />

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setError('')
  }

  const handleGoogle = async () => {
    if (!agreed) {
      setError('Please confirm you are 18 or older.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!agreed) {
      setError('Please confirm you are 18 or older.')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') await signInWithEmail(email, password)
      else await register(email, password, displayName)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Authentication failed.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-mesh px-5 py-6 sm:px-8 lg:px-10 safe-top">
      <header className="mx-auto flex max-w-7xl items-center justify-between"><Link to="/"><Logo size={40} /></Link><Link to="/privacy" className="text-sm text-text-muted-dark hover:text-white">Privacy & safety</Link></header>
      <main className="mx-auto grid min-h-[calc(100dvh-120px)] max-w-6xl items-center gap-12 py-10 lg:grid-cols-[0.9fr_0.75fr] lg:gap-24">
        <div className="hidden lg:block"><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-400">Your next conversation</p><h1 className="mt-5 max-w-xl font-display text-6xl font-semibold leading-[0.95] tracking-[-0.05em] text-white">Leave the feed. Find a <span className="text-gradient">real person.</span></h1><p className="mt-7 max-w-md text-base leading-relaxed text-text-secondary-dark">A calmer place to meet someone new, with safety tools and your agency built into every step.</p><div className="mt-9 grid max-w-sm gap-3"><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-sm font-semibold text-white">One match at a time</p><p className="mt-1 text-xs text-text-muted-dark">No infinite feed. No location tracking.</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-sm font-semibold text-white">Built to feel safe</p><p className="mt-1 text-xs text-text-muted-dark">Report, block, skip, or end the chat whenever you need.</p></div></div></div>
        <div className="card-surface p-6 sm:p-8"><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-300">Welcome to Vibe</p><h2 className="mt-3 font-display text-3xl font-semibold text-white">{mode === 'login' ? 'Good to see you.' : 'Make an entrance.'}</h2><p className="mt-2 text-sm text-text-secondary-dark">{mode === 'login' ? 'Pick up where the conversation left off.' : 'Choose a name and meet someone new.'}</p></div><div className="mb-6 grid grid-cols-2 rounded-xl bg-white/[0.04] p-1"><button type="button" onClick={() => changeMode('login')} className={`rounded-lg py-2.5 text-sm font-semibold transition ${mode === 'login' ? 'bg-white/10 text-white' : 'text-text-muted-dark'}`}>Log in</button><button type="button" onClick={() => changeMode('signup')} className={`rounded-lg py-2.5 text-sm font-semibold transition ${mode === 'signup' ? 'bg-white/10 text-white' : 'text-text-muted-dark'}`}>Register</button></div><form onSubmit={handleSubmit} className="space-y-4">{mode === 'signup' && <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted-dark">Display name</span><input className="input-field" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={24} placeholder="Nova, Alex, Pixel" /></label>}<label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted-dark">Email</span><input className="input-field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted-dark">Password</span><input className="input-field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} placeholder="At least 6 characters" /></label><label className="flex cursor-pointer items-start gap-3 py-2 text-xs leading-relaxed text-text-secondary-dark"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" /> <span>I am 18 or older and agree to the <Link to="/privacy" className="text-primary-300 underline">Privacy Policy</Link> and <Link to="/terms" className="text-primary-300 underline">Terms</Link>.</span></label>{error && <p className="text-sm text-danger" role="alert">{error}</p>}<button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Working...' : mode === 'login' ? 'Log in to Vibe' : 'Create my account'} <span aria-hidden="true">→</span></button></form><div className="my-6 flex items-center gap-3 text-xs text-text-muted-dark"><span className="h-px flex-1 bg-white/10" />or<span className="h-px flex-1 bg-white/10" /></div><button type="button" onClick={handleGoogle} disabled={loading} className="btn-secondary w-full"><span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-bold text-[#4285f4]">G</span> Continue with Google</button><p className="mt-6 text-center text-xs text-text-muted-dark">You can change your display name later.</p></div>
      </main>
    </div>
  )
}
