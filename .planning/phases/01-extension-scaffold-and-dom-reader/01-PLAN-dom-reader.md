---
plan: "WhatsApp DOM Reader + Typed Messaging to SW"
phase: 1
wave: 2
depends_on: ["01-PLAN-scaffold.md"]
requirements_addressed: [INFRA-02, INFRA-03]
files_modified:
  - entrypoints/content.ts
  - src/whatsapp/selectors.ts
  - src/whatsapp/extractor.ts
  - src/whatsapp/observer.ts
autonomous: true
---

## Objective

Add the read-only WhatsApp Web DOM reader. On every WhatsApp Web tab, a content script mounts a MutationObserver scoped to the chat pane, extracts `{dataId, sender, timestamp, text, urls[]}` from each new message using a tiered ARIA → `data-*` → structural selector cascade, dedupes by `data-id`, debounces the batch at 300ms, and forwards the batch to the service worker over the typed `@webext-core/messaging` channel registered in Plan 01.

After this plan ships:
- **INFRA-02**: Visible messages in the active WhatsApp Web conversation are observed and parsed into structured `Message` objects.
- **INFRA-03**: Batches of parsed messages flow from content script → service worker over the `chatDelta` channel defined in `src/messaging/protocol.ts`; the SW console logs `[JRNY] chatDelta: N messages` followed by one line per message.

**Constraints (from CLAUDE.md + ARCHITECTURE.md):**
- Content script is **read-only**. No writes to the page. No injected DOM. No `innerHTML` on WhatsApp nodes (XSS — always `innerText` / `textContent`).
- **ARIA-first selectors.** Never hashed class names like `._ao3e`.
- **No persistent storage** of chat content — the dedupe `Set<string>` and pending `Map` live only in content-script scope.
- **Never walk `__reactFiber$…`** — fragile and policy-risky.

---

## Tasks

### Task 1: Selector cascade + single-row extractor (pure functions, no DOM mutation)

<read_first>
- /Users/ammad/Documents/agently /.planning/phases/01-extension-scaffold-and-dom-reader/01-RESEARCH.md  (sections: "Pattern 6: WhatsApp DOM Reader", "Pitfall 4: Duplicate messages on chat switch", "Pitfall 6: Selector drift", Assumptions A1 + A2)
- /Users/ammad/Documents/agently /.planning/research/ARCHITECTURE.md  (section: "WhatsApp Web DOM Strategy" — tier table, defensive measures)
- /Users/ammad/Documents/agently /.planning/phases/01-extension-scaffold-and-dom-reader/01-PLAN-scaffold.md  (confirm `src/types/message.ts` shape and `src/messaging/protocol.ts` exports from Plan 01)
- /Users/ammad/Documents/agently /src/types/message.ts  (the Message contract this extractor must satisfy)
</read_first>

<action>
Create `src/whatsapp/selectors.ts` with the tiered selector constants. These are the single source of truth for every DOM query in the reader.

```typescript
// src/whatsapp/selectors.ts
/**
 * Selector tiers — most stable first.
 *
 * Tier 1 (ARIA / a11y): HIGH stability. WhatsApp preserves these for screen readers.
 * Tier 2 (data-*): MEDIUM-HIGH. `data-id` schema `false_<chat>@s.whatsapp.net_<msg>`
 *   rarely changes; `data-testid` present on some builds.
 * Tier 3 (structural classes .copyable-text / .selectable-text): MEDIUM.
 *   Historically stable for years but not guaranteed across WhatsApp deploys.
 * Tier 4 (hashed classes like ._ao3e): NEVER USE — rotates on every deploy.
 *
 * Source: .planning/research/ARCHITECTURE.md "WhatsApp Web DOM Strategy"
 * Source: .planning/phases/01-extension-scaffold-and-dom-reader/01-RESEARCH.md Pattern 6
 */
export const CHAT_PANE_SELECTORS = [
  '[aria-label="Message list"]',                    // tier 1 (a11y, English locale)
  '[data-testid="conversation-panel-messages"]',    // tier 2
  '#main [role="application"]',                     // tier 1 fallback
] as const;

/** Each rendered message row. Tier 1 ARIA. */
export const MESSAGE_ROW = '[role="row"]';

/** The .copyable-text wrapper carries data-pre-plain-text="[HH:MM, DD/MM/YYYY] Sender: ". */
export const MSG_BLOCK = '.copyable-text[data-pre-plain-text]';

/** The inner span with the actual message body text. */
export const MSG_TEXT = 'span.selectable-text';

/** The data attribute carrying the stable WhatsApp message id. */
export const MSG_ID_ATTR = 'data-id';
```

