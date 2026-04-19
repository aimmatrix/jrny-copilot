import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScheduledDate } from '../types'
import { resolveWildcards } from '../wildcard'

interface CalendarStore {
  dates: ScheduledDate[]
  addDate: (date: ScheduledDate) => void
  removeDate: (id: string) => void
  getDate: (dateStr: string) => ScheduledDate | undefined
  getResolved: () => ScheduledDate[]
}

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      dates: [],
      addDate: (date) =>
        set(state => ({
          dates: state.dates.some(d => d.date === date.date)
            ? state.dates.map(d => d.date === date.date ? date : d)
            : [...state.dates, date],
        })),
      removeDate: (id) =>
        set(state => ({ dates: state.dates.filter(d => d.id !== id) })),
      getDate: (dateStr) =>
        get().dates.find(d => d.date === dateStr),
      getResolved: () =>
        resolveWildcards(get().dates),
    }),
    { name: 'squad-calendar', partialize: (s) => ({ dates: s.dates }) }
  )
)
