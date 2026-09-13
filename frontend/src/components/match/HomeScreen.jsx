// frontend/src/components/match/HomeScreen.jsx
// Clean start-matching screen — pure FIFO

import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useMatch } from '../../hooks/useMatch'
import { useSocket } from '../../hooks/useSocket'

export default function HomeScreen() {
  const { user } = useAuth()
  const { startMatching } = useMatch()
  useSocket()
  const [showPledge, setShowPledge] = useState(false)

  const firstName = user?.display_name?.split(' ')[0] || user?.display_name || ''

  const handleStart = () => {
    setShowPledge(true)
  }

  const confirmAndMatch = () => {
    setShowPledge(false)
    startMatching()
  }

  return (
    <div className="min-h-full flex flex-col bg-mesh relative overflow-hidden">
      <div className="orb w-[360px] h-[360px] bg-primary/20 -top-24 right-[-7rem] animate-float-slow" />
      <div className="orb w-[240px] h-[240px] bg-accent/15 bottom-10 left-[-5rem] animate-float" />

      <div className="relative z-10 flex-1 flex flex-col justify-center px-5 py-12 sm:px-8 safe-top">
        <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-20 items-center">
          <div className="max-w-2xl text-center lg:text-left">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-accent-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              The open conversation
            </p>
            <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-[-0.04em] leading-[0.98]">
              A little more human, <span className="text-gradient">one hello at a time.</span>
            </h1>
            <p className="mt-7 text-base sm:text-lg text-text-secondary-dark leading-relaxed max-w-lg mx-auto lg:mx-0">
              Meet someone new without the noise. Vibe pairs you with the next person ready for a real, respectful conversation.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs text-text-muted-dark">
              <span className="chip">18+ community</span>
              <span className="chip">No location tracking</span>
              <span className="chip">Moderated in real time</span>
            </div>
          </div>

          <div className="card-surface p-6 sm:p-8 lg:p-9">
          {/* Avatar ring */}
          <div className="relative mx-auto w-28 h-28 mb-8">
            <div className="absolute inset-0 rounded-full bg-primary/25 animate-pulse-ring" />
            <div className="absolute inset-1 rounded-full bg-accent/15 animate-pulse-ring" style={{ animationDelay: '0.8s' }} />
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-fuchsia-500 via-purple-500 to-cyan-400 flex items-center justify-center shadow-glow-lg">
              <span className="text-4xl text-white font-display font-bold">
                {(user?.display_name || 'S')[0].toUpperCase()}
              </span>
            </div>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-left">
            {firstName ? `Hey, ${firstName}` : 'Ready when you are'}
          </h1>
          <p className="mt-3 text-sm text-text-secondary-dark leading-relaxed text-left">
            Jump into a chat with the next person waiting. No filters, no performance, just a clean start.
          </p>

          <button
            type="button"
            onClick={handleStart}
            className="btn-primary w-full mt-8 text-base py-4 rounded-control shadow-glow hover:shadow-glow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
            </svg>
            Start a conversation
          </button>

          <p className="mt-4 text-xs text-text-muted-dark leading-relaxed text-left">
            Text chat is live. Voice and video can come later.
          </p>
        </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="relative z-10 px-5 pb-8 safe-bottom">
        <div className="max-w-5xl mx-auto flex items-center justify-center lg:justify-start gap-6 sm:gap-8 text-[11px] text-text-muted-dark">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" /> Moderated
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> 18+ only
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" /> No location
          </span>
        </div>
      </div>

      {/* Good behavior pledge modal */}
      {showPledge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm glass-strong rounded-2xl p-6 sm:p-7 shadow-glow-lg animate-scale-in">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold text-center mb-2">
              Be good. Do good.
            </h3>
            <p className="text-sm text-text-secondary-dark text-center leading-relaxed mb-6">
              Treat the other person with respect. No harassment, no creepy stuff, no spam.
              We’re all here for real conversations.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={confirmAndMatch}
                className="btn-primary w-full py-3.5 rounded-xl"
              >
                I got it — let’s match
              </button>
              <button
                type="button"
                onClick={() => setShowPledge(false)}
                className="btn-ghost w-full py-3"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
