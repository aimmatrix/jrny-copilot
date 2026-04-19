# Squad Activity Planner — Design Spec
**Date:** 2026-04-19  
**Status:** Approved  
**Context:** Hackathon pivot — replacing the Chrome extension concept with a web app. 10-hour build. Single-device demo, architected for multi-user upgrade later.

---

## What We're Building

A group activity planning web app where friends share social media links (Twitter/X, Instagram, TikTok), the AI summarises each one, and the group swipes right/left to vote. The highest-approved activity becomes the priority pick. A calendar lets the group schedule outings, with an optional wildcard mode that hides the activity until the day-of.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | API routes keep z.AI key server-side; easy Vercel deploy |
| State | Zustand | Local for demo; swap store actions for API calls to go multi-user |
| Gestures | Framer Motion | Reliable drag-to-swipe on web, no native dependency |
| AI | z.AI via OpenAI SDK | Existing API key; OpenAI-compatible with baseURL override |
| Maps | Deferred to v2 | Removed from v1 scope |
| UI | Tailwind + shadcn/ui | Handled by separate UI skill |
| Deploy | Vercel | One command, works for browser (C) and phone mirror (B) demo |

---

## Data Models

```typescript
interface Activity {
  id: string
  postedBy: string                                      // simulated user name
  url: string                                           // original social media link
  platform: 'twitter' | 'instagram' | 'tiktok' | 'youtube' | 'other'
  title: string                                         // AI-extracted (max 8 words)
  summary: string                                       // AI summary (2-3 sentences)
  location?: string                                     // AI-extracted venue name
  category: 'restaurant' | 'activity' | 'event' | 'travel' | 'other'
  votes: Record<string, 'approve' | 'disapprove'>       // userId → vote
  createdAt: string                                     // ISO timestamp
}

interface ScheduledDate {
  id: string
  date: string                  // "YYYY-MM-DD"
  isWildcard: boolean
  activityId?: string           // assigned activity (non-wildcard, or revealed wildcard)
  wildcardActivityId?: string   // hidden until date === today
}

interface Member {
  id: string
  name: string
  avatar?: string
}
```

**Key invariants:**
- `votes` is a map — one vote per user per activity, overwrite on change
- Wildcard: `wildcardActivityId` is always set at assignment time; UI only reads it when `date <= today`
- `location` is optional — MapEmbed simply doesn't render if absent

---

## Pages

| Route | Purpose |
|---|---|
| `/` | Feed — swipe card stack of unvoted activities |
| `/post` | Add link — paste URL, trigger AI summarise, save activity |
| `/results` | Poll results — sorted by approval, priority badge on #1 |
| `/calendar` | Calendar — schedule dates, assign activity or set wildcard |

---

## API Route

### `POST /api/summarize`

**Request:**
```json
{ "url": "https://www.tiktok.com/..." }
```

**Behaviour:**
Calls z.AI (OpenAI-compatible, `baseURL: https://api.z.ai/api/paas/v4`) with a structured prompt requesting JSON output.

**Prompt:**
```
You are analysing a social media post link. Extract:
- title: short catchy title (max 8 words)
- summary: what this activity/event/place is (2-3 sentences)
- location: venue or place name if mentioned, else null
- category: one of restaurant|activity|event|travel|other
- platform: detected from URL domain (twitter|instagram|tiktok|youtube|other)
Return JSON only. No markdown, no explanation.
```

**Response:**
```json
{
  "title": "Rooftop Sunset Bar in the City",
  "summary": "A rooftop bar with panoramic city views...",
  "location": "Skybar, Downtown",
  "category": "restaurant",
  "platform": "instagram"
}
```

**Error handling:** If z.AI fails or returns malformed JSON, return a fallback activity with `title: "Untitled Activity"`, `summary: "Could not summarise this link."`, and `location: null`. Never throw to the client.

---

## Core Flows

### 1. Post a Link
```
/post → user pastes URL → POST /api/summarize
→ activity saved to useActivityStore with new id + createdAt
→ redirect to /
```

