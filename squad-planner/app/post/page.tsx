'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useActivityStore } from '@/lib/stores/activity.store'
import { useSessionStore, selectCurrentUser } from '@/lib/stores/session.store'
import type { Activity } from '@/lib/types'

export default function PostPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { addActivity } = useActivityStore()
  const currentUser = useSessionStore(selectCurrentUser)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })

      if (!res.ok) throw new Error('API error')

      const data = await res.json()

      const activity: Activity = {
        id: crypto.randomUUID(),
        postedBy: currentUser.name,
        url: trimmed,
        platform: data.platform ?? 'other',
        title: data.title ?? 'Untitled Activity',
        summary: data.summary ?? '',
        location: data.location ?? undefined,
        category: data.category ?? 'other',
        votes: {},
        createdAt: new Date().toISOString(),
      }

      addActivity(activity)
      router.push('/')
    } catch {
      setError('Something went wrong. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Share a Link</h1>
      <p className="text-sm text-gray-500 mb-6">
        Paste any TikTok, Instagram, or Twitter link. AI will summarise it for the squad.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link
          </label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.tiktok.com/..."
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            required
            disabled={loading}
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '✨ Analysing with AI...' : 'Share with Squad'}
        </button>
      </form>

      <div className="mt-8 p-4 bg-amber-50 rounded-2xl">
        <p className="text-xs text-amber-700 font-medium mb-1">Posting as</p>
        <p className="text-sm font-bold text-amber-900">{currentUser.name}</p>
        <p className="text-xs text-amber-600 mt-1">Switch user from the Feed page</p>
      </div>
    </div>
  )
}
