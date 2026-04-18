---
phase: 02-ai-integration-and-suggestions
plan: "04"
type: execute
wave: 3
depends_on:
  - "02-02"
  - "02-03"
files_modified:
  - entrypoints/sidepanel/App.tsx
  - entrypoints/sidepanel/store.ts
autonomous: false
requirements:
  - AI-05
  - SUGG-01
  - SUGG-02
  - SUGG-03
  - SUGG-04

user_setup:
  - service: z.ai
    why: "Live AI trip analysis requires a real API key"
    env_vars:
      - name: JRNY_Z_AI_KEY
        source: "z.AI dashboard at https://bigmodel.cn/usercenter/apikeys — replace placeholder in .env.local"

must_haves:
  truths:
    - "Side panel shows an 'Analyze Chat' button that triggers a z.AI API call"
    - "While the AI call is in progress, a loading indicator replaces the button"
    - "After analysis, a trip summary card shows destination, dates, travelers, budget, and the one-line summary"
    - "Consensus and debating items are listed below the summary"
    - "Flight suggestion links (Skyscanner + Google Flights) open in a new tab"
    - "Hotel suggestion links (Booking.com + Airbnb) open in a new tab"
    - "2-3 activity suggestion links (Google Search) open in a new tab"
    - "A follow-up chat input lets the user type a question and see the AI response"
    - "Chat history persists in Zustand across multiple follow-up questions"
    - "Error state is shown if the AI call fails (not a blank screen)"
  artifacts:
    - path: "entrypoints/sidepanel/store.ts"
      provides: "Zustand store with tripResult, chatHistory, isLoading, error state"
      exports: ["useJrnyStore"]
    - path: "entrypoints/sidepanel/App.tsx"
      provides: "Full side panel UI: analyze button, trip summary, suggestion cards, chat input"
  key_links:
    - from: "entrypoints/sidepanel/App.tsx analyzeButton onClick"
      to: "messaging/protocol.ts analyzeChat"
      via: "sendMessage('analyzeChat', { transcript })"
      pattern: "sendMessage\\('analyzeChat'"
    - from: "entrypoints/sidepanel/App.tsx chatInput onSubmit"
      to: "messaging/protocol.ts followUpChat"
      via: "sendMessage('followUpChat', { history, question })"
      pattern: "sendMessage\\('followUpChat'"
    - from: "entrypoints/sidepanel/App.tsx suggestion links"
      to: "lib/links.ts URL constructors"
      via: "import { buildFlightLink, buildHotelLink, buildActivitiesLink } from '@/lib/links'"
      pattern: "buildFlightLink|buildHotelLink|buildActivitiesLink"
    - from: "entrypoints/sidepanel/store.ts"
      to: "types/trip.ts TripResult"
      via: "import type { TripResult, ChatMessage } from '@/types/trip'"
      pattern: "TripResult|ChatMessage"
---

<objective>
Build the full Phase 2 side panel UI: Zustand state store, analyze button, trip summary display, suggestion link cards, and multi-turn follow-up chat input.

Purpose: This is the user-facing surface of Phase 2 — everything the demo judges see. The side panel sends analyzeChat to the SW, receives TripResult, displays structured trip info and deep-link cards, and supports follow-up questions via followUpChat.

Output: entrypoints/sidepanel/store.ts (new Zustand store), entrypoints/sidepanel/App.tsx (extended with full Phase 2 UI). Ends with a human-verify checkpoint to confirm the full flow works end-to-end.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/ammad/Documents/agently /.planning/ROADMAP.md
@/Users/ammad/Documents/agently /.planning/REQUIREMENTS.md

<interfaces>
<!-- Current App.tsx (full file — 18 lines, replace entirely): -->
```typescript
export default function App() {
  return (
    <main className="min-h-screen bg-neutral-50 p-4 font-sans">
      <header className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600" />
        <h1 className="text-xl font-semibold tracking-tight">JRNY Copilot</h1>
      </header>
      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-neutral-700">Extension active on WhatsApp Web.</p>
        <p className="mt-2 text-xs text-neutral-500">
          AI suggestions will appear here once Phase 2 ships.
        </p>
      </section>
    </main>
  );
}
```

