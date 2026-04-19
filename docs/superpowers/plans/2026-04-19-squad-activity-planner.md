# Squad Activity Planner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js group activity planning app where friends share social media links, AI summarises them, and the group swipes to vote — with a calendar for scheduling and wildcard reveal.

**Architecture:** Next.js 14 App Router with Zustand stores for all client state (single-device demo, no backend). z.AI is called from a Next.js API route to keep the key server-side. Framer Motion handles swipe gestures. All state persists to localStorage via Zustand persist middleware so the demo survives a page refresh.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Zustand + persist, Framer Motion, OpenAI SDK (z.AI), Vitest

---

## File Map

```
squad-planner/                        ← new directory created in Task 1
├── .env.local                        ← Z_AI_KEY (never committed)
├── vitest.config.ts
├── vitest.setup.ts
├── __tests__/
│   ├── wildcard.test.ts
│   └── types.test.ts
├── app/
│   ├── layout.tsx                    ← root layout + Nav
│   ├── globals.css
│   ├── page.tsx                      ← Feed (swipe cards)
│   ├── post/page.tsx                 ← Paste link + AI summarise
│   ├── results/page.tsx              ← Poll results + priority
│   ├── calendar/page.tsx             ← Calendar + wildcard scheduling
│   └── api/summarize/route.ts        ← z.AI API route
├── lib/
│   ├── types.ts                      ← Activity, ScheduledDate, Member, approvalCount()
│   ├── ai.ts                         ← z.AI OpenAI client
│   ├── wildcard.ts                   ← shouldReveal(), resolveWildcards()
│   └── stores/
│       ├── activity.store.ts         ← activities CRUD + vote actions
│       ├── calendar.store.ts         ← scheduled dates + wildcard resolution
│       └── session.store.ts          ← current user + demo members
└── components/
    ├── Nav.tsx                       ← bottom nav bar
    ├── SwipeCard.tsx                 ← Framer Motion draggable card
    ├── CardStack.tsx                 ← renders top card + depth card
    ├── ActivityCard.tsx              ← card body: title, summary, platform badge
    ├── VoteBar.tsx                   ← approve/disapprove % bar + names
    ├── PriorityBadge.tsx             ← "⭐ Top Pick" badge
    ├── CalendarView.tsx              ← shadcn Calendar wrapper
    └── DateModal.tsx                 ← assign activity or set wildcard
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `squad-planner/` (new Next.js project)
- Create: `squad-planner/.env.local`
- Create: `squad-planner/vitest.config.ts`
- Create: `squad-planner/vitest.setup.ts`

- [ ] **Step 1: Scaffold Next.js app**

Run from the repo root (i.e. the `agently` directory):

```bash
npx create-next-app@latest squad-planner \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --no-turbopack
cd squad-planner
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install zustand framer-motion openai
```

- [ ] **Step 3: Install and init shadcn/ui**

```bash
npx shadcn@latest init -d
npx shadcn@latest add calendar button input card badge dialog
```

When prompted, accept defaults. This installs shadcn components into `components/ui/`.

- [ ] **Step 4: Install test dependencies**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 5: Create vitest config**

Create `squad-planner/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 6: Create vitest setup file**

Create `squad-planner/vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Add test script to package.json**

In `squad-planner/package.json`, add to the `"scripts"` block:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 8: Create .env.local**

Create `squad-planner/.env.local`:

```
Z_AI_KEY=b0db6c0b67ce4d2e980a475378c4488c.FMOigABbtHwBCEVm
```

Verify `.gitignore` already includes `.env.local` (create-next-app adds it by default).

- [ ] **Step 9: Verify scaffold**

```bash
npm run dev
```

Expected: Next.js dev server starts on `http://localhost:3000` with no errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold squad-planner Next.js app"
```

---

## Task 2: Types + approvalCount

**Files:**
- Create: `squad-planner/lib/types.ts`
- Create: `squad-planner/__tests__/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `squad-planner/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { approvalCount } from '@/lib/types'
import type { Activity } from '@/lib/types'

const base: Activity = {
  id: '1',
  postedBy: 'Alex',
  url: 'https://example.com',
  platform: 'other',
  title: 'Test',
  summary: 'A test activity',
  category: 'other',
  votes: {},
  createdAt: new Date().toISOString(),
}

describe('approvalCount', () => {
  it('returns 0 when no votes', () => {
    expect(approvalCount({ ...base, votes: {} })).toBe(0)
  })

  it('counts only approve votes', () => {
    expect(approvalCount({
      ...base,
      votes: { u1: 'approve', u2: 'disapprove', u3: 'approve' },
    })).toBe(2)
  })

  it('returns 0 when all disapprove', () => {
    expect(approvalCount({
      ...base,
      votes: { u1: 'disapprove', u2: 'disapprove' },
    })).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test
```

