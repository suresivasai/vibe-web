// frontend/src/components/friends/FriendsTab.jsx
// Purpose: Friend list with search, pending from API, empty state
// Iteration: 5 (fixed: accept uses friend row id from API)

import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { listFriends, acceptFriend } from '../../api/friends'
import { useFriendStore } from '../../store/friendStore'
import { useAuthStore } from '../../store/authStore'
import Avatar from '../shared/Avatar'

export default function FriendsTab() {
  const { friends, setFriends } = useFriendStore()
  const myId = useAuthStore((s) => s.user?.id)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await listFriends()
      setFriends(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [setFriends])

  useEffect(() => {
    refresh()
    const onReq = () => refresh()
    const onAccepted = () => refresh()
    window.addEventListener('vibe:friend_request', onReq)
    window.addEventListener('vibe:friend_accepted', onAccepted)
    return () => {
      window.removeEventListener('vibe:friend_request', onReq)
      window.removeEventListener('vibe:friend_accepted', onAccepted)
    }
  }, [refresh])

  const pending = friends.filter(
    (f) => f.status === 'pending' && String(f.receiver_id) === String(myId)
  )
  const accepted = friends.filter((f) => f.status === 'accepted')

  const filtered = accepted.filter((f) => {
    const name = f.other_user?.display_name || ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  const handleAccept = async (friendId) => {
    try {
      await acceptFriend(friendId)
      const request = pending.find((friend) => friend.id === friendId)
      window.dispatchEvent(new CustomEvent('vibe:friend_accepted', { detail: { friend: { display_name: request?.other_user?.display_name || 'Your friend' } } }))
      await refresh()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex flex-col h-full px-4 pt-4 safe-top">
      <h1 className="text-xl font-bold mb-3">Friends</h1>

      <input
        type="search"
        placeholder="Search friends…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full min-h-touch px-3 rounded-control border border-black/10 dark:border-white/10 bg-surface-light dark:bg-surface-dark text-sm mb-4"
      />

      {pending.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-text-secondary-light dark:text-text-secondary-dark">
            Requests
          </p>
          {pending.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 p-3 rounded-card bg-primary/5 border border-primary/20"
            >
              <Avatar
                name={f.other_user?.display_name}
                url={f.other_user?.avatar_url}
                size={40}
              />
              <span className="flex-1 font-medium truncate">
                {f.other_user?.display_name || 'Someone'}
              </span>
              <button
                type="button"
                onClick={() => handleAccept(f.id)}
                className="min-h-touch px-3 rounded-control bg-primary text-white text-sm font-medium"
              >
                Accept
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 rounded-card bg-gray-200 dark:bg-gray-700 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <p className="text-4xl mb-3">👋</p>
          <p className="font-medium">No friends yet</p>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
            Match with strangers and send friend requests.
          </p>
        </div>
      ) : (
        <ul className="space-y-1">
          {filtered.map((f) => (
            <li key={f.id}>
              <Link
                to={`/friends/${f.id}`}
                className="flex items-center gap-3 p-3 rounded-card hover:bg-black/5 dark:hover:bg-white/5 min-h-touch"
              >
                <Avatar
                  name={f.other_user?.display_name}
                  url={f.other_user?.avatar_url}
                  size={44}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {f.other_user?.display_name || 'Friend'}
                  </p>
                  <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate">
                    Friends
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
