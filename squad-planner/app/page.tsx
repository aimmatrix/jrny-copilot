'use client'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useActivityStore } from '@/lib/stores/activity.store'
import { useSessionStore, selectCurrentUser } from '@/lib/stores/session.store'
import { CardStack } from '@/components/CardStack'
import { AddMemberSheet } from '@/components/AddMemberSheet'

export default function FeedPage() {
  const router = useRouter()

  const { members, currentUserId, setCurrentUser, addMember } = useSessionStore()
  const [showAddMember, setShowAddMember] = useState(false)
  const currentUser = useSessionStore(selectCurrentUser)
  const { getUnvoted, vote, activities, addActivity } = useActivityStore()

  const unvoted = getUnvoted(currentUser.id)

  const handleVote = useCallback((activityId: string, v: 'approve' | 'disapprove') => {
    vote(activityId, currentUser.id, v)
  }, [vote, currentUser.id])

  const handleEmpty = useCallback(() => {
    router.push('/results')
  }, [router])

  function loadDemoData() {
    const demos = [
      {
        id: crypto.randomUUID(),
        postedBy: 'Alex',
        url: 'https://www.instagram.com/p/demo1/',
        platform: 'instagram' as const,
        title: 'Rooftop Sunset Bar Night',
        summary: 'A trendy rooftop bar with panoramic city views, signature cocktails, and live DJ sets every Friday. Perfect for a sunset session with the squad.',
        location: 'Sky Lounge, City Centre',
        category: 'restaurant' as const,
        votes: {},
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        postedBy: 'Bria',
        url: 'https://www.tiktok.com/@demo2/',
        platform: 'tiktok' as const,
        title: 'Go-Kart Racing Grand Prix',
        summary: 'Indoor go-kart track with professional racing karts, timing systems, and trophies for the fastest laps. Great for competitive squads.',
        location: 'SpeedZone Arena',
        category: 'activity' as const,
        votes: {},
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        postedBy: 'Cam',
        url: 'https://twitter.com/demo3/',
        platform: 'twitter' as const,
        title: 'Street Food Festival Weekend',
        summary: 'A two-day street food festival featuring 50+ vendors, live music stages, and craft beer gardens. Runs both Saturday and Sunday this month.',
        location: 'Waterfront Park',
        category: 'event' as const,
        votes: {},
        createdAt: new Date().toISOString(),
      },
    ]
    demos.forEach(addActivity)
  }

  return (
    <div>
      {/* Header + user switcher */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Squad Feed</h1>
          <p className="text-xs text-gray-400">Voting as {currentUser.name}</p>
        </div>
        <div className="flex gap-1">
          {members.map(m => (
            <button
              key={m.id}
              onClick={() => setCurrentUser(m.id)}
              title={m.name}
              className={`w-9 h-9 rounded-full text-xs font-bold transition-all border-2 ${
                currentUserId === m.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-gray-100 text-gray-600 border-transparent'
              }`}
            >
              {m.name[0]}
            </button>
          ))}
          <button
            onClick={() => setShowAddMember(true)}
            title="Add member"
            className="w-9 h-9 rounded-full text-sm font-bold border-2 border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-all"
          >
            +
          </button>
        </div>
      </div>

      {/* Empty state — no activities at all */}
      {activities.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🎉</p>
          <p className="text-gray-700 font-semibold mb-2">Nothing here yet</p>
          <p className="text-gray-400 text-sm mb-6">Share a link or load demo data</p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button
              onClick={() => router.push('/post')}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-medium"
            >
              Share a Link
            </button>
            <button
              onClick={loadDemoData}
              className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-full text-sm font-medium"
            >
              Load Demo Data
            </button>
          </div>
        </div>
      )}

      {/* All voted for this user */}
      {activities.length > 0 && unvoted.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-gray-700 font-semibold mb-2">You&apos;ve voted on everything!</p>
          <button
            onClick={() => router.push('/results')}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-medium"
          >
            See Results →
          </button>
        </div>
      )}

      {/* Card stack */}
      {unvoted.length > 0 && (
        <>
          <p className="text-xs text-gray-400 text-center mb-4">
            Swipe right 👍 to approve · left 👎 to skip · {unvoted.length} left
          </p>
          <CardStack
            activities={unvoted}
            onVote={handleVote}
            onEmpty={handleEmpty}
          />
        </>
      )}

      {showAddMember && (
        <AddMemberSheet
          onAdd={addMember}
          onClose={() => setShowAddMember(false)}
        />
      )}
    </div>
  )
}
