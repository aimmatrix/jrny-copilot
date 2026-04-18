---
plan: "WXT Scaffold + Side Panel Shell"
phase: 1
wave: 1
depends_on: []
requirements_addressed: [INFRA-01, INFRA-04]
files_modified:
  - package.json
  - wxt.config.ts
  - tsconfig.json
  - components.json
  - entrypoints/background.ts
  - entrypoints/sidepanel/index.html
  - entrypoints/sidepanel/main.tsx
  - entrypoints/sidepanel/App.tsx
  - entrypoints/sidepanel/style.css
  - src/messaging/protocol.ts
  - src/types/message.ts
  - src/lib/utils.ts
  - public/icon/16.png
  - public/icon/32.png
  - public/icon/48.png
  - public/icon/128.png
  - .gitignore
autonomous: true
---

## Objective

Bootstrap a working WXT + React 19 + TypeScript + Tailwind v4 + shadcn/ui Chrome MV3 extension project. Wire up the MV3 service worker so that:

1. The extension installs on Chrome and its icon appears in the toolbar.
2. The extension auto-injects on `https://web.whatsapp.com/*` (INFRA-01).
3. Clicking the toolbar icon opens Chrome's native side panel docked to the tab (INFRA-04).
4. The side panel is enabled only for WhatsApp Web tabs (and disabled elsewhere).
5. A shared typed messaging protocol (`@webext-core/messaging`) is in place for Plan 02 to use.

No WhatsApp DOM reading in this plan. Content script entrypoint does NOT exist yet — Plan 02 creates it. The side panel shows a branded placeholder ("JRNY Copilot — Extension active on WhatsApp Web").

**Scope cut:** No options page, no storage usage, no AI, no shadcn components beyond scaffolded primitives — just the raw shell.

---

## Tasks

### Task 1: Bootstrap WXT project + install all dependencies

<read_first>
- /Users/ammad/Documents/agently /.planning/phases/01-extension-scaffold-and-dom-reader/01-RESEARCH.md  (sections: "Standard Stack", "Installation", "Recommended Project Structure")
- /Users/ammad/Documents/agently /.planning/research/STACK.md  (framework rationale + version pins)
- /Users/ammad/Documents/agently /CLAUDE.md  (architecture rules — read-only content script, all fetches from SW)
</read_first>

<action>
Run the bootstrap from the repo root (`/Users/ammad/Documents/agently /`). WXT will create its scaffolding IN the current directory when passed `.` — we want the code to live at repo root, NOT in a nested `jrny-copilot/` subdirectory.

```bash
cd "/Users/ammad/Documents/agently "

# 1. Bootstrap WXT into the current directory with the React template.
#    Using `.` as the project dir so everything lands at repo root.
npx --yes wxt@latest init . --template react

# 2. If `wxt init` refuses to write into a non-empty dir, accept its prompt
#    to overwrite or merge. The .planning/ directory is pre-existing and must
#    NOT be touched — WXT only writes its own files (package.json, wxt.config.ts,
#    entrypoints/, public/, tsconfig.json, .gitignore).

# 3. Install exact versions (all verified 2026-04-18 in 01-RESEARCH.md).
npm install react@^19.2.5 react-dom@^19.2.5
npm install @webext-core/messaging@^2.3.0 @wxt-dev/storage@^1.2.8

# 4. Styling.
npm install tailwindcss@^4.2.2 @tailwindcss/vite@^4.2.2 tw-animate-css@^1.4.0
npm install class-variance-authority@^0.7.1 clsx@^2.1.1 tailwind-merge@^3.5.0 lucide-react@^1.8.0

# 5. Dev dependencies.
npm install -D @wxt-dev/module-react@^1.2.2 @types/chrome@^0.1.40 typescript@^5.6.0 @types/node zod@^4.3.6

# 6. shadcn init — accepts defaults EXCEPT choose `Neutral` base color and CSS variables = YES.
#    Non-interactive mode: use the flags below to avoid prompts.
npx --yes shadcn@latest init --yes --base-color neutral --css-variables
```

Then overwrite `wxt.config.ts` with EXACTLY this content:

