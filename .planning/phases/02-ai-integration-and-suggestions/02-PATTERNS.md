# Phase 2: AI Integration & Suggestions — Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 8 new/modified files
**Analogs found:** 6 / 8 (2 have no close codebase analog — use RESEARCH.md patterns)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `entrypoints/background.ts` | service-worker | event-driven (request-response via messaging) | `entrypoints/background.ts` (self — current Phase 1 state) | exact — extend in place |
| `messaging/protocol.ts` | config / shared contract | request-response | `messaging/protocol.ts` (self — current Phase 1 state) | exact — extend in place |
| `types/trip.ts` | model | transform (AI output → typed struct) | `types/message.ts` | role-match (same pure-interface pattern) |
| `lib/ai.ts` | service | request-response (external API call) | `whatsapp/observer.ts` (closest async module in lib tier) | partial — different data flow; use RESEARCH.md Pattern 2 & 3 |
| `lib/links.ts` | utility | transform (string → URL) | `lib/utils.ts` | role-match (pure transform utility) |
| `entrypoints/sidepanel/App.tsx` | component | request-response + event-driven (Zustand) | `entrypoints/sidepanel/App.tsx` (self — current Phase 1 shell) | exact — extend in place |
| `wxt.config.ts` | config | — | `wxt.config.ts` (self — current Phase 1 state) | exact — extend in place |
| `.env.local` | config / secret | — | none | no analog — template only, not committed |

---

## Pattern Assignments

### `entrypoints/background.ts` (service-worker, event-driven)

**Analog:** `entrypoints/background.ts` (current file — extend in place)

**Existing imports pattern** (lines 1–2):
```typescript
import { defineBackground } from 'wxt/utils/define-background';
import { onMessage } from '@/messaging/protocol';
```

**Existing onMessage handler pattern** (lines 30–37):
```typescript
onMessage('chatDelta', ({ data }) => {
  console.log(`[JRNY] chatDelta: ${data.messages.length} messages`);
  data.messages.forEach((m) => {
    const preview = m.text.length > 80 ? m.text.slice(0, 80) + '…' : m.text;
    console.log(`  ${m.timestamp} ${m.sender}: ${preview}`);
    if (m.urls.length) console.log('    urls:', m.urls);
  });
});
```

**Key extension rule:** All new `onMessage` registrations (`analyzeChat`, `followUpChat`) MUST be registered SYNCHRONOUSLY inside `main()` at the top level — not inside callbacks or setTimeout. This is the existing pattern (lines 30–37 registered at the top level of `main()`). This is Pitfall 2 from 01-RESEARCH.md.

**New handler shape to add** (from RESEARCH.md Code Examples section):
```typescript
// Add after the existing chatDelta handler, still inside main()
onMessage('analyzeChat', async ({ data }) => {
  const client = createAIClient();
  const raw = await withKeepAlive(() =>
    client.chat.completions.create({
      model: 'glm-5.1',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: `Chat transcript:\n${data.transcript}` },
      ],
      response_format: { type: 'json_object' },
    })
  );
  const content = raw.choices[0]?.message.content ?? '{}';
  return TripIntentSchema.parse(JSON.parse(content));
});

onMessage('followUpChat', async ({ data }) => {
  const client = createAIClient();
  const messages = [
    { role: 'system' as const, content: buildSystemPrompt() },
    ...data.history,
    { role: 'user' as const, content: data.question },
  ];
  const raw = await withKeepAlive(() =>
    client.chat.completions.create({ model: 'glm-5.1', messages })
  );
  return { answer: raw.choices[0]?.message.content ?? '' };
});
```

**Error logging pattern** (lines 10–11 — copy this style for new error guards):
```typescript
.catch((err) => console.error('[JRNY] setPanelBehavior failed:', err));
```

**New import additions needed:**
```typescript
import { createAIClient } from '@/lib/ai-client';
import { buildSystemPrompt } from '@/lib/prompt';
import { TripIntentSchema } from '@/types/trip';
import { withKeepAlive } from '@/lib/keep-alive';
```

---

### `messaging/protocol.ts` (config/shared contract, request-response)

**Analog:** `messaging/protocol.ts` (current file — extend in place)

**Full current file** (lines 1–15):
```typescript
import { defineExtensionMessaging } from '@webext-core/messaging';
import type { Message } from '@/types/message';

export interface ProtocolMap {
  /** Content script -> SW: batch of new messages from one debounce window. */
  chatDelta(data: { messages: Message[] }): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
```

