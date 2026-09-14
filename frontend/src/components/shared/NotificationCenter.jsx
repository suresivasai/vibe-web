// frontend/src/components/shared/NotificationCenter.jsx
// In-app toasts for friend, match, and system events. Production level.

import { useEffect, useState, useCallback } from 'react'

const EVENT_MAP = {
  'vibe:friend_request': (d) => ({
    message: `${d?.from?.display_name || 'Someone'} sent you a friend request`,
    type: 'info',
  }),
  'vibe:friend_accepted': (d) => ({
    message: `${d?.friend?.display_name || 'A friend'} accepted your request`,
    type: 'success',
  }),
  'vibe:matched': (d) => ({
    message: `Matched with ${d?.stranger?.display_name || 'someone'}!`,
    type: 'success',
  }),
  'vibe:stranger_left': () => ({
    message: 'They left. Finding someone new…',
    type: 'info',
  }),
  'vibe:banned': (d) => ({
    message: d?.reason || 'Your account has been restricted',
    type: 'error',
  }),
}

export default function NotificationCenter() {
  const [items, setItems] = useState([])

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((n) => n.id !== id))
  }, [])

  useEffect(() => {
    const handlers = {}

    Object.keys(EVENT_MAP).forEach((eventName) => {
      const handler = (event) => {
        const payload = EVENT_MAP[eventName](event.detail)
        if (!payload?.message) return
        const id = `${eventName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        setItems((prev) => [...prev, { id, ...payload }].slice(-4))
      }
      handlers[eventName] = handler
      window.addEventListener(eventName, handler)
    })

    return () => {
      Object.entries(handlers).forEach(([name, fn]) => {
        window.removeEventListener(name, fn)
      })
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex flex-col items-center gap-2 p-4 safe-top">
      {items.map((n) => (
        <ToastItem key={n.id} notification={n} onClose={() => dismiss(n.id)} />
      ))}
    </div>
  )
}

function ToastItem({ notification, onClose }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setLeaving(true)
      setTimeout(onClose, 220)
    }, 4500)
    return () => clearTimeout(t)
  }, [onClose])

  const styles = {
    success: 'border-success/30 bg-success/15 text-emerald-100',
    error: 'border-danger/30 bg-danger/15 text-rose-100',
    info: 'border-primary/30 bg-primary/15 text-orange-100',
  }

  return (
    <div
      className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md transition-all duration-200 ${
        styles[notification.type] || styles.info
      } ${leaving ? 'translate-y-[-8px] opacity-0' : 'animate-fade-up'}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 text-sm font-medium leading-snug">{notification.message}</p>
        <button
          type="button"
          onClick={() => {
            setLeaving(true)
            setTimeout(onClose, 180)
          }}
          className="shrink-0 rounded-md p-0.5 opacity-60 transition hover:opacity-100"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
