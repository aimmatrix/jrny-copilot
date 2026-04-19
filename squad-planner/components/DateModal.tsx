'use client'
import { useState } from 'react'
import type { Activity } from '@/lib/types'

interface DateModalProps {
  date: string
  approvedActivities: Activity[]
  onAssign: (activityId: string) => void
  onWildcard: () => void
  onClose: () => void
}

export function DateModal({
  date,
  approvedActivities,
  onAssign,
  onWildcard,
  onClose,
}: DateModalProps) {
  const [selected, setSelected] = useState('')

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full p-6 max-h-[75vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-1">Schedule for {date}</h2>
        <p className="text-sm text-gray-400 mb-5">Pick an activity or go wildcard 🃏</p>

        {approvedActivities.length > 0 ? (
          <div className="space-y-2 mb-5">
            {approvedActivities.map(a => (
              <button
                key={a.id}
                onClick={() => setSelected(a.id)}
                className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${
                  selected === a.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {a.title}
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-5 p-4 bg-amber-50 rounded-2xl">
            <p className="text-sm text-amber-700">
              No approved activities yet. Vote on some from the feed first!
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            disabled={!selected}
            onClick={() => selected && onAssign(selected)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Assign
          </button>
          <button
            onClick={onWildcard}
            disabled={approvedActivities.length === 0}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🃏 Wildcard
          </button>
        </div>
      </div>
    </div>
  )
}
