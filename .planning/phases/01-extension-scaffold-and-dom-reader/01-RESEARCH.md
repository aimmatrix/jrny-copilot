# Phase 1: Extension Scaffold & DOM Reader — Research

**Researched:** 2026-04-18
**Domain:** Chrome MV3 extension bootstrapping (WXT + React 19 + Tailwind v4 + shadcn/ui) + WhatsApp Web DOM reading + typed messaging
**Confidence:** HIGH (framework/tooling, all versions verified against npm registry 2026-04-18); MEDIUM (WhatsApp DOM selectors — inherently unstable)

---

## Summary

Phase 1 scaffolds a WXT-based Chrome MV3 extension that (a) auto-enables the side panel on `web.whatsapp.com`, (b) runs a read-only content script that pulls messages from the visible chat via ARIA-first selectors + MutationObserver, (c) forwards typed `{sender, timestamp, text, urls[]}` payloads to the service worker over `@webext-core/messaging`, and (d) logs them in the SW console. No AI, no UI polish — just end-to-end plumbing.

**Primary recommendation:** Bootstrap with `npx wxt@latest init` → React template → add `@wxt-dev/module-react`, `@tailwindcss/vite`, `@webext-core/messaging`, `@wxt-dev/storage`. Use `tier-1/tier-2/tier-3` selector cascade (ARIA first, `data-pre-plain-text` second, `.copyable-text` third — never hashed classes). MutationObserver scoped to the chat pane with 300ms debounce, dedupe by `data-id`. Service worker calls `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` + `chrome.sidePanel.setOptions({ tabId, enabled: true })` on WhatsApp tabs.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

**No CONTEXT.md exists for this phase** — user did not run `/gsd-discuss-phase 1`. Planner has full discretion within the stack and architecture already fixed in `STACK.md`, `ARCHITECTURE.md`, `PITFALLS.md`, and top-level `CLAUDE.md`. Those documents function as the locked decisions for this phase:

### Locked Decisions (from STACK.md + CLAUDE.md)
- **Framework:** WXT (MV3, file-based entrypoints)
- **UI:** React 19 + TypeScript + Tailwind v4 + shadcn/ui
- **State:** Zustand + `@wxt-dev/storage` (not used heavily in Phase 1; reserved for Phase 2+)
- **Messaging:** `@webext-core/messaging` (typed protocol)
- **UI Surface:** `chrome.sidePanel` (NOT injected into the page)
- **Content script is strictly read-only** — never writes to the page, never auto-replies, never reads `window.Store`/moduleRaid
- **All network calls from service worker** (Phase 1 has none; content script talks only to SW via messaging)
- **No persistent chat storage** — messages live only in SW memory
- **Selectors:** ARIA-first, `data-*` second, structural classes third — never hashed class names

### Claude's Discretion
- Exact file layout inside `entrypoints/`
- MutationObserver debounce duration (recommendation: 300ms)
- Whether to add `biome` vs. leave WXT default lint
- Whether to add `zod` for payload validation at the SW boundary (recommended, bundled anyway)

### Deferred Ideas (OUT OF SCOPE for Phase 1)
- AI/z.AI integration (Phase 2)
- API key storage (Phase 2)
- Side panel UI content/branding (Phase 3)
- Multi-turn chat input (Phase 3)
- Suggestion cards (Phase 2/3)
- Selector-pack remote update (v2)
- Options page (Phase 2)
- Offscreen document (Phase 2 for URL metadata)
- URL metadata fetching (Phase 2)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Chrome MV3 extension installs and activates automatically on `web.whatsapp.com` | `manifest.content_scripts.matches: ["https://web.whatsapp.com/*"]` + `host_permissions` — WXT generates this from `defineContentScript({ matches })`. See "Manifest Generation" + "Content Script Registration". |
| INFRA-02 | Content script reads visible chat messages from the active WhatsApp Web conversation | "WhatsApp DOM Reading Strategy" — tiered selectors + `MutationObserver` on `[aria-label="Message list"]` (or fallback). |
| INFRA-03 | Content script forwards messages to service worker via typed message protocol | `@webext-core/messaging` `defineExtensionMessaging<ProtocolMap>()` — see "Typed Messaging Setup". |
| INFRA-04 | Extension activates side panel on WhatsApp Web tab | `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` + per-tab `setOptions({ tabId, enabled: true })` via `chrome.tabs.onUpdated` — see "Side Panel Activation". |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

1. Content script is **read-only**. It MUST NOT write to the page, MUST NOT auto-reply, MUST NOT mark-read, MUST NOT inject visible DOM.
2. **All network calls from the service worker.** (Phase 1 has no network calls, but the architecture must not close off this path.)
3. **Side panel is the only UI surface.** No injected sidebar, no Shadow DOM UI in the host page.
4. **No persistent chat storage.** Messages live in SW memory only during processing. No writes to `chrome.storage.local` of message content in Phase 1.
5. **ARIA-first selectors.** Never hashed class names like `._ao3e`.
6. **Hackathon context.** Ship fast; do not over-engineer. Skip selector-pack remote update, BYOK UI, analytics.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auto-register content script on WhatsApp Web | Manifest / Build (WXT codegen) | — | `defineContentScript({ matches })` in `entrypoints/content.ts` produces manifest entry; Chrome injects automatically [VERIFIED: WXT entrypoints docs] |
| Read DOM messages | Content script (isolated world) | — | Only context with DOM access to `web.whatsapp.com` [VERIFIED: MV3 docs] |
| Parse ARIA/data selectors + MutationObserver | Content script | — | DOM ops require `document`; SW has none |
| Dedupe by `data-id` | Content script | Service worker (secondary dedupe) | Cheapest at source; SW acts as backstop for multi-tab |
| Typed message channel | Shared TS module (imported in both CS + SW) | — | `@webext-core/messaging` requires a single `ProtocolMap` shared across contexts [VERIFIED: docs] |
| Log/inspect payloads | Service worker | — | Phase 1 endpoint — SW `console.log`, viewable via `chrome://extensions → service worker → inspect` |
| Open side panel on icon click | Service worker | — | `chrome.sidePanel.setPanelBehavior` only callable from SW [VERIFIED: Chrome docs] |
| Enable/disable side panel per tab | Service worker | — | `chrome.tabs.onUpdated` + `chrome.sidePanel.setOptions({ tabId })` runs in SW [VERIFIED: Chrome docs] |
| Side panel render shell (empty "Hello JRNY") | `entrypoints/sidepanel/` React app | — | Placeholder; filled out in Phase 3 |