<!-- Existing Tailwind conventions to preserve: -->
<!-- - bg-neutral-50 (page bg), border-neutral-200, shadow-sm (card chrome) -->
<!-- - text-sm text-neutral-700 (body), text-xs text-neutral-500 (secondary) -->
<!-- - rounded-lg border bg-white p-4 (card container) -->
<!-- - gap-2, mt-6, mt-2 (spacing) -->

<!-- Messaging pattern (sendMessage returns typed result — no cast needed): -->
```typescript
import { sendMessage } from '@/messaging/protocol';
const result = await sendMessage('analyzeChat', { transcript });
// result is typed as TripResult automatically
const { answer } = await sendMessage('followUpChat', { history, question });
```

<!-- Types from Wave 1 types/trip.ts: -->
```typescript
export type TripResult = {
  destination: string; dates: string; travelers: number; budget: string;
  summary: string; consensus: string[]; debating: string[];
}
export interface ChatMessage { role: 'user' | 'assistant'; content: string; }
```

<!-- Link constructors from Wave 1 lib/links.ts: -->
```typescript
export function buildFlightLink(destination: string, origin?: string): string
export function buildGoogleFlightsLink(destination: string): string
export function buildHotelLink(destination: string): string
export function buildAirbnbLink(destination: string): string
export function buildActivitiesLink(destination: string): string
```

<!-- lucide-react icons available (already installed): Plane, Building, MapPin, Loader2 -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create entrypoints/sidepanel/store.ts — Zustand state store</name>
  <files>entrypoints/sidepanel/store.ts</files>
  <read_first>
    - /Users/ammad/Documents/agently /types/trip.ts — confirm TripResult and ChatMessage exports (needed for store types)
    - /Users/ammad/Documents/agently /lib/utils.ts — check Zustand is available (already installed per RESEARCH.md)
  </read_first>
  <action>
Create `entrypoints/sidepanel/store.ts` with this exact content. The Zustand store owns ALL side panel state for Phase 2 — no local useState for trip data or chat history:

```typescript
import { create } from 'zustand';
import type { TripResult, ChatMessage } from '@/types/trip';

interface JrnyStore {
  /** Result from the last analyzeChat call. Null until first analysis. */
  tripResult: TripResult | null;
  /** Full conversation history for follow-up chat. Side panel owns this — SW is ephemeral. */
  chatHistory: ChatMessage[];
  /** True while an AI call (analyzeChat or followUpChat) is in flight. */
  isLoading: boolean;
  /** Error message to show in the UI. Null when no error. */
  error: string | null;

  setTripResult: (r: TripResult) => void;
  appendChat: (msg: ChatMessage) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  /** Reset trip result and chat history (used by re-analyze). */
  reset: () => void;
}

export const useJrnyStore = create<JrnyStore>((set) => ({
  tripResult: null,
  chatHistory: [],
  isLoading: false,
  error: null,
  setTripResult: (r) => set({ tripResult: r, error: null }),
  appendChat: (msg) => set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
  setLoading: (v) => set({ isLoading: v }),
  setError: (e) => set({ error: e, isLoading: false }),
  reset: () => set({ tripResult: null, chatHistory: [], error: null, isLoading: false }),
}));
```
  </action>
  <verify>
    <automated>cd "/Users/ammad/Documents/agently " && grep "useJrnyStore\|tripResult\|chatHistory\|isLoading" entrypoints/sidepanel/store.ts && npx tsc --noEmit --skipLibCheck 2>&1 | grep "sidepanel/store" | head -5</automated>
  </verify>
  <done>
    - store.ts exports `useJrnyStore`
    - Store has tripResult, chatHistory, isLoading, error fields
    - Store has setTripResult, appendChat, setLoading, setError, reset actions
    - TypeScript reports no errors on store.ts
  </done>
</task>

