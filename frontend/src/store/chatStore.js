// frontend/src/store/chatStore.js
// Purpose: Session, messages, stranger info, typing state
// Iteration: 3 (fixed: dedupe optimistic + server messages)

import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
  sessionId: null,
  stranger: null,
  messages: [],
  isTyping: false,
  status: 'idle',

  setSession: (sessionId) =>
    set((state) => ({
      sessionId,
      status: 'matched',
      messages: state.sessionId === sessionId ? state.messages : [],
    })),

  setStranger: (stranger) => set({ stranger }),
  updateStranger: (updates) => set((state) => ({ stranger: { ...state.stranger, ...updates } })),

  addMessage: (msg) =>
    set((state) => {
      if (state.messages.some((m) => m.id === msg.id)) return state
      const withoutTemp = state.messages.filter((m) => {
        if (!String(m.id).startsWith('temp-')) return true
        if (m.sender_id === msg.sender_id && m.content === msg.content) return false
        return true
      })
      return { messages: [...withoutTemp, msg] }
    }),

  addSystemMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: `system-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: 'system',
          content,
          sent_at: new Date().toISOString(),
        },
      ],
    })),

  setTyping: (isTyping) => set({ isTyping }),
  setStatus: (status) => set({ status }),

  clearSession: () =>
    set({
      sessionId: null,
      stranger: null,
      messages: [],
      isTyping: false,
      status: 'ended',
    }),

  reset: () =>
    set({
      sessionId: null,
      stranger: null,
      messages: [],
      isTyping: false,
      status: 'idle',
    }),
}))