---

## Standard Stack

All versions verified via `npm view <pkg> version` on 2026-04-18 [VERIFIED: npm registry 2026-04-18].

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `wxt` | `^0.20.25` | Extension framework — file-based entrypoints, auto-manifest, HMR | Actively maintained (last publish 2026-04-18); 43% smaller than Plasmo; first-class React module [VERIFIED: npm + WXT docs] |
| `@wxt-dev/module-react` | `^1.2.2` | React 19 integration module for WXT | Registers `@vitejs/plugin-react`, auto-imports, JSX support [VERIFIED: WXT docs] |
| `react` | `^19.2.5` | UI framework for side panel | Latest stable; shadcn v4 requires React 19 [VERIFIED: npm] |
| `react-dom` | `^19.2.5` | React renderer | Matches React [VERIFIED: npm] |
| `typescript` | `^5.6.0` | Language | WXT is TS-first; `@types/chrome` has full MV3 types [CITED: wxt.dev] |
| `@types/chrome` | `^0.1.40` | Chrome API type defs | Required for `chrome.sidePanel`, `chrome.tabs`, etc. [VERIFIED: npm] |

### Styling
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tailwindcss` | `^4.2.2` | Utility-first CSS | v4 uses CSS-first config via `@import "tailwindcss"` [VERIFIED: npm, tailwindcss.com] |
| `@tailwindcss/vite` | `^4.2.2` | Tailwind v4 Vite plugin | Official integration, zero PostCSS config required [CITED: tailwindcss.com/docs/installation/using-vite] |
| `tw-animate-css` | `^1.4.0` | Animation utility layer shadcn v4 depends on | Replaces `tailwindcss-animate` for v4 [VERIFIED: npm, shadcn docs] |
| `class-variance-authority` | `^0.7.1` | Variant prop helper (shadcn dep) | Required by shadcn component generator [VERIFIED: npm] |
| `clsx` | `^2.1.1` | Conditional className helper | Required by shadcn `cn()` util [VERIFIED: npm] |
| `tailwind-merge` | `^3.5.0` | Dedup conflicting Tailwind classes | Required by shadcn `cn()` util [VERIFIED: npm] |
| `lucide-react` | `^1.8.0` | Icon library | shadcn default icon set [VERIFIED: npm] |

> **Note on `lucide-react`:** The `1.x` line is the recently-renamed package; `0.x` was the legacy. Verify after install that shadcn-generated components import from `lucide-react` correctly. If the shadcn CLI pins an older range, accept its pin — don't override during Phase 1.

### Messaging & Storage
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@webext-core/messaging` | `^2.3.0` | Typed CS ↔ SW ↔ sidepanel messaging | WXT docs recommend; eliminates raw `chrome.runtime.sendMessage` footguns [VERIFIED: npm + webext-core docs] |
| `@wxt-dev/storage` | `^1.2.8` | Type-safe wrapper over `chrome.storage.local` | Not heavily used Phase 1; installed so Phase 2 can adopt without refactor [VERIFIED: npm] |

### Optional (recommended, low cost)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^4.3.6` | Runtime validation of message payloads at SW boundary | Cheap safety net; catches malformed payloads early [VERIFIED: npm] |
| `@vitejs/plugin-react` | `^6.0.1` | React Fast Refresh for side panel HMR | Bundled by `@wxt-dev/module-react` — no direct install needed [VERIFIED: npm] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@webext-core/messaging` | Raw `chrome.runtime.sendMessage` | Untyped, easier to mis-wire on/off listener registrations, no RPC-style return |
| `@webext-core/messaging` | `webext-bridge` | Similar ergonomics; WXT docs explicitly recommend webext-core — sticking with docs-blessed path |
| Tailwind v4 | Tailwind v3 | v3 has smaller community friction with shadcn, but STACK.md already locked v4 |
| WXT | Plasmo | Plasmo has stagnated in 2025; WXT is the clear successor [CITED: redreamality 2025 comparison] |

### Installation (one-shot)

```bash
# 1. Bootstrap
npx wxt@latest init jrny-copilot --template react
cd jrny-copilot

# 2. Core deps (Phase 1)
npm install react@^19 react-dom@^19
npm install @webext-core/messaging@^2 @wxt-dev/storage@^1

# 3. Styling
npm install tailwindcss@^4 @tailwindcss/vite@^4 tw-animate-css@^1
npm install class-variance-authority clsx tailwind-merge lucide-react

# 4. shadcn/ui init (will interactively update components.json, tsconfig paths, src/index.css)
npx shadcn@latest init
# Choose: base color Neutral, CSS variables YES, use src/ (accept default)

