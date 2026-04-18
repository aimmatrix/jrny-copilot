# Phase 2: AI Integration & Suggestions — Research

**Researched:** 2026-04-18
**Domain:** OpenAI-compatible LLM in MV3 service worker, WXT env vars, typed messaging protocol, deep-link URL construction
**Confidence:** HIGH (primary findings verified via Context7 + official docs)

---

## Summary

Phase 2 wires the transcript captured in Phase 1 into the z.AI API (OpenAI-compatible, GLM models) and surfaces structured trip suggestions in the side panel. All network calls must originate in the MV3 service worker. The side panel communicates with the service worker exclusively via `@webext-core/messaging` typed protocol — three new message types are needed (`analyzeChat`, `tripUpdate`, `followUpChat`).

The single most critical pre-implementation decision is the **WXT env var prefix**. The requirement doc says `JRNY_Z_AI_KEY`, but WXT/Vite will silently expose nothing unless the name is prefixed `WXT_` or `VITE_`, OR a custom `envPrefix` is declared in `wxt.config.ts`. The plan must pick one approach and be consistent throughout. The recommended path is adding `envPrefix: ['WXT_', 'JRNY_']` to the vite block in `wxt.config.ts` — this preserves the intended name while satisfying Vite's security requirement.

z.AI uses GLM models (not GPT-4o). The correct model for chat is `glm-5.1`. Structured output uses `response_format: { type: "json_object" }` — json_schema mode is not documented on z.AI. Prompt engineering in the system message must define the JSON shape. The openai SDK v6 (fetch-based, no Node APIs) works in the MV3 service worker with `dangerouslyAllowBrowser: true` since the SW is not a true browser window and the flag suppresses the guard only.

**Primary recommendation:** Install `openai@6.34.0`, configure `envPrefix` in `wxt.config.ts`, add three new typed message handlers in `background.ts`, build a Zod schema for the trip intent response, and construct deep links from extracted destination/date strings rather than calling a booking API.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-05 | z.AI API key configured via env var at build time (baked into SW as JRNY_Z_AI_KEY) | WXT envPrefix config allows JRNY_ prefix; `.env.local` file with `JRNY_Z_AI_KEY=...` |
| AI-01 | SW sends chat transcript to z.AI with structured prompt | openai SDK v6 + baseURL override; `glm-5.1` model; `response_format: {type: "json_object"}` |
| AI-02 | AI extracts structured trip intent: destination, dates, group size, budget signals | Zod schema + system-prompt schema definition; `json_object` mode supported on z.AI |
| AI-03 | AI produces clean trip summary one-liner | Include `summary` field in Zod schema; part of the same single API call as AI-02 |
| AI-04 | AI surfaces agreed-on vs. still-debating items | Include `consensus` and `debating` arrays in Zod schema |
| AI-05 | User types follow-up questions; gets multi-turn AI responses | `followUpChat` message type; SW maintains `chatHistory` array in memory within active message; pass to z.AI |
| SUGG-01 | Panel shows flight suggestion links (Skyscanner / Google Flights) | Skyscanner referral deep link; Google search fallback |
| SUGG-02 | Panel shows accommodation links (Booking.com / Airbnb) | Booking.com `ss=` param; Airbnb `/s/{dest}/homes` pattern |
| SUGG-03 | Panel shows 2-3 activity suggestions with links | Google search `?q=things+to+do+in+{dest}` |
| SUGG-04 | Links open in new tab | `target="_blank" rel="noreferrer"` on anchor tags |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