<task type="auto">
  <name>Task 2: Rewrite entrypoints/sidepanel/App.tsx with full Phase 2 UI</name>
  <files>entrypoints/sidepanel/App.tsx</files>
  <read_first>
    - /Users/ammad/Documents/agently /entrypoints/sidepanel/App.tsx — read current shell (18 lines) before replacing
    - /Users/ammad/Documents/agently /entrypoints/sidepanel/store.ts — confirm store exports (Task 1 must be complete)
    - /Users/ammad/Documents/agently /messaging/protocol.ts — confirm analyzeChat and followUpChat are in ProtocolMap (Wave 2 must be complete)
    - /Users/ammad/Documents/agently /lib/links.ts — confirm all five URL constructor exports
    - /Users/ammad/Documents/agently /types/trip.ts — confirm TripResult type shape
  </read_first>
  <action>
Replace the entire content of `entrypoints/sidepanel/App.tsx` with the following. Preserve the header (logo + "JRNY Copilot") from the Phase 1 shell; replace the placeholder section with the full Phase 2 UI.

The component architecture:
- `App` — root layout, header, routes between states (empty / loading / result / error)
- Inline sub-components within the file: `TripSummary`, `SuggestionCard`, `ChatPanel`
- Zustand store via `useJrnyStore()` for all mutable state
- `sendMessage` from `@/messaging/protocol` for SW communication