# 5. Dev deps
npm install -D @wxt-dev/module-react@^1 @types/chrome typescript@^5.6 @types/node zod
```

### Version verification
All versions above confirmed via `npm view <pkg> version` on 2026-04-18. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ web.whatsapp.com (host page — Chrome renders as usual)               │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │ entrypoints/content.ts  (isolated world)                   │    │
│   │                                                            │    │
│   │   boot()                                                   │    │
│   │     ↓                                                      │    │
│   │   findChatPane()  ──► tier1 [aria-label="Message list"]    │    │
│   │     ↓                  tier2 [data-testid=...]             │    │
│   │   new MutationObserver(callback).observe(pane,             │    │
│   │     { childList: true, subtree: true })                    │    │
│   │     ↓                                                      │    │
│   │   per addedNode:                                           │    │
│   │     • extract [data-id], [data-pre-plain-text], text, URLs│    │
│   │     • dedupe via Set<string> (data-id)                    │    │
│   │     • debounce(300ms) → batch to SW                       │    │
│   │                                                            │    │
│   │   sendMessage('chatDelta', { messages: [...] })  ──┐      │    │
│   └─────────────────────────────────────────────────────┼──────┘    │
└────────────────────────────────────────────────────────┼────────────┘
                                                         │
                                     chrome.runtime      │ (typed,
                                     (webext-core)       │  async)
                                                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│ entrypoints/background.ts  (MV3 service worker — ephemeral)          │
│                                                                      │
│   defineBackground({ main() {                                        │
│                                                                      │
│     chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick:true})│
│                                                                      │
│     chrome.tabs.onUpdated.addListener(async (tabId, _info, tab) => { │
│       if (tab.url?.startsWith('https://web.whatsapp.com/')) {        │
│         chrome.sidePanel.setOptions({ tabId, path, enabled: true })  │
│       } else {                                                       │
│         chrome.sidePanel.setOptions({ tabId, enabled: false })       │
│       }                                                              │
│     })                                                               │
│                                                                      │
│     onMessage('chatDelta', ({ data }) => {                           │
│       console.log('[JRNY] batch:', data.messages.length)             │
│       data.messages.forEach(m => console.log(m))                     │
│     })                                                               │
│                                                                      │
│   }})                                                                │
└──────────────────────────────────────────────────────────────────────┘
                                                         │
                                                         ▼ (unused in Phase 1;
                                                            side panel present
                                                            as empty React app)
┌──────────────────────────────────────────────────────────────────────┐
│ entrypoints/sidepanel/index.html + main.tsx  (React 19 app)          │
│   Renders <App/> with Tailwind-styled "Hello JRNY — connected" card  │
│   No messaging subscription in Phase 1 (added Phase 2+)              │
└──────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
jrny-copilot/
├── entrypoints/
│   ├── content.ts                 # CS on web.whatsapp.com — reads DOM, sends chatDelta
│   ├── background.ts              # SW — sidePanel wiring, logs chatDelta
│   └── sidepanel/
│       ├── index.html             # <div id="root"> + <script src="./main.tsx">
│       ├── main.tsx               # createRoot + <App/>
│       ├── App.tsx                # shell UI; Phase 1: "Hello JRNY — connected"
│       └── style.css              # @import "tailwindcss"; @import "tw-animate-css";
├── src/
│   ├── messaging/
│   │   └── protocol.ts            # defineExtensionMessaging<ProtocolMap>()
│   ├── whatsapp/
│   │   ├── selectors.ts           # Tier 1/2/3 selector constants
│   │   ├── extractor.ts           # parseRow(el) → Message | null
│   │   └── observer.ts            # start(onBatch: (msgs) => void)
│   ├── types/
│   │   └── message.ts             # type Message = { dataId, sender, timestamp, text, urls }
│   └── components/ui/             # shadcn components (auto-added via CLI)
├── public/
│   └── icon/                      # 16/32/48/128.png (shadcn or placeholder)
├── wxt.config.ts
├── components.json                # shadcn config
├── tsconfig.json                  # paths: { "@/*": ["src/*"] }
├── package.json
└── .env.local                     # (empty in Phase 1; Phase 2 adds JRNY_Z_AI_KEY)
```

### Pattern 1: Manifest Generation via `defineContentScript`

```typescript
// entrypoints/content.ts
// Source: https://wxt.dev/guide/essentials/entrypoints.html [VERIFIED]
import { defineContentScript } from 'wxt/sandbox';
import { startObserver } from '@/whatsapp/observer';
import { sendMessage } from '@/messaging/protocol';

export default defineContentScript({
  matches: ['https://web.whatsapp.com/*'],
  runAt: 'document_idle',
  world: 'ISOLATED',   // default, explicit for clarity
  main(ctx) {
    startObserver({
      onBatch: (messages) => {
        void sendMessage('chatDelta', { messages });
      },
      signal: ctx.signal,  // WXT abort-on-reload
    });
  },
});
```

**What WXT does:** At build time, WXT scans `entrypoints/`, reads the `defineContentScript` options, and generates `manifest.content_scripts[]` with the right `matches`, `run_at`, `js`. You do NOT hand-write `manifest.json`. [VERIFIED: wxt.dev]

### Pattern 2: Service Worker with `defineBackground`

```typescript
// entrypoints/background.ts
// Source: https://wxt.dev/guide/essentials/entrypoints.html [VERIFIED]
import { defineBackground } from 'wxt/sandbox';
import { onMessage } from '@/messaging/protocol';

export default defineBackground({
  type: 'module',
  main() {
    // --- Side panel wiring (INFRA-04) ---------------------------------
    // Source: https://developer.chrome.com/docs/extensions/reference/api/sidePanel [VERIFIED]
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.error('[JRNY] setPanelBehavior', err));

    chrome.tabs.onUpdated.addListener((tabId, _info, tab) => {
      if (!tab.url) return;
      const isWa = tab.url.startsWith('https://web.whatsapp.com/');
      chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel.html',
        enabled: isWa,
      });
    });

    // --- Message logging endpoint (INFRA-03) --------------------------
    // Source: https://webext-core.aklinker1.io/guide/messaging/ [VERIFIED]
    onMessage('chatDelta', ({ data }) => {
      console.log(`[JRNY] chatDelta: ${data.messages.length} messages`);
      data.messages.forEach((m) => {
        console.log(`  ${m.timestamp} ${m.sender}: ${m.text.slice(0, 80)}`);
        if (m.urls.length) console.log('    urls:', m.urls);
      });
    });
  },
});
```