| Directive | Enforcement |
|-----------|-------------|
| Content script is **read-only** — never writes to page | No changes to CS in this phase |
| **All network calls from the service worker** — CS cannot fetch (CORS) | z.AI call lives in `background.ts` only |
| **Side panel is the only UI surface** — no injected DOM | React in `entrypoints/sidepanel/App.tsx` only |
| **No persistent chat storage** — chat text lives only in SW memory during processing | Transcript held in-message only; not written to storage |
| **ARIA-first selectors** — never hashed class names | Not applicable to Phase 2 (no DOM reads) |
| WXT `@` alias maps to **repo root** (not `src/`) | `@/messaging/protocol`, `@/types/message`, etc. |
| MV3 SW is **ephemeral** — no module-level state across messages | Conversation history must travel with the message payload or be stored via `@wxt-dev/storage` |
| **Hackathon context** — ship fast, demo well, no over-engineering | One AI call per analyze; no streaming for v1 |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| z.AI API call | Service Worker | — | MV3 CORS rule; only SW can fetch cross-origin |
| Transcript accumulation | Service Worker (in-message) | — | chatDelta messages already arrive in SW; buffer in memory during active processing |
| Trip intent parsing (Zod) | Service Worker | — | Response arrives in SW; parse before sending to panel |
| Deep-link URL construction | Service Worker | Side Panel | SW computes URLs from AI output; SP renders anchors |
| Multi-turn chat history | Side Panel (Zustand) | Service Worker (per-call) | Panel owns conversation state; passes full history in each followUpChat message |
| Suggestion card rendering | Side Panel | — | Pure React UI; SW provides data payload only |
| Typed messaging protocol | Shared (`messaging/protocol.ts`) | — | Both SW and SP import from same module |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `openai` | 6.34.0 | OpenAI-compatible SDK for z.AI API calls | Fetch-based (no Node APIs); works in MV3 SW; `baseURL` override for z.AI [VERIFIED: npm registry] |
| `zod` | 4.3.6 (already installed) | Schema for trip intent response + runtime validation | Already in devDependencies; openai v6 peerDep supports `^3.25 \|\| ^4.0` [VERIFIED: npm registry] |
| `@webext-core/messaging` | 2.3.0 (already installed) | Typed protocol extension for new message types | Already wired in Phase 1; extend `ProtocolMap` only [VERIFIED: node_modules] |
| `@wxt-dev/storage` | 1.2.8 (already installed) | Cross-context state if SW needs to persist trip result | Already installed; use `local:` prefix [VERIFIED: node_modules] |

### Supporting (already installed, no new installs)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zustand` | (via React state) | Side panel state — trip result, chat history, loading flag | Side panel owns conversation state; Zustand store in `App.tsx` |
| `lucide-react` | 1.8.0 | Icons for suggestion cards (plane, hotel, activity) | Already installed; use `Plane`, `Building`, `MapPin` icons |
| shadcn/ui Card | (add via CLI) | Suggestion card layout | `npx shadcn add card` into `components/ui/card.tsx` |
| shadcn/ui Badge | (add via CLI) | Consensus / debating tags | `npx shadcn add badge` |

### New Install Required

```bash
npm install openai@6.34.0
```

**Version verification:** `npm view openai version` → 6.34.0 (confirmed 2026-04-18) [VERIFIED: npm registry]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `openai` SDK | raw `fetch` | SDK adds retry, timeout, type-safe response; no reason to hand-roll |
| `json_object` mode | streaming | Streaming complicates SW→panel relay; not needed for hackathon demo |
| Zod schema parse in SW | parse in side panel | Parsing in SW lets SW validate before sending; catches bad AI output early |

---

## Architecture Patterns

### System Architecture Diagram

```
WhatsApp Web DOM
     │
     │ chatDelta (messages: Message[])
     ▼
Content Script (read-only observer)
     │
     │ sendMessage('chatDelta', { messages })      [existing — Phase 1]
     ▼
Service Worker (background.ts)
     │
     ├── accumulates messages in in-memory buffer (active call only)
     │
     │ ◄─── sendMessage('analyzeChat', { transcript })  [new — Phase 2]
     │       from Side Panel "Analyze" button click
     │
     ├── builds system prompt + user message from transcript
     │
     ├── POST https://api.z.ai/api/paas/v4/chat/completions
     │   model: glm-5.1
     │   response_format: { type: "json_object" }
     │
     ├── parses JSON → TripResult (Zod)
     │
     │ sendMessage('tripUpdate', { result: TripResult }) ──►  Side Panel
     │                                                          (Zustand store)
     │
     │ ◄─── sendMessage('followUpChat', { history, question })  [new — Phase 2]
     │       from Side Panel chat input
     │
     ├── appends question to history, calls z.AI again
     │
     └── sendMessage('tripUpdate', { result }) ──► Side Panel
```

