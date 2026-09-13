// frontend/src/components/friends/FriendChat.jsx
// Purpose: Persistent friend chat (no skip, history loaded)
// Iteration: 5

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFriendChat, sendFriendMessage, listFriends, clearFriendChat } from '../../api/friends'
import { useAuthStore } from '../../store/authStore'
import MessageBubble from '../chat/MessageBubble'
import Avatar from '../shared/Avatar'
import { useWebRTC } from '../../hooks/useWebRTC'
import CallOverlay from '../chat/CallOverlay'

export default function FriendChat() {
  const { friendId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [messages, setMessages] = useState([])
  const [friendName, setFriendName] = useState('Friend')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const bottomRef = useRef(null)
  const call = useWebRTC(null, { display_name: friendName }, friendId)

  useEffect(() => {
    async function load() {
      try {
        const [chat, friends] = await Promise.all([
          getFriendChat(friendId),
          listFriends(),
        ])
        setMessages(chat.messages || [])
        const f = friends.find((x) => x.id === friendId)
        if (f?.other_user) setFriendName(f.other_user.display_name)
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

  const handleSend = async () => {
    const content = text.trim()
    if (!content) return
    try {
      const msg = await sendFriendMessage(friendId, content)
      setMessages((prev) => [...prev, msg])
      setText('')
    } catch (err) {
      console.error(err)
    }
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
    <div className="h-dvh flex flex-col bg-bg-light dark:bg-bg-dark">
      <header className="relative flex items-center gap-3 px-3 py-2 border-b border-black/8 dark:border-white/8 safe-top bg-surface-light dark:bg-surface-dark">
        <button
          type="button"
          onClick={() => navigate('/friends')}
          className="min-h-touch min-w-touch text-lg"
          aria-label="Back"
        >
          ←
        </button>
        <Avatar name={friendName} size={36} />
        <p className="font-semibold flex-1 truncate">{friendName}</p>
        <button type="button" onClick={() => call.startCall('voice')} disabled={call.status !== 'idle'} className="min-h-touch min-w-touch rounded-xl text-primary-300 disabled:opacity-40" aria-label="Voice call" title="Voice call">☎</button>
        <button type="button" onClick={() => call.startCall('video')} disabled={call.status !== 'idle'} className="min-h-touch min-w-touch rounded-xl text-primary-300 disabled:opacity-40" aria-label="Video call" title="Video call">▣</button>
        <button type="button" onClick={() => setShowMenu((value) => !value)} className="min-h-touch min-w-touch rounded-xl text-text-secondary-light" aria-label="Chat options" title="Chat options">•••</button>
        {showMenu && <div className="absolute right-3 top-16 z-20 rounded-xl border border-white/10 bg-[#171a1c] p-2 shadow-card"><button type="button" onClick={handleClear} className="rounded-lg px-3 py-2 text-sm text-danger hover:bg-white/5">Clear chat</button></div>}
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="mx-auto w-full max-w-sm space-y-3"><div className="h-5 w-2/5 animate-pulse rounded bg-white/10" /><div className="h-12 w-3/4 animate-pulse rounded-2xl bg-white/10" /><div className="ml-auto h-12 w-2/3 animate-pulse rounded-2xl bg-primary/10" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-text-secondary-light dark:text-text-secondary-dark py-8">
            No messages yet. Say hi!
          </p>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.sender_id === user?.id}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {actionError && <p className="border-t border-danger/20 bg-danger/10 px-4 py-2 text-center text-xs text-red-200">{actionError}</p>}

      <div className="border-t border-black/8 dark:border-white/8 px-2 py-2 safe-bottom bg-surface-light dark:bg-surface-dark">
        <div className="flex items-end gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message…"
            maxLength={500}
            className="flex-1 min-h-touch px-3 py-2 rounded-control bg-bg-light dark:bg-bg-dark border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim()}
            className="min-h-touch min-w-touch rounded-control bg-primary text-white font-semibold disabled:opacity-40"
          >
            ↑
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
