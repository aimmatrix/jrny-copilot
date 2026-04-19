# GoTogether Rename + AI Naming Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the app from "Squad Planner" to "GoTogether" across all source files, and fix the AI summarise route so it always produces a real activity title (using OG-tag fallback when both z.AI and Gemini fail).

**Architecture:** Two independent changes to the existing Next.js app at `squad-planner/`. Task 1 is pure text replacement across 7 files. Task 2 adds an OG-based fallback path in the API route so real page content is used instead of "Untitled Activity" when both AI providers are unreachable. Task 3 pushes everything to GitHub.

**Tech Stack:** Next.js 16 App Router, TypeScript, existing `app/api/summarize/route.ts`, git

---

## File Map

```
squad-planner/
├── app/layout.tsx                    ← Modify: title, description, appleWebApp.title
├── app/page.tsx                      ← Modify: "Squad Feed" → "GoTogether"
├── app/post/page.tsx                 ← Modify: two "squad" strings
├── app/api/summarize/route.ts        ← Modify: bot User-Agent + OG fallback logic
├── components/AddMemberSheet.tsx     ← Modify: "Add Squad Member" heading
└── public/manifest.json              ← Modify: name, short_name, description
```

`package.json` `name` field is internal — leave it as `squad-planner` (Vercel project name is already set).

---

## Task 1: Rename "Squad Planner" → "GoTogether" in source files

**Files:**
- Modify: `squad-planner/app/layout.tsx`
- Modify: `squad-planner/public/manifest.json`
- Modify: `squad-planner/app/page.tsx`
- Modify: `squad-planner/app/post/page.tsx`
- Modify: `squad-planner/components/AddMemberSheet.tsx`

- [ ] **Step 1: Update `app/layout.tsx`**

Replace the `metadata` object:

```typescript
export const metadata: Metadata = {
  title: 'GoTogether',
  description: 'Plan group activities and outings with your crew',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GoTogether',
  },
  formatDetection: {
    telephone: false,
  },
}
```

- [ ] **Step 2: Update `public/manifest.json`**

Full file content:

```json
{
  "name": "GoTogether",
  "short_name": "GoTogether",
  "description": "Plan group activities and outings with your crew",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f9fafb",
  "theme_color": "#4f46e5",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any"
    }
  ]
}
```

- [ ] **Step 3: Update `app/page.tsx`**

Change the heading and subtitle:

```tsx
// Change this:
<h1 className="text-2xl font-bold">Squad Feed</h1>
<p className="text-xs text-gray-400">Voting as {currentUser.name}</p>

// To this:
<h1 className="text-2xl font-bold">GoTogether</h1>
<p className="text-xs text-gray-400">Voting as {currentUser.name}</p>
```

- [ ] **Step 4: Update `app/post/page.tsx`**

Two string replacements:

```tsx
// Change:
Paste any TikTok, Instagram, or Twitter link. AI will summarise it for the squad.
// To:
Paste any TikTok, Instagram, or Twitter link. AI will summarise it for the group.

// Change:
{loading ? '✨ Analysing with AI...' : 'Share with Squad'}
// To:
{loading ? '✨ Analysing with AI...' : 'Add to GoTogether'}
```

- [ ] **Step 5: Update `components/AddMemberSheet.tsx`**

```tsx
// Change:
<h2 className="text-lg font-bold mb-4">Add Squad Member</h2>
// To:
<h2 className="text-lg font-bold mb-4">Add Member</h2>
```

- [ ] **Step 6: Verify build passes**

```bash
cd "/Users/ammad/Documents/agently /squad-planner" && npm run build 2>&1 | tail -15
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
cd "/Users/ammad/Documents/agently /squad-planner"
git add app/layout.tsx public/manifest.json app/page.tsx app/post/page.tsx components/AddMemberSheet.tsx
git commit -m "feat: rename app to GoTogether"
```

---

## Task 2: Fix AI naming — OG-tag fallback when AI unavailable

**Files:**
- Modify: `squad-planner/app/api/summarize/route.ts`

**Problem:** When both z.AI and Gemini fail (e.g. invalid API keys), the route returns `FALLBACK` with `title: 'Untitled Activity'`. The OG tags were already fetched but discarded. Instead, use them to construct a real title and summary.

**Fix:** Add a `buildFromOg()` function that converts OG data into a usable activity card. Call it between the AI failure and the bare `FALLBACK`.

- [ ] **Step 1: Add `buildFromOg` function to `app/api/summarize/route.ts`**

Add this function after `buildPrompt()` (around line 66):

```typescript
function buildFromOg(
  url: string,
  og: { title: string; description: string }
): Record<string, unknown> | null {
  if (!og.title && !og.description) return null
  const words = (og.title || og.description).replace(/\s+/g, ' ').trim().split(' ')
  const title = words.slice(0, 8).join(' ')
  const summary = og.description
    ? og.description.slice(0, 300)
    : og.title
  return {
    title,
    summary,
    location: null,
    category: 'other',
    platform: detectPlatform(url),
  }
}
```

- [ ] **Step 2: Update the `POST` handler to use `buildFromOg` as a third fallback**

Replace the inner try/catch block (the one with `summariseWithZai` / `summariseWithGemini`) with:

```typescript
let data: Record<string, unknown> | null = null

try {
  data = await summariseWithZai(prompt)
} catch {
  try {
    data = await summariseWithGemini(prompt)
  } catch {
    data = buildFromOg(url, og)
  }
}

if (!data) return NextResponse.json(FALLBACK)
```

The rest of the response-building block stays unchanged — it already validates each field and falls back field-by-field.

Also update the User-Agent string while in this file:

```typescript
// Change:
'User-Agent': 'Mozilla/5.0 (compatible; SquadPlannerBot/1.0)',
// To:
'User-Agent': 'Mozilla/5.0 (compatible; GoTogetherBot/1.0)',
```

- [ ] **Step 3: Verify build passes**

```bash
cd "/Users/ammad/Documents/agently /squad-planner" && npm run build 2>&1 | tail -15
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Smoke-test the OG fallback locally**

```bash
cd "/Users/ammad/Documents/agently /squad-planner" && npm run dev &
sleep 3
curl -s -X POST http://localhost:3000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' | python3 -m json.tool
```

Expected: JSON with a real `title` (not "Untitled Activity") derived from YouTube's OG tags.

Kill dev server after: `kill %1`

- [ ] **Step 5: Commit**

```bash
cd "/Users/ammad/Documents/agently /squad-planner"
git add app/api/summarize/route.ts
git commit -m "fix: use OG tags as fallback title/summary when AI is unavailable"
```

---

## Task 3: Deploy to Vercel + push to GitHub

**Files:** none (git operations only)

- [ ] **Step 1: Deploy to Vercel production**

```bash
cd "/Users/ammad/Documents/agently /squad-planner" && vercel --prod --yes 2>&1 | tail -20
```

Expected: `Aliased: https://squad-planner-sigma.vercel.app`

- [ ] **Step 2: Push to GitHub**

```bash
cd "/Users/ammad/Documents/agently /squad-planner" && git push origin main 2>&1
```

Expected: commits pushed to `https://github.com/aimmatrix/jrny-copilot.git`

- [ ] **Step 3: Confirm**

```bash
cd "/Users/ammad/Documents/agently /squad-planner" && git log --oneline -5
```

Report the live Vercel URL and the GitHub repo URL.