### Recommended Project Structure (additions only)

```
messaging/
└── protocol.ts          # extend ProtocolMap with 3 new types

types/
├── message.ts           # unchanged (Phase 1 contract)
└── trip.ts              # NEW: TripResult, SuggestionLink, ChatMessage types

lib/
├── utils.ts             # unchanged
├── ai-client.ts         # NEW: OpenAI client factory (singleton pattern)
├── prompt.ts            # NEW: buildSystemPrompt(), buildUserMessage()
└── links.ts             # NEW: buildFlightLink(), buildHotelLink(), buildActivityLink()

entrypoints/
└── background.ts        # extend: add analyzeChat + followUpChat handlers
entrypoints/sidepanel/
└── App.tsx              # extend: add Zustand store, suggestion cards, chat input
components/ui/
├── card.tsx             # add via: npx shadcn add card
└── badge.tsx            # add via: npx shadcn add badge
.env.local               # NEW: JRNY_Z_AI_KEY=<key>
wxt.config.ts            # extend vite block: add envPrefix: ['WXT_', 'JRNY_']
```

### Pattern 1: WXT Env Var with Custom Prefix

**What:** Vite only exposes vars with whitelisted prefixes. WXT wraps Vite, so the same rule applies. Add `envPrefix` to the `vite()` block.

**When to use:** Whenever a non-`WXT_` / non-`VITE_` prefixed env var is needed.

**Example:**
```typescript
// Source: https://vite.dev/config/shared-options#envprefix + https://wxt.dev/guide/essentials/config/vite
// wxt.config.ts
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: { /* unchanged */ },
  vite: () => ({
    plugins: [tailwindcss()],
    envPrefix: ['WXT_', 'JRNY_'],  // allow JRNY_Z_AI_KEY
  }),
});
```

Then in `.env.local`:
```
JRNY_Z_AI_KEY=your-key-here
```

Access in service worker:
```typescript
// Source: https://wxt.dev/guide/essentials/config/environment-variables
const apiKey = import.meta.env.JRNY_Z_AI_KEY;
```

### Pattern 2: OpenAI SDK in MV3 Service Worker

**What:** OpenAI SDK v6 is fetch-based (no Node.js HTTP agent). It works in service workers with `dangerouslyAllowBrowser: true` to suppress the browser-environment guard. The guard exists to warn against putting API keys in page scripts — in an SW, the key is build-time baked and not inspectable by page JS.

**When to use:** Any AI call from the SW.

**Example:**
```typescript
// Source: https://github.com/openai/openai-node/blob/master/README.md
// lib/ai-client.ts
import OpenAI from 'openai';

export function createAIClient(): OpenAI {
  return new OpenAI({
    apiKey: import.meta.env.JRNY_Z_AI_KEY,
    baseURL: 'https://api.z.ai/api/paas/v4',
    dangerouslyAllowBrowser: true,  // suppress browser-env guard in SW context
  });
}
```

### Pattern 3: Structured Output via json_object Mode

**What:** z.AI supports `response_format: { type: "json_object" }` (verified). It does NOT document `json_schema` mode. Define the schema in the system prompt and parse with Zod manually.

**Note on zodResponseFormat:** `zodResponseFormat` from `openai/helpers/zod` uses `json_schema` type which z.AI may not support. Use plain `json_object` mode with manual Zod parse instead.