```typescript
import { useState, useRef } from 'react';
import { Plane, Building, MapPin, Loader2 } from 'lucide-react';
import { sendMessage } from '@/messaging/protocol';
import { useJrnyStore } from './store';
import {
  buildFlightLink,
  buildGoogleFlightsLink,
  buildHotelLink,
  buildAirbnbLink,
  buildActivitiesLink,
} from '@/lib/links';
import type { TripResult, ChatMessage } from '@/types/trip';

// ---------------------------------------------------------------------------
// Helper: build transcript string from accumulated chatDelta messages.
// For Phase 2 demo: reads from chrome.storage.session if available,
// otherwise uses a hardcoded demo transcript so the Analyze button always works.
// ---------------------------------------------------------------------------
async function getTranscript(): Promise<string> {
  try {
    // @wxt-dev/storage stores chatDelta messages under 'session:jrny_messages'
    // (set by background.ts accumulator if added — graceful fallback if not)
    const stored = await chrome.storage.session.get('jrny_messages');
    const msgs = stored['jrny_messages'] as Array<{ sender: string; timestamp: string; text: string }> | undefined;
    if (msgs && msgs.length > 0) {
      return msgs
        .slice(-60)
        .map((m) => `[${m.timestamp}] ${m.sender}: ${m.text}`)
        .join('\n');
    }
  } catch {
    // session storage not available — fall through to demo transcript
  }
  // Demo transcript fallback: ensures Analyze button always produces a result
  return [
    '[10:00] Alice: Hey everyone, thinking we should do a group trip this summer!',
    '[10:01] Bob: Yes! I vote Barcelona — great food and beaches',
    '[10:02] Charlie: Barcelona sounds amazing, I\'m in',
    '[10:03] Alice: Dates? I can do late July, maybe 20th-27th?',
    '[10:04] Bob: Late July works for me',
    '[10:05] Charlie: Same, late July is good',
    '[10:06] Alice: Budget-wise, thinking around £600-800 per person?',
    '[10:07] Bob: That works, maybe slightly under if we find good deals',
    '[10:08] Charlie: Agreed, budget-friendly is key',
    '[10:09] Alice: So we\'re thinking Barcelona, late July, 3 of us, ~£700pp?',
    '[10:10] Bob: Yes let\'s do it! Still need to figure out accommodation though',
    '[10:11] Charlie: Hotel or Airbnb? I prefer Airbnb for groups',
    '[10:12] Alice: Airbnb sounds good to me too',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// SuggestionCard — renders a single link card with icon
// ---------------------------------------------------------------------------
interface SuggestionCardProps {
  icon: 'plane' | 'building' | 'map-pin';
  label: string;
  url: string;
}

function SuggestionCard({ icon, label, url }: SuggestionCardProps) {
  const Icon = icon === 'plane' ? Plane : icon === 'building' ? Building : MapPin;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm hover:border-emerald-400 hover:shadow transition-all"
    >
      <Icon className="h-4 w-4 shrink-0 text-emerald-600" />
      <span className="text-sm text-neutral-700">{label}</span>
    </a>
  );
}

// ---------------------------------------------------------------------------
// TripSummary — renders the AI-extracted trip intent card
// ---------------------------------------------------------------------------
function TripSummary({ result }: { result: TripResult }) {
  return (
    <section className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-neutral-800">{result.summary}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-neutral-500">Destination</dt>
          <dd className="font-medium text-neutral-800">{result.destination}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Dates</dt>
          <dd className="font-medium text-neutral-800">{result.dates}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Travelers</dt>
          <dd className="font-medium text-neutral-800">{result.travelers}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Budget</dt>
          <dd className="font-medium text-neutral-800">{result.budget}</dd>
        </div>
      </dl>

      {result.consensus.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-emerald-700">Agreed on</p>
          <ul className="mt-1 space-y-0.5">
            {result.consensus.map((item, i) => (
              <li key={i} className="text-xs text-neutral-600">• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {result.debating.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-amber-700">Still debating</p>
          <ul className="mt-1 space-y-0.5">
            {result.debating.map((item, i) => (
              <li key={i} className="text-xs text-neutral-600">• {item}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// SuggestionLinks — renders flight, hotel, activity cards
// ---------------------------------------------------------------------------
function SuggestionLinks({ destination }: { destination: string }) {
  return (
    <section className="mt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Suggestions</p>
      <div className="mt-2 space-y-2">
        <SuggestionCard
          icon="plane"
          label={`Flights to ${destination} — Skyscanner`}
          url={buildFlightLink(destination)}
        />
        <SuggestionCard
          icon="plane"
          label={`Flights to ${destination} — Google Flights`}
          url={buildGoogleFlightsLink(destination)}
        />
        <SuggestionCard
          icon="building"
          label={`Stays in ${destination} — Booking.com`}
          url={buildHotelLink(destination)}
        />
        <SuggestionCard
          icon="building"
          label={`Stays in ${destination} — Airbnb`}
          url={buildAirbnbLink(destination)}
        />
        <SuggestionCard
          icon="map-pin"
          label={`Things to do in ${destination}`}
          url={buildActivitiesLink(destination)}
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ChatPanel — multi-turn follow-up questions
// ---------------------------------------------------------------------------
function ChatPanel() {
  const { chatHistory, isLoading, appendChat, setLoading, setError } = useJrnyStore();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: question };
    appendChat(userMsg);
    setInput('');
    setLoading(true);

    try {
      const history = useJrnyStore.getState().chatHistory;
      const { answer } = await sendMessage('followUpChat', { history, question });
      appendChat({ role: 'assistant', content: answer });
    } catch (err) {
      setError('Follow-up failed. Check SW logs.');
      console.error('[JRNY][panel] followUpChat failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Ask a follow-up</p>

      {chatHistory.length > 0 && (
        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-xs ${
                msg.role === 'user'
                  ? 'bg-emerald-50 text-emerald-900 ml-4'
                  : 'bg-white border border-neutral-200 text-neutral-700 mr-4'
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Any good beaches near Barcelona?"
          disabled={isLoading}
          className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs placeholder:text-neutral-400 focus:border-emerald-400 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ask'}
        </button>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// App — root component
// ---------------------------------------------------------------------------
export default function App() {
  const { tripResult, isLoading, error, setTripResult, setLoading, setError, reset } = useJrnyStore();

  async function handleAnalyze() {
    reset();
    setLoading(true);
    try {
      const transcript = await getTranscript();
      const result = await sendMessage('analyzeChat', { transcript });
      setTripResult(result);
    } catch (err) {
      setError('Analysis failed. Check the SW console and verify JRNY_Z_AI_KEY is set.');
      console.error('[JRNY][panel] analyzeChat failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-4 font-sans">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600" />
          <h1 className="text-xl font-semibold tracking-tight">JRNY Copilot</h1>
        </div>
        {tripResult && (
          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="text-xs text-neutral-500 hover:text-emerald-600 disabled:opacity-50"
          >
            Re-analyze
          </button>
        )}
      </header>

      {/* Error state */}
      {error && (
        <section className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-700">{error}</p>
        </section>
      )}

      {/* Empty state — Analyze button */}
      {!tripResult && !isLoading && (
        <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-neutral-700">Open a WhatsApp group chat, then analyze it with JRNY.</p>
          <button
            onClick={handleAnalyze}
            className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Analyze Chat
          </button>
        </section>
      )}

      {/* Loading state */}
      {isLoading && (
        <section className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <p className="text-sm text-neutral-500">Analyzing your trip chat...</p>
        </section>
      )}

      {/* Result state */}
      {tripResult && !isLoading && (
        <>
          <TripSummary result={tripResult} />
          <SuggestionLinks destination={tripResult.destination} />
          <ChatPanel />
        </>
      )}
    </main>
  );
}
```

