import { useEffect, useRef } from 'react'

const SCRIPT_ID = 'cf-turnstile-script'
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

export default function TurnstileWidget({ onToken, onError }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)

  useEffect(() => {
    if (!SITE_KEY) return undefined

    let cancelled = false

    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      if (widgetIdRef.current !== null) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: 'dark',
        size: 'flexible',
        appearance: 'always',
        execution: 'render',
        action: 'login',
        callback: (token) => onToken?.(token),
        'expired-callback': () => onToken?.(''),
        'timeout-callback': () => onToken?.(''),
        'error-callback': () => {
          onToken?.('')
          onError?.('Verification failed. Please try again.')
        },
      })
    }

    if (window.turnstile) {
      render()
    } else {
      let script = document.getElementById(SCRIPT_ID)
      if (!script) {
        script = document.createElement('script')
        script.id = SCRIPT_ID
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.defer = true
        script.onload = render
        script.onerror = () => onError?.('Could not load verification. Please refresh and try again.')
        document.head.appendChild(script)
      } else {
        script.addEventListener('load', render, { once: true })
      }
    }

    return () => {
      cancelled = true
      if (widgetIdRef.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch {}
      }
      widgetIdRef.current = null
    }
  }, [onToken, onError])

  if (!SITE_KEY) return null

  return <div ref={containerRef} className="min-h-[65px] overflow-hidden rounded-lg" aria-label="Security verification" />
}