**Extension pattern** — add new types to `ProtocolMap`, import `TripResult`:
```typescript
import { defineExtensionMessaging } from '@webext-core/messaging';
import type { Message } from '@/types/message';
import type { TripResult } from '@/types/trip';

export interface ProtocolMap {
  /** Content script -> SW: batch of new messages from one debounce window. */
  chatDelta(data: { messages: Message[] }): void;

  /** SidePanel -> SW: trigger full AI analysis. Returns TripResult directly (return-value pattern). */
  analyzeChat(data: { transcript: string }): TripResult;

  /** SidePanel -> SW: follow-up question with full conversation history. */
  followUpChat(data: {
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    question: string;
  }): { answer: string };
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
```

**Critical note:** Do NOT add a `tripUpdate` push message type. `@webext-core/messaging` is request-response only — use return values from `analyzeChat` and `followUpChat` handlers (RESEARCH.md Pitfall 4 and Anti-Patterns section).

---

### `types/trip.ts` (model, transform)

**Analog:** `types/message.ts`

**Pattern from analog** (lines 1–16 of `types/message.ts` — pure TypeScript interface file, no imports, JSDoc on every field):
```typescript
/**
 * A WhatsApp Web chat message as extracted by the content script (Plan 02).
 * Fields are Phase 1 contract; Plan 02 MUST produce payloads matching this shape.
 */
export interface Message {
  /** Stable WhatsApp message id, schema `false_<chat>@s.whatsapp.net_<msg>`. Dedupe key. */
  dataId: string;
  /** Sender display name, parsed from data-pre-plain-text. '' if parse fails. */
  sender: string;
  // ...
}
```

**New file shape** (copy this pattern — interfaces + Zod schema in same file):
```typescript
import { z } from 'zod';

/** Zod schema for AI-returned trip intent. Used for runtime validation in SW. */
export const TripIntentSchema = z.object({
  destination: z.string(),
  dates: z.string(),       // e.g. "late July" or "2025-07-20 to 2025-07-27"
  travelers: z.number(),
  budget: z.string(),      // e.g. "budget-friendly" or "~£500pp"
  summary: z.string(),     // one-liner human readable
  consensus: z.array(z.string()),  // things group agreed on
  debating: z.array(z.string()),   // things still undecided
});

/** Inferred type from schema — use throughout the codebase. */
export type TripResult = z.infer<typeof TripIntentSchema>;

/** A single message in a multi-turn chat conversation. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** A booking/activity suggestion link shown in the side panel. */
export interface SuggestionLink {
  label: string;
  url: string;
  /** Icon key — matches lucide-react icon names: 'plane' | 'building' | 'map-pin' */
  icon: 'plane' | 'building' | 'map-pin';
}
```

---

### `lib/ai.ts` (service, request-response)

**Analog:** No close codebase analog exists (no async external-API call modules in the repo). Use RESEARCH.md Pattern 2 and Pattern 3 directly.

**Closest structural analog:** `whatsapp/observer.ts` — shows the project pattern for exporting named functions from a module file, and the `import type` convention for type-only imports.

**Import convention from observer.ts** (lines 1–3):
```typescript
import type { Message } from '@/types/message';
import { CHAT_PANE_SELECTORS, MESSAGE_ROW } from './selectors';
import { parseRow } from './extractor';
```

**New files to create (split per RESEARCH.md project structure):**

`lib/ai-client.ts` — OpenAI client factory (RESEARCH.md Pattern 2):
```typescript
import OpenAI from 'openai';

/** Factory: instantiate inside each onMessage handler — do NOT use module-level singleton.
 *  MV3 SW may restart between messages; module-level state does not persist.
 */
export function createAIClient(): OpenAI {
  return new OpenAI({
    apiKey: import.meta.env.JRNY_Z_AI_KEY,
    baseURL: 'https://api.z.ai/api/paas/v4',
    dangerouslyAllowBrowser: true,  // suppresses browser-env guard in SW context
  });
}
```

`lib/prompt.ts` — system prompt builder:
```typescript
export function buildSystemPrompt(): string {
  return `You are a trip-planning assistant analyzing a group WhatsApp chat.
Extract trip planning information and return ONLY a JSON object with this exact shape:
{
  "destination": "city or country name (string)",
  "dates": "approximate dates or date range (string, e.g. 'late July' or '2025-07-20 to 2025-07-27')",
  "travelers": <number of travelers>,
  "budget": "budget description (string, e.g. 'budget-friendly', '~£500pp')",
  "summary": "one sentence: 'You're planning a trip to X for N people around [dates]'",
  "consensus": ["list of things the group has agreed on"],
  "debating": ["list of things still being discussed or undecided"]
}
Return ONLY the JSON object. No markdown, no explanation.`;
}
```