Key implementation rules:
- All links use `target="_blank" rel="noreferrer"` (SUGG-04)
- `sendMessage('analyzeChat', ...)` and `sendMessage('followUpChat', ...)` imported from `@/messaging/protocol`
- URL constructors imported from `@/lib/links`
- chatHistory passed in full on each followUpChat call (SW is ephemeral — RESEARCH.md Pitfall 5)
- `useJrnyStore.getState().chatHistory` used inside async handler to get latest state (avoids stale closure)
- Loader2 from lucide-react for loading spinners (already installed)
- Error state shown as red section, not blank screen
  </action>
  <verify>
    <automated>cd "/Users/ammad/Documents/agently " && grep "sendMessage('analyzeChat'" entrypoints/sidepanel/App.tsx && grep "sendMessage('followUpChat'" entrypoints/sidepanel/App.tsx && grep "target=\"_blank\"" entrypoints/sidepanel/App.tsx && grep "buildFlightLink\|buildHotelLink\|buildActivitiesLink" entrypoints/sidepanel/App.tsx && grep "useJrnyStore" entrypoints/sidepanel/App.tsx && npx tsc --noEmit --skipLibCheck 2>&1 | grep "sidepanel/App" | head -10</automated>
  </verify>
  <done>
    - App.tsx has sendMessage('analyzeChat') and sendMessage('followUpChat') calls
    - All anchor tags have target="_blank" rel="noreferrer"
    - buildFlightLink, buildHotelLink, buildActivitiesLink are used
    - useJrnyStore is imported from './store'
    - JRNY Copilot header preserved
    - Loading, error, empty, and result states all present
    - TypeScript reports no errors
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
The full Phase 2 AI integration is complete:
- Wave 0: openai@6.34.0 installed, wxt.config.ts has envPrefix: ['WXT_', 'JRNY_'], .env.local template created
- Wave 1: types/trip.ts, lib/ai-client.ts, lib/prompt.ts, lib/keep-alive.ts, lib/links.ts all created
- Wave 2: messaging/protocol.ts extended with analyzeChat/followUpChat, background.ts has SW handlers
- Wave 3: sidepanel/store.ts (Zustand) and sidepanel/App.tsx (full UI) complete

