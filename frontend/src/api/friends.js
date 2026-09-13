// frontend/src/api/friends.js
// Purpose: Friend API calls
// Iteration: 5

import api from './axios'

export async function listFriends() {
  const { data } = await api.get('/friends')
  return data
}

export async function sendFriendRequest(targetUserId) {
  const { data } = await api.post('/friends/request', {
    target_user_id: targetUserId,
  })
  return data
}

export async function acceptFriend(friendId) {
  const { data } = await api.patch(`/friends/${friendId}/accept`)
  return data
}

export async function removeFriend(friendId) {
  const { data } = await api.delete(`/friends/${friendId}`)
  return data
}

export async function getFriendChat(friendId, page = 1, limit = 30) {
  const { data } = await api.get(`/friends/chats/${friendId}`, {
    params: { page, limit },
  })
  return data
}

export async function sendFriendMessage(friendId, content) {
  const { data } = await api.post(`/friends/chats/${friendId}/messages`, {
    content,
  })
  return data
}

export async function clearFriendChat(friendId) {
  const { data } = await api.delete(`/friends/chats/${friendId}/messages`)
  return data
}