Create `src/whatsapp/extractor.ts`. This file contains ONLY pure functions — they take a DOM node and return a `Message` or `null`. No observers, no state, no side effects. Keeping it pure makes it trivial to reason about in Task 3.

```typescript
// src/whatsapp/extractor.ts
import type { Message } from '@/types/message';
import { MSG_BLOCK, MSG_ID_ATTR, MSG_TEXT } from './selectors';

/** Regex: match any http(s) URL in message text. */
const URL_RE = /https?:\/\/[^\s<>"']+/g;

/** data-pre-plain-text format: "[HH:MM, DD/MM/YYYY] Sender Name: " */
const HEADER_RE = /^\[([^\]]+)\]\s+([^:]+):\s*$/;

/**
 * Extract a structured Message from a WhatsApp [role="row"] element.
 * Returns null if the row has no data-id or no body text (non-message rows,
 * system notifications, date dividers all return null).
 *
 * Defensive by design: if the data-pre-plain-text header fails to parse,
 * sender + timestamp fall back to '' but `text` is still returned — passing
 * INFRA-02 even when locale/format drifts (Assumption A1/A2 in RESEARCH.md).
 */
export function parseRow(row: Element): Message | null {
  // data-id may live on the row itself OR a descendant wrapper.
  const idEl =
    row.closest(`[${MSG_ID_ATTR}]`) ?? row.querySelector(`[${MSG_ID_ATTR}]`);
  const dataId = idEl?.getAttribute(MSG_ID_ATTR);
  if (!dataId) return null;

  const block = row.querySelector(MSG_BLOCK);
  if (!block) return null;

  const header = block.getAttribute('data-pre-plain-text') ?? '';
  const m = HEADER_RE.exec(header);
  const timestamp = m?.[1]?.trim() ?? '';
  const sender = m?.[2]?.trim() ?? '';

  // innerText ONLY — never innerHTML. Message content is untrusted input.
  const textEl = block.querySelector(MSG_TEXT) as HTMLElement | null;
  const text = (textEl?.innerText ?? '').trim();
  if (!text) return null;

  const urls = Array.from(text.matchAll(URL_RE), (x) => x[0]);

  return { dataId, sender, timestamp, text, urls };
}
```
</action>

<acceptance_criteria>
- `test -f src/whatsapp/selectors.ts` succeeds
- `test -f src/whatsapp/extractor.ts` succeeds
- `grep -q 'aria-label="Message list"' src/whatsapp/selectors.ts` returns 0
- `grep -q 'data-testid="conversation-panel-messages"' src/whatsapp/selectors.ts` returns 0
- `grep -q "role=\"row\"" src/whatsapp/selectors.ts` returns 0
- `grep -q "copyable-text" src/whatsapp/selectors.ts` returns 0
- `grep -q "data-pre-plain-text" src/whatsapp/selectors.ts` returns 0
- `grep -q "MSG_ID_ATTR" src/whatsapp/selectors.ts` returns 0
- `grep -q "selectable-text" src/whatsapp/selectors.ts` returns 0
- No hashed class selector appears in the file: `grep -Eq "\\._[a-z0-9]{4,}" src/whatsapp/selectors.ts` returns NONZERO
- `grep -q "export function parseRow" src/whatsapp/extractor.ts` returns 0
- `grep -q "innerText" src/whatsapp/extractor.ts` returns 0
- `grep -q "innerHTML" src/whatsapp/extractor.ts` returns NONZERO  (MUST NOT be used)
- `grep -q "https\\?://" src/whatsapp/extractor.ts` returns 0  (URL regex present)
- `grep -q "from '@/types/message'" src/whatsapp/extractor.ts` returns 0
- `npx tsc --noEmit` exits 0
</acceptance_criteria>

