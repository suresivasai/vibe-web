// frontend/src/components/friends/FriendChat.jsx
// Persistent friend chat. Production polish.

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFriendChat, listFriends, clearFriendChat } from '../../api/friends'
import { useAuthStore } from '../../store/authStore'
import MessageBubble from '../chat/MessageBubble'
import Avatar from '../shared/Avatar'
import { useWebRTC } from '../../hooks/useWebRTC'
import { useSocket } from '../../hooks/useSocket'
import CallOverlay from '../chat/CallOverlay'
import { maskUnsafeText } from '../../utils/contentFilter'

export default function FriendChat() {
  const { friendId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [messages, setMessages] = useState([])
  const [friendName, setFriendName] = useState('Friend')
  const [friendAvatar, setFriendAvatar] = useState(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const bottomRef = useRef(null)
  const call = useWebRTC(null, { display_name: friendName }, friendId)
  const { emit } = useSocket()

  useEffect(() => {
    async function load() {
      try {
        const [chat, friends] = await Promise.all([
          getFriendChat(friendId),
          listFriends(),
        ])
        setMessages((chat.messages || []).map((m) => ({ ...m, content: maskUnsafeText(m.content) })))
        const f = friends.find((x) => String(x.id) === String(friendId))
        if (f?.other_user) {
          setFriendName(f.other_user.display_name)
          setFriendAvatar(f.other_user.avatar_url)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [friendId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const onMessage = (event) => {
      const msg = event.detail
      if (String(msg?.friend_id) !== String(friendId)) return
      setMessages((prev) => {
        if (prev.some((m) => String(m.id) === String(msg.message_id))) return prev
        return [...prev, {
          id: msg.message_id,
          friend_id: msg.friend_id,
          content: maskUnsafeText(msg.content),
          sender_id: msg.sender_id,
          sent_at: msg.sent_at,
          is_flagged: msg.is_flagged,
        }]
      })
    }
    window.addEventListener('vibe:new_friend_message', onMessage)
    return () => window.removeEventListener('vibe:new_friend_message', onMessage)
  }, [friendId])

  useEffect(() => {
    const onCleared = (event) => {
      if (String(event.detail?.friend_id) === String(friendId)) {
        setMessages([])
      }
    }
    window.addEventListener('vibe:friend_chat_cleared', onCleared)
    return () => window.removeEventListener('vibe:friend_chat_cleared', onCleared)
  }, [friendId])

  const handleSend = () => {
    const content = text.trim()
    if (!content) return
    emit('send_friend_message', { friend_id: friendId, content })
    setText('')
  }

  const handleClear = async () => {
    if (!window.confirm('Clear this conversation for both people?')) return
    try {
      await clearFriendChat(friendId)
      setMessages([])
      setShowMenu(false)
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Could not clear chat.')
    }
  }

  return (
    <div className="h-dvh flex flex-col bg-[#0c0e10]">
      <header className="relative flex items-center gap-2 border-b border-white/[0.07] bg-[#121416]/95 px-2 py-2 backdrop-blur-md safe-top">
        <button
          type="button"
          onClick={() => navigate('/friends')}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar name={friendName} url={friendAvatar} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{friendName}</p>
            <p className="text-[11px] text-zinc-500">Friend</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => call.startCall('voice')}
          disabled={call.status !== 'idle'}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
          title="Voice call"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => call.startCall('video')}
          disabled={call.status !== 'idle'}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
          title="Video call"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55-2.73A1 1 0 0121 8.13v7.74a1 1 0 01-1.45.86L15 14M5 6h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
          </svg>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-11 z-30 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#171a1c] py-1 shadow-xl animate-fade-in">
              <button
                type="button"
                onClick={handleClear}
                className="w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/10"
              >
                Clear chat
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4" onClick={() => setShowMenu(false)}>
        {loading ? (
          <div className="mx-auto w-full max-w-sm space-y-3">
            <div className="h-5 w-2/5 animate-pulse rounded bg-white/10" />
            <div className="h-12 w-3/4 animate-pulse rounded-2xl bg-white/10" />
            <div className="ml-auto h-12 w-2/3 animate-pulse rounded-2xl bg-primary/10" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">No messages yet. Say hi!</p>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} isOwn={m.sender_id === user?.id} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {actionError && (
        <p className="border-t border-danger/20 bg-danger/10 px-4 py-2 text-center text-xs text-red-200">
          {actionError}
        </p>
      )}

      <div className="border-t border-white/[0.07] bg-[#121416]/95 px-3 py-2.5 safe-bottom">
        <div className="flex items-end gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Message…"
            maxLength={500}
            className="input-clean !rounded-2xl !py-2.5 flex-1"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/25 transition disabled:opacity-40 active:scale-95"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
            </svg>
          </button>
        </div>
      </div>

      <CallOverlay
        stranger={{ display_name: friendName }}
        status={call.status}
        mode={call.mode}
        error={call.error}
        localStream={call.localStream}
        remoteStream={call.remoteStream}
        incomingCall={call.incomingCall}
        onAccept={call.acceptCall}
        onDecline={call.declineCall}
        onEnd={() => call.endCall()}
        onToggleMute={call.toggleMute}
        onToggleCamera={call.toggleCamera}
        onClearError={call.clearError}
      />
    </div>
  )
}
