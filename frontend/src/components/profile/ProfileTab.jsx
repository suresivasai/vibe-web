// frontend/src/components/profile/ProfileTab.jsx
// Clean profile + edit name + settings/logout. Production polish.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../shared/Avatar'
import { updateMe } from '../../api/auth'

export default function ProfileTab() {
  const { user, signOut, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Name needs at least 2 characters')
      return
    }
    setSaving(true)
    setError('')
    try {
      const updated = await updateMe({ display_name: trimmed })
      updateUser(updated)
      setEditing(false)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-8 pb-10 safe-top animate-fade-up">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
          <div className="relative overflow-hidden rounded-full ring-2 ring-white/10">
            <Avatar name={user?.display_name} url={user?.avatar_url} size={88} />
          </div>
        </div>

        {!editing ? (
          <>
            <h1 className="mt-4 font-display text-xl font-semibold text-white">
              {user?.display_name}
            </h1>
            <span className="mt-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium capitalize text-primary-300">
              {user?.gender || '—'}
            </span>
          </>
        ) : (
          <div className="mt-4 w-full">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              maxLength={24}
              className="input-clean text-center text-lg font-semibold"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-center text-sm text-danger" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Profile
          </h2>
          <button
            type="button"
            onClick={() => {
              if (editing) save()
              else {
                setName(user?.display_name || '')
                setError('')
                setEditing(true)
              }
            }}
            className="text-sm font-medium text-primary-300 transition hover:text-primary-200"
          >
            {editing ? (saving ? 'Saving…' : 'Save') : 'Edit name'}
          </button>
        </div>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(false)
              setError('')
            }}
            className="mb-4 text-sm text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="mt-2 space-y-2">
        <Link
          to="/settings"
          className="flex min-h-[48px] items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 font-medium text-white transition hover:bg-white/[0.05]"
        >
          <span>Settings</span>
          <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-danger/25 bg-danger/5 px-4 font-medium text-danger transition hover:bg-danger/10 active:scale-[0.99]"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