---

### Task 2: MutationObserver + dedupe + 300ms debounce

<read_first>
- /Users/ammad/Documents/agently /.planning/phases/01-extension-scaffold-and-dom-reader/01-RESEARCH.md  (sections: "Pattern 6" full observer code, "Pitfall 3: Chat pane not mounted at document_idle", "Pitfall 4: Duplicate messages on chat switch")
- /Users/ammad/Documents/agently /src/whatsapp/selectors.ts  (from Task 1)
- /Users/ammad/Documents/agently /src/whatsapp/extractor.ts  (from Task 1)
</read_first>

<action>
Create `src/whatsapp/observer.ts`. This module owns three concerns: (a) find the chat pane even when WhatsApp mounts it late, (b) dedupe by `data-id`, (c) debounce batches at 300ms.

```typescript
// src/whatsapp/observer.ts
import type { Message } from '@/types/message';
import { CHAT_PANE_SELECTORS, MESSAGE_ROW } from './selectors';
import { parseRow } from './extractor';

const DEBOUNCE_MS = 300;
const CHAT_PANE_POLL_MS = 500;

function findChatPane(): Element | null {
  for (const sel of CHAT_PANE_SELECTORS) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

export interface StartObserverOptions {
  /** Called with a batched, deduped array of new messages every ~300ms. */
  onBatch: (msgs: Message[]) => void;
  /** WXT's ctx.signal — aborts observer on content-script reload. */
  signal: AbortSignal;
}

export function startObserver({ onBatch, signal }: StartObserverOptions): void {
  const seen = new Set<string>();              // dedupe by dataId for lifetime of CS
  const pending = new Map<string, Message>();  // batched messages awaiting flush
  let flushTimer: number | null = null;

  function flush(): void {
    flushTimer = null;
    if (pending.size === 0) return;
    const batch = Array.from(pending.values());
    pending.clear();
    onBatch(batch);
  }

  function queue(msg: Message): void {
    if (seen.has(msg.dataId)) return;         // Pitfall 4: dedupe across chat switches
    seen.add(msg.dataId);
    pending.set(msg.dataId, msg);
    if (flushTimer === null) {
      flushTimer = window.setTimeout(flush, DEBOUNCE_MS);
    }
  }

  function scanRoot(root: ParentNode): void {
    root.querySelectorAll(MESSAGE_ROW).forEach((row) => {
      const m = parseRow(row);
      if (m) queue(m);
    });
  }

  // Pitfall 3: WhatsApp is an SPA. At document_idle the chat pane may not be
  // mounted yet. Poll until it appears, then start the real observer.
  const bootInterval = window.setInterval(() => {
    const pane = findChatPane();
    if (!pane) return;
    window.clearInterval(bootInterval);

    console.log('[JRNY][content] chat pane found; starting observer');

    // Initial sweep: emit currently-visible messages so the SW sees something
    // even before any new mutation fires.
    scanRoot(pane);

    const observer = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches(MESSAGE_ROW)) {
            const msg = parseRow(node);
            if (msg) queue(msg);
          } else {
            scanRoot(node);               // handle wrapping div that contains rows
          }
        }
      }
    });
    observer.observe(pane, { childList: true, subtree: true });

    signal.addEventListener('abort', () => {
      observer.disconnect();
      if (flushTimer !== null) {
        window.clearTimeout(flushTimer);
        flushTimer = null;
      }
    });
  }, CHAT_PANE_POLL_MS);

  signal.addEventListener('abort', () => window.clearInterval(bootInterval));
}
```

Notes:
- `seen` is never cleared within a content-script lifetime. A new `Set` is created only on full page reload (when the CS module re-evaluates). This matches the "no persistent chat storage" rule (everything lives in CS memory only) while preventing the SW from being flooded when the user switches chats and WhatsApp re-injects historical rows.
- The observer watches `pane` with `{ childList: true, subtree: true }`. This is sufficient — WhatsApp re-renders by swapping subtrees, and our `scanRoot` pass catches descendants added inside wrapper divs.
- Debounce is implemented with a single pending timer — no leading edge, no trailing throttle. `onBatch` fires at most once every 300ms when new messages arrive.
</action>