```typescript
// wxt.config.ts
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

**Critical:** do NOT add `default_popup` inside `action`. That would break `openPanelOnActionClick` in Task 2 (see 01-RESEARCH.md Pitfall 1).

Then patch `tsconfig.json` so the `@/*` path alias resolves to `src/*`. If shadcn's init already added it, verify it exists; otherwise merge in:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Create `src/lib/utils.ts` (shadcn's `cn` helper — shadcn init normally writes this; if missing, create it):

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Confirm there are four icon PNGs in `public/icon/` (16, 32, 48, 128). The WXT React template ships placeholders — keep them. If any are missing, `cp` any existing PNG to fill the gaps so the manifest icon key resolves.

Append `.env.local` to `.gitignore` if not already present.
</action>

<acceptance_criteria>
- `grep -q '"wxt"' package.json` returns 0
- `grep -q '"react": "\^19' package.json` returns 0
- `grep -q '"@webext-core/messaging"' package.json` returns 0
- `grep -q '"tailwindcss": "\^4' package.json` returns 0
- `grep -q '"@wxt-dev/module-react"' package.json` returns 0
- `grep -q "@tailwindcss/vite" wxt.config.ts` returns 0
- `grep -q "host_permissions" wxt.config.ts` returns 0
- `grep -q "web.whatsapp.com" wxt.config.ts` returns 0
- `grep -q "sidePanel" wxt.config.ts` returns 0
- `grep -q "default_popup" wxt.config.ts` returns NONZERO (MUST NOT be present)
- `grep -q '"@/\*"' tsconfig.json` returns 0
- `test -f src/lib/utils.ts` succeeds
- `test -f public/icon/128.png` succeeds
- `grep -q ".env.local" .gitignore` returns 0
- `npm run build` exits 0 (validates install + manifest generation)
</acceptance_criteria>

---

### Task 2: Service worker — side panel wiring + typed messaging protocol

<read_first>
- /Users/ammad/Documents/agently /.planning/phases/01-extension-scaffold-and-dom-reader/01-RESEARCH.md  (sections: "Pattern 2: Service Worker with defineBackground", "Pattern 3: Typed Messaging Protocol", "Pitfall 2: Listeners after await")
- /Users/ammad/Documents/agently /.planning/research/ARCHITECTURE.md  (section: "Component Map" — SW responsibilities)
- /Users/ammad/Documents/agently /CLAUDE.md  (rules: no state in SW module scope, listeners register sync)
</read_first>

<action>
Create the shared messaging protocol FIRST so the background and (later) the content script import from the same file.

Create `src/types/message.ts`:

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
  /** Timestamp string from data-pre-plain-text header. '' if parse fails. */
  timestamp: string;
  /** innerText body. Never innerHTML. Trimmed, never empty. */
  text: string;
  /** http(s) URLs regex-extracted from `text`. */
  urls: string[];
}
```

Create `src/messaging/protocol.ts`:

```typescript
import { defineExtensionMessaging } from '@webext-core/messaging';
import type { Message } from '@/types/message';

/**
 * Typed messaging contract between all extension contexts.
 * Plan 02 content script sends 'chatDelta'; SW logs it.
 * Side panel channels (stateUpdate, etc.) are reserved for Phase 2+.
 */
