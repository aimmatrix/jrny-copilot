'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useActivityStore } from '@/lib/stores/activity.store'
import { useCalendarStore } from '@/lib/stores/calendar.store'
import { CalendarView } from '@/components/CalendarView'
import { DateModal } from '@/components/DateModal'
import { approvalCount } from '@/lib/types'
import { shouldReveal } from '@/lib/wildcard'

function CalendarContent() {
  const searchParams = useSearchParams()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const { getSorted, activities } = useActivityStore()
  const { addDate, getResolved } = useCalendarStore()
  const resolved = getResolved()

  const preSelectedId = searchParams.get('activityId') ?? ''
  const allActivities = getSorted()
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
