import { Link, useLocation } from 'react-router-dom'
import Logo from '../shared/Logo'

const CONTENT = {
  '/privacy': {
    eyebrow: 'Trust & safety',
    title: 'Privacy is part of the product.',
    intro: 'Vibe is designed to help you meet people without turning your life into a data profile.',
    sections: [
      ['What we collect', 'We store the account details needed to authenticate you, your display profile, match sessions, messages, reports, and blocks. We do not collect precise location data.'],
      ['How conversations work', 'Stranger chat messages are automatically cleaned up after a session ends according to the product retention policy. Friend messages remain until you remove them or delete your account.'],
      ['Your choices', 'You can end a chat, skip, report, block, change your display name, or request account deletion from Settings.'],
      ['Safety', 'Moderation signals and reports are used to protect the community. Never share passwords, financial information, or private details with someone you just met.'],
    ],
  },
  '/terms': {
    eyebrow: 'Community agreement',
    title: 'Make the room better.',
    intro: 'Vibe is for adults who want respectful, voluntary conversations with people they have not met before.',
    sections: [
      ['Be 18 or older', 'You must be 18 or older to use Vibe. Do not misrepresent your age or attempt to contact minors.'],
      ['Stay respectful', 'Harassment, threats, sexual exploitation, hate, spam, and attempts to obtain sensitive information are not welcome.'],
      ['Use your control', 'You can leave a conversation at any time. Use report and block tools when someone crosses a line.'],
      ['Service changes', 'Vibe may improve, pause, or change features as the service evolves. We will keep safety and user control at the center of those changes.'],
    ],
  },
  '/about': {
    eyebrow: 'About Vibe',
    title: 'A smaller internet for bigger conversations.',
    intro: 'Vibe is an independent social product built around one simple idea: the best connection does not need an audience.',
    sections: [
      ['Why we built it', 'Endless feeds optimize for attention. Vibe is built for presence: one match, one conversation, and a clear way out when it is not right.'],
      ['What we value', 'Curiosity over performance, consent over pressure, and useful safety tools over vague promises.'],
      ['What is next', 'Text chat is the foundation. Voice, video, friends, and moderation features grow from the same principle: keep people in control.'],
    ],
  },
}

export default function LegalPage() {
  const { pathname } = useLocation()
  const page = CONTENT[pathname] || CONTENT['/about']

  return (
    <div className="min-h-dvh bg-mesh px-5 py-6 sm:px-8 lg:px-10 safe-top">
      <header className="mx-auto flex max-w-5xl items-center justify-between"><Link to="/"><Logo size={40} /></Link><Link to="/" className="text-sm text-text-muted-dark hover:text-white">Back to Vibe</Link></header>
      <main className="mx-auto max-w-5xl py-16 sm:py-24"><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-400">{page.eyebrow}</p><h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold leading-[0.96] tracking-[-0.05em] text-white sm:text-7xl">{page.title}</h1><p className="mt-7 max-w-2xl text-lg leading-relaxed text-text-secondary-dark">{page.intro}</p><div className="mt-16 grid max-w-4xl gap-0 border-t border-white/10">{page.sections.map(([title, body]) => <section key={title} className="grid gap-4 border-b border-white/10 py-8 sm:grid-cols-[0.35fr_0.65fr]"><h2 className="font-display text-xl font-semibold text-white">{title}</h2><p className="text-sm leading-relaxed text-text-secondary-dark">{body}</p></section>)}</div></main>
      <footer className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-3 border-t border-white/10 py-8 text-xs text-text-muted-dark"><Link to="/about" className="hover:text-white">About</Link><Link to="/privacy" className="hover:text-white">Privacy</Link><Link to="/terms" className="hover:text-white">Terms</Link><a href="mailto:support@vibe.app" className="hover:text-white">Support</a></footer>
    </div>
  )
}
