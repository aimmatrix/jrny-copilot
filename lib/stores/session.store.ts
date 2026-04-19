import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Member } from '../types'

const DEMO_MEMBERS: Member[] = [
  { id: 'u1', name: 'Alex' },
  { id: 'u2', name: 'Bria' },
  { id: 'u3', name: 'Cam' },
  { id: 'u4', name: 'Dana' },
]

interface SessionStore {
  members: Member[]
  currentUserId: string
  setCurrentUser: (id: string) => void
  addMember: (name: string) => void
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      members: DEMO_MEMBERS,
      currentUserId: 'u1',
      setCurrentUser: (id) => set({ currentUserId: id }),
      addMember: (name) => set(state => {
        const id = `u${Date.now()}`
        const newMember: Member = { id, name: name.trim() }
        return { members: [...state.members, newMember] }
      }),
    }),
    {
      name: 'squad-session',
      partialize: (s) => ({ currentUserId: s.currentUserId, members: s.members }),
    }
  )
)

export const selectCurrentUser = (state: SessionStore) =>
  state.members.find(m => m.id === state.currentUserId) ?? state.members[0]
