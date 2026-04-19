import type { Activity } from '@/lib/types'

const PLATFORM_STYLES: Record<Activity['platform'], string> = {
  twitter:   'bg-sky-100 text-sky-700',
  instagram: 'bg-pink-100 text-pink-700',
  tiktok:    'bg-violet-100 text-violet-700',
  youtube:   'bg-red-100 text-red-700',
  other:     'bg-gray-100 text-gray-600',
}

const CATEGORY_EMOJI: Record<Activity['category'], string> = {
  restaurant: '🍽️',
  activity:   '🎯',
  event:      '🎉',
  travel:     '✈️',
  other:      '📌',
}

interface ActivityCardProps {
  activity: Activity
}

export function ActivityCard({ activity }: ActivityCardProps) {
  return (
    <div className="w-full h-full rounded-3xl bg-white shadow-2xl p-6 flex flex-col select-none">
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${PLATFORM_STYLES[activity.platform]}`}>
          {activity.platform}
        </span>
        <span className="text-xl">{CATEGORY_EMOJI[activity.category]}</span>
        <span className="ml-auto text-xs text-gray-400">by {activity.postedBy}</span>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
        {activity.title}
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed flex-1">
        {activity.summary}
      </p>

      {activity.location && (
        <p className="mt-4 text-xs text-gray-400 flex items-center gap-1">
          📍 {activity.location}
        </p>
      )}

      <a
        href={activity.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 text-xs text-indigo-400 hover:text-indigo-600 truncate block"
        onClick={e => e.stopPropagation()}
      >
        {activity.url}
      </a>
    </div>
  )
}
