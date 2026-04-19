import type { ScheduledDate } from './types'

export function shouldReveal(date: string): boolean {
  return date <= new Date().toISOString().split('T')[0]
}

export function resolveWildcards(dates: ScheduledDate[]): ScheduledDate[] {
  return dates.map(d => {
    if (d.isWildcard && d.wildcardActivityId && shouldReveal(d.date)) {
      return { ...d, activityId: d.wildcardActivityId }
    }
    return d
  })
}
