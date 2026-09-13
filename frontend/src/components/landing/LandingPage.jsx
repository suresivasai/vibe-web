import { lazy, Suspense, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Logo from '../shared/Logo'
const SignalScene = lazy(() => import('./SignalScene'))
gsap.registerPlugin(ScrollTrigger)

const values = [
  ['01', 'Arrive as you are', 'No profile performance. Choose a name, set your boundaries, and show up.'],
  ['02', 'Find the next hello', 'A simple FIFO match gets you into a real conversation without endless swiping.'],
  ['03', 'Leave with control', 'Skip, report, block, or keep the connection. Your comfort stays in your hands.'],
]

function Check({ children }) {
  return <span className="flex items-center gap-2 text-sm text-text-secondary-dark"><span className="grid h-5 w-5 place-items-center rounded-full bg-accent/15 text-accent-400">✓</span>{children}</span>
}

export default function LandingPage() {
  const pageRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const context = gsap.context(() => {
      gsap.from('.landing-reveal', { y: 28, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' })
      gsap.from('.landing-card', { y: 40, opacity: 0, duration: 1, delay: 0.25, stagger: 0.12, ease: 'power3.out' })
      gsap.utils.toArray('.scroll-reveal').forEach((element) => {
        gsap.fromTo(element, { y: 28, opacity: 0 }, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 84%',
            once: true,
          },
        })
      })
    }, pageRef)
    return () => context.revert()
  }, [])

  return (
    <div ref={pageRef} className="min-h-dvh overflow-hidden bg-mesh">
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10 safe-top">
        <Logo size={42} />
        <nav className="hidden items-center gap-7 text-sm text-text-secondary-dark md:flex">
          <a href="#why" className="transition-colors hover:text-white">Why Vibe</a>
          <a href="#how" className="transition-colors hover:text-white">How it works</a>
          <Link to="/about" className="transition-colors hover:text-white">About</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="rounded-control px-3 py-2 text-sm font-semibold text-text-secondary-dark transition hover:text-white sm:px-4">Log in</Link>
          <Link to="/login?mode=signup" className="btn-primary px-4 py-2.5 text-sm sm:px-5">Join Vibe <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid min-h-[calc(100dvh-88px)] w-full max-w-7xl items-center gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:pb-24 lg:pt-4">
          <div className="landing-reveal relative z-10 max-w-2xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-pill border border-accent/20 bg-accent/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-accent-300"><span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />Real conversations, by design</p>
            <h1 className="font-display text-5xl font-semibold leading-[0.94] tracking-[-0.06em] text-white sm:text-7xl lg:text-[6.6rem]">The internet is better when it feels <span className="text-gradient">human.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-text-secondary-dark sm:text-lg">Vibe is a calmer way to meet someone new. One intentional match, one open conversation, no endless feed.</p>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3"><Check>18+ community</Check><Check>No location tracking</Check><Check>Moderation tools</Check></div>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row"><Link to="/login?mode=signup" className="btn-primary px-6">Start a conversation <span aria-hidden="true">→</span></Link><a href="#how" className="btn-secondary px-6">See how it works</a></div>
          </div>
          <div className="landing-card relative min-h-[420px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#171a1c]/65 shadow-card sm:min-h-[560px]">
            <Suspense fallback={<div className="absolute inset-0 animate-pulse bg-primary/5" />}><SignalScene /></Suspense>
            <div className="absolute left-5 top-5 rounded-xl border border-white/10 bg-[#101214]/70 px-3 py-2 text-xs text-text-secondary-dark backdrop-blur-md"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-accent" />live connection field</div>
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 rounded-2xl border border-white/10 bg-[#101214]/75 p-4 backdrop-blur-md"><div><p className="text-[10px] uppercase tracking-[0.18em] text-text-muted-dark">Your next conversation</p><p className="mt-1 font-display text-xl font-semibold text-white">Starts with hello.</p></div><span className="rounded-full bg-primary/15 px-3 py-1.5 text-xs text-primary-200">open now</span></div>
          </div>
        </section>

        <section id="why" className="border-y border-white/[0.07] bg-[#151819]/75 px-5 py-20 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><div className="scroll-reveal max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-300">A different kind of social</p><h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">Less noise. More presence.</h2></div><div className="mt-12 grid gap-4 md:grid-cols-3">{values.map(([number, title, body]) => <article key={number} className="scroll-reveal border-t border-white/10 pt-5"><span className="font-display text-sm text-primary-300">{number}</span><h3 className="mt-10 font-display text-2xl font-semibold text-white">{title}</h3><p className="mt-3 max-w-sm text-sm leading-relaxed text-text-secondary-dark">{body}</p></article>)}</div></div></section>

        <section id="how" className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-28"><div className="scroll-reveal"><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-400">The simple version</p><h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">Good conversations do not need a complicated interface.</h2></div><div className="grid gap-4 sm:grid-cols-2"><div className="scroll-reveal rounded-2xl border border-white/10 bg-white/[0.04] p-6"><p className="text-4xl font-display text-primary-300">01</p><h3 className="mt-10 font-display text-xl font-semibold">Make your entrance</h3><p className="mt-2 text-sm leading-relaxed text-text-secondary-dark">Sign in, choose a display name, and decide how you want to show up.</p></div><div className="scroll-reveal rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:translate-y-10"><p className="text-4xl font-display text-accent-300">02</p><h3 className="mt-10 font-display text-xl font-semibold">Meet one person</h3><p className="mt-2 text-sm leading-relaxed text-text-secondary-dark">Join the queue and talk privately with the next available person.</p></div><div className="scroll-reveal rounded-2xl border border-white/10 bg-white/[0.04] p-6"><p className="text-4xl font-display text-primary-300">03</p><h3 className="mt-10 font-display text-xl font-semibold">Keep your agency</h3><p className="mt-2 text-sm leading-relaxed text-text-secondary-dark">End, skip, report, block, or add a friend without losing control.</p></div><div className="scroll-reveal rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:translate-y-10"><p className="text-4xl font-display text-accent-300">04</p><h3 className="mt-10 font-display text-xl font-semibold">Come back anytime</h3><p className="mt-2 text-sm leading-relaxed text-text-secondary-dark">Vibe is a place to visit, not a feed that asks for all your attention.</p></div></div></section>

        <section className="mx-5 mb-20 overflow-hidden rounded-[2rem] border border-primary/20 bg-primary/10 px-6 py-12 sm:mx-8 sm:px-12 lg:mx-auto lg:max-w-7xl lg:py-16"><div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-200">Your next hello is out there</p><h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">Come find a conversation worth remembering.</h2></div><Link to="/login?mode=signup" className="btn-primary shrink-0">Join Vibe <span aria-hidden="true">→</span></Link></div></section>
      </main>

      <footer className="border-t border-white/[0.07] px-5 py-10 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"><div><Logo size={34} /><p className="mt-4 max-w-xs text-xs leading-relaxed text-text-muted-dark">A more human way to meet someone new. Built for respectful conversations.</p></div><div className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-text-muted-dark"><Link to="/about" className="hover:text-white">About us</Link><Link to="/privacy" className="hover:text-white">Privacy</Link><Link to="/terms" className="hover:text-white">Terms</Link><a href="mailto:support@vibe.app" className="hover:text-white">Support</a></div></div><p className="mx-auto mt-10 max-w-7xl text-[11px] text-text-muted-dark">© 2026 Vibe. 18+ only. Be kind.</p></footer>
    </div>
  )
}