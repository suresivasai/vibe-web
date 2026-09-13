// frontend/src/api/match.js
// Purpose: HTTP match endpoints (optional complement to socket)
// Iteration: 3

import api from './axios'

export async function joinQueue() {
  const { data } = await api.post('/match/join', {})
  return data
}

export async function leaveQueue() {
  const { data } = await api.delete('/match/leave')
  return data
}

export async function skipSession(sessionId) {
  const { data } = await api.post('/match/skip', { session_id: sessionId })
  return data
}