**Critical:** Listeners MUST be registered **synchronously at top level** of `main()`. Never `await` before `onMessage(...)` — the SW re-spins and misses events [CITED: PITFALLS.md #5].

### Pattern 3: Typed Messaging Protocol

```typescript
// src/messaging/protocol.ts
// Source: https://webext-core.aklinker1.io/guide/messaging/ [VERIFIED]
import { defineExtensionMessaging } from '@webext-core/messaging';
import type { Message } from '@/types/message';

export interface ProtocolMap {
  /** Content script → SW: batch of new messages from a debounce window */
  chatDelta(data: { messages: Message[] }): void;

  /** SW → side panel (Phase 2+): reserved */
  // stateUpdate(data: { ... }): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
```

```typescript
// src/types/message.ts
export interface Message {
  /** Stable WhatsApp message id, e.g. "false_<chat>@s.whatsapp.net_<msg>" — dedupe key */
  dataId: string;
  sender: string;       // parsed from data-pre-plain-text header
  timestamp: string;    // ISO-ish; raw header value acceptable for Phase 1
  text: string;         // innerText only — never innerHTML
  urls: string[];       // regex-extracted http(s) URLs from text
}
```

### Pattern 4: Side Panel Entrypoint (Phase 1 shell)

```html
<!-- entrypoints/sidepanel/index.html -->
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>JRNY Copilot</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

```typescript
// entrypoints/sidepanel/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';

createRoot(document.getElementById('root')!).render(<App />);
```

```typescript
// entrypoints/sidepanel/App.tsx
export default function App() {
  return (
    <main className="p-4 font-sans">
      <h1 className="text-xl font-semibold">JRNY Copilot</h1>
      <p className="text-sm text-neutral-600 mt-2">
        Extension active on WhatsApp Web.
      </p>
    </main>
  );
}
```

```css
/* entrypoints/sidepanel/style.css */
@import "tailwindcss";
@import "tw-animate-css";
```

### Pattern 5: WXT Config

```typescript
// wxt.config.ts
// Source: https://wxt.dev/guide/essentials/config/vite.html [VERIFIED]
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'JRNY Copilot',
    description: 'Read-only AI trip-planning assistant for WhatsApp Web.',
    permissions: ['sidePanel', 'storage', 'tabs'],
    host_permissions: ['https://web.whatsapp.com/*'],
    action: {
      default_title: 'Open JRNY Copilot',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
```

> **`action` without `default_popup` is intentional** — if you set a `default_popup`, clicking the icon opens a popup instead of toggling the side panel. INFRA-04 requires icon-click → side panel, so leave `default_popup` unset. [CITED: dev.to WXT sidepanel discussion]

### Pattern 6: WhatsApp DOM Reader

```typescript
// src/whatsapp/selectors.ts
/**
 * Selector tiers — most stable first.
 * Validated 2026-04-18 against web.whatsapp.com layout.
 * If tier-1 + tier-2 both fail at boot, log a warning and bail; do NOT silent-fail.
 *
 * Sources:
 *  - ARCHITECTURE.md "WhatsApp Web DOM Strategy"
 *  - [CITED] Will Hackett WhatsApp Web DOM notes — https://willhackett.uk/whatsapp-and-tonic/
 *  - [CITED] medium.com data-pre-plain-text pattern
 */
export const CHAT_PANE = [
  '[aria-label="Message list"]',                    // tier 1 (a11y)
  '[data-testid="conversation-panel-messages"]',    // tier 2
  '#main [role="application"]',                     // tier 1 fallback
] as const;

export const MESSAGE_ROW = '[role="row"]';

/** Each message is a .copyable-text[data-pre-plain-text] element whose inner
 *  span.selectable-text contains the body text. */
export const MSG_BLOCK = '.copyable-text[data-pre-plain-text]';
export const MSG_TEXT  = 'span.selectable-text';

/** data-id lives on a wrapper; schema "false_<chat>@s.whatsapp.net_<msg>" */
export const MSG_ID_ATTR = 'data-id';
```

```typescript
// src/whatsapp/extractor.ts
import type { Message } from '@/types/message';
import { MSG_BLOCK, MSG_ID_ATTR, MSG_TEXT } from './selectors';

const URL_RE = /https?:\/\/[^\s<>"']+/g;

// data-pre-plain-text format: "[HH:MM, DD/MM/YYYY] Sender Name: "
const HEADER_RE = /^\[([^\]]+)\]\s+([^:]+):\s*$/;

export function parseRow(row: Element): Message | null {
  const idEl = row.closest(`[${MSG_ID_ATTR}]`) ?? row.querySelector(`[${MSG_ID_ATTR}]`);
  const dataId = idEl?.getAttribute(MSG_ID_ATTR);
  if (!dataId) return null;

  const block = row.querySelector(MSG_BLOCK);
  if (!block) return null;

  const header = block.getAttribute('data-pre-plain-text') ?? '';
  const m = HEADER_RE.exec(header);
  const timestamp = m?.[1]?.trim() ?? '';
  const sender = m?.[2]?.trim() ?? '';

  // innerText ONLY — never innerHTML (XSS from message content)
  const textEl = block.querySelector(MSG_TEXT) as HTMLElement | null;
  const text = (textEl?.innerText ?? '').trim();
  if (!text) return null;

  const urls = Array.from(text.matchAll(URL_RE), (x) => x[0]);

  return { dataId, sender, timestamp, text, urls };
}
```

```typescript
// src/whatsapp/observer.ts
import type { Message } from '@/types/message';
import { CHAT_PANE, MESSAGE_ROW } from './selectors';
import { parseRow } from './extractor';

const DEBOUNCE_MS = 300;

function findChatPane(): Element | null {
  for (const sel of CHAT_PANE) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

export function startObserver(opts: {
  onBatch: (msgs: Message[]) => void;
  signal: AbortSignal;
}) {
  const seen = new Set<string>();          // dedupe by dataId
  const pending = new Map<string, Message>();
  let flushTimer: number | null = null;

  function flush() {
    flushTimer = null;
    if (pending.size === 0) return;
    const batch = Array.from(pending.values());
    pending.clear();
    opts.onBatch(batch);
  }

  function queue(msg: Message) {
    if (seen.has(msg.dataId)) return;
    seen.add(msg.dataId);
    pending.set(msg.dataId, msg);
    if (flushTimer === null) {
      flushTimer = window.setTimeout(flush, DEBOUNCE_MS);
    }
  }

  function scanRoot(root: ParentNode) {
    root.querySelectorAll(MESSAGE_ROW).forEach((row) => {
      const m = parseRow(row);
      if (m) queue(m);
    });
  }

  // Poll briefly for chat pane to appear — WhatsApp SPA mounts late.
  const bootInterval = window.setInterval(() => {
    const pane = findChatPane();
    if (!pane) return;
    window.clearInterval(bootInterval);

    // Initial sweep
    scanRoot(pane);

    const observer = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches(MESSAGE_ROW)) {
            const msg = parseRow(node);
            if (msg) queue(msg);
          } else {
            scanRoot(node);
          }
        }
      }
    });
    observer.observe(pane, { childList: true, subtree: true });

    opts.signal.addEventListener('abort', () => {
      observer.disconnect();
      if (flushTimer !== null) window.clearTimeout(flushTimer);
    });
  }, 500);

  opts.signal.addEventListener('abort', () => window.clearInterval(bootInterval));
}
```

### Anti-Patterns to Avoid

- **DO NOT** call `await` before `onMessage(...)` in the service worker — listeners must register synchronously [CITED: PITFALLS.md #5].
- **DO NOT** use `innerHTML` on WhatsApp nodes — always `innerText` / `textContent`. Chat content is untrusted [CITED: ARCHITECTURE.md].
- **DO NOT** walk `__reactFiber$...` to read state from WhatsApp's React tree — more fragile than the DOM, and Chrome Web Store has rejected extensions using it [CITED: ARCHITECTURE.md].
- **DO NOT** inject visible UI into the page — use the side panel [CITED: CLAUDE.md].
- **DO NOT** set `action.default_popup` — it blocks `openPanelOnActionClick` from opening the side panel [CITED: dev.to].
- **DO NOT** read `window.Store` or moduleRaid internals — crosses the ToS grey line [CITED: PITFALLS.md #1].
- **DO NOT** use hashed class selectors like `._ao3e` — they rotate on every WhatsApp deploy [CITED: PITFALLS.md #4].
- **DO NOT** hold message state in SW module-level vars — SW terminates after ~30s idle [CITED: PITFALLS.md #5].

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Manifest generation from code | Custom `manifest.json` hand-edited | WXT `defineContentScript` / `defineBackground` / `side_panel` key in `wxt.config.ts` | Drift between manifest and code is a top source of MV3 bugs [VERIFIED: wxt.dev] |
| Cross-context message plumbing | `chrome.runtime.sendMessage` + ad-hoc dispatch | `@webext-core/messaging` with a `ProtocolMap` | Typed, async-by-default, prevents forgotten `return true` for async listeners [VERIFIED: webext-core docs] |
| Tailwind v4 wiring in Vite | PostCSS + `autoprefixer` configs | `@tailwindcss/vite` plugin + one `@import "tailwindcss";` | v4 ships zero-config Vite plugin [CITED: tailwindcss.com] |
| shadcn component scaffolding | Hand-copy components + vars | `npx shadcn@latest init` + `npx shadcn@latest add <component>` | Keeps you aligned with shadcn v4 + React 19 branch [CITED: ui.shadcn.com] |
| Path aliases | Re-invent in every tsconfig | shadcn init writes `@/*` alias into tsconfig + vite config via WXT's vite plugin | Shadcn uses `@/` by convention |
| Typed chrome APIs | `(chrome as any).sidePanel...` | Rely on `@types/chrome` — `chrome.sidePanel.setOptions` is typed | Available in `@types/chrome` ≥ `0.1.40` [VERIFIED: npm] |
| MutationObserver throttling | Custom setInterval poll | Native `MutationObserver` + in-code `setTimeout` debounce | Observer is the only way WhatsApp SPA mutations can be captured [CITED: Chrome dev docs] |

**Key insight:** The fast path in a 24-hour hackathon is to ride the conventions baked into WXT + shadcn CLI; every minute spent deviating from defaults is a minute not spent on the demo.

---

## Common Pitfalls (Phase 1-specific — subset of PITFALLS.md)

### Pitfall 1: `action.default_popup` blocks side-panel-on-click
**What goes wrong:** Side panel does not open when user clicks the extension icon; popup opens instead.
**Why it happens:** Setting `default_popup` in the `action` manifest entry takes priority over `setPanelBehavior({ openPanelOnActionClick: true })`.
**How to avoid:** Leave `default_popup` unset. Use only `default_title` in the `action` config.
**Warning sign:** Popup appears instead of side panel on icon click.
[CITED: dev.to WXT discussion]

### Pitfall 2: Listeners registered after `await` never fire after SW re-spin
**What goes wrong:** First message works; after 30s idle SW terminates, next message never reaches the handler.
**Why it happens:** MV3 SW re-runs the entire module on wake; only listeners registered by end of synchronous module load are active when the event fires.
**How to avoid:** Register `onMessage(...)`, `chrome.tabs.onUpdated.addListener(...)`, etc. **synchronously at top level** of `defineBackground.main()`. Never `await` before them.
**Warning sign:** "Works the first time, not the second."
[CITED: PITFALLS.md #5, Chrome SW lifecycle docs]

### Pitfall 3: Chat pane not mounted at `document_idle`
**What goes wrong:** Content script boots, queries `[aria-label="Message list"]`, gets `null`, exits silently.
**Why it happens:** WhatsApp is a React SPA; the message list mounts AFTER initial render, sometimes seconds later.
**How to avoid:** Poll with `setInterval(500ms)` until `findChatPane()` returns a node, then start the observer. Abort polling on content-script unload via `ctx.signal`.
**Warning sign:** Extension loads but zero messages flow even on an active chat.

### Pitfall 4: Duplicate messages on chat switch / WhatsApp re-render
**What goes wrong:** Every chat switch re-mounts the message list; observer sees all historical messages again, floods SW.
**Why it happens:** WhatsApp virtualizes the message list; switching chats re-injects DOM.
**How to avoid:** Dedupe by `data-id` (stable message identifier) using a `Set<string>` in content-script scope. Reset the set only on full page unload.
**Warning sign:** SW console shows the same message multiple times.
[CITED: ARCHITECTURE.md]

### Pitfall 5: Tailwind classes don't apply in side panel
**What goes wrong:** Side panel renders plain unstyled HTML despite Tailwind classes.
**Why it happens:** Forgot to `@import "tailwindcss"` in the sidepanel's CSS file, or forgot to import that CSS from `main.tsx`.
**How to avoid:** `entrypoints/sidepanel/style.css` must contain `@import "tailwindcss";` and `main.tsx` must `import './style.css';`. Also confirm `@tailwindcss/vite` is in `wxt.config.ts` → `vite.plugins`.
**Warning sign:** Inspect element shows classes present but no computed styles from Tailwind utilities.
[CITED: tailwindcss.com]

### Pitfall 6: Selector drift after a WhatsApp deploy
**What goes wrong:** Extension was working yesterday; today extracts zero messages.
**Why it happens:** WhatsApp rotates CSS hashes and sometimes shuffles DOM structure. Tier-3 structural classes (`.copyable-text`, `.selectable-text`) are historically stable but not guaranteed.
**How to avoid:** Tier-1 selectors first. Log a warning when tier-1/tier-2 fail but tier-3 succeeds — this is early warning for the planner. For Phase 1 (hackathon), accept that a WhatsApp deploy could break us; document in README. Do NOT build a remote selector pack in Phase 1.
**Warning sign:** Content-script console shows `findChatPane() → null` consistently.
[CITED: PITFALLS.md #4]

### Pitfall 7: `host_permissions` too narrow
**What goes wrong:** Content script doesn't inject.
**Why it happens:** `matches` requires both an entry in `content_scripts[i].matches` AND a covering `host_permissions`. If you only set one, Chrome silently declines injection.
**How to avoid:** Declare `host_permissions: ['https://web.whatsapp.com/*']` in `wxt.config.ts` manifest AND `matches: ['https://web.whatsapp.com/*']` on the content script.
**Warning sign:** Content script file ships but `chrome://extensions → service worker → console` never logs its boot message.

### Pitfall 8: `chrome.storage.sync` used for state
**What goes wrong:** 8 KB per-item cap hit, silent write failures.
**Why it happens:** Default habit from prior MV2 extensions.
**How to avoid:** Phase 1 doesn't persist anything — but when Phase 2 does, use `@wxt-dev/storage` which defaults to `chrome.storage.local`. Never `sync` for chat-adjacent data.
[CITED: PITFALLS.md]

---

## Code Examples

### Example A — Extract messages from a real WhatsApp DOM subtree

```typescript
// src/whatsapp/extractor.test-manual.ts (manual dev aid, not shipped)
// Paste in DevTools console on web.whatsapp.com to verify selectors:
document.querySelectorAll('.copyable-text[data-pre-plain-text]').forEach((el) => {
  const header = el.getAttribute('data-pre-plain-text');
  const text = (el.querySelector('span.selectable-text') as HTMLElement)?.innerText;
  const id = el.closest('[data-id]')?.getAttribute('data-id');
  console.log({ id, header, text });
});
// Expected output format:
//   { id: "false_1234...@s.whatsapp.net_3EB0...",
//     header: "[10:32, 18/04/2026] Alice: ",
//     text: "Let's go to Goa in June!" }
```

### Example B — Verify side panel flip in SW console

```
1. Load unpacked extension (dev mode) — `npm run dev` → WXT launches Chrome with extension.
2. Navigate a tab to https://web.whatsapp.com/ → side panel icon becomes clickable.
3. Click icon → side panel opens showing "JRNY Copilot" + "Extension active on WhatsApp Web."
4. Navigate same tab to https://example.com → click icon → side panel disabled (shows nothing or "no panel").
5. chrome://extensions → JRNY Copilot → service worker link → console shows
     [JRNY] chatDelta: 3 messages
       10:32 Alice: Let's go to Goa in June!
       10:33 Bob: Down. How about flights?
       10:35 Alice: I'll check Skyscanner
     ...
```

### Example C — Dev mode loop (hackathon workflow)

```bash
# Terminal 1: WXT dev server (launches Chrome with extension loaded)
npm run dev

# Terminal 2: (optional) type-check in watch mode
npx tsc --noEmit --watch
```

WXT HMR updates content scripts and side panel on save. Service worker reloads on `background.ts` save (may require clicking "Reload" on `chrome://extensions` for stale listeners — edge case). [CITED: wxt.dev]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Plasmo + Parcel | WXT + Vite | 2024–2025 | 43% smaller bundles, faster HMR, file-based entrypoints [CITED: redreamality 2025] |
| Tailwind v3 + `tailwind.config.js` + PostCSS | Tailwind v4 + `@tailwindcss/vite` + CSS-first `@theme` | 2025 | One-line Vite plugin, no PostCSS setup [CITED: tailwindcss.com v4 blog] |
| `tailwindcss-animate` | `tw-animate-css` | Tailwind v4 release | v4-compatible animation layer; shadcn v4 template uses this [CITED: shadcn docs] |
| Raw `chrome.runtime.sendMessage` + `return true` dance | `@webext-core/messaging` `defineExtensionMessaging<ProtocolMap>()` | 2024+ | Type safety + async-by-default [CITED: webext-core + wxt.dev] |
| MV2 `browser_action` + persistent background page | MV3 `action` + service worker | Chrome 88+ (MV3 required in CWS 2024+) | Ephemeral workers, stricter CORS, no remote code [CITED: Chrome docs] |
| Injected sidebar (Shadow DOM iframe into host page) | `chrome.sidePanel` API | Chrome 114+ | Clean separate document, no CSS-reset gymnastics, user-pinnable [CITED: Chrome docs] |

**Deprecated/outdated (do not use):**
- `browser_action`, `page_action` — MV2 only.
- `tailwind.config.js` JS config for v4 — prefer CSS-first `@theme` block (shadcn init generates).
- `tailwindcss-animate` — replaced by `tw-animate-css` for v4.
- Persistent background pages.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | WhatsApp Web still exposes `data-pre-plain-text` on `.copyable-text` elements with the format `[HH:MM, DD/MM/YYYY] Sender: ` | Pattern 6 / extractor | Phase 1 demo fails to extract sender+timestamp. Mitigation: extractor degrades gracefully — if header doesn't match, it still returns `{ dataId, text, urls, sender:'', timestamp:'' }`. Text-only extraction still passes INFRA-02. Planner should include a Wave 0 manual verification task: "paste Example A in DevTools on a live WhatsApp group, confirm selectors match." |
| A2 | `[aria-label="Message list"]` is present on the chat pane in English WhatsApp Web locale | selectors.ts | Non-English locales may use translated aria-label. Mitigation: tier-2 + tier-3 fallbacks. A follow-up (v2) is to use `aria-label` matched by locale or by `role="application"` inside `#main`. |
| A3 | The side-panel-per-tab flip via `chrome.tabs.onUpdated` triggers reliably on hard navigation to web.whatsapp.com (not just SPA route changes) | background.ts | If WhatsApp Web navigation is purely hash-based, `onUpdated` may not fire with a new `tab.url`. Mitigation: also listen to `chrome.webNavigation.onHistoryStateUpdated` if needed. For hackathon demo with a full page load of web.whatsapp.com, this is fine. |
| A4 | `zod` is acceptable as a Phase 1 optional dependency | Standard Stack → Optional | If the user dislikes extra deps, skip it. Payloads are already typed via `ProtocolMap`; zod is only a runtime safety net. Low-cost to remove. |
| A5 | `lucide-react@^1` is the correct range shadcn will install; older `0.x` range is legacy | Standard Stack | Shadcn CLI pin may differ. Mitigation: let shadcn CLI pick the version during `shadcn init` — do not pre-install `lucide-react`. |

**User confirmation recommended for:** A1 (selector schema) and A2 (locale aria-label) before committing the selector cascade as final. One live DevTools check takes 60 seconds and de-risks the entire DOM reader.

---

## Open Questions

1. **Does WhatsApp Web throttle MutationObserver callbacks on heavy chats (1000+ msgs)?**
   - What we know: Observer is passive; callbacks are cheap; our debounce batches.
   - What's unclear: Behavior on bulk scrollback (user scrolls up, hundreds of rows mount at once).
   - Recommendation: Test on a long group chat. If problematic, cap per-batch size at e.g. 50 and drop the rest; or only parse rows whose `data-pre-plain-text` timestamp is within the last hour.

2. **Should the content script also run in Incognito?**
   - What we know: WXT inherits manifest `incognito` mode; default is `"spanning"`.
   - What's unclear: User demo context.
   - Recommendation: Leave default for hackathon; add `"incognito": "split"` in v2 if privacy posture demands.

3. **Is the shadcn CLI's `vite` preset aware that we're inside WXT (not a bare Vite app)?**
   - What we know: Shadcn CLI writes to `vite.config.ts` by default, but WXT uses `wxt.config.ts`.
   - What's unclear: Whether `shadcn init` detects WXT or needs manual bridging.
   - Recommendation: Run `shadcn init` with flag `--cwd .` and accept the `tsconfig`/`src/` changes; manually port any `vite.config.ts` plugin write-ins into `wxt.config.ts` → `vite()`. There's a known pattern in the `imtiger/wxt-react-shadcn-tailwindcss-chrome-extension` repo [CITED].

4. **How to verify INFRA-04 success criterion "auto-activates on WhatsApp Web (no manual toggle required)"?**
   - Interpretation: The **content script** and **side panel availability** auto-activate. Actually opening the panel still requires the icon click per Chrome's UX. That matches ROADMAP success criterion #2 ("User clicks the extension action and a Chrome side panel opens").
   - Recommendation: Planner should phrase the test explicitly: (a) load WhatsApp tab → side panel icon is enabled; (b) click icon → panel opens. Do NOT attempt `chrome.sidePanel.open()` on `tabs.onUpdated` — that requires a user gesture and will throw.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | WXT, Vite, npm install | Assumed ✓ | ≥ 20 | — |
| npm (or pnpm) | Package install | Assumed ✓ | ≥ 10 | pnpm equivalent |
| Chrome (stable) | Load unpacked, test `chrome.sidePanel` | Assumed ✓ | ≥ 114 (sidePanel API) | — |
| WhatsApp Web login | Manual demo verification | User responsibility | — | None — hackathon demo target |
| Internet access | npm install, fetching WhatsApp Web | Assumed ✓ | — | — |

**Missing dependencies with no fallback:** None anticipated in a dev environment.

**Missing dependencies with fallback:** `pnpm` vs `npm` — either works; WXT docs show `pnpm dlx` but `npx` is fine.

> Phase 1 has **zero** external service dependencies. No z.AI, no offscreen, no URL fetches. This is intentional — the foundation must ship before any AI call exists.

---

## Sources

### Primary (HIGH confidence — official docs, verified on 2026-04-18)

- [WXT — Installation](https://wxt.dev/guide/installation.html) — bootstrap command, templates, package.json scripts
- [WXT — Entrypoints](https://wxt.dev/guide/essentials/entrypoints.html) — `defineContentScript`, `defineBackground`, sidepanel entry conventions
- [WXT — Vite config](https://wxt.dev/guide/essentials/config/vite.html) — `vite: () => ({ plugins: [...] })` pattern
- [WXT — Frontend Frameworks (React)](https://wxt.dev/guide/essentials/frontend-frameworks.html) — `@wxt-dev/module-react` setup
- [WXT — SidepanelEntrypointOptions](https://wxt.dev/api/reference/wxt/interfaces/sidepanelentrypointoptions) — sidepanel entry options
- [webext-core/messaging guide](https://webext-core.aklinker1.io/guide/messaging/) — `defineExtensionMessaging<ProtocolMap>()`, `sendMessage`, `onMessage`
- [chrome.sidePanel API reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) — `setPanelBehavior`, `setOptions`, permissions
- [Chrome side panel launch blog](https://developer.chrome.com/blog/extension-side-panel-launch) — UX guidelines for sidePanel
- [Tailwind CSS v4 — Using Vite](https://tailwindcss.com/docs/installation/using-vite) — `@tailwindcss/vite` plugin, `@import "tailwindcss"`
- [shadcn/ui — Vite installation](https://ui.shadcn.com/docs/installation/vite) — `shadcn@latest init`, tsconfig paths, vite alias
- [shadcn/ui — Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4) — v4 compatibility notes
- [Chrome cross-origin network requests in extensions](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) — why content scripts can't fetch
- npm registry: verified latest versions of `wxt`, `@wxt-dev/module-react`, `@wxt-dev/storage`, `@webext-core/messaging`, `tailwindcss`, `@tailwindcss/vite`, `react`, `react-dom`, `lucide-react`, `tw-animate-css`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@types/chrome`, `zod`, `@vitejs/plugin-react` on 2026-04-18

### Secondary (MEDIUM confidence — community, cross-checked with official docs)

- [imtiger/wxt-react-shadcn-tailwindcss-chrome-extension](https://github.com/imtiger/wxt-react-shadcn-tailwindcss-chrome-extension) — reference WXT + React + Tailwind + shadcn layout
- [How to Build a Chrome Extension Side Panel in 2026 (extensionfast.com)](https://www.extensionfast.com/blog/how-to-build-a-chrome-extension-side-panel-in-2026)
- [WXT discussion #1225 — sidepanel toggle](https://github.com/wxt-dev/wxt/discussions/1225)
- [Redreamality — 2025 comparison Plasmo vs WXT vs CRXJS](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/)
- [Medium — data-pre-plain-text pattern for WhatsApp Web message extraction](https://medium.com/geekculture/bypass-scraping-websites-that-has-css-class-names-change-frequently-d4877ecd6d8f)
- [Will Hackett — How to Not Decrypt WhatsApp Web (But Still Win)](https://willhackett.uk/whatsapp-and-tonic/) — DOM notes
- Upstream project docs: `STACK.md`, `ARCHITECTURE.md`, `PITFALLS.md`, `CLAUDE.md` (this repo)

### Tertiary (LOW confidence — flagged for validation at implementation)

- `data-pre-plain-text` header format `[HH:MM, DD/MM/YYYY] Sender: ` — derived from 2024 community posts; validate with DevTools sweep at start of Phase 1 (Assumption A1)
- Exact aria-label string `"Message list"` — may vary by locale (Assumption A2)

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every package version verified against npm registry today; WXT, Tailwind v4, shadcn v4, webext-core messaging all confirmed via official docs.
- Architecture: **HIGH** — side panel per-tab flip, typed messaging, and SW lifecycle rules all backed by Chrome + WXT official docs.
- WhatsApp DOM patterns: **MEDIUM** — tiered selectors documented but WhatsApp deploys weekly; first dev session must paste Example A into DevTools to confirm selectors before writing production code. Graceful degradation built into extractor so sender/timestamp failure doesn't block text extraction.
- Pitfalls: **HIGH** — all phase-1 pitfalls cross-referenced against PITFALLS.md and Chrome official SW lifecycle docs.

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — WXT and Tailwind stable; re-verify WhatsApp selectors sooner if deploy cadence bites)
