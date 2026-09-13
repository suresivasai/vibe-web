// frontend/src/components/shared/Toast.jsx
// Purpose: Top-of-screen toast for match, friend request, errors
// Iteration: 6

import { useEffect, useState } from 'react'

export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      onClose?.()
    }, duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  if (!visible || !message) return null

  const colors = {
    info: 'bg-primary text-white',
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
  }

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-50 mx-auto max-w-sm px-4 py-3 rounded-card shadow-lg text-sm font-medium text-center safe-top ${
        colors[type] || colors.info
      }`}
      role="status"
    >
      {message}
    </div>
  )
}
