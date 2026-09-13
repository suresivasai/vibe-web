// frontend/src/hooks/useMatch.js
// Purpose: Join/leave queue (pure FIFO), handle matched events

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from './useSocket'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import confetti from 'canvas-confetti'

export function useMatch() {
  const { emit } = useSocket()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { setStatus, reset } = useChatStore()

  const startMatching = useCallback(() => {
    if (!user) return
    setStatus('waiting')
    emit('join_queue', {})
    navigate('/waiting')
  }, [emit, user, setStatus, navigate])

  const cancelMatching = useCallback(() => {
    emit('leave_queue', {})
    setStatus('idle')
    navigate('/')
  }, [emit, setStatus, navigate])

  const skipChat = useCallback(
    (sessionId) => {
      emit('skip', { session_id: sessionId })
      reset()
      navigate('/waiting')
      // re-join queue immediately
      setTimeout(() => {
        if (user) {
          emit('join_queue', {})
        }
      }, 300)
    },
    [emit, reset, navigate, user]
  )

  const endChat = useCallback(
    (sessionId) => {
      emit('skip', { session_id: sessionId })
      reset()
      navigate('/')
    },
    [emit, reset, navigate]
  )

  const celebrateMatch = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#8B5CF6', '#06B6D4', '#F472B6', '#A78BFA', '#22D3EE'],
    })
  }, [])

  return { startMatching, cancelMatching, skipChat, endChat, celebrateMatch }
}