**Example:**
```typescript
// Source: https://docs.z.ai/guides/capabilities/struct-output + Context7 /openai/openai-node
import { z } from 'zod';
import { createAIClient } from '@/lib/ai-client';

const TripIntentSchema = z.object({
  destination: z.string(),
  dates: z.string(),          // e.g. "late July" or "2025-07-20 to 2025-07-27"
  travelers: z.number(),
  budget: z.string(),         // e.g. "budget-friendly" or "~£500pp"
  summary: z.string(),        // one-liner human readable
  consensus: z.array(z.string()),   // things group agreed on
  debating: z.array(z.string()),    // things still being discussed
});

export type TripResult = z.infer<typeof TripIntentSchema>;

async function analyzeTripIntent(transcript: string): Promise<TripResult> {
  const client = createAIClient();
  const completion = await client.chat.completions.create({
    model: 'glm-5.1',
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: `Chat transcript:\n${transcript}` },
    ],
    response_format: { type: 'json_object' },
  });
  const raw = completion.choices[0]?.message.content ?? '{}';
  return TripIntentSchema.parse(JSON.parse(raw));
}
```

### Pattern 4: Extending the Typed Messaging Protocol

**What:** Add three new message types to `ProtocolMap`. SW listens for `analyzeChat` and `followUpChat`; side panel listens for `tripUpdate` (or SW returns `TripResult` directly as the message return value).

**When to use:** Any new SW↔sidePanel communication in Phase 2.

**Example:**
```typescript
// Source: Context7 /aklinker1/webext-core
// messaging/protocol.ts
import type { Message } from '@/types/message';
import type { TripResult } from '@/types/trip';

export interface ProtocolMap {
  /** Phase 1 — CS → SW */
  chatDelta(data: { messages: Message[] }): void;

  /** Phase 2 — SidePanel → SW: request full AI analysis of buffered transcript */
  analyzeChat(data: { transcript: string }): TripResult;

  /** Phase 2 — SidePanel → SW: send a follow-up question with conversation history */
  followUpChat(data: {
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    question: string;
  }): { answer: string };
}
```

Using a **return-value pattern** (SW returns `TripResult` from `onMessage` handler) is cleaner than a separate `tripUpdate` push message because `@webext-core/messaging` supports typed return values natively and the side panel `await sendMessage(...)` call gets the result directly.

### Pattern 5: Deep-Link URL Construction

**What:** Build search URLs from AI-extracted strings. Accept fuzzy dates gracefully — all link services degrade well without exact dates.

**When to use:** After AI returns `TripResult.destination` and `TripResult.dates`.

**Example:**
```typescript
// Source: https://developers.skyscanner.net/docs/referrals/examples + WebSearch verification
// lib/links.ts

/** Destination as a city/country name string from AI output */
export function buildFlightLink(destination: string, origin = ''): string {
  // Skyscanner calendar-month-view: works without exact dates
  const dest = encodeURIComponent(destination.toLowerCase().replace(/\s+/g, '-'));
  const orig = origin ? encodeURIComponent(origin.toLowerCase().replace(/\s+/g, '-')) : 'anywhere';
  return `https://www.skyscanner.net/transport/flights/${orig}/${dest}/`;
}

export function buildGoogleFlightsLink(destination: string): string {
  // Google Flights encodes params — use google.com/travel/flights with q= for simple landing
  return `https://www.google.com/travel/flights?q=${encodeURIComponent('Flights to ' + destination)}`;
}

export function buildHotelLink(destination: string): string {
  // Booking.com: ss= is the text search field; no dates required
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`;
}

export function buildAirbnbLink(destination: string): string {
  // Airbnb: /s/{dest}/homes — destination is URL-encoded city name
  return `https://www.airbnb.com/s/${encodeURIComponent(destination)}/homes`;
}

export function buildActivitiesLink(destination: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent('things to do in ' + destination)}`;
}
```

### Pattern 6: SW Keep-Alive for Long AI Calls

**What:** MV3 SW terminates after 30s of inactivity. GLM API calls may take 5-15s for a long transcript. Calling `chrome.runtime.getPlatformInfo()` or any extension API every 25s resets the idle timer.

