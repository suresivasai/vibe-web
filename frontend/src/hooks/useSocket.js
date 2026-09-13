// frontend/src/hooks/useSocket.js
// Purpose: Singleton Socket.io connection — connect once on auth, survive route changes
// Iteration: 3 (fixed: no disconnect on every page unmount)

import { useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useFriendStore } from '../store/friendStore'

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000'

let socketInstance = null
let listenersBound = false

export function getSocket() {
  return socketInstance
}

export function requestNotificationPermission() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
  Notification.requestPermission().catch(() => {})
}

function bindListeners(socket) {
  if (listenersBound) return
  listenersBound = true

  const chat = () => useChatStore.getState()
  const friends = () => useFriendStore.getState()

  socket.on('connect', () => {
    const token = useAuthStore.getState().accessToken
    if (token) socket.emit('authenticate', { token })
  })

  socket.on('authenticated', (data) => {
    console.log('[Socket] authenticated', data?.user_id)
  })

  socket.on('auth_error', (data) => {
    console.error('[Socket] auth error', data)
  })

  socket.on('matched', (data) => {
    chat().setSession(data.session_id)
    chat().setStranger(data.stranger)
    chat().addSystemMessage(`${data.stranger?.display_name || 'Someone'} joined the conversation.`)
    window.dispatchEvent(new CustomEvent('vibe:matched', { detail: data }))
  })

  socket.on('new_message', (msg) => {
    chat().addMessage({
      id: msg.message_id,
      content: msg.content,
      sender_id: msg.sender_id,
      sent_at: msg.sent_at,
      is_flagged: msg.is_flagged,
    })
  })

  socket.on('stranger_typing', (data) => {
    chat().setTyping(!(data && data.stopped))
  })

  socket.on('stranger_name_changed', (data) => {
    chat().updateStranger({ display_name: data.display_name })
  })

  socket.on('stranger_left', () => {
    chat().addSystemMessage('They left the conversation. You will be matched with someone new.')
    window.dispatchEvent(new CustomEvent('vibe:stranger_left'))
  })

  socket.on('friend_request_received', (data) => {
    friends().addPendingRequest(data.from)
    window.dispatchEvent(new CustomEvent('vibe:friend_request', { detail: data }))
  })

  socket.on('call_incoming', (data) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(`${data?.from?.display_name || 'Someone'} is calling`, {
        body: `Incoming ${data?.mode || 'voice'} call on Vibe`,
        tag: `vibe-call-${data?.call_id || 'incoming'}`,
      })
    }
  })

  socket.on('friend_accepted', (data) => {
    friends().markAccepted(data.friend)
    window.dispatchEvent(new CustomEvent('vibe:friend_accepted', { detail: data }))
  })

  socket.on('banned', (data) => {
    window.dispatchEvent(new CustomEvent('vibe:banned', { detail: data }))
  })

  const callEvents = [
    'call_incoming',
    'call_accepted',
    'call_declined',
    'call_offer',
    'call_answer',
    'call_ice_candidate',
    'call_ended',
    'call_error',
  ]
  callEvents.forEach((eventName) => {
    socket.on(eventName, (data) => {
      window.dispatchEvent(new CustomEvent(`vibe:${eventName}`, { detail: data }))
    })
  })

  socket.on('error', (data) => {
    console.error('[Socket] error', data)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] disconnected', reason)
  })
}

function ensureSocket(token) {
  if (socketInstance?.connected) {
    return socketInstance
  }
  if (socketInstance) {
    socketInstance.auth = { token }
    socketInstance.connect()
    return socketInstance
  }

  socketInstance = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    autoConnect: true,
  })
  bindListeners(socketInstance)
  return socketInstance
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.removeAllListeners()
    socketInstance.disconnect()
    socketInstance = null
    listenersBound = false
  }
}

/**
 * Hook: ensures a single shared socket while authenticated.
 * Safe to call from multiple components — will not create multiple connections.
 */
export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      disconnectSocket()
      return
    }
    ensureSocket(accessToken)
    requestNotificationPermission()
    // Do NOT disconnect on unmount — only on logout / token clear
  }, [isAuthenticated, accessToken])

  const emit = useCallback((event, data) => {
    const s = socketInstance
    if (s?.connected) {
      s.emit(event, data)
    } else if (s) {
      s.once('connect', () => s.emit(event, data))
    }
  }, [])

  return { emit, socket: socketInstance }
}
