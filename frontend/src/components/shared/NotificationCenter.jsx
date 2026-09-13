import { useEffect, useState } from 'react'
import Toast from './Toast'

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    const add = (event) => {
      const data = event.detail || {}
      const isAccepted = event.type === 'vibe:friend_accepted'
      const message = isAccepted
        ? `${data.friend?.display_name || 'A friend'} accepted your request.`
        : `${data.from?.display_name || 'Someone'} sent you a friend request.`
      const id = `${event.type}-${Date.now()}`
      setNotifications((current) => [...current, { id, message, type: 'success' }].slice(-3))
    }
    window.addEventListener('vibe:friend_request', add)
    window.addEventListener('vibe:friend_accepted', add)
    return () => {
      window.removeEventListener('vibe:friend_request', add)
      window.removeEventListener('vibe:friend_accepted', add)
    }
  }, [])

  return (
    <div className="fixed inset-x-0 top-0 z-[90] pointer-events-none flex flex-col items-center gap-2 p-4 safe-top">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto w-full max-w-sm">
          <Toast
            message={notification.message}
            type={notification.type}
            duration={5000}
            onClose={() => setNotifications((current) => current.filter((item) => item.id !== notification.id))}
          />
        </div>
      ))}
    </div>
  )
}