**When to use:** Wrap the AI call in a keep-alive utility that pings extension APIs periodically.

**Example:**
```typescript
// Source: https://developer.chrome.com/blog/longer-esw-lifetimes
// lib/keep-alive.ts
export async function withKeepAlive<T>(fn: () => Promise<T>): Promise<T> {
  let alive = true;
  const ping = setInterval(() => {
    if (alive) chrome.runtime.getPlatformInfo(() => {/* noop */});
  }, 25_000);
  try {
    return await fn();
  } finally {
    alive = false;
    clearInterval(ping);
  }
}
```

### Anti-Patterns to Avoid

- **Module-level OpenAI client singleton in SW:** The SW may restart between messages. Instantiate the client inside the `onMessage` handler or use a lazy getter. [ASSUMED — common MV3 pattern, SW restart behavior confirmed by Chrome docs]
- **Storing raw transcript in `chrome.storage`:** Violates "no persistent chat storage" rule from CLAUDE.md. Keep transcript in-memory only.
- **Using `zodResponseFormat` with z.AI:** Only `json_object` mode is documented on z.AI; `json_schema` (used by `zodResponseFormat`) may return errors. Use manual parse instead.
- **`JRNY_Z_AI_KEY` without `envPrefix`:** Will be `undefined` at runtime — silent failure. Always verify `import.meta.env.JRNY_Z_AI_KEY` is non-empty on SW boot.
- **Sending `tripUpdate` as a one-way push from SW to side panel:** `@webext-core/messaging` is request-response, not pub-sub. Use return values from `analyzeChat` / `followUpChat` handlers instead of a separate push message.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client with retries/timeouts | Custom fetch wrapper | `openai` SDK | SDK handles retries, timeouts, auth headers, error types |
| JSON schema validation | Manual field checking | Zod `schema.parse()` | Catches partial AI output, surfaces typed errors |
| Env var type declarations | `declare global` stubs | WXT auto-generates `wxt.d.ts` | WXT injects `ImportMeta` augmentation automatically from `.env` files |
| Message serialization | JSON.stringify/parse wrappers | `@webext-core/messaging` | Already handles serialization and type safety |

**Key insight:** The hardest part of Phase 2 is not the AI call — it's the SW lifecycle (ephemeral state, keep-alive) and the env var prefix config. Both have standard solutions; don't improvise.

---

## Common Pitfalls

### Pitfall 1: JRNY_Z_AI_KEY is undefined at runtime

**What goes wrong:** `import.meta.env.JRNY_Z_AI_KEY` resolves to `undefined`; API call fails with 401 or a confusing SDK error about missing API key.
**Why it happens:** Vite only exposes vars with `WXT_` or `VITE_` prefix by default. `JRNY_` is not in the default whitelist.
**How to avoid:** Add `envPrefix: ['WXT_', 'JRNY_']` to `wxt.config.ts` vite block. Guard on SW boot: `if (!import.meta.env.JRNY_Z_AI_KEY) console.error('[JRNY] API key missing')`.
**Warning signs:** `openai` SDK throws "The OPENAI_API_KEY environment variable is missing or empty" OR network call gets 401.

### Pitfall 2: SW terminates mid-AI-call (30s timeout)

**What goes wrong:** For long transcripts, the z.AI call exceeds 30s of extension API silence and Chrome terminates the SW. The call is abandoned; the side panel gets no response.
**Why it happens:** MV3 SW has a 30s idle timer reset only by extension API calls or incoming events.
**How to avoid:** Wrap the `client.chat.completions.create()` call in `withKeepAlive()` (see Pattern 6). For hackathon: keep transcripts short (last 50 messages only) to stay well under 30s.
**Warning signs:** Side panel shows perpetual loading; SW logs show no completion message.

### Pitfall 3: zodResponseFormat incompatibility with z.AI

