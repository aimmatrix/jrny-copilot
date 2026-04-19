'use client'
import { useEffect } from 'react'
import type { Activity } from '@/lib/types'
import { SwipeCard } from './SwipeCard'
import { ActivityCard } from './ActivityCard'

interface CardStackProps {
  activities: Activity[]
  onVote: (activityId: string, vote: 'approve' | 'disapprove') => void
  onEmpty: () => void
}

export function CardStack({ activities, onVote, onEmpty }: CardStackProps) {
  useEffect(() => {
    if (activities.length === 0) onEmpty()
  }, [activities.length, onEmpty])

  if (activities.length === 0) return null

  const top = activities[0]
  const behind = activities[1]

  return (
    <div className="relative w-full h-[480px]">
      {/* Card behind for visual depth */}
      {behind && (
        <div className="absolute inset-0 rounded-3xl bg-white shadow-lg scale-95 translate-y-4 pointer-events-none" />
      )}
      {/* Top draggable card */}
      <SwipeCard key={top.id} onVote={(vote) => onVote(top.id, vote)}>
        <ActivityCard activity={top} />
      </SwipeCard>
    </div>
  )
}
