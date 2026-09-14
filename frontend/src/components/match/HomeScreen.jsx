// frontend/src/components/match/HomeScreen.jsx
// Simple, focused start-matching screen. Production polish + animations.

import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useMatch } from '../../hooks/useMatch'
import { useSocket } from '../../hooks/useSocket'
import Avatar from '../shared/Avatar'

export default function HomeScreen() {
  const { user } = useAuth()
  const { startMatching } = useMatch()
  useSocket()
  const [showPledge, setShowPledge] = useState(false)
  const [starting, setStarting] = useState(false)

  const firstName = user?.display_name?.split(' ')[0] || user?.display_name || 'there'

  const handleStart = () => setShowPledge(true)

  const confirmAndMatch = () => {
    setShowPledge(false)
    setStarting(true)
    startMatching()
  }

  return (
    <div className="min-h-full flex flex-col relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 right-[-6rem] h-72 w-72 rounded-full bg-primary/15 blur-[100px] animate-float-slow" />
        <div className="absolute bottom-16 left-[-4rem] h-56 w-56 rounded-full bg-accent/10 blur-[80px] animate-float" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-5 py-10 sm:px-8 safe-top">
        <div className="mx-auto w-full max-w-lg animate-fade-up">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/25 blur-xl animate-pulse-slow" />
                <div className="relative ring-2 ring-white/10 rounded-full overflow-hidden">
                  <Avatar url={user?.avatar_url} name={user?.display_name} size={72} />
                </div>
              </div>
            </div>
            <p className="text-sm text-zinc-400">Hey {firstName}</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Ready to meet someone new?
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
              One tap pairs you with the next person who is free for a real conversation.
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm sm:p-7">
            <div className="flex flex-wrap justify-center gap-2 text-[11px] text-zinc-500">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">18+ only</span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">No location</span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">Live moderated</span>
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={starting}
              className="btn-primary mt-6 w-full !py-4 !rounded-2xl text-base"
            >
              {starting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                  Starting…
                </span>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
                  </svg>
                  Start a conversation
                </>
              )}
            </button>

            <p className="mt-4 text-center text-xs text-zinc-600">
              Text chat is live. Voice & video can come later.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-[11px] text-zinc-600">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Moderated
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> 18+
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Private
            </span>
          </div>
        </div>
      </div>

      {showPledge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141618] p-6 shadow-2xl animate-fade-up sm:p-7">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
              <svg className="h-6 w-6 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="text-center font-display text-xl font-semibold text-white">
              Be good. Do good.
            </h3>
            <p className="mt-2 text-center text-sm leading-relaxed text-zinc-400">
              Treat the other person with respect. No harassment, no spam, no creepy stuff.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={confirmAndMatch}
                className="btn-primary w-full !py-3.5"
              >
                I agree — find someone
              </button>
              <button
                type="button"
                onClick={() => setShowPledge(false)}
                className="rounded-xl py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
