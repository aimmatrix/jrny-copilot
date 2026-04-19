import { describe, it, expect } from 'vitest'
import { shouldReveal, resolveWildcards } from '@/lib/wildcard'
import type { ScheduledDate } from '@/lib/types'

describe('shouldReveal', () => {
  it('returns true for today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(shouldReveal(today)).toBe(true)
  })

  it('returns true for past dates', () => {
    expect(shouldReveal('2020-01-01')).toBe(true)
  })

  it('returns false for future dates', () => {
    expect(shouldReveal('2099-12-31')).toBe(false)
  })
})

describe('resolveWildcards', () => {
  it('promotes wildcardActivityId to activityId when date is past', () => {
    const dates: ScheduledDate[] = [{
      id: '1', date: '2020-01-01', isWildcard: true, wildcardActivityId: 'act-1',
    }]
    expect(resolveWildcards(dates)[0].activityId).toBe('act-1')
  })

  it('does not reveal wildcard for future dates', () => {
    const dates: ScheduledDate[] = [{
      id: '2', date: '2099-12-31', isWildcard: true, wildcardActivityId: 'act-2',
    }]
    expect(resolveWildcards(dates)[0].activityId).toBeUndefined()
  })

  it('leaves non-wildcard dates unchanged', () => {
    const dates: ScheduledDate[] = [{
      id: '3', date: '2020-01-01', isWildcard: false, activityId: 'act-3',
    }]
    expect(resolveWildcards(dates)[0].activityId).toBe('act-3')
  })

  it('does not reveal wildcard without a wildcardActivityId', () => {
    const dates: ScheduledDate[] = [{
      id: '4', date: '2020-01-01', isWildcard: true,
    }]
    expect(resolveWildcards(dates)[0].activityId).toBeUndefined()
  })
})
