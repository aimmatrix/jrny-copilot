'use client'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useActivityStore } from '@/lib/stores/activity.store'
import { useSessionStore } from '@/lib/stores/session.store'
import { VoteBar } from '@/components/VoteBar'
import { PriorityBadge } from '@/components/PriorityBadge'
import { approvalCount } from '@/lib/types'

export default function ResultsPage() {
  const router = useRouter()
  const { getSorted, activities } = useActivityStore()
  const { members } = useSessionStore()
  const sorted = getSorted()
  const topCount = sorted.length > 0 ? approvalCount(sorted[0]) : 0
  const tied = topCount > 0 ? sorted.filter(a => approvalCount(a) === topCount) : []
  const priorityId = useMemo(() => {
    if (tied.length === 0) return ''
    return tied[Math.floor(Math.random() * tied.length)].id
  }, [tied.length, topCount])

  if (activities.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-5xl mb-4">📭</p>
        <p className="text-gray-600 mb-4">No activities shared yet.</p>
        <button
          onClick={() => router.push('/post')}
          className="text-indigo-600 text-sm font-medium"
        >
          Share one →
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Results</h1>
      <div className="space-y-3">
        {sorted.map((activity, i) => {
          const count = approvalCount(activity)
          const total = Object.keys(activity.votes).length

          return (
            <div key={activity.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-sm font-bold text-gray-400 w-5 shrink-0 mt-0.5">
                  {i + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {activity.id === priorityId && <PriorityBadge />}
                    <span className="text-sm font-semibold text-gray-800 leading-tight">
                      {activity.title}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                    {activity.summary}
                  </p>
                  {total > 0 ? (
                    <VoteBar activity={activity} members={members} />
                  ) : (
                    <p className="text-xs text-gray-300 italic">No votes yet</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => router.push(`/calendar?activityId=${activity.id}`)}
                  className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                >
                  Schedule this →
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