**What goes wrong:** `zodResponseFormat` sets `response_format.type = "json_schema"` which z.AI's GLM may not handle, returning a model error or ignoring the format instruction.
**Why it happens:** z.AI docs only document `json_object` mode; `json_schema` is an OpenAI-specific feature.
**How to avoid:** Use `response_format: { type: 'json_object' }` and define the expected shape in the system prompt. Parse the result with `TripIntentSchema.parse(JSON.parse(content))`.
**Warning signs:** API returns 400 or returns free-form text instead of JSON.

### Pitfall 4: Return-value vs push-message confusion

**What goes wrong:** Side panel tries to `onMessage('tripUpdate', ...)` but the SW never sends it because `@webext-core/messaging` is request-response, not pub-sub.
**Why it happens:** Mental model mismatch — `sendMessage` from side panel awaits a return value from SW's `onMessage` handler.
**How to avoid:** Use the return-value pattern: `onMessage('analyzeChat', async ({ data }) => { return await analyze(data.transcript); })`. Side panel gets `TripResult` from `await sendMessage('analyzeChat', ...)`.
**Warning signs:** Side panel awaits forever; no type error catches it because `void` return is valid.

### Pitfall 5: Conversation history lost between follow-up questions

**What goes wrong:** Each `followUpChat` call starts fresh; the AI has no context of previous Q&A.
**Why it happens:** SW is ephemeral — module-level variables don't persist across message invocations.
**How to avoid:** Side panel Zustand store owns the full `history` array. Each `followUpChat` message includes the entire history. SW appends the new question, calls z.AI with full history, returns the answer. Panel appends both Q and A to its history.
**Warning signs:** AI gives unrelated answers to follow-up questions.

### Pitfall 6: openai SDK v6 + zod v4 import path

**What goes wrong:** `import { z } from 'zod/v3'` (seen in some SDK examples) fails with zod v4 installed. Alternatively, `zodResponseFormat` import path may mismatch.
**Why it happens:** openai v6 examples sometimes show `zod/v3` subpath (backwards-compat shim); project has zod v4.
**How to avoid:** Import `from 'zod'` directly (not `zod/v3`). Avoid `zodResponseFormat` entirely (see Pitfall 3). Use `z.object(...)` from `'zod'`.
**Warning signs:** TypeScript error on `zod/v3` module not found.

---

## Code Examples

### Full analyzeChat Handler in background.ts

```typescript
// Source: Context7 /openai/openai-node + Context7 /aklinker1/webext-core + CLAUDE.md pattern
import { onMessage } from '@/messaging/protocol';
import { createAIClient } from '@/lib/ai-client';
import { buildSystemPrompt } from '@/lib/prompt';
import { TripIntentSchema } from '@/types/trip';
import { withKeepAlive } from '@/lib/keep-alive';

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
```

### System Prompt Shape

```typescript
// lib/prompt.ts
export function buildSystemPrompt(): string {
  return `You are a trip-planning assistant analyzing a group WhatsApp chat.
Extract trip planning information and return ONLY a JSON object with this exact shape:
{
  "destination": "city or country name (string)",
  "dates": "approximate dates or date range (string, e.g. 'late July' or '2025-07-20 to 2025-07-27')",
  "travelers": <number of travelers>,
  "budget": "budget description (string, e.g. 'budget-friendly', '~£500pp')",
  "summary": "one sentence: 'You\\'re planning a trip to X for N people around [dates]'",
  "consensus": ["list of things the group has agreed on"],
  "debating": ["list of things still being discussed or undecided"]
}
Return ONLY the JSON object. No markdown, no explanation.`;
}
```

### Zustand Store in Side Panel

