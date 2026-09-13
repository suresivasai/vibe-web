// frontend/src/store/friendStore.js
// Purpose: Friends list, pending requests, unread counts
// Iteration: 5

import { create } from 'zustand'

export const useFriendStore = create((set, get) => ({
  friends: [],
  pendingRequests: [],
  unreadCounts: {},

  setFriends: (friends) => set({ friends }),
  addPendingRequest: (from) =>
    set((state) => ({
      pendingRequests: [
        ...state.pendingRequests.filter((p) => p.id !== from.id),
        from,
      ],
    })),
  removePending: (id) =>
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((p) => p.id !== id),
    })),
  markAccepted: (friend) =>
    set((state) => ({
      friends: [...state.friends, friend],
      pendingRequests: state.pendingRequests.filter((p) => p.id !== friend.id),
    })),
  setUnread: (friendId, count) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [friendId]: count },
    })),
  clearUnread: (friendId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [friendId]: 0 },
    })),
}))
