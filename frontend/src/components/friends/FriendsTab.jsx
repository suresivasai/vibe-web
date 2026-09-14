// frontend/src/components/friends/FriendsTab.jsx
// Clean friends list + pending requests. Production polish.

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
  const [accepting, setAccepting] = useState(null)

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
    setAccepting(friendId)
    try {
      await acceptFriend(friendId)
      const request = pending.find((friend) => friend.id === friendId)
      window.dispatchEvent(
        new CustomEvent('vibe:friend_accepted', {
          detail: { friend: { display_name: request?.other_user?.display_name || 'Your friend' } },
        })
      )
      await refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setAccepting(null)
    }
  }

  return (
    <div className="flex h-full flex-col px-5 pt-6 safe-top animate-fade-up">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Friends</h1>

      <div className="relative mt-4">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="search"
          placeholder="Search friends…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-clean !pl-10"
        />
      </div>

      {pending.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Requests · {pending.length}
          </p>
          {pending.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3"
            >
              <Avatar name={f.other_user?.display_name} url={f.other_user?.avatar_url} size={42} />
              <span className="flex-1 truncate font-medium text-white">
                {f.other_user?.display_name || 'Someone'}
              </span>
              <button
                type="button"
                onClick={() => handleAccept(f.id)}
                disabled={accepting === f.id}
                className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-[#151719] transition active:scale-[0.97] disabled:opacity-60"
              >
                {accepting === f.id ? '…' : 'Accept'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl">
              👋
            </div>
            <p className="font-medium text-white">No friends yet</p>
            <p className="mt-1.5 max-w-[240px] text-sm text-zinc-500">
              Match with strangers and send friend requests when the vibe is right.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {filtered.map((f) => (
              <li key={f.id}>
                <Link
                  to={`/friends/${f.id}`}
                  className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-white/[0.04] active:scale-[0.99]"
                >
                  <Avatar name={f.other_user?.display_name} url={f.other_user?.avatar_url} size={46} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">
                      {f.other_user?.display_name || 'Friend'}
                    </p>
                    <p className="text-xs text-zinc-500">Friends</p>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