```typescript
// Source: Context7 /pmndrs/zustand
// entrypoints/sidepanel/store.ts
import { create } from 'zustand';
import type { TripResult } from '@/types/trip';

interface ChatMessage { role: 'user' | 'assistant'; content: string; }

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

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GPT-4o via OpenAI API | GLM-5.1 via z.AI (OpenAI-compatible) | z.AI uses Zhipu AI GLM models | Must use model name `glm-5.1`, not `gpt-4o` |
| MV3 5-min hard SW limit | No hard max; 30s idle reset | Chrome 110+ | Keep-alive ping resets timer; no alarm needed for <30s AI calls |
| `httpAgent` in openai SDK | `fetchOptions` / native fetch | openai SDK v6 | SDK v6 is fully fetch-based; works natively in SW |
| `VITE_` only prefix in older Vite | `envPrefix: string \| string[]` in Vite config | Vite 2.x+ | Array form allows multiple custom prefixes alongside `VITE_` |

**Deprecated/outdated:**
- `openai` SDK v4/v5: Used `httpAgent` (Node.js only). v6 is required for SW compatibility.
- `json_schema` response_format: Not supported on z.AI GLM; use `json_object` instead.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `glm-5.1` is the correct/best model name for chat on z.AI paas endpoint | Standard Stack, Code Examples | API returns 404 model not found; fallback to `glm-4.7` or `glm-5` |
| A2 | z.AI `json_object` mode reliably produces valid JSON for the defined schema shape | Architecture Patterns | Occasional non-JSON output; add try/catch around `JSON.parse` with graceful error |
| A3 | Side panel can call `sendMessage('analyzeChat', ...)` to SW and await return | Architecture Patterns | If `@webext-core/messaging` has a side-panel limitation; test early in Wave 1 |
| A4 | Skyscanner referral links without `mediaPartnerId` still resolve for end users | Common Pitfalls, Links | Skyscanner may redirect to homepage; replace with Google Flights fallback |
| A5 | Google `?q=Flights to {dest}` format on `/travel/flights` lands on search results | Code Examples | Google changes URL format; use google.com/search?q= as fallback |
| A6 | MV3 SW keep-alive via `chrome.runtime.getPlatformInfo()` every 25s is sufficient for z.AI response latency | Common Pitfalls | If response >30s, SW still dies; add transcript windowing (last 50 msgs) as defense |
| A7 | `dangerouslyAllowBrowser: true` suppresses the SDK guard without side effects in SW context | Code Examples | No known side effects in SW; flag only affects a runtime check |

---

## Open Questions (RESOLVED)

1. **Which z.AI model name to use: `glm-5.1` or `glm-4.7`?**
   - What we know: z.AI quick-start shows `glm-5.1`; structured output docs show `glm-4.7` and `glm-5`
   - What's unclear: Whether `glm-5.1` is available on the general paas endpoint (vs coding endpoint)
   - Recommendation: Try `glm-5.1` first; fallback to `glm-4.7` in error handler. Document in the plan as a Wave 0 validation step.
   - **RESOLVED:** All plans use `glm-5.1` for both `analyzeChat` and `followUpChat` calls (02-PLAN-sw-handler.md Task 2). Fallback to `glm-4.7` is available if needed at runtime.

2. **Does `sendMessage` work from the side panel to the SW without an active tab?**
   - What we know: `@webext-core/messaging` supports SW as message target; works from content scripts
   - What's unclear: Side panel runs in its own context — need to confirm the routing path
   - Recommendation: Test in Wave 1 with a trivial `ping` message before building the full `analyzeChat` handler.
   - **RESOLVED:** `@webext-core/messaging` routes side panel → SW without requiring an active tab. Plan 04 (02-PLAN-sidepanel-ui.md) uses `sendMessage('analyzeChat', ...)` and `sendMessage('followUpChat', ...)` directly from `App.tsx`. The return-value pattern (no push/tripUpdate) is confirmed per RESEARCH.md Pattern 4 and Pitfall 4.

3. **Transcript windowing threshold?**
   - What we know: Large transcripts slow AI calls and risk SW timeout
   - What's unclear: At what message count does latency exceed 25s
   - Recommendation: Default to last 60 messages; user can re-trigger with shorter window if needed.
   - **RESOLVED:** `TRANSCRIPT_CAP = 60` set in `background.ts` (02-PLAN-sw-handler.md Task 2). Lines beyond 60 are sliced with `lines.slice(-TRANSCRIPT_CAP)` before the API call.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install openai | Yes | v24.14.1 | — |
| npm | package install | Yes | (via node) | — |
| openai package | AI-01..AI-05 | Not yet installed | 6.34.0 target | — |
| z.AI API endpoint | AI-01 | Assumed reachable | — | None; demo requires live API |
| JRNY_Z_AI_KEY secret | INFRA-05 | Not committed (correct) | — | None; must be provided in .env.local |
| Skyscanner referral URL | SUGG-01 | URL pattern confirmed | — | Google Flights search as primary |
| Booking.com search URL | SUGG-02 | URL pattern confirmed | — | Airbnb as secondary |

**Missing dependencies with no fallback:**
- `openai` package: must `npm install openai@6.34.0` before any AI code runs
- `JRNY_Z_AI_KEY` in `.env.local`: without this, build succeeds but API call fails at runtime

**Missing dependencies with fallback:**
- Skyscanner referral URL: if domain changes, Google Flights is the fallback

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A — no user auth in extension |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A |
| V5 Input Validation | Yes | Zod schema parse of AI output; never trust raw AI JSON |
| V6 Cryptography | No | API key is symmetric secret baked at build time — not stored, not transmitted to user's page |

### Known Threat Patterns for MV3 + LLM

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key exposure via page JS | Information Disclosure | Key lives in SW only (not content script); SW context not accessible to page JS |
| AI response injection (malicious chat content manipulates AI) | Tampering | Prompt includes system instructions; AI output is parsed by Zod (schema constrains shape); output is never eval'd |
| Large transcript DoS (huge chat → OOM or timeout) | Denial of Service | Transcript windowing: last N messages only before sending to AI |
| Link injection via AI output | Tampering | Links built from extracted destination strings using encode functions; AI cannot inject raw URLs into the DOM |

---

## Sources

### Primary (HIGH confidence)
- Context7 `/openai/openai-node` — SDK client config, structured output, streaming, chat completions
- Context7 `/llmstxt/wxt_dev_llms_txt` — WXT env var prefix rules, vite() override pattern
- Context7 `/aklinker1/webext-core` — typed messaging protocol, return-value pattern
- Context7 `/wxt-dev/wxt` — storage API, defineItem patterns
- `https://vite.dev/config/shared-options#envprefix` — envPrefix as string | string[] (verified via WebFetch)
- `https://wxt.dev/guide/essentials/config/environment-variables` — WXT_ / VITE_ prefix requirement (verified via WebFetch)
- `https://docs.z.ai/guides/capabilities/struct-output` — json_object mode, supported models (verified via WebFetch)
- `https://docs.z.ai/guides/overview/quick-start` — glm-5.1 model name, base URL (verified via WebFetch)
- npm registry — openai@6.34.0, zod@4.3.6 versions (verified via `npm view`)

### Secondary (MEDIUM confidence)
- `https://developers.skyscanner.net/docs/referrals/examples` — Skyscanner calendar-month-view URL format (verified via WebFetch)
- `https://developer.chrome.com/blog/longer-esw-lifetimes` — SW 30s idle timeout, no hard max (verified via WebFetch)
- WebSearch + multiple sources — Booking.com `ss=` param, Airbnb `/s/{dest}/homes` pattern

### Tertiary (LOW confidence)
- WebSearch — Google Flights `/travel/flights?q=` URL format (current URL uses encoded `tfs` param; simple text search not confirmed to work)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all library versions verified via npm registry; installed packages confirmed in node_modules
- Architecture: HIGH — messaging patterns verified via Context7; SW rules confirmed via Chrome docs
- Pitfalls: HIGH — env var prefix verified via official WXT + Vite docs; SW timeout from Chrome docs
- Deep links: MEDIUM — Skyscanner verified; Booking.com/Airbnb pattern-confirmed from search; Google Flights LOW (encoded URL)

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (stable stack; z.AI model names may change faster)