Expected: FAIL — `Cannot find module '@/lib/types'`

- [ ] **Step 3: Create types**

Create `squad-planner/lib/types.ts`:

```typescript
export interface Activity {
  id: string
  postedBy: string
  url: string
  platform: 'twitter' | 'instagram' | 'tiktok' | 'youtube' | 'other'
  title: string
  summary: string
  location?: string
  category: 'restaurant' | 'activity' | 'event' | 'travel' | 'other'
  votes: Record<string, 'approve' | 'disapprove'>
  createdAt: string
}

export interface ScheduledDate {
  id: string
  date: string // "YYYY-MM-DD"
  isWildcard: boolean
  activityId?: string
  wildcardActivityId?: string
}

export interface Member {
  id: string
  name: string
  avatar?: string
}

export function approvalCount(activity: Activity): number {
  return Object.values(activity.votes).filter(v => v === 'approve').length
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test
```

Expected: PASS — 3 tests in types.test.ts

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts __tests__/types.test.ts
git commit -m "feat: add shared types and approvalCount"
```

---

## Task 3: Wildcard Logic

**Files:**
- Create: `squad-planner/lib/wildcard.ts`
- Create: `squad-planner/__tests__/wildcard.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `squad-planner/__tests__/wildcard.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { shouldReveal, resolveWildcards } from '@/lib/wildcard'
import type { ScheduledDate } from '@/lib/types'

describe('shouldReveal', () => {
  it('returns true for today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(shouldReveal(today)).toBe(true)
  })

  it('returns true for past dates', () => {
    expect(shouldReveal('2020-01-01')).toBe(true)
  })

  it('returns false for future dates', () => {
    expect(shouldReveal('2099-12-31')).toBe(false)
  })
})

describe('resolveWildcards', () => {
  it('promotes wildcardActivityId to activityId when date is past', () => {
    const dates: ScheduledDate[] = [{
      id: '1', date: '2020-01-01', isWildcard: true, wildcardActivityId: 'act-1',
    }]
    expect(resolveWildcards(dates)[0].activityId).toBe('act-1')
  })

  it('does not reveal wildcard for future dates', () => {
    const dates: ScheduledDate[] = [{
      id: '2', date: '2099-12-31', isWildcard: true, wildcardActivityId: 'act-2',
    }]
    expect(resolveWildcards(dates)[0].activityId).toBeUndefined()
  })

  it('leaves non-wildcard dates unchanged', () => {
    const dates: ScheduledDate[] = [{
      id: '3', date: '2020-01-01', isWildcard: false, activityId: 'act-3',
    }]
    expect(resolveWildcards(dates)[0].activityId).toBe('act-3')
  })

  it('does not reveal wildcard without a wildcardActivityId', () => {
    const dates: ScheduledDate[] = [{
      id: '4', date: '2020-01-01', isWildcard: true,
    }]
    expect(resolveWildcards(dates)[0].activityId).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test
```

Expected: FAIL — `Cannot find module '@/lib/wildcard'`

- [ ] **Step 3: Implement wildcard logic**

Create `squad-planner/lib/wildcard.ts`:

```typescript
import type { ScheduledDate } from './types'

export function shouldReveal(date: string): boolean {
  return date <= new Date().toISOString().split('T')[0]
}

export function resolveWildcards(dates: ScheduledDate[]): ScheduledDate[] {
  return dates.map(d => {
    if (d.isWildcard && d.wildcardActivityId && shouldReveal(d.date)) {
      return { ...d, activityId: d.wildcardActivityId }
    }
    return d
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test
```

Expected: PASS — all 7 tests (3 types + 4 wildcard)

- [ ] **Step 5: Commit**

