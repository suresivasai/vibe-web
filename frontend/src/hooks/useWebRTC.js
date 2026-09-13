import { useCallback, useEffect, useRef, useState } from 'react'
import { getSocket } from './useSocket'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  ...(import.meta.env.VITE_TURN_URL
    ? [{
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL,
      }]
    : []),
]

function makeCallId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
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

  const closeCall = useCallback((notify = true) => {
    const call = callRef.current
    if (notify && call) {
      emit('call_end', { ...scope, call_id: call.callId })
    }
    peerRef.current?.close()
    peerRef.current = null
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    callRef.current = null
    pendingCandidatesRef.current = []
    setLocalStream(null)
    setRemoteStream(null)
    setIncomingCall(null)
    setMode(null)
    setStatus('idle')
  }, [emit, friendId, sessionId])

  const createPeer = useCallback((call, isCaller) => {
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        emit('call_ice_candidate', {
          ...scope,
          call_id: call.callId,
          candidate: event.candidate.toJSON(),
        })
      }
    }
    peer.ontrack = (event) => {
      setRemoteStream((current) => current || event.streams[0])
    }
    peer.onconnectionstatechange = () => {
      if (['connected', 'completed'].includes(peer.connectionState)) setStatus('connected')
      if (['failed', 'disconnected', 'closed'].includes(peer.connectionState)) closeCall(false)
    }
    localStreamRef.current?.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current))
    peerRef.current = peer
    setStatus(isCaller ? 'connecting' : 'connected')
    return peer
  }, [closeCall, emit, friendId, sessionId])

  const startCall = useCallback(async (requestedMode) => {
    if ((!sessionId && !friendId) || status !== 'idle') return
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
      emit('call_invite', { ...scope, call_id: call.callId, mode: requestedMode })
    } catch (err) {
      setError(err.name === 'NotAllowedError' ? 'Please allow microphone or camera access to call.' : 'Your device could not start the call.')
      setStatus('idle')
    }
  }, [emit, friendId, sessionId, status])

  const acceptCall = useCallback(async () => {
    const incoming = incomingCall
    if (!incoming) return
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
      emit('call_accept', { ...scope, call_id: call.callId })
      createPeer(call, false)
    } catch (err) {
      setError('Please allow microphone or camera access to accept the call.')
      emit('call_decline', { ...scope, call_id: incoming.callId })
      setIncomingCall(null)
    }
  }, [createPeer, emit, friendId, incomingCall, sessionId])

  const declineCall = useCallback(() => {
    if (incomingCall) emit('call_decline', { ...scope, call_id: incomingCall.callId })
    setIncomingCall(null)
  }, [emit, friendId, incomingCall, sessionId])

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
    const onIncoming = (event) => {
      const call = event.detail
      const sameScope = sessionId ? call?.session_id === sessionId : call?.friend_id === friendId
      if (sameScope && statusRef.current === 'idle') setIncomingCall(call)
    }
    const onAccepted = (event) => {
      const data = event.detail
      const call = callRef.current
      if (!call || !call.caller || data?.call_id !== call.callId) return
      const peer = createPeer(call, true)
      peer.createOffer().then((offer) => peer.setLocalDescription(offer)).then(() => {
        emit('call_offer', { ...scope, call_id: call.callId, offer: peer.localDescription.toJSON() })
      }).catch(() => setError('Could not start the call.'))
    }
    const onOffer = async (event) => {
      const data = event.detail
      const call = callRef.current
      if (!call || call.caller || data?.call_id !== call.callId) return
      const peer = peerRef.current
      await peer.setRemoteDescription(data.offer)
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      const pendingCandidates = pendingCandidatesRef.current.splice(0)
      await Promise.all(pendingCandidates.map((candidate) => peer.addIceCandidate(candidate)))
      emit('call_answer', { ...scope, call_id: call.callId, answer: peer.localDescription.toJSON() })
    }
    const onAnswer = async (event) => {
      const data = event.detail
      if (data?.call_id !== callRef.current?.callId || !peerRef.current) return
      await peerRef.current.setRemoteDescription(data.answer)
      const pendingCandidates = pendingCandidatesRef.current.splice(0)
      await Promise.all(pendingCandidates.map((candidate) => peerRef.current.addIceCandidate(candidate)))
    }
    const onCandidate = async (event) => {
      const data = event.detail
      if (data?.call_id !== callRef.current?.callId) return
      if (!peerRef.current?.remoteDescription) {
        pendingCandidatesRef.current.push(data.candidate)
        return
      }
      try { await peerRef.current.addIceCandidate(data.candidate) } catch { /* peer may already be closed */ }
    }
    const onDeclined = (event) => {
      if (event.detail?.call_id === callRef.current?.callId) {
        setError('The other person declined the call.')
        closeCall(false)
      }
    }
    const onEnded = (event) => {
      if (event.detail?.call_id === callRef.current?.callId) closeCall(false)
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