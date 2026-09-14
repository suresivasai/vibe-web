// frontend/src/components/landing/LandingPage.jsx
// Simple, focused landing — production polish + light motion.

import { Link } from 'react-router-dom'
import Logo from '../shared/Logo'

const STEPS = [
  {
    n: '01',
    title: 'Arrive as you are',
    body: 'Pick a name, set boundaries, and show up. No profile theater.',
  },
  {
    n: '02',
    title: 'Meet the next person',
    body: 'One tap puts you in queue. Real conversation, no endless swiping.',
  },
  {
    n: '03',
    title: 'Stay in control',
    body: 'Skip, report, block, or add a friend. Your comfort comes first.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#0c0e10] overflow-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-80 w-80 rounded-full bg-primary/20 blur-[120px] animate-float-slow" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/10 blur-[100px] animate-float" />
      </div>

      <header className="relative z-20 mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8 safe-top">
        <Logo size={36} />
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            Log in
          </Link>
          <Link to="/login?mode=signup" className="btn-primary !px-5 !py-2.5 !text-sm">
            Join
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-5 pb-16 pt-12 text-center sm:px-8 sm:pt-20 animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-400">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            18+ · Respectful chat
          </p>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Meet someone new.{' '}
            <span className="text-gradient">One hello at a time.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-zinc-400 sm:text-lg">
            Vibe pairs you with the next person ready for a real conversation — no feeds, no location tracking.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/login?mode=signup" className="btn-primary !px-8 !py-3.5 w-full sm:w-auto">
              Get started
            </Link>
            <Link
              to="/login"
              className="w-full rounded-xl border border-white/10 px-8 py-3.5 text-center text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white sm:w-auto"
            >
              I already have an account
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-600">
            <span>No location tracking</span>
            <span>·</span>
            <span>Live moderated</span>
            <span>·</span>
            <span>Leave anytime</span>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            How it works
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 transition hover:border-white/15"
              >
                <p className="font-display text-2xl text-primary-300">{s.n}</p>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="mx-5 mb-16 overflow-hidden rounded-3xl border border-primary/20 bg-primary/10 px-6 py-12 text-center sm:mx-auto sm:max-w-3xl sm:px-10">
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
            Your next conversation is waiting.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-zinc-400">
            Join the queue when you’re ready. Be kind, be present.
          </p>
          <Link to="/login?mode=signup" className="btn-primary mt-6 inline-flex !px-8 !py-3.5">
            Join Vibe
          </Link>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Logo size={28} />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-zinc-600">
              A more human way to meet someone new.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-600">
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-5xl text-[11px] text-zinc-700">
          © 2026 Vibe. 18+ only. Be kind.
        </p>
      </footer>
    </div>
  )
}