```bash
git add lib/wildcard.ts __tests__/wildcard.test.ts
git commit -m "feat: add wildcard reveal logic with tests"
```

---

## Task 4: Zustand Stores

**Files:**
- Create: `squad-planner/lib/stores/session.store.ts`
- Create: `squad-planner/lib/stores/activity.store.ts`
- Create: `squad-planner/lib/stores/calendar.store.ts`

- [ ] **Step 1: Create session store**

Create `squad-planner/lib/stores/session.store.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Member } from '../types'

const DEMO_MEMBERS: Member[] = [
  { id: 'u1', name: 'Alex' },
  { id: 'u2', name: 'Bria' },
  { id: 'u3', name: 'Cam' },
  { id: 'u4', name: 'Dana' },
]

interface SessionStore {
  members: Member[]
  currentUserId: string
  setCurrentUser: (id: string) => void
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      members: DEMO_MEMBERS,
      currentUserId: 'u1',
      setCurrentUser: (id) => set({ currentUserId: id }),
    }),
    { name: 'squad-session' }
  )
)

export const selectCurrentUser = (state: SessionStore) =>
  state.members.find(m => m.id === state.currentUserId) ?? state.members[0]
```

- [ ] **Step 2: Create activity store**

Create `squad-planner/lib/stores/activity.store.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Activity } from '../types'
import { approvalCount } from '../types'

interface ActivityStore {
  activities: Activity[]
  addActivity: (activity: Activity) => void
  vote: (activityId: string, userId: string, vote: 'approve' | 'disapprove') => void
  getUnvoted: (userId: string) => Activity[]
  getSorted: () => Activity[]
  clearAll: () => void
}

export const useActivityStore = create<ActivityStore>()(
  persist(
    (set, get) => ({
      activities: [],
      addActivity: (activity) =>
        set(state => ({ activities: [...state.activities, activity] })),
      vote: (activityId, userId, vote) =>
        set(state => ({
          activities: state.activities.map(a =>
            a.id === activityId
              ? { ...a, votes: { ...a.votes, [userId]: vote } }
              : a
          ),
        })),
      getUnvoted: (userId) =>
        get().activities.filter(a => !(userId in a.votes)),
      getSorted: () =>
        [...get().activities].sort((a, b) => approvalCount(b) - approvalCount(a)),
      clearAll: () => set({ activities: [] }),
    }),
    { name: 'squad-activities' }
  )
)
```

- [ ] **Step 3: Create calendar store**

Create `squad-planner/lib/stores/calendar.store.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScheduledDate } from '../types'
import { resolveWildcards } from '../wildcard'

interface CalendarStore {
  dates: ScheduledDate[]
  addDate: (date: ScheduledDate) => void
  removeDate: (id: string) => void
  getDate: (dateStr: string) => ScheduledDate | undefined
  getResolved: () => ScheduledDate[]
}

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      dates: [],
      addDate: (date) =>
        set(state => ({ dates: [...state.dates, date] })),
      removeDate: (id) =>
        set(state => ({ dates: state.dates.filter(d => d.id !== id) })),
      getDate: (dateStr) =>
        get().dates.find(d => d.date === dateStr),
      getResolved: () =>
        resolveWildcards(get().dates),
    }),
    { name: 'squad-calendar' }
  )
)
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add lib/stores/
git commit -m "feat: add zustand stores for session, activities, and calendar"
```

---

## Task 5: z.AI Client + API Route

**Files:**
- Create: `squad-planner/lib/ai.ts`
- Create: `squad-planner/app/api/summarize/route.ts`

- [ ] **Step 1: Create z.AI client**

Create `squad-planner/lib/ai.ts`:

```typescript
import OpenAI from 'openai'

export const zai = new OpenAI({
  apiKey: process.env.Z_AI_KEY,
  baseURL: 'https://api.z.ai/api/paas/v4',
})
```

- [ ] **Step 2: Create summarize API route**