`lib/keep-alive.ts` — SW keep-alive wrapper (RESEARCH.md Pattern 6):
```typescript
/** Pings extension APIs every 25s to reset the MV3 SW 30s idle timer. */
export async function withKeepAlive<T>(fn: () => Promise<T>): Promise<T> {
  let alive = true;
  const ping = setInterval(() => {
    if (alive) chrome.runtime.getPlatformInfo(() => { /* noop */ });
  }, 25_000);
  try {
    return await fn();
  } finally {
    alive = false;
    clearInterval(ping);
  }
}
```

---

### `lib/links.ts` (utility, transform)

**Analog:** `lib/utils.ts`

**Pattern from analog** (full file — lines 1–6):
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Established conventions to copy:**
- No default export — only named exports
- Pure functions, no side effects
- No imports needed (links.ts takes plain strings, returns strings)
- Single-responsibility per function

**New file shape** (RESEARCH.md Pattern 5):
```typescript
// lib/links.ts
// Pure URL constructors — no imports required.
// All functions accept AI-extracted string values (fuzzy dates ok; all services degrade gracefully).

export function buildFlightLink(destination: string, origin = ''): string {
  const dest = encodeURIComponent(destination.toLowerCase().replace(/\s+/g, '-'));
  const orig = origin ? encodeURIComponent(origin.toLowerCase().replace(/\s+/g, '-')) : 'anywhere';
  return `https://www.skyscanner.net/transport/flights/${orig}/${dest}/`;
}

export function buildGoogleFlightsLink(destination: string): string {
  return `https://www.google.com/travel/flights?q=${encodeURIComponent('Flights to ' + destination)}`;
}

export function buildHotelLink(destination: string): string {
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`;
}

export function buildAirbnbLink(destination: string): string {
  return `https://www.airbnb.com/s/${encodeURIComponent(destination)}/homes`;
}

export function buildActivitiesLink(destination: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent('things to do in ' + destination)}`;
}
```

---

### `entrypoints/sidepanel/App.tsx` (component, request-response + event-driven)

**Analog:** `entrypoints/sidepanel/App.tsx` (current file — extend in place)

**Current shell** (full file — lines 1–18):
```typescript
export default function App() {
  return (
    <main className="min-h-screen bg-neutral-50 p-4 font-sans">
      <header className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600" />
        <h1 className="text-xl font-semibold tracking-tight">JRNY Copilot</h1>
      </header>
      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-neutral-700">
          Extension active on WhatsApp Web.
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          AI suggestions will appear here once Phase 2 ships.
        </p>
      </section>
    </main>
  );
}
```

**Established UI conventions to preserve:**
- Tailwind v4 class utilities inline — no CSS modules
- `bg-neutral-50`, `border-neutral-200`, `shadow-sm` for card/section chrome
- `text-sm text-neutral-700` for body text, `text-xs text-neutral-500` for secondary text
- `rounded-lg border bg-white p-4` for card containers
- `gap-2`, `mt-6`, `mt-2` for spacing

**Extension pattern — Zustand store** (from RESEARCH.md Code Examples, Zustand Store section):
```typescript
// entrypoints/sidepanel/store.ts  (extract to own file — keep App.tsx clean)
import { create } from 'zustand';
import type { TripResult, ChatMessage } from '@/types/trip';

interface JrnyStore {
  tripResult: TripResult | null;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  setTripResult: (r: TripResult) => void;
  appendChat: (msg: ChatMessage) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useJrnyStore = create<JrnyStore>((set) => ({
  tripResult: null,
  chatHistory: [],
  isLoading: false,
  error: null,
  setTripResult: (r) => set({ tripResult: r }),
  appendChat: (msg) => set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
  setLoading: (v) => set({ isLoading: v }),
  setError: (e) => set({ error: e }),
}));
```

**sendMessage call pattern** (copy from `entrypoints/content.ts` lines 20–22 — same library):
```typescript
// content.ts uses fire-and-forget with .catch(); side panel uses await with try/catch
// because it needs the return value (TripResult)
import { sendMessage } from '@/messaging/protocol';

const result = await sendMessage('analyzeChat', { transcript });
// result is typed as TripResult — no cast needed
```

**Link anchor pattern** (requirement SUGG-04 — all links open in new tab):
```typescript
<a href={url} target="_blank" rel="noreferrer" className="...">
  {label}
</a>
```

