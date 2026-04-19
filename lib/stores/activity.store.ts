import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Activity } from '../types'
import { approvalCount } from '../types'

interface ActivityStore {
  activities: Activity[]
  addActivity: (activity: Activity) => void
  vote: (activityId: string, userId: string, vote: 'approve' | 'disapprove') => void
  getUnvoted: (userId: string) => Activity[]
  getSorted: () => Activity[]
  clearAll: () => void
}

export const useActivityStore = create<ActivityStore>()(
  persist(
    (set, get) => ({
      activities: [],
      addActivity: (activity) =>
        set(state => ({ activities: [...state.activities, activity] })),
      vote: (activityId, userId, vote) =>
        set(state => ({
          activities: state.activities.map(a =>
            a.id === activityId
              ? { ...a, votes: { ...a.votes, [userId]: vote } }
              : a
          ),
        })),
      getUnvoted: (userId) =>
        get().activities.filter(a => !(userId in a.votes)),
      getSorted: () =>
        [...get().activities].sort((a, b) => approvalCount(b) - approvalCount(a)),
      clearAll: () => set({ activities: [] }),
    }),
    { name: 'squad-activities', partialize: (s) => ({ activities: s.activities }) }
  )
)