Create `squad-planner/app/api/summarize/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { zai } from '@/lib/ai'

const SYSTEM_PROMPT = `You are analysing a social media post link. Extract:
- title: short catchy title describing the activity or place (max 8 words)
- summary: what this activity, event, or place is about (2-3 sentences)
- location: venue or place name if mentioned, else null
- category: one of restaurant|activity|event|travel|other
- platform: detected from URL domain (twitter|instagram|tiktok|youtube|other)
Return JSON only. No markdown, no explanation, no extra keys.`

const FALLBACK = {
  title: 'Untitled Activity',
  summary: 'Could not summarise this link. Add it manually.',
  location: null,
  category: 'other',
  platform: 'other',
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json(FALLBACK)
    }

    const completion = await zai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: url },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return NextResponse.json(FALLBACK)

    const data = JSON.parse(content)
    return NextResponse.json({
      title: data.title ?? FALLBACK.title,
      summary: data.summary ?? FALLBACK.summary,
      location: data.location ?? null,
      category: data.category ?? 'other',
      platform: data.platform ?? 'other',
    })
  } catch {
    return NextResponse.json(FALLBACK)
  }
}
```

- [ ] **Step 3: Manually test the API route**

Start the dev server (`npm run dev`) then in a new terminal:

```bash
curl -X POST http://localhost:3000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.tiktok.com/@gordonramsay"}'
```

Expected: JSON with `title`, `summary`, `location`, `category`, `platform` fields. If z.AI returns a model error, check the model name — try `gpt-4o` or `claude-3-haiku` depending on what z.AI supports.

- [ ] **Step 4: Commit**

```bash
git add lib/ai.ts app/api/summarize/route.ts
git commit -m "feat: add z.AI client and summarize API route"
```

---

## Task 6: SwipeCard + CardStack + ActivityCard

**Files:**
- Create: `squad-planner/components/SwipeCard.tsx`
- Create: `squad-planner/components/CardStack.tsx`
- Create: `squad-planner/components/ActivityCard.tsx`

- [ ] **Step 1: Create SwipeCard**

Create `squad-planner/components/SwipeCard.tsx`:

```tsx
'use client'
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'

interface SwipeCardProps {
  onVote: (vote: 'approve' | 'disapprove') => void
  children: React.ReactNode
}

export function SwipeCard({ onVote, children }: SwipeCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-25, 25])
  const approveOpacity = useTransform(x, [20, 100], [0, 1])
  const rejectOpacity = useTransform(x, [-100, -20], [1, 0])

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 100) {
      onVote('approve')
    } else if (info.offset.x < -100) {
      onVote('disapprove')
    }
  }

  return (
    <motion.div
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      whileDrag={{ scale: 1.03 }}
    >
      {/* Approve overlay */}
      <motion.div
        style={{ opacity: approveOpacity }}
        className="absolute top-6 left-6 z-10 rotate-[-15deg] border-4 border-green-500 text-green-500 font-black text-2xl px-3 py-1 rounded-lg pointer-events-none"
      >
        LIKE
      </motion.div>
      {/* Reject overlay */}
      <motion.div
        style={{ opacity: rejectOpacity }}
        className="absolute top-6 right-6 z-10 rotate-[15deg] border-4 border-red-500 text-red-500 font-black text-2xl px-3 py-1 rounded-lg pointer-events-none"
      >
        NOPE
      </motion.div>
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 2: Create ActivityCard**

Create `squad-planner/components/ActivityCard.tsx`:

```tsx
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
```

- [ ] **Step 3: Create CardStack**

Create `squad-planner/components/CardStack.tsx`:

```tsx
'use client'
import { useEffect } from 'react'
import type { Activity } from '@/lib/types'
import { SwipeCard } from './SwipeCard'
import { ActivityCard } from './ActivityCard'

interface CardStackProps {
  activities: Activity[]
  onVote: (activityId: string, vote: 'approve' | 'disapprove') => void
  onEmpty: () => void
}

