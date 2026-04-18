---
phase: 02-ai-integration-and-suggestions
plan: "02"
type: execute
wave: 1
depends_on:
  - "02-01"
files_modified:
  - types/trip.ts
  - lib/ai-client.ts
  - lib/prompt.ts
  - lib/keep-alive.ts
  - lib/links.ts
autonomous: true
requirements:
  - AI-01
  - AI-02
  - AI-03
  - AI-04
  - SUGG-01
  - SUGG-02
  - SUGG-03
  - SUGG-04

must_haves:
  truths:
    - "TripResult type is importable from @/types/trip throughout the codebase"
    - "TripIntentSchema.parse() validates AI JSON output and throws on missing fields"
    - "createAIClient() returns an OpenAI instance pointing at https://api.z.ai/api/paas/v4"
    - "buildSystemPrompt() returns the exact JSON schema shape for z.AI's json_object mode"
    - "withKeepAlive() pings chrome.runtime.getPlatformInfo every 25s during async calls"
    - "buildFlightLink(), buildHotelLink(), buildActivitiesLink() return valid deep-link URLs"
  artifacts:
    - path: "types/trip.ts"
      provides: "TripIntentSchema (Zod), TripResult, ChatMessage, SuggestionLink types"
      exports: ["TripIntentSchema", "TripResult", "ChatMessage", "SuggestionLink"]
    - path: "lib/ai-client.ts"
      provides: "createAIClient() factory"
      exports: ["createAIClient"]
    - path: "lib/prompt.ts"
      provides: "buildSystemPrompt()"
      exports: ["buildSystemPrompt"]
    - path: "lib/keep-alive.ts"
      provides: "withKeepAlive() SW idle timer reset"
      exports: ["withKeepAlive"]
    - path: "lib/links.ts"
      provides: "URL constructors for flight, hotel, activity deep links"
      exports: ["buildFlightLink", "buildGoogleFlightsLink", "buildHotelLink", "buildAirbnbLink", "buildActivitiesLink"]
  key_links:
    - from: "types/trip.ts TripIntentSchema"
      to: "entrypoints/background.ts analyzeChat handler"
      via: "import { TripIntentSchema } from '@/types/trip'"
      pattern: "TripIntentSchema\\.parse"
    - from: "lib/ai-client.ts createAIClient"
      to: "entrypoints/background.ts"
      via: "import { createAIClient } from '@/lib/ai-client'"
      pattern: "createAIClient\\(\\)"
    - from: "lib/links.ts"
      to: "entrypoints/sidepanel/App.tsx"
      via: "import { buildFlightLink, buildHotelLink, buildActivitiesLink } from '@/lib/links'"
      pattern: "buildFlightLink|buildHotelLink|buildActivitiesLink"
---

<objective>
Create all new shared lib modules and type definitions that the SW handler (Wave 2) and side panel (Wave 3) depend on.

Purpose: These are the contracts the rest of Phase 2 is built against. Creating them first (Wave 1, before any consumers) eliminates the scavenger-hunt anti-pattern — the SW handler plan can reference exact function signatures rather than needing to explore the codebase.

Output: Five new files — types/trip.ts, lib/ai-client.ts, lib/prompt.ts, lib/keep-alive.ts, lib/links.ts.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/ammad/Documents/agently /.planning/ROADMAP.md
@/Users/ammad/Documents/agently /.planning/REQUIREMENTS.md

<interfaces>
<!-- Analog pattern from types/message.ts — pure TS interface with JSDoc: -->
```typescript
export interface Message {
  /** Stable WhatsApp message id. Dedupe key. */
  dataId: string;
  sender: string;
  timestamp: string;
  text: string;
  urls: string[];
}
```