---

### `wxt.config.ts` (config)

**Analog:** `wxt.config.ts` (current file — extend in place)

**Current vite block** (lines 19–21):
```typescript
vite: () => ({
  plugins: [tailwindcss()],
}),
```

**Extension — add envPrefix** (RESEARCH.md Pattern 1):
```typescript
vite: () => ({
  plugins: [tailwindcss()],
  envPrefix: ['WXT_', 'JRNY_'],   // allows JRNY_Z_AI_KEY to be exposed to import.meta.env
}),
```

**Critical:** Without `envPrefix`, `import.meta.env.JRNY_Z_AI_KEY` is `undefined` at runtime — silent 401 failure. This is RESEARCH.md Pitfall 1.

---

### `.env.local` (config/secret — template only)

**No analog.** File is not committed; provide instructions only.

```
# .env.local — NOT committed (in .gitignore)
JRNY_Z_AI_KEY=your-z-ai-key-here
```

Access in service worker after `envPrefix` is configured:
```typescript
import.meta.env.JRNY_Z_AI_KEY  // string | undefined
```

Add a boot-time guard in `background.ts` `main()`:
```typescript
if (!import.meta.env.JRNY_Z_AI_KEY) {
  console.error('[JRNY] JRNY_Z_AI_KEY is missing — AI calls will fail');
}
```

---

## Shared Patterns

### Typed Messaging — `@webext-core/messaging` Import Convention
**Source:** `messaging/protocol.ts` lines 1 and 14–15; `entrypoints/background.ts` line 2; `entrypoints/content.ts` line 2
**Apply to:** `entrypoints/background.ts` (onMessage), `entrypoints/sidepanel/App.tsx` (sendMessage)

```typescript
// SW side — receives messages:
import { onMessage } from '@/messaging/protocol';

// Side panel / CS side — sends messages:
import { sendMessage } from '@/messaging/protocol';
```

Both `sendMessage` and `onMessage` are exported from the single `defineExtensionMessaging<ProtocolMap>()` call. Never import from `@webext-core/messaging` directly in entrypoints — always go through `@/messaging/protocol`.

### Path Alias Convention
**Source:** All existing files — `@/messaging/protocol`, `@/types/message`, `@/whatsapp/observer`
**Apply to:** All new files

WXT maps `@/` to the repo root (not `src/`). Use:
- `@/types/trip` (not `../types/trip` or `src/types/trip`)
- `@/lib/ai-client`
- `@/lib/prompt`
- `@/lib/keep-alive`
- `@/lib/links`
- `@/messaging/protocol`

### Error Logging Convention
**Source:** `entrypoints/background.ts` lines 10–11, 24–26
**Apply to:** All new try/catch blocks in background.ts and App.tsx

```typescript
// Always prefix with [JRNY] and include context:
console.error('[JRNY] analyzeChat failed:', err);
console.warn('[JRNY][content] chatDelta send failed:', err);
// Context prefix pattern: [JRNY] for SW, [JRNY][content] for CS, [JRNY][panel] for side panel
```

### Zod Import Convention
**Source:** RESEARCH.md Pitfall 6 — import from `'zod'` directly (not `'zod/v3'`)
**Apply to:** `types/trip.ts`, `entrypoints/background.ts`

```typescript
import { z } from 'zod';  // correct for zod v4
// NOT: import { z } from 'zod/v3'  — this breaks with zod v4
```

### SW Ephemeral State Rule
**Source:** CLAUDE.md Architecture Rules + RESEARCH.md Anti-Patterns
**Apply to:** `entrypoints/background.ts`, `lib/ai-client.ts`

- No module-level variables that hold state across message invocations in `background.ts`
- `createAIClient()` called inside each `onMessage` handler — NOT as a module-level singleton
- Conversation history MUST travel with the `followUpChat` message payload from the side panel (Zustand store owns it); SW never stores it

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/ai.ts` / `lib/ai-client.ts` | service | request-response (external API) | No async external-API call modules exist in the codebase yet. Use RESEARCH.md Pattern 2 (OpenAI SDK in MV3 SW). |
| `.env.local` | config/secret | — | No committed env files exist (correct — secrets not committed). Template only. |

---

## Metadata

**Analog search scope:** `entrypoints/`, `lib/`, `types/`, `messaging/`, `whatsapp/`
**Files scanned:** 10 source files (excluding node_modules and .wxt generated files)
**Pattern extraction date:** 2026-04-18