<acceptance_criteria>
- `test -f src/whatsapp/observer.ts` succeeds
- `grep -q "export function startObserver" src/whatsapp/observer.ts` returns 0
- `grep -q "MutationObserver" src/whatsapp/observer.ts` returns 0
- `grep -q "new Set<string>" src/whatsapp/observer.ts` returns 0
- `grep -q "DEBOUNCE_MS = 300" src/whatsapp/observer.ts` returns 0
- `grep -q "childList: true, subtree: true" src/whatsapp/observer.ts` returns 0
- `grep -q "signal.addEventListener('abort'" src/whatsapp/observer.ts` returns 0
- `grep -q "observer.disconnect" src/whatsapp/observer.ts` returns 0
- `grep -q "findChatPane" src/whatsapp/observer.ts` returns 0
- `grep -q "setInterval" src/whatsapp/observer.ts` returns 0  (boot polling for late-mount chat pane)
- `grep -q "parseRow" src/whatsapp/observer.ts` returns 0
- `grep -q "CHAT_PANE_SELECTORS" src/whatsapp/observer.ts` returns 0
- No `innerHTML` usage: `grep -q "innerHTML" src/whatsapp/observer.ts` returns NONZERO
- `npx tsc --noEmit` exits 0
</acceptance_criteria>

---

### Task 3: Content script entrypoint — wire observer → typed `chatDelta` → SW

<read_first>
- /Users/ammad/Documents/agently /.planning/phases/01-extension-scaffold-and-dom-reader/01-RESEARCH.md  (sections: "Pattern 1: Manifest Generation via defineContentScript", "Pitfall 7: host_permissions too narrow", "Example B: Verify side panel flip")
- /Users/ammad/Documents/agently /src/messaging/protocol.ts  (sendMessage signature from Plan 01)
- /Users/ammad/Documents/agently /src/whatsapp/observer.ts  (startObserver signature from Task 2)
- /Users/ammad/Documents/agently /entrypoints/background.ts  (confirm `onMessage('chatDelta', …)` is already registered from Plan 01)
- /Users/ammad/Documents/agently /wxt.config.ts  (confirm `host_permissions: ['https://web.whatsapp.com/*']` from Plan 01)
</read_first>

<action>
Create `entrypoints/content.ts`:

```typescript
// entrypoints/content.ts
// Source: https://wxt.dev/guide/essentials/entrypoints.html
import { defineContentScript } from 'wxt/sandbox';
import { sendMessage } from '@/messaging/protocol';
import { startObserver } from '@/whatsapp/observer';

export default defineContentScript({
  matches: ['https://web.whatsapp.com/*'],
  runAt: 'document_idle',
  world: 'ISOLATED',
  main(ctx) {
    console.log('[JRNY][content] booted on', location.href);

    startObserver({
      signal: ctx.signal,
      onBatch: (messages) => {
        // Fire-and-forget. The SW will log the payload (see entrypoints/background.ts).
        // @webext-core/messaging returns a Promise; we don't await to keep the
        // observer callback synchronous, but we DO catch to surface delivery errors.
        sendMessage('chatDelta', { messages }).catch((err) => {
          console.warn('[JRNY][content] chatDelta send failed:', err);
        });
      },
    });
  },
});
```

Key points:
- `matches` must be identical to the `host_permissions` entry in `wxt.config.ts` (Pitfall 7). Both are `https://web.whatsapp.com/*`.
- `runAt: 'document_idle'` is the WXT default and gives WhatsApp enough time to start mounting — the observer then polls for the chat pane (Task 2) to handle the rest.
- `world: 'ISOLATED'` is the default; spelled out here for clarity and to document that this CS does NOT need access to WhatsApp's page globals (no `window.Store`, no `__reactFiber$…`).
- We do NOT await `sendMessage` because a slow SW wake should never block the next mutation; `.catch` surfaces delivery failures without crashing the observer.