export function CardStack({ activities, onVote, onEmpty }: CardStackProps) {
  useEffect(() => {
    if (activities.length === 0) onEmpty()
  }, [activities.length, onEmpty])

  if (activities.length === 0) return null

  const top = activities[0]
  const behind = activities[1]

  return (
    <div className="relative w-full h-[480px]">
      {/* Card behind for visual depth */}
      {behind && (
        <div className="absolute inset-0 rounded-3xl bg-white shadow-lg scale-95 translate-y-4 pointer-events-none" />
      )}
      {/* Top draggable card */}
      <SwipeCard key={top.id} onVote={(vote) => onVote(top.id, vote)}>
        <ActivityCard activity={top} />
      </SwipeCard>
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add components/SwipeCard.tsx components/CardStack.tsx components/ActivityCard.tsx
git commit -m "feat: add swipe card components with Framer Motion"
```

---

## Task 7: VoteBar + PriorityBadge

**Files:**
- Create: `squad-planner/components/VoteBar.tsx`
- Create: `squad-planner/components/PriorityBadge.tsx`

- [ ] **Step 1: Create VoteBar**

Create `squad-planner/components/VoteBar.tsx`:

```tsx
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
```

- [ ] **Step 2: Create PriorityBadge**

Create `squad-planner/components/PriorityBadge.tsx`:

```tsx
export function PriorityBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold shrink-0">
      ⭐ Top Pick
    </span>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/VoteBar.tsx components/PriorityBadge.tsx
git commit -m "feat: add VoteBar and PriorityBadge components"
```

---

## Task 8: Nav + Root Layout

**Files:**
- Create: `squad-planner/components/Nav.tsx`
- Modify: `squad-planner/app/layout.tsx`

- [ ] **Step 1: Create Nav component**

Create `squad-planner/components/Nav.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/',         label: 'Feed',     icon: '🃏' },
  { href: '/post',     label: 'Post',     icon: '➕' },
  { href: '/results',  label: 'Results',  icon: '📊' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 z-50 max-w-md mx-auto left-1/2 -translate-x-1/2 w-full">
      {LINKS.map(link => (
        <Link
          key={link.href}
          href={link.href}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-xs transition-colors ${
            pathname === link.href
              ? 'text-indigo-600 font-semibold'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="text-xl">{link.icon}</span>
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Update root layout**

Replace the entire content of `squad-planner/app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/Nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Squad Planner',
  description: 'Plan your next squad outing',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <div className="max-w-md mx-auto px-4 pt-6 pb-24 min-h-screen">
          {children}
        </div>
        <Nav />
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: bottom nav bar visible with 4 icons.

- [ ] **Step 4: Commit**

```bash
git add components/Nav.tsx app/layout.tsx
git commit -m "feat: add Nav and root layout"
```

---

## Task 9: Post Page

**Files:**
- Create: `squad-planner/app/post/page.tsx`

- [ ] **Step 1: Create post page**

Create `squad-planner/app/post/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Test in browser**

- Go to `/post`
- Paste `https://www.tiktok.com/@gordonramsay`
- Click "Share with Squad"
- Expected: loading spinner → redirect to `/` with the activity added to state

- [ ] **Step 3: Commit**

```bash
git add app/post/page.tsx
git commit -m "feat: add post page with AI summarise flow"
```

---

## Task 10: Feed Page

**Files:**
- Create: `squad-planner/app/page.tsx`

- [ ] **Step 1: Create feed page**

Replace `squad-planner/app/page.tsx` with:

```tsx
'use client'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useActivityStore } from '@/lib/stores/activity.store'
import { useSessionStore, selectCurrentUser } from '@/lib/stores/session.store'
import { CardStack } from '@/components/CardStack'

export default function FeedPage() {
  const router = useRouter()

  const { members, currentUserId, setCurrentUser } = useSessionStore()
  const currentUser = useSessionStore(selectCurrentUser)
  const { getUnvoted, vote, activities } = useActivityStore()

  const unvoted = getUnvoted(currentUser.id)

  const handleVote = useCallback((activityId: string, v: 'approve' | 'disapprove') => {
    vote(activityId, currentUser.id, v)
  }, [vote, currentUser.id])

  const handleEmpty = useCallback(() => {
    router.push('/results')
  }, [router])

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
        </div>
      </div>

      {/* Empty state — no activities at all */}
      {activities.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🎉</p>
          <p className="text-gray-700 font-semibold mb-2">Nothing here yet</p>
          <p className="text-gray-400 text-sm mb-6">Be the first to share a link with the squad</p>
          <button
            onClick={() => router.push('/post')}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-medium"
          >
            Share a Link
          </button>
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
    </div>
  )
}
```

- [ ] **Step 2: Test in browser**

- Add an activity via `/post`
- Go to `/` — card stack should appear
- Drag right — card disappears, "approve" registered
- When all voted — redirects to `/results`

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add feed page with swipe voting"
```

---

## Task 11: Results Page

**Files:**
- Create: `squad-planner/app/results/page.tsx`

- [ ] **Step 1: Create results page**

Create `squad-planner/app/results/page.tsx`:

```tsx
'use client'
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
                    {i === 0 && count > 0 && <PriorityBadge />}
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
```

- [ ] **Step 2: Test in browser**

- Vote on some activities from the feed
- Go to `/results`
- Expected: activities sorted by approval count, #1 has ⭐ Top Pick badge, vote bars show breakdown

- [ ] **Step 3: Commit**

```bash
git add app/results/page.tsx
git commit -m "feat: add results page with vote breakdown"
```

---

## Task 12: CalendarView + DateModal

**Files:**
- Create: `squad-planner/components/CalendarView.tsx`
- Create: `squad-planner/components/DateModal.tsx`

- [ ] **Step 1: Create CalendarView**

Create `squad-planner/components/CalendarView.tsx`:

```tsx
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
      onDayClick={onSelectDate}
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
```

- [ ] **Step 2: Create DateModal**

Create `squad-planner/components/DateModal.tsx`:

```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add components/CalendarView.tsx components/DateModal.tsx
git commit -m "feat: add CalendarView and DateModal components"
```

---

## Task 13: Calendar Page

**Files:**
- Create: `squad-planner/app/calendar/page.tsx`

- [ ] **Step 1: Create calendar page**

Create `squad-planner/app/calendar/page.tsx`:

```tsx
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

      {/* Scheduled events list */}
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

      {/* Date modal */}
      {selectedDate && (
        <DateModal
          date={selectedDate}
          approvedActivities={approvedActivities}
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
```

- [ ] **Step 2: Test in browser**

- Add and vote on 2+ activities
- Go to `/calendar` → click a date → modal opens
- Assign an activity → date shows activity name
- Click another date → choose Wildcard → date shows "🃏 Revealed on the day"

- [ ] **Step 3: Commit**

```bash
git add app/calendar/page.tsx
git commit -m "feat: add calendar page with scheduling and wildcard"
```

---

## Task 14: Demo Seed Data + Vercel Deploy

**Files:**
- Modify: `squad-planner/app/page.tsx`

- [ ] **Step 1: Add seed data loader to feed page**

Open `squad-planner/app/page.tsx` and add a seed button to the empty state. Replace the empty state block (the one with `activities.length === 0`) with:

```tsx
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
```

Add the `loadDemoData` function and import `addActivity` from the store inside the component (before the return statement):

```tsx
const { getUnvoted, vote, activities, addActivity } = useActivityStore()

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
      summary: 'Indoor go-kart track with professional racing karts, timing systems, and a trophies for the fastest laps. Great for competitive squads.',
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
```

- [ ] **Step 2: Full smoke test**

Walk through the entire demo flow:
1. Go to `http://localhost:3000` → click "Load Demo Data"
2. Three cards appear — swipe right on two, left on one (as Alex)
3. Switch to "B" (Bria) via avatar — swipe all cards
4. Switch to "C" (Cam) — swipe all cards
5. All voted → redirected to `/results` — verify top pick badge on highest approved
6. Click "Schedule this →" on the top pick → goes to `/calendar`
7. Click a date → modal opens → assign the top activity → date shows activity name
8. Click another date → Wildcard → date shows "🃏 Revealed on the day"
9. Go to `/post` → paste a real URL → AI summarises it → appears in feed

- [ ] **Step 3: Deploy to Vercel**

```bash
npm install -g vercel
vercel
```

When prompted:
- Link to existing project? No
- Project name: `squad-planner`
- Directory: `./` (already in squad-planner/)
- Override settings? No

Then add the environment variable in Vercel dashboard:
- Go to Project Settings → Environment Variables
- Add `Z_AI_KEY` with the value from `.env.local`
- Redeploy: `vercel --prod`

Expected: live URL that works in browser and on mobile.

- [ ] **Step 4: Final commit**

```bash
git add app/page.tsx
git commit -m "feat: add demo seed data loader + smoke test passed"
```

---

## All Tests Passing

Run the full test suite one final time:

```bash
npm run test
```

Expected output:
```
✓ __tests__/types.test.ts (3 tests)
✓ __tests__/wildcard.test.ts (4 tests)

Test Files: 2 passed (2)
Tests:      7 passed (7)
```
