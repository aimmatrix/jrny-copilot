export interface Activity {
  id: string
  postedBy: string
  url: string
  platform: 'twitter' | 'instagram' | 'tiktok' | 'youtube' | 'other'
  title: string
  summary: string
  location?: string
  category: 'restaurant' | 'activity' | 'event' | 'travel' | 'other'
  votes: Record<string, 'approve' | 'disapprove'>
  createdAt: string
}

export interface ScheduledDate {
  id: string
  date: string // "YYYY-MM-DD"
  isWildcard: boolean
  activityId?: string
  wildcardActivityId?: string
}

export interface Member {
  id: string
  name: string
  avatar?: string
}

export function approvalCount(activity: Activity): number {
  return Object.values(activity.votes).filter(v => v === 'approve').length
}
