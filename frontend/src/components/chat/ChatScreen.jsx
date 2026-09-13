// frontend/src/components/chat/ChatScreen.jsx
// Purpose: Stranger chat with text, voice, and video calls
// Iteration: UI polish

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

const REPORT_REASONS = [
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'nudity', label: 'Nudity' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'underage', label: 'Underage' },
  { value: 'spam', label: 'Spam' },
]

function CallButton({ label, icon, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative min-h-touch min-w-touch flex flex-col items-center justify-center rounded-xl text-text-secondary-light dark:text-text-secondary-dark hover:bg-black/5 dark:hover:bg-white/5 transition"
      title={label}
      disabled={disabled}
    >
      <span className="text-lg leading-none">{icon}</span>
    </button>
  )
}

export default function ChatScreen() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const { messages, stranger, isTyping, setSession, clearSession, addMessage } =
    useChatStore()
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
      window.setTimeout(() => {
        clearSession()
        navigate('/waiting', { replace: true })
      }, 1400)
    }
    window.addEventListener('vibe:stranger_left', onLeft)
    return () => window.removeEventListener('vibe:stranger_left', onLeft)
  }, [clearSession, endCall, navigate])

  const handleSend = () => {
    const content = text.trim()
    if (!content || !sessionId) return
    addMessage({
      id: `temp-${Date.now()}`,
      content,
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
      const updated = await api.patch('/users/me', { display_name: name }).then(r => r.data)
      updateUser(updated)
      emit('name_changed', { session_id: sessionId, display_name: name })
      setShowChangeName(false)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="h-dvh flex flex-col bg-bg-light dark:bg-bg-dark">
      {/* Header */}
      <header className="flex items-center gap-2 px-2 py-2 border-b border-black/[0.06] dark:border-white/[0.08] safe-top bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md">
        <button
          type="button"
          onClick={() => endChat(sessionId)}
          className="min-h-touch min-w-touch flex items-center justify-center rounded-xl text-text-secondary-light dark:text-text-secondary-dark hover:bg-black/5 dark:hover:bg-white/5"
          aria-label="End chat"
          title="End chat"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {(stranger?.display_name || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate text-sm">
              {stranger?.display_name || 'Stranger'}
            </p>
            <p className="text-[11px] text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Connected
            </p>
          </div>
        </div>

        <CallButton
          label="Start voice call"
          icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M5 4.75A2.75 2.75 0 017.75 2h.5A2.75 2.75 0 0111 4.75v1.5A2.75 2.75 0 018.25 9H8a10 10 0 007 7v-.25A2.75 2.75 0 0117.75 13h1.5A2.75 2.75 0 0122 15.75v.5A2.75 2.75 0 0119.25 19C11.38 19 5 12.62 5 4.75z" /></svg>}
          onClick={() => call.startCall('voice')}
          disabled={call.status !== 'idle'}
        />
        <CallButton
          label="Start video call"
          icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55-2.73A1 1 0 0121 8.13v7.74a1 1 0 01-1.45.86L15 14M5 6h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" /></svg>}
          onClick={() => call.startCall('video')}
          disabled={call.status !== 'idle'}
        />

        <button
          type="button"
          onClick={() => setShowChangeName(true)}
          className="min-h-touch px-2 text-xs font-semibold text-primary"
        >
          Edit Name
        </button>

        <button
          type="button"
          onClick={handleAddFriend}
          disabled={friendSent}
          className="min-h-touch px-2 text-xs font-semibold text-primary disabled:opacity-50"
        >
          {friendSent ? 'Sent' : 'Friend'}
        </button>
        <button
          type="button"
          onClick={() => setShowReport(true)}
          className="min-h-touch px-2 text-xs font-semibold text-danger"
        >
          Report
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <div className="text-center py-12 px-6">
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              You’re connected. Say hi — voice & video calls will live here soon.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isOwn={m.sender_id === user?.id} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Change Name Modal */}
      {showChangeName && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowChangeName(false)}
        >
          <div
            className="w-full max-w-sm card-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Change Display Name</h3>
            <form onSubmit={handleChangeName}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-text-primary-light dark:text-text-primary-dark outline-none mb-4"
                placeholder="New name..."
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowChangeName(false)}
                  className="px-4 py-2 text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || newName.trim() === user?.display_name}
                  className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="relative border-t border-black/[0.06] dark:border-white/[0.08] bg-surface-light dark:bg-surface-dark px-2 py-2 safe-bottom">
        {showEmoji && (
          <EmojiPicker
            onSelect={(e) => setText((t) => t + e)}
            onClose={() => setShowEmoji(false)}
          />
        )}
        {showGif && (
          <GifPicker
            onSelect={(url) => {
              setText(url)
              setShowGif(false)
            }}
            onClose={() => setShowGif(false)}
          />
        )}
        <div className="flex items-end gap-1.5 max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className="min-h-touch min-w-touch text-xl rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Emoji"
          >
            😊
          </button>
          <button
            type="button"
            onClick={() => {
              setShowGif((value) => !value)
              setShowEmoji(false)
            }}
            className="min-h-touch min-w-touch rounded-xl text-xs font-bold text-primary-300 hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="GIF"
          >
            GIF
          </button>
          <input
            type="text"
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Message…"
            maxLength={500}
            className="flex-1 min-h-touch px-4 py-2.5 rounded-2xl bg-bg-light dark:bg-bg-dark border border-black/8 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim()}
            className="min-h-touch min-w-touch rounded-2xl bg-primary text-white font-semibold disabled:opacity-40 shadow-md shadow-primary/20"
          >
            ↑
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

      {/* Report sheet */}
      {showReport && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40"
          onClick={() => setShowReport(false)}
        >
          <div
            className="w-full bg-surface-light dark:bg-surface-dark rounded-t-2xl p-5 safe-bottom shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg mb-1">Report & block</h3>
            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-4">
              We’ll end this chat and you won’t be matched again.
            </p>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReportReason(r.value)}
                  className={`w-full min-h-touch text-left px-4 rounded-control border transition ${
                    reportReason === r.value
                      ? 'border-primary bg-primary/10'
                      : 'border-black/10 dark:border-white/10'
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
              className="mt-4 w-full min-h-touch rounded-control bg-danger text-white font-semibold disabled:opacity-40"
            >
              Submit report
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
