// frontend/src/components/match/WaitingScreen.jsx
// Simple waiting UI with soft guides + match celebration. Production polish.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMatch } from '../../hooks/useMatch'
import { useSocket } from '../../hooks/useSocket'
import { useChatStore } from '../../store/chatStore'

const GUIDES = [
  {
    title: 'Privacy first',
    body: 'Vibe does not track your location. You choose what to share.',
  },
  {
    title: 'Start with curiosity',
    body: 'A simple question makes the first hello feel easy and human.',
  },
  {
    title: 'You are in control',
    body: 'Skip, report, or block anytime. Your comfort comes first.',
  },
]

export default function WaitingScreen() {
  const { cancelMatching, celebrateMatch } = useMatch()
  useSocket()
  const navigate = useNavigate()
  const sessionId = useChatStore((s) => s.sessionId)
  const [elapsed, setElapsed] = useState(0)
  const [guideIndex, setGuideIndex] = useState(0)
  const [phase, setPhase] = useState('searching') // searching | found

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setGuideIndex((i) => (i + 1) % GUIDES.length), 4500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onMatched = (e) => {
      setPhase('found')
      celebrateMatch()
      const id = e.detail?.session_id
      if (id) setTimeout(() => navigate(`/chat/${id}`, { replace: true }), 250)
    }
    window.addEventListener('vibe:matched', onMatched)
    return () => window.removeEventListener('vibe:matched', onMatched)
  }, [navigate, celebrateMatch])

  useEffect(() => {
    if (sessionId) {
      setPhase('found')
      celebrateMatch()
      const t = setTimeout(() => navigate(`/chat/${sessionId}`, { replace: true }), 250)
      return () => clearTimeout(t)
    }
  }, [sessionId, navigate, celebrateMatch])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 bg-[#0c0e10] relative overflow-hidden safe-top safe-bottom">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-primary/20 blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 h-40 w-40 rounded-full bg-accent/10 blur-[80px] animate-float" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center animate-fade-up">
        {/* Pulse ring */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          {phase === 'searching' && (
            <>
              <span className="absolute inset-0 rounded-full border border-primary/30 animate-ping opacity-40" />
              <span className="absolute inset-2 rounded-full border border-primary/20 animate-pulse-slow" />
            </>
          )}
          <div
            className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-500 ${
              phase === 'found'
                ? 'bg-success/20 text-success scale-110'
                : 'bg-primary/20 text-primary-200'
            }`}
          >
            {phase === 'found' ? (
              <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
              </svg>
            )}
          </div>
        </div>

        <h2 className="mt-8 text-center font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {phase === 'found' ? (
            <span className="text-gradient">Match found!</span>
          ) : (
            'Finding someone…'
          )}
        </h2>

        {phase === 'searching' && (
          <>
            <p className="mt-2 font-medium tabular-nums tracking-wide text-zinc-500">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </p>

            <div className="mt-8 w-full min-h-[120px]">
              <div
                key={guideIndex}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 animate-fade-in"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Tip {guideIndex + 1} / {GUIDES.length}
                </p>
                <h3 className="mt-2 font-display text-base font-semibold text-white">
                  {GUIDES[guideIndex].title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                  {GUIDES[guideIndex].body}
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-center gap-1.5">
              {GUIDES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === guideIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/15'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {phase === 'found' && (
          <p className="mt-3 text-sm text-zinc-400 animate-fade-in">Connecting you now…</p>
        )}

        {phase === 'searching' && (
          <button
            type="button"
            onClick={cancelMatching}
            className="mt-10 rounded-xl border border-white/10 px-8 py-3 text-sm font-medium text-zinc-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white active:scale-[0.98]"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
