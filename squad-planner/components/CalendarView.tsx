'use client'
import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import type { ScheduledDate } from '@/lib/types'

interface CalendarViewProps {
  scheduledDates: ScheduledDate[]
  onSelectDate: (date: Date) => void
}

export function CalendarView({ scheduledDates, onSelectDate }: CalendarViewProps) {
  const [month, setMonth] = useState(new Date())
  const scheduled = new Set(scheduledDates.map(d => d.date))

  return (
    <Calendar
      mode="single"
      month={month}
      onMonthChange={setMonth}
      onDayClick={(date) => onSelectDate(date)}
      modifiers={{
        scheduled: (date) => scheduled.has(date.toISOString().split('T')[0]),
      }}
      modifiersClassNames={{
        scheduled: 'bg-indigo-100 text-indigo-700 font-bold rounded-full',
      }}
      className="rounded-2xl border border-gray-100 shadow-sm w-full"
    />
  )
}
