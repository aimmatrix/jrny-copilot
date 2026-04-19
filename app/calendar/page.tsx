'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useActivityStore } from '@/lib/stores/activity.store'
import { useCalendarStore } from '@/lib/stores/calendar.store'
import { CalendarView } from '@/components/CalendarView'
import { DateModal } from '@/components/DateModal'
import { approvalCount } from '@/lib/types'
import { shouldReveal } from '@/lib/wildcard'

function CalendarContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const { getSorted, activities } = useActivityStore()
  const { addDate, getResolved, dates } = useCalendarStore()
  const resolved = getResolved()

  const preSelectedId = searchParams.get('activityId') ?? ''
  const allActivities = getSorted()
  const hasActivities = allActivities.length > 0
  const approvedActivities = getSorted().filter(a => approvalCount(a) > 0)

  function handleSelectDate(date: Date) {
    const str = date.toISOString().split('T')[0]
    setSelectedDate(str)
  }

  function handleAssign(activityId: string) {
    if (!selectedDate) return
    addDate({
      id: crypto.randomUUID(),
      date: selectedDate,
      isWildcard: false,
      activityId,
    })
    setSelectedDate(null)
  }

  function handleWildcard() {
    if (!selectedDate || approvedActivities.length === 0) return
    const random = approvedActivities[Math.floor(Math.random() * approvedActivities.length)]
    addDate({
      id: crypto.randomUUID(),
      date: selectedDate,
      isWildcard: true,
      wildcardActivityId: random.id,
    })
    setSelectedDate(null)
  }

  function getTitle(activityId: string): string {
    return activities.find(a => a.id === activityId)?.title ?? 'Unknown'
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>
      {!hasActivities && (
        <div className="mb-4 p-4 bg-amber-50 rounded-2xl border border-amber-200">
          <p className="text-sm text-amber-800 font-medium mb-2">No activities to schedule yet</p>
          <p className="text-xs text-amber-600 mb-3">Go to the feed and load demo data or share a link first.</p>
          <button
            onClick={() => router.push('/')}
            className="text-xs bg-amber-500 text-white px-4 py-2 rounded-full font-semibold"
          >
            Go to Feed →
          </button>
        </div>
      )}
      <CalendarView scheduledDates={resolved} onSelectDate={handleSelectDate} />

      {resolved.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Scheduled</h2>
          {resolved
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(d => {
              const revealed = !d.isWildcard || shouldReveal(d.date)
              return (
                <div
                  key={d.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-gray-600">{d.date}</span>
                  <span className="text-sm text-gray-800 font-semibold">
                    {d.isWildcard && !revealed
                      ? '🃏 Revealed on the day'
                      : d.activityId
                        ? getTitle(d.activityId)
                        : '—'}
                  </span>
                </div>
              )
            })}
        </div>
      )}

      {selectedDate && (
        <DateModal
          date={selectedDate}
          activities={allActivities}
          approvedActivities={approvedActivities}
          preSelectedId={preSelectedId}
          onAssign={handleAssign}
          onWildcard={handleWildcard}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarContent />
    </Suspense>
  )
}