### 2. Swipe & Vote
```
/ → CardStack renders unvoted activities (filtered by currentUser.id not in activity.votes)
→ Framer Motion drag on SwipeCard
→ drag end: offset.x > 100 → approve | offset.x < -100 → disapprove | else snap back
→ vote written: activity.votes[currentUser.id] = 'approve' | 'disapprove'
→ card animates off screen → next card shown
→ stack empty → redirect to /results
```

### 3. Results & Priority
```
/results → activities sorted by approvalCount descending
  where approvalCount = Object.values(votes).filter(v => v === 'approve').length  (computed, not stored)
→ #1 gets PriorityBadge ("Top Pick")
→ each activity shows VoteBar (approve %, disapprove %) + voter names
→ "Schedule" button → navigates to /calendar with activityId pre-selected
```

### 4. Calendar & Wildcard
```
/calendar → month grid (shadcn Calendar)
→ click date → DateModal opens:
    Option A: "Assign activity" → pick from approved list → saved as ScheduledDate
    Option B: "Wildcard" → randomly picks from approved activities
              → if no approved activities exist: show toast "Vote on some activities first", close modal
              → wildcardActivityId stored, activityId left null
              → calendar shows "🃏 Surprise" on that date
→ on date === today: wildcardActivityId promoted to activityId, revealed in UI
```

---

## Component Structure

```
app/
├── page.tsx                    # Feed — swipe card stack
├── post/page.tsx               # Add link form
├── results/page.tsx            # Poll results + priority activity
├── calendar/page.tsx           # Calendar view
└── api/
    └── summarize/route.ts      # z.AI API route

lib/
├── stores/
│   ├── activity.store.ts       # activities CRUD + vote actions
│   ├── calendar.store.ts       # scheduled dates + wildcard logic
│   └── session.store.ts        # current user + simulated group members
├── ai.ts                       # z.AI OpenAI client (baseURL override)
└── wildcard.ts                 # shouldReveal(date): date <= today

components/
├── SwipeCard.tsx               # Framer Motion draggable card + snap-back
├── CardStack.tsx               # renders top N cards, fires onVote callback
├── ActivityCard.tsx            # card body: title, summary, platform badge
├── VoteBar.tsx                 # approve/disapprove % bar with voter names
├── CalendarView.tsx            # month grid wrapper around shadcn Calendar
├── DateModal.tsx               # assign activity or set wildcard
└── PriorityBadge.tsx           # "Top Pick" badge for #1 activity
```

---

## Wildcard Reveal Logic

```typescript
// lib/wildcard.ts
export function shouldReveal(date: string): boolean {
  return date <= new Date().toISOString().split('T')[0]
}

// In useCalendarStore — called on app load and on calendar render:
function resolveWildcards(dates: ScheduledDate[]): ScheduledDate[] {
  return dates.map(d => {
    if (d.isWildcard && d.wildcardActivityId && shouldReveal(d.date)) {
      return { ...d, activityId: d.wildcardActivityId }
    }
    return d
  })
}
```

---

## Simulated Users (Session Store)

For the demo, 4 hardcoded members are pre-loaded. The "current user" cycles through them via a switcher (top-right avatar tap) so the presenter can demo voting from multiple perspectives.

```typescript
const DEMO_MEMBERS: Member[] = [
  { id: 'u1', name: 'Alex' },
  { id: 'u2', name: 'Bria' },
  { id: 'u3', name: 'Cam' },
  { id: 'u4', name: 'Dana' },
]
```

---

## Explicitly Out of Scope (v1)

- Real authentication / accounts
- OG image scraping (imageUrl field reserved for v2)
- Push notifications
- In-app link preview iframe
- Google Maps / location display (deferred to v2)
- Real-time multi-user sync (Zustand → Supabase migration deferred)

---

## Multi-User Migration Path (v2)

When ready to go real multi-user:
1. Add Supabase project — `activities`, `votes`, `scheduled_dates`, `members` tables mirror the data models above
2. Replace `useActivityStore` actions with `fetch('/api/activities/...')` calls backed by Supabase
3. Add Supabase Realtime subscription in `CardStack` for live vote updates
4. Add NextAuth or Supabase Auth for real identity
5. Components are unchanged — only the store layer swaps

---

## Environment Variables

```
Z_AI_KEY=...              # z.AI API key — server-side only, never in client bundle
```
