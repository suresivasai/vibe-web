// frontend/src/api/reports.js
// Purpose: Submit report
// Iteration: 4

import api from './axios'

export async function submitReport(sessionId, reportedUserId, reason) {
  const { data } = await api.post('/reports', {
    session_id: sessionId,
    reported_id: reportedUserId,
    reason,
  })
  return data
}