export interface ProtocolMap {
  /** Content script -> SW: batch of new messages from one debounce window. */
  chatDelta(data: { messages: Message[] }): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
```

Create `entrypoints/background.ts` with EXACTLY this content (WXT's React template may have created a stub — overwrite it):

```typescript
import { defineBackground } from 'wxt/sandbox';
import { onMessage } from '@/messaging/protocol';

export default defineBackground({
  type: 'module',
  main() {
    // ---------- INFRA-04: side panel opens on action (icon) click ----------
    // Source: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.error('[JRNY] setPanelBehavior failed:', err));

    // ---------- INFRA-04: per-tab enable/disable ----------
    // Enable side panel only for WhatsApp Web tabs; disable elsewhere
    // so the icon click on other tabs does not open the panel.
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

    // ---------- INFRA-03 endpoint (Plan 02 wires the sender) ----------
    // Registered SYNCHRONOUSLY at top level — Pitfall 2 in 01-RESEARCH.md.
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

**Do NOT** place any `await` before the `onMessage(...)` or `chrome.tabs.onUpdated.addListener(...)` calls. They MUST register synchronously on every SW wake (Pitfall 2).
</action>

<acceptance_criteria>
- `test -f entrypoints/background.ts` succeeds
- `test -f src/messaging/protocol.ts` succeeds
- `test -f src/types/message.ts` succeeds
- `grep -q "defineBackground" entrypoints/background.ts` returns 0
- `grep -q "setPanelBehavior" entrypoints/background.ts` returns 0
- `grep -q "openPanelOnActionClick: true" entrypoints/background.ts` returns 0
- `grep -q "chrome.tabs.onUpdated.addListener" entrypoints/background.ts` returns 0
- `grep -q "web.whatsapp.com" entrypoints/background.ts` returns 0
- `grep -q "onMessage('chatDelta'" entrypoints/background.ts` returns 0
- `grep -q "defineExtensionMessaging<ProtocolMap>" src/messaging/protocol.ts` returns 0
- `grep -q "chatDelta(data" src/messaging/protocol.ts` returns 0
- `grep -q "dataId" src/types/message.ts` returns 0
- `grep -q "urls: string\[\]" src/types/message.ts` returns 0
- No `await` precedes `onMessage` or `.addListener` in `entrypoints/background.ts`
  (verify: `grep -nE "await.*\n.*onMessage\(" entrypoints/background.ts` returns NONZERO,
   and `awk '/onMessage\(|addListener\(/{print NR": "$0}' entrypoints/background.ts` shows both appear before any `await` in `main()` — manual sanity check)
- `npx tsc --noEmit` exits 0
- `npm run build` exits 0
</acceptance_criteria>

---

### Task 3: Side panel React shell + Tailwind v4 wiring

<read_first>
- /Users/ammad/Documents/agently /.planning/phases/01-extension-scaffold-and-dom-reader/01-RESEARCH.md  (sections: "Pattern 4: Side Panel Entrypoint", "Pitfall 5: Tailwind in side panel")
- /Users/ammad/Documents/agently /.planning/research/STACK.md  (Tailwind v4 + shadcn v4 notes)
</read_first>

<action>
Create `entrypoints/sidepanel/index.html`:

```html
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

Create `entrypoints/sidepanel/main.tsx`:

```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `entrypoints/sidepanel/App.tsx` (minimal branded shell — Phase 3 will replace this):

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

Create `entrypoints/sidepanel/style.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";

/* shadcn base layer — keep whatever shadcn init injected at project root;
   for Phase 1 this file is the only stylesheet the side panel loads. */
```

**If shadcn's `init` step in Task 1 wrote a `src/index.css` with the shadcn theme variables**, also import it so the side panel inherits the theme. Check for its existence; if present, add to the TOP of `entrypoints/sidepanel/style.css`:

```css
@import "../../src/index.css";
```

(If no `src/index.css` exists, skip this line — Phase 1 needs the Tailwind layer only.)

**Verify Tailwind is wired** by running the dev server briefly and opening the side panel (see "Verification" below). If classes don't apply, check:
1. `@tailwindcss/vite` plugin is present in `wxt.config.ts` (it is, from Task 1).
2. `main.tsx` imports `./style.css`.
3. `style.css` starts with `@import "tailwindcss";`.
</action>

<acceptance_criteria>
- `test -f entrypoints/sidepanel/index.html` succeeds
- `test -f entrypoints/sidepanel/main.tsx` succeeds
- `test -f entrypoints/sidepanel/App.tsx` succeeds
- `test -f entrypoints/sidepanel/style.css` succeeds
- `grep -q '@import "tailwindcss"' entrypoints/sidepanel/style.css` returns 0
- `grep -q 'createRoot' entrypoints/sidepanel/main.tsx` returns 0
- `grep -q "import './style.css'" entrypoints/sidepanel/main.tsx` returns 0
- `grep -q 'JRNY Copilot' entrypoints/sidepanel/App.tsx` returns 0
- `npx tsc --noEmit` exits 0
- `npm run build` exits 0 AND a `.output/chrome-mv3/sidepanel.html` artifact exists
  (verify: `test -f .output/chrome-mv3/sidepanel.html` succeeds after build)
- `grep -q '"side_panel"' .output/chrome-mv3/manifest.json` returns 0
- `grep -q '"sidepanel.html"' .output/chrome-mv3/manifest.json` returns 0
- `grep -q 'web.whatsapp.com' .output/chrome-mv3/manifest.json` returns 0
- Manual smoke test (record outcome in SUMMARY):
    1. `npm run dev` launches Chrome with the extension loaded
    2. Navigate a tab to https://web.whatsapp.com/ and log in
    3. Click the JRNY extension icon in the toolbar
    4. Side panel docks to the right of the tab showing "JRNY Copilot" heading
    5. Panel has green→teal gradient square + subtitle text rendered with Tailwind utility classes (visibly styled, NOT unstyled HTML)
    6. Navigate the SAME tab to https://example.com
    7. Click the icon — side panel no longer opens (it is disabled for non-WhatsApp tabs)
    8. At chrome://extensions → JRNY Copilot → "service worker" → Inspect → Console shows `[JRNY] service worker booted`
</acceptance_criteria>
