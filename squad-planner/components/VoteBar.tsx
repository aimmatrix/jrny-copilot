import type { Activity, Member } from '@/lib/types'
import { approvalCount } from '@/lib/types'

interface VoteBarProps {
  activity: Activity
  members: Member[]
}

export function VoteBar({ activity, members }: VoteBarProps) {
  const total = Object.keys(activity.votes).length
  const approved = approvalCount(activity)
  const approvePercent = total > 0 ? Math.round((approved / total) * 100) : 0

  const approvers = members
    .filter(m => activity.votes[m.id] === 'approve')
    .map(m => m.name)
  const disapprovers = members
    .filter(m => activity.votes[m.id] === 'disapprove')
    .map(m => m.name)

  return (
    <div className="w-full">
      <div className="flex rounded-full overflow-hidden h-2.5 mb-2 bg-gray-100">
        <div
          className="bg-green-400 transition-all duration-500"
          style={{ width: `${approvePercent}%` }}
        />
        <div
          className="bg-red-400 transition-all duration-500"
          style={{ width: `${100 - approvePercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span className="text-green-600">
          {approved} 👍{approvers.length > 0 && ` · ${approvers.join(', ')}`}
        </span>
        <span className="text-red-500">
          {total - approved} 👎{disapprovers.length > 0 && ` · ${disapprovers.join(', ')}`}
        </span>
      </div>
    </div>
  )
}
