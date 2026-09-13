// frontend/src/components/profile/SettingsScreen.jsx
// Purpose: Dark mode, blocked list, delete account, privacy
// Iteration: 6 (fixed: blocked users list + unblock)

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import api from '../../api/axios'
import Avatar from '../shared/Avatar'

export default function SettingsScreen() {
  const { deleteAccount } = useAuth()
  const navigate = useNavigate()
  const [dark, setDark] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [blocked, setBlocked] = useState([])

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
    api
      .get('/blocks')
      .then((r) => setBlocked(r.data || []))
      .catch(() => {})
  }, [])

  const unblock = async (id) => {
    try {
      await api.delete(`/blocks/${id}`)
      setBlocked((prev) => prev.filter((u) => u.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('vibe-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('vibe-theme', 'light')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
      navigate('/login', { replace: true })
    } catch (err) {
      console.error(err)
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-dvh px-4 pt-4 pb-8 safe-top max-w-md mx-auto">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="min-h-touch text-primary font-medium mb-4"
      >
        ← Back
      </button>
      <h1 className="text-xl font-bold mb-6">Settings</h1>

      <section className="space-y-3">
        <label className="flex items-center justify-between min-h-touch px-4 rounded-card bg-surface-light dark:bg-surface-dark border border-black/8 dark:border-white/8">
          <span className="font-medium">Dark mode</span>
          <button
            type="button"
            role="switch"
            aria-checked={dark}
            onClick={toggleDark}
            className={`w-12 h-7 rounded-full transition ${
              dark ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white shadow transform transition ${
                dark ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>

        <Link
          to="/privacy"
          className="flex items-center min-h-touch px-4 rounded-card bg-surface-light dark:bg-surface-dark border border-black/8 dark:border-white/8 font-medium"
        >
          Privacy policy
        </Link>

        {blocked.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold mb-2 px-1">Blocked users</p>
            <ul className="space-y-2">
              {blocked.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3 px-4 py-2 rounded-card bg-surface-light dark:bg-surface-dark border border-black/8 dark:border-white/8"
                >
                  <Avatar name={u.display_name} url={u.avatar_url} size={36} />
                  <span className="flex-1 truncate text-sm font-medium">
                    {u.display_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => unblock(u.id)}
                    className="text-sm text-primary font-medium min-h-touch"
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark px-1 pt-2">
          App version 0.1.0
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-danger mb-2">Danger zone</h2>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full min-h-touch rounded-card border border-danger text-danger font-medium"
          >
            Delete account
          </button>
        ) : (
          <div className="p-4 rounded-card border border-danger/40 bg-danger/5 space-y-3">
            <p className="text-sm">
              This permanently deletes your profile, messages, and friends. This
              cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 min-h-touch rounded-control border border-black/10 dark:border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 min-h-touch rounded-control bg-danger text-white font-semibold disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Confirm delete'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
