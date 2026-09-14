// frontend/src/components/chat/ChatScreen.jsx
// Stranger chat — text, voice, video. Production UI polish.

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { useSocket } from '../../hooks/useSocket'
import { useMatch } from '../../hooks/useMatch'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import EmojiPicker from './EmojiPicker'
import GifPicker from './GifPicker'
import CallOverlay from './CallOverlay'
import { submitReport } from '../../api/reports'
import { sendFriendRequest } from '../../api/friends'
import api from '../../api/axios'
import { useWebRTC } from '../../hooks/useWebRTC'
import Avatar from '../shared/Avatar'
import { maskUnsafeText } from '../../utils/contentFilter'

const REPORT_REASONS = [
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'nudity', label: 'Nudity' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'underage', label: 'Underage' },
  { value: 'spam', label: 'Spam' },
]

export default function ChatScreen() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const { messages, stranger, isTyping, setSession, clearSession, addMessage } = useChatStore()
  const { emit } = useSocket()
  const { skipChat, endChat } = useMatch()
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [friendSent, setFriendSent] = useState(false)
  const [showChangeName, setShowChangeName] = useState(false)
  const [newName, setNewName] = useState(user?.display_name || '')
  const [showMenu, setShowMenu] = useState(false)
  const bottomRef = useRef(null)
  const typingTimeout = useRef(null)
  const call = useWebRTC(sessionId, stranger)
  const { endCall } = call

  useEffect(() => {
    if (sessionId) setSession(sessionId)
  }, [sessionId, setSession])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    const onLeft = () => {
      endCall(false)
      clearSession()
      navigate('/waiting', { replace: true })
    }
    window.addEventListener('vibe:stranger_left', onLeft)
    return () => window.removeEventListener('vibe:stranger_left', onLeft)
  }, [clearSession, endCall, navigate])

  const handleSend = () => {
    const content = text.trim()
    if (!content || !sessionId) return
    addMessage({
      id: `temp-${Date.now()}`,
      content: maskUnsafeText(content),
      sender_id: user?.id,
      sent_at: new Date().toISOString(),
      is_flagged: false,
    })
    emit('send_message', { session_id: sessionId, content })
    setText('')
    setShowEmoji(false)
    emit('stop_typing', { session_id: sessionId })
  }

  const handleTyping = (value) => {
    setText(value)
    if (!sessionId) return
    emit('typing', { session_id: sessionId })
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      emit('stop_typing', { session_id: sessionId })
    }, 1500)
  }

  const handleReport = async () => {
    if (!reportReason || !stranger?.id) return
    try {
      await submitReport(sessionId, stranger.id, reportReason)
      try {
        await api.post('/blocks', { blocked_id: stranger.id })
      } catch (_) {}
      setShowReport(false)
      skipChat(sessionId)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddFriend = async () => {
    if (!stranger?.id || friendSent) return
    try {
      await sendFriendRequest(stranger.id)
      setFriendSent(true)
    } catch (err) {
      if (err.response?.status === 409) setFriendSent(true)
      else console.error(err)
    }
  }

  const handleChangeName = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name || name.length < 2 || name === user?.display_name) {
      setShowChangeName(false)
      return
    }
    try {
      const updated = await api.patch('/users/me', { display_name: name }).then((r) => r.data)
      updateUser(updated)
      emit('name_changed', { session_id: sessionId, display_name: name })
      setShowChangeName(false)
    } catch (err) {
      console.error(err)
    }
  }

  const onEmoji = (emoji) => {
    setText((t) => t + (emoji.native || emoji))
  }

  const onGif = (url) => {
    if (!sessionId || !url) return
    addMessage({
      id: `temp-${Date.now()}`,
      content: url,
      sender_id: user?.id,
      sent_at: new Date().toISOString(),
      is_flagged: false,
    })
    emit('send_message', { session_id: sessionId, content: url })
    setShowGif(false)
  }

  return (
    <div className="h-dvh flex flex-col bg-[#0c0e10]">
      {/* Header */}
      <header className="flex items-center gap-2 border-b border-white/[0.07] bg-[#121416]/95 px-2 py-2 backdrop-blur-md safe-top">
        <button
          type="button"
          onClick={() => endChat(sessionId)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-white"
          aria-label="End chat"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar name={stranger?.display_name} url={stranger?.avatar_url} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {stranger?.display_name || 'Stranger'}
            </p>
            <p className="text-[11px] text-zinc-500">
              {call.status !== 'idle' ? `In ${call.mode || 'call'}…` : 'Connected'}
            </p>
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
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="More"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#171a1c] py-1 shadow-xl animate-fade-in">
              <button
                type="button"
                onClick={() => { setShowChangeName(true); setShowMenu(false) }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/5"
              >
                Edit my name
              </button>
              <button
                type="button"
                onClick={() => { handleAddFriend(); setShowMenu(false) }}
                disabled={friendSent}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50"
              >
                {friendSent ? 'Request sent' : 'Add friend'}
              </button>
              <button
                type="button"
                onClick={() => { setShowReport(true); setShowMenu(false) }}
                className="w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/10"
              >
                Report & block
              </button>
              <button
                type="button"
                onClick={() => { skipChat(sessionId); setShowMenu(false) }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/5"
              >
                Skip to next
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4" onClick={() => setShowMenu(false)}>
        {messages.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-zinc-500">
              You’re connected. Say hi — keep it kind.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isOwn={m.sender_id === user?.id} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="relative border-t border-white/[0.07] bg-[#121416]/95 px-3 py-2.5 safe-bottom">
        {showEmoji && (
          <div className="absolute bottom-full left-0 right-0 z-30 mb-2 px-2">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#171a1c] shadow-xl">
              <EmojiPicker
                onSelect={onEmoji}
                onClose={() => setShowEmoji(false)}
              />
            </div>
          </div>
        )}
        {showGif && (
          <div className="absolute bottom-full left-0 right-0 z-30 mb-2 px-2">
            <GifPicker
              onSelect={(url) => { onGif(url); setShowGif(false) }}
              onClose={() => setShowGif(false)}
            />
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => { setShowEmoji((v) => !v); setShowGif(false) }}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
              showEmoji ? 'bg-primary/20 text-primary-300' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
            }`}
            title="Emoji"
          >
            ☺
          </button>
          <button
            type="button"
            onClick={() => { setShowGif((v) => !v); setShowEmoji(false) }}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition ${
              showGif ? 'bg-primary/20 text-primary-300' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
            }`}
            title="GIF"
          >
            GIF
          </button>
          <input
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Message…"
            className="input-clean !rounded-2xl !py-2.5 flex-1"
            maxLength={2000}
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
        stranger={stranger}
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

      {/* Change name modal */}
      {showChangeName && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowChangeName(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141618] p-6 shadow-2xl animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold text-white">Change display name</h3>
            <form onSubmit={handleChangeName} className="mt-4 space-y-4">
              <input
                className="input-clean"
                value={newName}
                onChange={(e) => setNewName(e.target.value.slice(0, 24))}
                maxLength={24}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowChangeName(false)}
                  className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-zinc-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 !py-2.5">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report sheet */}
      {showReport && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowReport(false)}
        >
          <div
            className="w-full rounded-t-2xl border-t border-white/10 bg-[#141618] p-5 safe-bottom shadow-2xl animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Report & block</h3>
            <p className="mt-1 text-xs text-zinc-500">
              We’ll end this chat and you won’t be matched with them again.
            </p>
            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReportReason(r.value)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    reportReason === r.value
                      ? 'border-primary bg-primary/15 text-white'
                      : 'border-white/10 text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleReport}
              disabled={!reportReason}
              className="mt-4 w-full rounded-xl bg-danger py-3.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              Submit report
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
