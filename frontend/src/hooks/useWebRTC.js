// frontend/src/hooks/useWebRTC.js
// WebRTC voice/video — Metered TURN API + static fallback

import { useCallback, useEffect, useRef, useState } from 'react'
import { getSocket } from './useSocket'

const DEFAULT_STUN = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

/** Cache Metered ICE servers for a few minutes */
let cachedIceServers = null
let cacheAt = 0
const CACHE_MS = 5 * 60 * 1000

async function resolveIceServers() {
  const now = Date.now()
  if (cachedIceServers && now - cacheAt < CACHE_MS) {
    return cachedIceServers
  }

  // 1) Metered dynamic credentials API (best)
  const meteredKey = import.meta.env.VITE_METERED_API_KEY
  const meteredUrl =
    import.meta.env.VITE_METERED_TURN_API ||
    (meteredKey
      ? `https://vibe-web.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(meteredKey)}`
      : null)

  if (meteredUrl) {
    try {
      const res = await fetch(meteredUrl)
      if (res.ok) {
        const iceServers = await res.json()
        if (Array.isArray(iceServers) && iceServers.length) {
          cachedIceServers = iceServers
          cacheAt = now
          return iceServers
        }
      }
    } catch (err) {
      console.warn('[WebRTC] Metered TURN fetch failed, using static fallback', err)
    }
  }

  // 2) Static Metered-style servers from env username/credential
  const username = import.meta.env.VITE_TURN_USERNAME
  const credential = import.meta.env.VITE_TURN_CREDENTIAL
  if (username && credential) {
    const servers = [
      { urls: 'stun:stun.relay.metered.ca:80' },
      {
        urls: 'turn:standard.relay.metered.ca:80',
        username,
        credential,
      },
      {
        urls: 'turn:standard.relay.metered.ca:80?transport=tcp',
        username,
        credential,
      },
      {
        urls: 'turn:standard.relay.metered.ca:443',
        username,
        credential,
      },
      {
        urls: 'turns:standard.relay.metered.ca:443?transport=tcp',
        username,
        credential,
      },
      ...DEFAULT_STUN,
    ]
    // Allow single custom URL override if provided
    if (import.meta.env.VITE_TURN_URL) {
      servers.unshift({
        urls: import.meta.env.VITE_TURN_URL,
        username,
        credential,
      })
    }
    cachedIceServers = servers
    cacheAt = now
    return servers
  }

  // 3) STUN only (weak across mobile / strict NATs)
  return DEFAULT_STUN
}

function makeCallId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeIncoming(detail) {
  if (!detail) return null
  return {
    ...detail,
    callId: detail.callId || detail.call_id,
    sessionId: detail.sessionId || detail.session_id,
    friendId: detail.friendId || detail.friend_id,
    mode: detail.mode,
    from: detail.from,
  }
}