<!-- Analog pattern from lib/utils.ts — named exports only, pure functions: -->
```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

<!-- openai SDK factory pattern (no module-level singleton): -->
```typescript
import OpenAI from 'openai';
export function createAIClient(): OpenAI {
  return new OpenAI({
    apiKey: import.meta.env.JRNY_Z_AI_KEY,
    baseURL: 'https://api.z.ai/api/paas/v4',
    dangerouslyAllowBrowser: true,
  });
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create types/trip.ts — TripResult schema and shared interfaces</name>
  <files>types/trip.ts</files>
  <read_first>
    - /Users/ammad/Documents/agently /types/message.ts — copy JSDoc and export style exactly; this file is the pattern analog
  </read_first>
  <action>
Create `types/trip.ts` at the repo root `types/` directory with this exact content:

```typescript
import { z } from 'zod';

/**
 * Zod schema for the AI-returned trip intent object.
 * Enforced at runtime in the service worker after JSON.parse().
 * Shape must exactly match the system prompt in lib/prompt.ts.
 */
export const TripIntentSchema = z.object({
  /** City or country name extracted from the chat. */
  destination: z.string(),
  /** Approximate dates, e.g. "late July" or "2025-07-20 to 2025-07-27". */
  dates: z.string(),
  /** Number of travelers extracted or inferred from the chat. */
  travelers: z.number(),
  /** Budget descriptor, e.g. "budget-friendly" or "~£500pp". */
  budget: z.string(),
  /** One-liner: "You're planning a trip to X for N people around [dates]". */
  summary: z.string(),
  /** Topics the group has agreed on. */
  consensus: z.array(z.string()),
  /** Topics still being discussed or undecided. */
  debating: z.array(z.string()),
});

/** Inferred TypeScript type from TripIntentSchema. Use throughout the codebase. */
export type TripResult = z.infer<typeof TripIntentSchema>;

/** A single message in a multi-turn follow-up conversation. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * A curated suggestion link rendered in the side panel.
 * icon must match lucide-react icon names used in App.tsx.
 */
export interface SuggestionLink {
  label: string;
  url: string;
  /** 'plane' = Plane icon, 'building' = Building icon, 'map-pin' = MapPin icon */
  icon: 'plane' | 'building' | 'map-pin';
}
```

Import rule: import from `'zod'` directly — NOT `'zod/v3'` (project uses zod v4, which breaks the /v3 subpath).
  </action>
  <verify>
    <automated>cd "/Users/ammad/Documents/agently " && npx tsc --noEmit --skipLibCheck 2>&1 | head -20 && grep -n "TripIntentSchema\|TripResult\|ChatMessage\|SuggestionLink" types/trip.ts</automated>
  </verify>
  <done>
    - `types/trip.ts` exists with TripIntentSchema, TripResult, ChatMessage, SuggestionLink all exported
    - `grep "from 'zod'" types/trip.ts` returns `import { z } from 'zod'` (not zod/v3)
    - `grep "z.object" types/trip.ts` shows the schema definition
    - TypeScript compiler reports no errors in types/trip.ts
  </done>
</task>

<task type="auto">
  <name>Task 2: Create lib/ai-client.ts, lib/prompt.ts, lib/keep-alive.ts, lib/links.ts</name>
  <files>lib/ai-client.ts, lib/prompt.ts, lib/keep-alive.ts, lib/links.ts</files>
  <read_first>
    - /Users/ammad/Documents/agently /lib/utils.ts — copy export convention (named exports only, no default export)
    - /Users/ammad/Documents/agently /types/trip.ts — must already exist from Task 1 before proceeding (it is a prerequisite for ai-client.ts type safety, but lib modules do not import types/trip directly)
  </read_first>
  <action>
Create four files in `lib/`. All use named exports only — no default exports. No cross-imports between these lib files.

**lib/ai-client.ts:**
```typescript
import OpenAI from 'openai';

/**
 * Factory: returns a new OpenAI client pointing at the z.AI API endpoint.
 * MUST be called inside each onMessage handler — never stored as a module-level
 * singleton. MV3 service worker may restart between messages; module-level state
 * does not persist across invocations.
 */
export function createAIClient(): OpenAI {
  return new OpenAI({
    apiKey: import.meta.env.JRNY_Z_AI_KEY,
    baseURL: 'https://api.z.ai/api/paas/v4',
    dangerouslyAllowBrowser: true, // suppresses browser-env guard; safe in SW context
  });
}
```

**lib/prompt.ts:**
```typescript
/**
 * Returns the system prompt for the trip analysis AI call.
 * The JSON shape defined here MUST exactly match TripIntentSchema in types/trip.ts.
 * z.AI uses json_object mode — the schema is defined in the prompt, not via json_schema param.
 */
export function buildSystemPrompt(): string {
  return `You are a trip-planning assistant analyzing a group WhatsApp chat.
Extract trip planning information and return ONLY a JSON object with this exact shape:
{
  "destination": "city or country name (string)",
  "dates": "approximate dates or date range (string, e.g. 'late July' or '2025-07-20 to 2025-07-27')",
  "travelers": <number of travelers as integer>,
  "budget": "budget description (string, e.g. 'budget-friendly', '~£500pp')",
  "summary": "one sentence: 'You're planning a trip to X for N people around [dates]'",
  "consensus": ["list of things the group has agreed on"],
  "debating": ["list of things still being discussed or undecided"]
}
Return ONLY the JSON object. No markdown fences, no explanation, no extra fields.`;
}
```

**lib/keep-alive.ts:**
```typescript
/**
 * Wraps an async function with a keep-alive ping that resets the MV3 SW 30s
 * idle timer every 25 seconds by calling a Chrome extension API.
 * Required for z.AI calls that may take 5-15 seconds on long transcripts.
 */
export async function withKeepAlive<T>(fn: () => Promise<T>): Promise<T> {
  let alive = true;
  const ping = setInterval(() => {
    if (alive) chrome.runtime.getPlatformInfo(() => { /* noop — resets idle timer */ });
  }, 25_000);
  try {
    return await fn();
  } finally {
    alive = false;
    clearInterval(ping);
  }
}
```

**lib/links.ts:**
```typescript
/**
 * Pure URL constructors for trip suggestion deep links.
 * All functions accept AI-extracted strings (fuzzy values accepted — booking services
 * degrade gracefully without exact dates).
 * No imports required — pure string transforms.
 */

/** Skyscanner calendar-month-view search for a destination. */
export function buildFlightLink(destination: string, origin = ''): string {
  const dest = encodeURIComponent(destination.toLowerCase().replace(/\s+/g, '-'));
  const orig = origin
    ? encodeURIComponent(origin.toLowerCase().replace(/\s+/g, '-'))
    : 'anywhere';
  return `https://www.skyscanner.net/transport/flights/${orig}/${dest}/`;
}

