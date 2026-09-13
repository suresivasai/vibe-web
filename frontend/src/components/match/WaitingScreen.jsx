// frontend/src/components/match/WaitingScreen.jsx
// Premium matching animation + soft behavior reminder

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMatch } from '../../hooks/useMatch'
import { useSocket } from '../../hooks/useSocket'
import { useChatStore } from '../../store/chatStore'

const GUIDES = [
  {
    eyebrow: 'Privacy first',
    title: 'Your location stays yours.',
    body: 'Vibe does not use location tracking. You choose what to share and when.',
    tone: 'bg-accent/10 border-accent/20 text-accent-200',
  },
  {
    eyebrow: 'Good conversation',
    title: 'Start with curiosity.',
    body: 'A simple question makes the first hello feel easy. Keep it human and respectful.',
    tone: 'bg-primary/10 border-primary/20 text-primary-200',
  },
  {
    eyebrow: 'Your control',
    title: 'You can leave anytime.',
    body: 'Skip, report, or block if the conversation feels wrong. Your comfort comes first.',
    tone: 'bg-white/[0.06] border-white/10 text-white',
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
    const t = setInterval(() => setGuideIndex((i) => (i + 1) % GUIDES.length), 4800)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onMatched = (e) => {
      setPhase('found')
      celebrateMatch()
      const id = e.detail?.session_id
      if (id) setTimeout(() => navigate(`/chat/${id}`, { replace: true }), 1400)
    }
    window.addEventListener('vibe:matched', onMatched)
    return () => window.removeEventListener('vibe:matched', onMatched)
  }, [navigate, celebrateMatch])

  useEffect(() => {
    if (sessionId) {
      setPhase('found')
      celebrateMatch()
      setTimeout(() => navigate(`/chat/${sessionId}`, { replace: true }), 1400)
    }
  }, [sessionId, navigate, celebrateMatch])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-mesh relative overflow-hidden">
      <div className="orb w-[400px] h-[400px] bg-primary/20 top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse-slow" />
      <div className="orb w-[280px] h-[280px] bg-accent/15 bottom-1/4 right-1/4 animate-float" />

      {/* Central animation */}
      <div className="relative w-44 h-44 mb-4">
        <div className="absolute inset-0 rounded-full border border-primary/20 animate-pulse-ring" />
        <div className="absolute inset-0 rounded-full border border-primary/15 animate-pulse-ring" style={{ animationDelay: '0.7s' }} />
        <div className="absolute inset-2 rounded-full border border-accent/20 animate-pulse-ring" style={{ animationDelay: '1.2s' }} />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-400 shadow-glow animate-orbit" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-accent-400 shadow-glow-accent animate-orbit-reverse" style={{ animationDelay: '0.5s' }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-orbit" style={{ animationDuration: '10s', animationDelay: '1s' }} />
        </div>

        <div className={`absolute inset-8 rounded-full bg-primary flex items-center justify-center shadow-glow-lg transition-all duration-700 ${phase === 'found' ? 'scale-110' : ''}`}>
          {phase === 'found' ? (
            <svg className="w-10 h-10 text-white animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path className="text-[#151719]" d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
            </svg>
          )}
        </div>
      </div>

      <div className="text-center mt-8 min-h-[7rem]">
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight transition-all duration-500">
          {phase === 'found' ? (
            <span className="text-gradient">Match found!</span>
          ) : (
            'Finding someone...'
          )}
        </h2>

        {phase === 'searching' && (
          <>
            <p className="mt-2 text-sm tabular-nums text-text-secondary-dark font-medium tracking-wide">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </p>
            <div className="mt-6 w-full max-w-sm min-h-[156px]">
              <div key={guideIndex} className={`rounded-2xl border p-5 text-left shadow-soft animate-fade-in ${GUIDES[guideIndex].tone}`}>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70">{GUIDES[guideIndex].eyebrow}</span>
                  <span className="text-[10px] tabular-nums opacity-60">0{guideIndex + 1} / 0{GUIDES.length}</span>
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold">{GUIDES[guideIndex].title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed opacity-75">{GUIDES[guideIndex].body}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-center gap-1.5" aria-label="Guidance cards">
              {GUIDES.map((guide, index) => (
                <span key={guide.eyebrow} className={`h-1 rounded-full transition-all ${index === guideIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/20'}`} />
              ))}
            </div>
          </>
        )}

        {phase === 'found' && (
          <p className="mt-3 text-text-secondary-dark animate-fade-in">
            Connecting you now…
          </p>
        )}
      </div>

      {phase === 'searching' && (
        <button type="button" onClick={cancelMatching} className="btn-ghost mt-8 px-10">
          Cancel
        </button>
      )}
    </div>
  )
}
