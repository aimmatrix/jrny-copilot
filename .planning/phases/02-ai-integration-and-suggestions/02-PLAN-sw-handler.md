---
phase: 02-ai-integration-and-suggestions
plan: "03"
type: execute
wave: 2
depends_on:
  - "02-01"
  - "02-02"
files_modified:
  - messaging/protocol.ts
  - entrypoints/background.ts
autonomous: true
requirements:
  - AI-01
  - AI-02
  - AI-03
  - AI-04
  - AI-05

must_haves:
  truths:
    - "Service worker receives analyzeChat message from side panel and returns TripResult"
    - "Service worker receives followUpChat message with history and returns {answer: string}"
    - "analyzeChat caps transcript at 60 messages before sending to z.AI"
    - "Both AI calls are wrapped in withKeepAlive to prevent SW idle timeout"
    - "All onMessage handlers are registered synchronously inside main()"
    - "No module-level OpenAI singleton — createAIClient() called inside each handler"
    - "chatDelta handler buffers messages into chrome.storage.session['jrny_messages'] (capped at 120) so side panel can read the live transcript"
  artifacts:
    - path: "messaging/protocol.ts"
      provides: "analyzeChat and followUpChat message types in ProtocolMap"
      contains: "analyzeChat"
    - path: "entrypoints/background.ts"
      provides: "analyzeChat and followUpChat onMessage handlers"
      exports: ["analyzeChat handler", "followUpChat handler"]
  key_links:
    - from: "messaging/protocol.ts ProtocolMap"
      to: "entrypoints/background.ts onMessage handlers"
      via: "import { onMessage } from '@/messaging/protocol'"
      pattern: "onMessage\\('analyzeChat'"
    - from: "entrypoints/background.ts analyzeChat"
      to: "lib/ai-client.ts createAIClient"
      via: "import { createAIClient } from '@/lib/ai-client'"
      pattern: "createAIClient\\(\\)"
    - from: "entrypoints/background.ts analyzeChat"
      to: "types/trip.ts TripIntentSchema"
      via: "import { TripIntentSchema } from '@/types/trip'"
      pattern: "TripIntentSchema\\.parse"
---

<objective>
Extend the messaging protocol with analyzeChat and followUpChat types, then implement the corresponding SW handlers in background.ts that call z.AI and return typed results.

Purpose: This is the core AI integration — the SW handler is the only place permitted to make cross-origin network calls (CLAUDE.md rule). The side panel triggers analysis by sending analyzeChat; the SW calls z.AI, parses the JSON response through Zod, and returns TripResult directly as the message return value.

Output: messaging/protocol.ts extended with 2 new message types; background.ts extended with analyzeChat and followUpChat handlers using the lib modules from Wave 1.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/ammad/Documents/agently /.planning/ROADMAP.md
@/Users/ammad/Documents/agently /.planning/REQUIREMENTS.md

<interfaces>
<!-- Current messaging/protocol.ts (full file): -->
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

<!-- Types created in Wave 1 — Wave 2 imports these: -->
```typescript
// From types/trip.ts:
export const TripIntentSchema = z.object({ destination, dates, travelers, budget, summary, consensus, debating });
export type TripResult = z.infer<typeof TripIntentSchema>;
export interface ChatMessage { role: 'user' | 'assistant'; content: string; }

// From lib/ai-client.ts:
export function createAIClient(): OpenAI

// From lib/prompt.ts:
export function buildSystemPrompt(): string

// From lib/keep-alive.ts:
export async function withKeepAlive<T>(fn: () => Promise<T>): Promise<T>
```

<!-- Current background.ts structure (full file): -->
```typescript
import { defineBackground } from 'wxt/utils/define-background';
import { onMessage } from '@/messaging/protocol';

export default defineBackground({
  type: 'module',
  main() {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.error('[JRNY] setPanelBehavior failed:', err));

    if (!import.meta.env.JRNY_Z_AI_KEY) {
      console.error('[JRNY] JRNY_Z_AI_KEY is missing — AI calls will fail. Set it in .env.local');
    }

    chrome.tabs.onUpdated.addListener((tabId, _info, tab) => {
      if (!tab.url) return;
      const isWa = tab.url.startsWith('https://web.whatsapp.com/');
      chrome.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: isWa })
        .catch((err) => console.error('[JRNY] setOptions failed:', err));
    });

    onMessage('chatDelta', ({ data }) => {
      console.log(`[JRNY] chatDelta: ${data.messages.length} messages`);
      data.messages.forEach((m) => {
        const preview = m.text.length > 80 ? m.text.slice(0, 80) + '…' : m.text;
        console.log(`  ${m.timestamp} ${m.sender}: ${preview}`);
        if (m.urls.length) console.log('    urls:', m.urls);
      });
    });

    console.log('[JRNY] service worker booted');
  },
});
```