export function useWebRTC(sessionId, stranger, friendId = null) {
  const [status, setStatus] = useState('idle')
  const [mode, setMode] = useState(null)
  const [error, setError] = useState('')
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)

  const peerRef = useRef(null)
  const localStreamRef = useRef(null)
  const callRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const statusRef = useRef(status)
  const incomingCallRef = useRef(incomingCall)
  statusRef.current = status
  incomingCallRef.current = incomingCall

  const scope = sessionId ? { session_id: sessionId } : { friend_id: friendId }

  const emit = useCallback((event, payload) => {
    const socket = getSocket()
    if (socket?.connected) socket.emit(event, payload)
  }, [])

  const closeCall = useCallback(
    (notify = true) => {
      const call = callRef.current
      if (notify && call?.callId) {
        emit('call_end', { ...scope, call_id: call.callId })
      }
      try {
        peerRef.current?.close()
      } catch {
        /* ignore */
      }
      peerRef.current = null
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
      callRef.current = null
      pendingCandidatesRef.current = []
      setLocalStream(null)
      setRemoteStream(null)
      setIncomingCall(null)
      setMode(null)
      setStatus('idle')
    },
    [emit, friendId, sessionId]
  )

  const createPeer = useCallback(
    async (call) => {
      if (peerRef.current) {
        try {
          peerRef.current.close()
        } catch {
          /* ignore */
        }
      }

      const iceServers = await resolveIceServers()
      const peer = new RTCPeerConnection({ iceServers })

      peer.onicecandidate = (event) => {
        if (event.candidate && call?.callId) {
          emit('call_ice_candidate', {
            ...scope,
            call_id: call.callId,
            candidate: event.candidate.toJSON(),
          })
        }
      }

      peer.ontrack = (event) => {
        const stream = event.streams?.[0]
        if (stream) setRemoteStream(stream)
      }

      peer.onconnectionstatechange = () => {
        const state = peer.connectionState
        if (state === 'connected') setStatus('connected')
        if (state === 'failed') {
          setError('Call connection failed. Check network or TURN settings.')
          closeCall(false)
        }
      }

      peer.oniceconnectionstatechange = () => {
        const state = peer.iceConnectionState
        if (state === 'connected' || state === 'completed') setStatus('connected')
        if (state === 'failed') {
          setError('Network could not connect the call.')
        }
      }

      localStreamRef.current?.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current)
      })

      peerRef.current = peer
      setStatus('connecting')
      return peer
    },
    [closeCall, emit, friendId, sessionId]
  )

  const startCall = useCallback(
    async (requestedMode) => {
      if ((!sessionId && !friendId) || statusRef.current !== 'idle') return
      setError('')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: requestedMode === 'video',
        })
        const call = { callId: makeCallId(), mode: requestedMode, caller: true }
        localStreamRef.current = stream
        callRef.current = call
        setLocalStream(stream)
        setMode(requestedMode)
        setStatus('outgoing')
        emit('call_invite', {
          ...scope,
          call_id: call.callId,
          mode: requestedMode,
        })
      } catch (err) {
        setError(
          err.name === 'NotAllowedError'
            ? 'Please allow microphone or camera access to call.'
            : 'Your device could not start the call.'
        )
        setStatus('idle')
      }
    },
    [emit, friendId, sessionId]
  )

  const acceptCall = useCallback(async () => {
    const incoming = normalizeIncoming(incomingCallRef.current)
    if (!incoming?.callId) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incoming.mode === 'video',
      })
      const call = { callId: incoming.callId, mode: incoming.mode, caller: false }
      localStreamRef.current = stream
      callRef.current = call
      setLocalStream(stream)
      setMode(incoming.mode)
      setIncomingCall(null)
      setStatus('connecting')
      await createPeer(call)
      emit('call_accept', { ...scope, call_id: call.callId })
    } catch {
      setError('Please allow microphone or camera access to accept the call.')
      emit('call_decline', { ...scope, call_id: incoming.callId })
      setIncomingCall(null)
    }
  }, [createPeer, emit, friendId, sessionId])

  const declineCall = useCallback(() => {
    const incoming = normalizeIncoming(incomingCallRef.current)
    if (incoming?.callId) {
      emit('call_decline', { ...scope, call_id: incoming.callId })
    }
    setIncomingCall(null)
  }, [emit, friendId, sessionId])

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (track) track.enabled = !track.enabled
    return track ? !track.enabled : false
  }, [])

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (track) track.enabled = !track.enabled
    return track ? !track.enabled : false
  }, [])

  useEffect(() => {
    const sameScope = (data) => {
      if (sessionId) return String(data?.session_id || data?.sessionId || '') === String(sessionId)
      if (friendId) return String(data?.friend_id || data?.friendId || '') === String(friendId)
      return false
    }

    const onIncoming = (event) => {
      const call = normalizeIncoming(event.detail)
      if (call && sameScope(event.detail) && statusRef.current === 'idle') {
        setIncomingCall(call)
      }
    }

    const onAccepted = async (event) => {
      const data = event.detail
      const call = callRef.current
      if (!call?.caller || !call.callId) return
      if (String(data?.call_id || data?.callId) !== String(call.callId)) return
      try {
        const peer = await createPeer(call)
        const offer = await peer.createOffer()
        await peer.setLocalDescription(offer)
        emit('call_offer', {
          ...scope,
          call_id: call.callId,
          offer: peer.localDescription.toJSON(),
        })
      } catch {
        setError('Could not start the call.')
      }
    }

    const onOffer = async (event) => {
      const data = event.detail
      const call = callRef.current
      if (!call || call.caller) return
      if (String(data?.call_id || data?.callId) !== String(call.callId)) return
      try {
        let peer = peerRef.current
        if (!peer) peer = await createPeer(call)
        await peer.setRemoteDescription(data.offer)
        const answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        const pending = pendingCandidatesRef.current.splice(0)
        for (const c of pending) {
          try {
            await peer.addIceCandidate(c)
          } catch {
            /* ignore */
          }
        }
        emit('call_answer', {
          ...scope,
          call_id: call.callId,
          answer: peer.localDescription.toJSON(),
        })
      } catch {
        setError('Could not answer the call.')
      }
    }

    const onAnswer = async (event) => {
      const data = event.detail
      const call = callRef.current
      if (!call?.callId || !peerRef.current) return
      if (String(data?.call_id || data?.callId) !== String(call.callId)) return
      try {
        await peerRef.current.setRemoteDescription(data.answer)
        const pending = pendingCandidatesRef.current.splice(0)
        for (const c of pending) {
          try {
            await peerRef.current.addIceCandidate(c)
          } catch {
            /* ignore */
          }
        }
      } catch {
        setError('Could not complete the call.')
      }
    }

    const onCandidate = async (event) => {
      const data = event.detail
      const call = callRef.current
      if (!call?.callId) return
      if (String(data?.call_id || data?.callId) !== String(call.callId)) return
      const candidate = data.candidate
      if (!candidate) return
      if (!peerRef.current?.remoteDescription) {
        pendingCandidatesRef.current.push(candidate)
        return
      }
      try {
        await peerRef.current.addIceCandidate(candidate)
      } catch {
        /* peer may be closed */
      }
    }

    const onDeclined = (event) => {
      const id = event.detail?.call_id || event.detail?.callId
      if (id && String(id) === String(callRef.current?.callId)) {
        setError('The other person declined the call.')
        closeCall(false)
      }
    }

    const onEnded = (event) => {
      const id = event.detail?.call_id || event.detail?.callId
      if (id && String(id) === String(callRef.current?.callId)) closeCall(false)
    }

    const onError = (event) => {
      if (callRef.current || incomingCallRef.current) {
        setError(event.detail?.message || 'The call could not connect.')
        closeCall(false)
      }
    }

    window.addEventListener('vibe:call_incoming', onIncoming)
    window.addEventListener('vibe:call_accepted', onAccepted)
    window.addEventListener('vibe:call_offer', onOffer)
    window.addEventListener('vibe:call_answer', onAnswer)
    window.addEventListener('vibe:call_ice_candidate', onCandidate)
    window.addEventListener('vibe:call_declined', onDeclined)
    window.addEventListener('vibe:call_ended', onEnded)
    window.addEventListener('vibe:call_error', onError)

    return () => {
      window.removeEventListener('vibe:call_incoming', onIncoming)
      window.removeEventListener('vibe:call_accepted', onAccepted)
      window.removeEventListener('vibe:call_offer', onOffer)
      window.removeEventListener('vibe:call_answer', onAnswer)
      window.removeEventListener('vibe:call_ice_candidate', onCandidate)
      window.removeEventListener('vibe:call_declined', onDeclined)
      window.removeEventListener('vibe:call_ended', onEnded)
      window.removeEventListener('vibe:call_error', onError)
      closeCall(false)
    }
  }, [closeCall, createPeer, emit, friendId, sessionId])

  return {
    status,
    mode,
    error,
    localStream,
    remoteStream,
    incomingCall,
    startCall,
    acceptCall,
    declineCall,
    endCall: closeCall,
    toggleMute,
    toggleCamera,
    clearError: () => setError(''),
  }
}