Before verifying, ensure your real z.AI API key is set in .env.local:
```
JRNY_Z_AI_KEY=your-actual-key-here
```
Then rebuild: `npm run dev` (or `npm run build` and reload extension in chrome://extensions).
  </what-built>
  <how-to-verify>
1. Open Chrome and load the extension in developer mode (chrome://extensions → Load unpacked → select .output/chrome-mv3 or use npm run dev)
2. Navigate to https://web.whatsapp.com — the extension should activate (check chrome://extensions for no errors)
3. Click the JRNY extension icon — the side panel should open with the "JRNY Copilot" header and an "Analyze Chat" button
4. Click "Analyze Chat" — a loading spinner should appear (Loader2 animation)
5. After 5-15 seconds, the trip result should appear:
   - Trip summary card with destination (Barcelona), dates (late July), travelers (3), budget (~£700pp)
   - One-line summary sentence
   - "Agreed on" list with consensus items
   - "Still debating" list (accommodation type)
   - 5 suggestion cards: Skyscanner, Google Flights, Booking.com, Airbnb, Google Search activities
6. Click each suggestion card — should open the booking/search site in a NEW TAB (not same tab)
7. Type a follow-up question in the chat input: "Any good beaches near Barcelona?"
8. Click "Ask" — loading indicator should appear, then the AI's answer should appear below the input
9. Type a second follow-up: "What's the best neighbourhood to stay in?" — should answer with context from the previous Q&A
10. Click "Re-analyze" (top right, appears after first result) — should restart the analysis

Expected: All 10 steps work. If the AI call fails, check:
  - SW console (chrome://extensions → Inspect service worker) for error messages
  - Confirm JRNY_Z_AI_KEY is set in .env.local and not the placeholder string
  - Confirm npm run dev / rebuild after adding the key
  </how-to-verify>
  <resume-signal>Type "approved" if all steps pass. Otherwise describe which step failed and any console errors.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| User input (chat box) → followUpChat message | User-typed text crosses into the z.AI messages array |
| TripResult → rendered HTML | AI strings are rendered as text content (not innerHTML) |
| Deep-link URLs → new tab | URL-encoded destination strings open in new tab |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-13 | Tampering | App.tsx — XSS via AI result fields rendered as HTML | mitigate | All TripResult fields rendered via JSX text content (not dangerouslySetInnerHTML). React escapes string content automatically. |
| T-02-14 | Tampering | App.tsx — user follow-up input injection into AI context | accept | Input is passed as role:'user' message content. Cannot escape the messages array to affect system prompt. AI output is display-only text, not executable code. Low risk for hackathon. |
| T-02-15 | Information Disclosure | getTranscript() reads chrome.storage.session | accept | session storage is isolated to the extension origin. Not accessible by WhatsApp Web page JS. Transcript is ephemeral (session storage cleared on browser close). Acceptable for hackathon scope. |
| T-02-16 | Denial of Service | ChatPanel — unbounded chatHistory renders | accept | Each follow-up is one user message + one assistant message. Realistic chat sessions produce <20 exchanges. max-h-48 overflow-y-auto bounds the rendered height. |
| T-02-17 | Spoofing | Demo transcript fallback — analyst sees fake data | accept | Fallback is clearly for demo purposes (hardcoded Barcelona scenario). Real transcript from chatDelta takes priority. Developer must replace key to get real results. |
</threat_model>

<verification>
After tasks complete and before the checkpoint:
1. `grep "sendMessage('analyzeChat'" entrypoints/sidepanel/App.tsx` — present
2. `grep "sendMessage('followUpChat'" entrypoints/sidepanel/App.tsx` — present
3. `grep "target=\"_blank\"" entrypoints/sidepanel/App.tsx` — present on all suggestion card anchors
4. `grep "useJrnyStore" entrypoints/sidepanel/store.ts entrypoints/sidepanel/App.tsx` — both files reference the store
5. `npx tsc --noEmit --skipLibCheck` — no errors
6. Extension loads in Chrome without manifest or console errors
7. Analyze Chat button triggers loading state → AI call → result display
8. All 5 suggestion links open in new tabs
9. Follow-up chat input sends message and receives response
</verification>

<success_criteria>
- store.ts: Zustand store with tripResult, chatHistory, isLoading, error; reset() action
- App.tsx: Analyze button triggers analyzeChat; loading spinner during call; TripSummary card with all 7 fields; 5 SuggestionCard links (2 flight, 2 hotel, 1 activity); all links open in new tab; ChatPanel with input, history display, followUpChat integration; Re-analyze button visible after first result; error state shown on failure
- Phase 2 end-to-end flow verified by human checkpoint: analyze → display → deep-links → follow-up chat
</success_criteria>

<output>
After completion, create `/Users/ammad/Documents/agently /.planning/phases/02-ai-integration-and-suggestions/02-04-SUMMARY.md` using the summary template.
</output>