/** Google Flights text search fallback. */
export function buildGoogleFlightsLink(destination: string): string {
  return `https://www.google.com/travel/flights?q=${encodeURIComponent('Flights to ' + destination)}`;
}

/** Booking.com text search — ss= param accepts destination name without dates. */
export function buildHotelLink(destination: string): string {
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`;
}

/** Airbnb homes search for a destination. */
export function buildAirbnbLink(destination: string): string {
  return `https://www.airbnb.com/s/${encodeURIComponent(destination)}/homes`;
}

/** Google search for activities at the destination. */
export function buildActivitiesLink(destination: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent('things to do in ' + destination)}`;
}
```
  </action>
  <verify>
    <automated>cd "/Users/ammad/Documents/agently " && grep "export function createAIClient" lib/ai-client.ts && grep "export function buildSystemPrompt" lib/prompt.ts && grep "export async function withKeepAlive" lib/keep-alive.ts && grep "export function buildFlightLink" lib/links.ts && grep "export function buildActivitiesLink" lib/links.ts</automated>
  </verify>
  <done>
    - lib/ai-client.ts exports `createAIClient` with baseURL `https://api.z.ai/api/paas/v4` and `dangerouslyAllowBrowser: true`
    - lib/prompt.ts exports `buildSystemPrompt` returning string with JSON shape matching TripIntentSchema
    - lib/keep-alive.ts exports `withKeepAlive` using `setInterval` at 25_000ms with `chrome.runtime.getPlatformInfo`
    - lib/links.ts exports all five URL constructors: `buildFlightLink`, `buildGoogleFlightsLink`, `buildHotelLink`, `buildAirbnbLink`, `buildActivitiesLink`
    - No default exports in any lib file
    - `npx tsc --noEmit --skipLibCheck` reports no errors in lib/ files
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| AI JSON output → TripResult | Untrusted AI response crosses into typed application state via Zod parse |
| Destination string → URL | AI-extracted string is URL-encoded before insertion into deep links |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-04 | Tampering | lib/prompt.ts — prompt injection via chat content | mitigate | System prompt defines strict JSON-only output format. AI output is never eval()'d — only JSON.parse() + Zod schema.parse(). Zod rejects unexpected fields. |
| T-02-05 | Tampering | lib/links.ts — link injection via AI destination string | mitigate | All destination strings are passed through encodeURIComponent() before URL construction. AI cannot inject arbitrary URL segments or query params outside the encoded destination field. |
| T-02-06 | Denial of Service | lib/keep-alive.ts — unbounded setInterval | mitigate | setInterval is always cleared in the `finally` block regardless of success or error. No interval leak. |
| T-02-07 | Information Disclosure | lib/ai-client.ts — JRNY_Z_AI_KEY logged | accept | Key is accessed via import.meta.env (build-time baked). Not logged. console.error in background.ts only logs "key missing" boolean, never the key value. Low risk: SW is isolated context. |
</threat_model>

<verification>
After both tasks complete:
1. `grep "TripIntentSchema\|TripResult\|ChatMessage\|SuggestionLink" types/trip.ts` — all four present
2. `grep "from 'zod'" types/trip.ts` — imports from 'zod' not 'zod/v3'
3. `grep "createAIClient\|https://api.z.ai" lib/ai-client.ts` — factory and baseURL present
4. `grep "25_000\|getPlatformInfo" lib/keep-alive.ts` — keep-alive interval correct
5. `grep "skyscanner\|booking.com\|airbnb\|google.com/search" lib/links.ts` — all four services present
6. `npx tsc --noEmit --skipLibCheck` in repo root — no errors in new files
</verification>

<success_criteria>
- types/trip.ts: TripIntentSchema (Zod object), TripResult (inferred type), ChatMessage, SuggestionLink all exported
- lib/ai-client.ts: createAIClient() returns OpenAI pointed at api.z.ai with dangerouslyAllowBrowser: true
- lib/prompt.ts: buildSystemPrompt() returns system prompt string with exact JSON shape
- lib/keep-alive.ts: withKeepAlive() wraps async call with 25s ping clearing on completion/error
- lib/links.ts: 5 pure URL constructors covering Skyscanner, Google Flights, Booking.com, Airbnb, Google Search
- All files TypeScript-clean with named exports only
</success_criteria>

<output>
After completion, create `/Users/ammad/Documents/agently /.planning/phases/02-ai-integration-and-suggestions/02-02-SUMMARY.md` using the summary template.
</output>