<!-- CRITICAL: @webext-core/messaging return-value pattern -->
<!-- onMessage handler RETURNS the value; sendMessage caller awaits it. NO separate push message. -->
<!-- DO NOT add a tripUpdate message type — this is the wrong pattern for @webext-core/messaging. -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend messaging/protocol.ts with analyzeChat and followUpChat types</name>
  <files>messaging/protocol.ts</files>
  <read_first>
    - /Users/ammad/Documents/agently /messaging/protocol.ts — read full file; must preserve chatDelta and the defineExtensionMessaging call exactly
    - /Users/ammad/Documents/agently /types/trip.ts — confirm TripResult is exported (created in Wave 1) before adding the import
  </read_first>
  <action>
Replace the contents of `messaging/protocol.ts` with the following. Preserve the chatDelta entry unchanged. Add two new entries to ProtocolMap and one new import:

```typescript
import { defineExtensionMessaging } from '@webext-core/messaging';
import type { Message } from '@/types/message';
import type { TripResult } from '@/types/trip';

/**
 * Typed messaging contract between all extension contexts.
 * chatDelta: CS -> SW (Phase 1)
 * analyzeChat, followUpChat: SidePanel -> SW (Phase 2)
 *
 * IMPORTANT: @webext-core/messaging is request-response, not pub-sub.
 * SW handlers RETURN values; side panel AWAITS sendMessage() — no push messages.
 */
export interface ProtocolMap {
  /** Content script -> SW: batch of new messages from one debounce window. */
  chatDelta(data: { messages: Message[] }): void;

  /**
   * SidePanel -> SW: request full AI analysis of the provided transcript.
   * Returns TripResult directly (return-value pattern — no separate tripUpdate push).
   * Transcript should be pre-capped to last 60 messages by the caller.
   */
  analyzeChat(data: { transcript: string }): TripResult;

  /**
   * SidePanel -> SW: send a follow-up question with the full conversation history.
   * SW appends question to history, calls z.AI, returns the assistant answer.
   * Side panel (Zustand) owns history state; passes full array each call.
   */
  followUpChat(data: {
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    question: string;
  }): { answer: string };
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
```

Critical: Do NOT add a `tripUpdate` message type. The return-value pattern makes it unnecessary and adding it would cause side-panel logic to hang (RESEARCH.md Pitfall 4).
  </action>
  <verify>
    <automated>cd "/Users/ammad/Documents/agently " && grep "analyzeChat\|followUpChat\|TripResult" messaging/protocol.ts && grep "chatDelta" messaging/protocol.ts && npx tsc --noEmit --skipLibCheck 2>&1 | head -10</automated>
  </verify>
  <done>
    - messaging/protocol.ts contains analyzeChat, followUpChat, and chatDelta in ProtocolMap
    - `import type { TripResult } from '@/types/trip'` is present
    - `tripUpdate` does NOT appear in the file
    - TypeScript reports no errors on the file
  </done>
</task>

<task type="auto">
  <name>Task 2: Add analyzeChat and followUpChat handlers to background.ts</name>
  <files>entrypoints/background.ts</files>
  <read_first>
    - /Users/ammad/Documents/agently /entrypoints/background.ts — read full file before editing; note existing imports on lines 1-2 and the exact structure of main()
    - /Users/ammad/Documents/agently /messaging/protocol.ts — confirm analyzeChat and followUpChat are now in ProtocolMap (Task 1 must be complete)
    - /Users/ammad/Documents/agently /lib/ai-client.ts — confirm createAIClient export signature
    - /Users/ammad/Documents/agently /lib/prompt.ts — confirm buildSystemPrompt export signature
    - /Users/ammad/Documents/agently /lib/keep-alive.ts — confirm withKeepAlive export signature
    - /Users/ammad/Documents/agently /types/trip.ts — confirm TripIntentSchema export
  </read_first>
  <action>
Replace the contents of `entrypoints/background.ts` with the following. All existing behavior (sidePanel setup, tab listener, chatDelta handler, boot log) MUST be preserved exactly. Add 4 new imports and 2 new onMessage handlers:

```typescript
import { defineBackground } from 'wxt/utils/define-background';
import { onMessage } from '@/messaging/protocol';
import { createAIClient } from '@/lib/ai-client';
import { buildSystemPrompt } from '@/lib/prompt';
import { TripIntentSchema } from '@/types/trip';
import { withKeepAlive } from '@/lib/keep-alive';

/** Maximum number of messages to send to z.AI per analysis call. */
const TRANSCRIPT_CAP = 60;

export default defineBackground({
  type: 'module',
  main() {
    // ---------- INFRA-04: side panel opens on action (icon) click ----------
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.error('[JRNY] setPanelBehavior failed:', err));

    // ---------- INFRA-05: API key guard ----------
    if (!import.meta.env.JRNY_Z_AI_KEY) {
      console.error('[JRNY] JRNY_Z_AI_KEY is missing — AI calls will fail. Set it in .env.local');
    }

    // ---------- INFRA-04: per-tab enable/disable ----------
    chrome.tabs.onUpdated.addListener((tabId, _info, tab) => {
      if (!tab.url) return;
      const isWa = tab.url.startsWith('https://web.whatsapp.com/');
      chrome.sidePanel
        .setOptions({
          tabId,
          path: 'sidepanel.html',
          enabled: isWa,
        })
        .catch((err) => console.error('[JRNY] setOptions failed:', err));
    });

    // ---------- INFRA-03 endpoint ----------
    // Registered SYNCHRONOUSLY at top level — Pitfall 2 in 01-RESEARCH.md.
    onMessage('chatDelta', ({ data }) => {
      console.log(`[JRNY] chatDelta: ${data.messages.length} messages`);
      data.messages.forEach((m) => {
        const preview = m.text.length > 80 ? m.text.slice(0, 80) + '…' : m.text;
        console.log(`  ${m.timestamp} ${m.sender}: ${preview}`);
        if (m.urls.length) console.log('    urls:', m.urls);
      });
      // Buffer to session storage so side panel getTranscript() reads the live chat
      chrome.storage.session.get('jrny_messages').then((stored) => {
        const existing = (stored['jrny_messages'] as Array<{ sender: string; timestamp: string; text: string }>) ?? [];
        const merged = [...existing, ...data.messages].slice(-120);
        chrome.storage.session.set({ jrny_messages: merged });
      });
    });

    // ---------- AI-01 / AI-02 / AI-03 / AI-04: full trip analysis ----------
    // Side panel sends transcript; SW calls z.AI and returns TripResult directly.
    // Return-value pattern: side panel awaits sendMessage('analyzeChat', ...) for result.
    onMessage('analyzeChat', async ({ data }) => {
      // Cap transcript to prevent runaway latency / SW timeout (RESEARCH.md Pitfall 2)
      const lines = data.transcript.split('\n');
      const capped = lines.slice(-TRANSCRIPT_CAP).join('\n');

      console.log(`[JRNY] analyzeChat: ${lines.length} lines → capped to ${Math.min(lines.length, TRANSCRIPT_CAP)}`);

      try {
        const client = createAIClient(); // never module-level — SW is ephemeral
        const completion = await withKeepAlive(() =>
          client.chat.completions.create({
            model: 'glm-5.1',
            messages: [
              { role: 'system', content: buildSystemPrompt() },
              { role: 'user', content: `Chat transcript:\n${capped}` },
            ],
            response_format: { type: 'json_object' },
          })
        );
        const raw = completion.choices[0]?.message.content ?? '{}';
        const result = TripIntentSchema.parse(JSON.parse(raw));
        console.log('[JRNY] analyzeChat complete — destination:', result.destination);
        return result;
      } catch (err) {
        console.error('[JRNY] analyzeChat failed:', err);
        throw err; // re-throw so side panel can display error state
      }
    });

    // ---------- AI-05: multi-turn follow-up chat ----------
    // Side panel owns history (Zustand); passes full history + new question each call.
    // SW never stores conversation state — it is ephemeral.
    onMessage('followUpChat', async ({ data }) => {
      console.log('[JRNY] followUpChat: question =', data.question.slice(0, 60));

      try {
        const client = createAIClient();
        const messages = [
          { role: 'system' as const, content: buildSystemPrompt() },
          ...data.history,
          { role: 'user' as const, content: data.question },
        ];
        const completion = await withKeepAlive(() =>
          client.chat.completions.create({
            model: 'glm-5.1',
            messages,
          })
        );
        const answer = completion.choices[0]?.message.content ?? '';
        return { answer };
      } catch (err) {
        console.error('[JRNY] followUpChat failed:', err);
        throw err;
      }
    });

    console.log('[JRNY] service worker booted');
  },
});
```

