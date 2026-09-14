// frontend/src/components/profile/SettingsScreen.jsx
// Clean settings — blocked list, privacy links, delete account. Production polish.

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import api from '../../api/axios'
import Avatar from '../shared/Avatar'

export default function SettingsScreen() {
  const { deleteAccount } = useAuth()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [blocked, setBlocked] = useState([])

  useEffect(() => {
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
    <div className="min-h-dvh bg-[#0c0e10] px-5 pt-6 pb-10 safe-top max-w-md mx-auto animate-fade-up">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 flex items-center gap-1.5 text-sm font-medium text-primary-300 transition hover:text-primary-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Settings</h1>

      <section className="mt-8 space-y-2">
        <Link
          to="/privacy"
          className="flex min-h-[48px] items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 text-sm font-medium text-white transition hover:bg-white/[0.05]"
        >
          Privacy policy
          <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
        <Link
          to="/terms"
          className="flex min-h-[48px] items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 text-sm font-medium text-white transition hover:bg-white/[0.05]"
        >
          Terms of use
          <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </section>

      {blocked.length > 0 && (
        <section className="mt-8">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Blocked users
          </p>
          <ul className="space-y-2">
            {blocked.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5"
              >
                <Avatar name={u.display_name} url={u.avatar_url} size={36} />
                <span className="flex-1 truncate text-sm font-medium text-white">
                  {u.display_name}
                </span>
                <button
                  type="button"
                  onClick={() => unblock(u.id)}
                  className="text-sm font-medium text-primary-300 hover:text-primary-200"
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-xs text-zinc-600">App version 0.1.1</p>

      <section className="mt-10">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-danger">
          Danger zone
        </h2>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full min-h-[48px] rounded-xl border border-danger/30 text-sm font-medium text-danger transition hover:bg-danger/10"
          >
            Delete account
          </button>
        ) : (
          <div className="space-y-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
            <p className="text-sm leading-relaxed text-zinc-300">
              This permanently deletes your profile, messages, and friends. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 min-h-[44px] rounded-xl border border-white/10 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 min-h-[44px] rounded-xl bg-danger text-sm font-semibold text-white transition disabled:opacity-50"
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
