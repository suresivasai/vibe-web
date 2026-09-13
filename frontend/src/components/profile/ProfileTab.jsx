// frontend/src/components/profile/ProfileTab.jsx
// Purpose: Avatar, name, gender, profile editing, settings, logout
// Iteration: 6

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

  const save = async () => {
    setSaving(true)
    try {
      const updated = await updateMe({
        display_name: name,
      })
      updateUser(updated)
      setEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-8 safe-top max-w-md mx-auto">
      <div className="flex flex-col items-center">
        <Avatar name={user?.display_name} url={user?.avatar_url} size={88} />
        {!editing ? (
          <>
            <h1 className="mt-3 text-xl font-bold">{user?.display_name}</h1>
            <span className="mt-1 px-3 py-0.5 rounded-pill bg-primary/10 text-primary text-xs font-medium capitalize">
              {user?.gender}
            </span>
          </>
        ) : (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="mt-3 w-full text-center text-xl font-bold bg-transparent border-b border-primary focus:outline-none"
          />
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold uppercase text-text-secondary-light dark:text-text-secondary-dark">
            Profile Details
          </h2>
          <button
            type="button"
            onClick={() => (editing ? save() : setEditing(true))}
            className="text-sm text-primary font-medium min-h-touch"
          >
            {editing ? (saving ? 'Saving…' : 'Save') : 'Edit Name'}
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-2">
        <Link
          to="/settings"
          className="flex items-center min-h-touch px-4 rounded-card bg-surface-light dark:bg-surface-dark border border-black/8 dark:border-white/8 font-medium"
        >
          Settings
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="w-full min-h-touch px-4 rounded-card text-danger font-medium border border-danger/30"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