Critical rules:
- Both new onMessage calls are INSIDE main(), registered synchronously at the top level (not inside callbacks or Promises)
- createAIClient() is called INSIDE each handler body — never at module scope
- model name is `glm-5.1` (not gpt-4o or any other name)
- response_format is `{ type: 'json_object' }` (not json_schema)
- TripIntentSchema.parse(JSON.parse(raw)) — manual parse, NOT zodResponseFormat
  </action>
  <verify>
    <automated>cd "/Users/ammad/Documents/agently " && grep "onMessage('analyzeChat'" entrypoints/background.ts && grep "onMessage('followUpChat'" entrypoints/background.ts && grep "glm-5.1" entrypoints/background.ts && grep "json_object" entrypoints/background.ts && grep "TripIntentSchema.parse" entrypoints/background.ts && grep "jrny_messages" entrypoints/background.ts && npx tsc --noEmit --skipLibCheck 2>&1 | head -20</automated>
  </verify>
  <done>
    - background.ts has onMessage('analyzeChat', ...) and onMessage('followUpChat', ...) both inside main()
    - model name is 'glm-5.1' in both calls
    - response_format: { type: 'json_object' } is present in analyzeChat call
    - TripIntentSchema.parse(JSON.parse(raw)) is present
    - createAIClient() is called inside handler bodies, not at module scope
    - withKeepAlive wraps both client.chat.completions.create() calls
    - TRANSCRIPT_CAP = 60 is applied before the analyzeChat AI call
    - chatDelta handler, sidePanel setup, and tab listener are unchanged
    - chatDelta handler calls `chrome.storage.session.get('jrny_messages')` and buffers up to 120 messages
    - TypeScript reports no errors
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| SidePanel transcript → SW | Side panel sends transcript text; SW must not trust its length or content |
| z.AI JSON response → TripResult | Untrusted network response crosses into typed app state |
| followUpChat history → z.AI messages | Panel-owned history array is injected into z.AI messages array |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-08 | Denial of Service | analyzeChat — large transcript causes timeout | mitigate | TRANSCRIPT_CAP = 60 enforced before AI call. Lines beyond 60 are sliced off. withKeepAlive pings every 25s. |
| T-02-09 | Tampering | followUpChat — prompt injection via user question | mitigate | User question is appended as a role:'user' message, not string-concatenated into the system prompt. System prompt enforces JSON-only output for analyzeChat; followUpChat does not use json_object mode, so injection can affect response phrasing but not application state. |
| T-02-10 | Tampering | analyzeChat — malicious chat message in transcript manipulates AI | mitigate | AI output is parsed by TripIntentSchema.parse() which enforces the exact schema shape. Output is never eval()'d. Fields are strings/numbers/arrays only — no code paths. |
| T-02-11 | Information Disclosure | analyzeChat — raw transcript logged | accept | console.log only logs message count and line count, not transcript content. Individual message previews already logged via chatDelta handler (existing). SW console not accessible to page JS. |
| T-02-12 | Repudiation | No audit trail of AI calls | accept | Hackathon scope. Post-launch: add request IDs to logs. |
</threat_model>

<verification>
After both tasks complete:
1. `grep "analyzeChat\|followUpChat" messaging/protocol.ts` — both present in ProtocolMap
2. `grep "tripUpdate" messaging/protocol.ts` — must return nothing (type must not exist)
3. `grep "onMessage('analyzeChat'" entrypoints/background.ts` — handler registered
4. `grep "onMessage('followUpChat'" entrypoints/background.ts` — handler registered
5. `grep "glm-5.1" entrypoints/background.ts` — correct model name
6. `grep "json_object" entrypoints/background.ts` — correct response format
7. `grep "TRANSCRIPT_CAP" entrypoints/background.ts` — cap applied
8. `grep "createAIClient" entrypoints/background.ts` — called inside handlers, not at top-level
9. `grep "jrny_messages" entrypoints/background.ts` — session storage buffering in chatDelta handler
10. `npx tsc --noEmit --skipLibCheck` — no TypeScript errors
</verification>

<success_criteria>
- messaging/protocol.ts: ProtocolMap has analyzeChat (returns TripResult) and followUpChat (returns {answer: string}), no tripUpdate
- background.ts: both handlers registered synchronously inside main(); model glm-5.1; json_object mode; Zod parse; withKeepAlive; TRANSCRIPT_CAP=60
- background.ts chatDelta handler buffers messages into chrome.storage.session['jrny_messages'] (capped at 120) so side panel getTranscript() reads the live WhatsApp chat
- All Phase 1 behavior (sidePanel, tab listener, chatDelta logging) is unchanged
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `/Users/ammad/Documents/agently /.planning/phases/02-ai-integration-and-suggestions/02-03-SUMMARY.md` using the summary template.
</output>
