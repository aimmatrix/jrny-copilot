import { describe, it, expect } from 'vitest'
import { approvalCount } from '@/lib/types'
import type { Activity } from '@/lib/types'

const base: Activity = {
  id: '1',
  postedBy: 'Alex',
  url: 'https://example.com',
  platform: 'other',
  title: 'Test',
  summary: 'A test activity',
  category: 'other',
  votes: {},
  createdAt: new Date().toISOString(),
}

describe('approvalCount', () => {
  it('returns 0 when no votes', () => {
    expect(approvalCount({ ...base, votes: {} })).toBe(0)
  })

  it('counts only approve votes', () => {
    expect(approvalCount({
      ...base,
      votes: { u1: 'approve', u2: 'disapprove', u3: 'approve' },
    })).toBe(2)
  })

  it('returns 0 when all disapprove', () => {
    expect(approvalCount({
      ...base,
      votes: { u1: 'disapprove', u2: 'disapprove' },
    })).toBe(0)
  })
})