**Verify the full pipeline end-to-end** by running `npm run dev`, loading WhatsApp Web in the Chrome window WXT launches, signing in, opening a group chat, and then reading the **service worker** console at `chrome://extensions → JRNY Copilot → "service worker" → Inspect`. Expected output after a few seconds of chat activity:

```
[JRNY] service worker booted
[JRNY] chatDelta: 12 messages
  10:32, 18/04/2026 Alice: Let's go to Goa in June!
  10:33, 18/04/2026 Bob: Down. How about flights?
  ...
```

And the **content script** console (in the WhatsApp tab's DevTools → Console, filtered by source `content.js`) shows:

```
[JRNY][content] booted on https://web.whatsapp.com/
[JRNY][content] chat pane found; starting observer
```

If the SW console shows the boot line but never `chatDelta: N messages`, the DOM selectors have drifted — use the DevTools snippet in `01-RESEARCH.md` "Example A" to verify `.copyable-text[data-pre-plain-text]` still matches on the current WhatsApp build, and update `src/whatsapp/selectors.ts` accordingly.
</action>

<acceptance_criteria>
- `test -f entrypoints/content.ts` succeeds
- `grep -q "defineContentScript" entrypoints/content.ts` returns 0
- `grep -q "https://web.whatsapp.com/\\*" entrypoints/content.ts` returns 0
- `grep -q "runAt: 'document_idle'" entrypoints/content.ts` returns 0
- `grep -q "world: 'ISOLATED'" entrypoints/content.ts` returns 0
- `grep -q "startObserver" entrypoints/content.ts` returns 0
- `grep -q "sendMessage('chatDelta'" entrypoints/content.ts` returns 0
- `grep -q "ctx.signal" entrypoints/content.ts` returns 0
- `npx tsc --noEmit` exits 0
- `npm run build` exits 0
- `test -f .output/chrome-mv3/content-scripts/content.js` succeeds (WXT emits the CS bundle)
- Manifest includes the content script:
    - `grep -q '"content_scripts"' .output/chrome-mv3/manifest.json` returns 0
    - `grep -q 'web.whatsapp.com' .output/chrome-mv3/manifest.json` returns 0
- End-to-end smoke test (record result in SUMMARY):
    1. `npm run dev` — Chrome launches with extension loaded
    2. Navigate to https://web.whatsapp.com/ and sign in to your account
    3. Open any group or 1:1 chat with recent messages
    4. Open `chrome://extensions → JRNY Copilot → "service worker" → Inspect`
    5. Service worker console shows `[JRNY] service worker booted` then, within ~1s of chat activity, `[JRNY] chatDelta: N messages` followed by one line per message in the format `  TIMESTAMP SENDER: TEXT`
    6. Send a new message in the chat (manually, from another device or the WhatsApp UI) — a fresh `[JRNY] chatDelta: 1 messages` entry appears in the SW console within ~500ms
    7. Switch to a DIFFERENT chat in the same tab — SW console does NOT re-log the previously-seen messages (dedupe works)
    8. The WhatsApp tab's own DevTools console shows `[JRNY][content] booted on https://web.whatsapp.com/` and `[JRNY][content] chat pane found; starting observer`
</acceptance_criteria>

---

## Phase 1 Exit Criteria (met after this plan ships)

- [x] INFRA-01: Extension installs and activates on `web.whatsapp.com` (Plan 01 manifest + Plan 02 content script)
- [x] INFRA-02: Content script reads visible chat messages (observer + extractor)
- [x] INFRA-03: Content script forwards messages to SW via typed protocol (`chatDelta` over `@webext-core/messaging`)
- [x] INFRA-04: Side panel opens on icon click, enabled only on WhatsApp Web tabs (Plan 01 background.ts)

Phase 1 demo: Load WhatsApp Web → click icon → side panel opens showing "JRNY Copilot" branded shell → SW console shows live `chatDelta` batches flowing from the chat. Ready for Phase 2 to replace `console.log` with a z.AI call.
