# Stack Research — JRNY Copilot

**Project:** JRNY Copilot — Chrome MV3 extension overlaying WhatsApp Web with AI trip planning
**Researched:** 2026-04-18
**Overall confidence:** HIGH (on framework/tooling) / MEDIUM (on site-specific scraping strategy)

---

## Recommended Stack

| Component | Choice | Version (2025) | Rationale |
|-----------|--------|----------------|-----------|
| **Extension framework** | WXT | `wxt@0.20.22` (RC for v1.0) | File-based entrypoints, auto-manifest, HMR for content scripts, 43% smaller bundle than Plasmo, actively maintained. Framework-agnostic but has first-class React module. |
| **UI framework** | React | `react@19` | Mature ecosystem, most boilerplates target it, best shadcn/ui support. React 19 stable and required for latest shadcn. |
| **Language** | TypeScript | `typescript@5.6+` | Chrome extension APIs have excellent type defs (`@types/chrome`), WXT is TS-first. |
| **Bundler** | Vite (via WXT) | `vite@6` (bundled by WXT) | Fast HMR, ESM-native. Do not configure directly — WXT wraps it. |
| **Styling** | Tailwind CSS v4 | `tailwindcss@4` | v4 native CSS-first config, works in Shadow DOM with `:host` selector tweak. Massive productivity vs. hand-CSS for sidebar UI. |
| **Component library** | shadcn/ui | latest (copy-paste) | Owns the source; Tailwind v4 + React 19 compatible; perfect for sidebar dashboard UI. |
| **UI isolation** | Shadow DOM (WXT `createShadowRootUi`) | built-in | Prevents WhatsApp Web's CSS from bleeding into extension UI when injecting into the page. Not needed for side panel (separate document), but required for any in-page injection. |
| **State management** | Zustand | `zustand@5` | Simple store API, works across popup/side-panel/content-script via chrome.storage subscription. Lighter than Redux, less cognitive overhead than Jotai for this scope. |
| **Cross-context persistence** | `@wxt-dev/storage` | `1.2.8` | Type-safe wrapper over `chrome.storage.local`. All contexts (SW, content script, side panel) can read/write. Persists across restarts. |
| **Messaging** | `@webext-core/messaging` (built into WXT) | latest | Type-safe request/response + events between content script ⇆ service worker ⇆ side panel. |
| **DOM observation** | Native `MutationObserver` | built-in | WhatsApp Web is a React SPA that re-renders aggressively; the only reliable way to detect new messages. No library needed. |
| **AI API client** | `openai` SDK | `openai@4.x` (latest v4) | z.AI exposes OpenAI-compatible endpoint at `https://api.z.ai/api/paas/v4`. Use official OpenAI SDK with `baseURL` override — no separate SDK required. |
| **URL/link parsing** | `unfurl.js` OR custom fetch + DOMParser | `unfurl.js@6+` | For server-side unfurling. For extension-only (no backend) approach: fetch in service worker + parse OG/Twitter meta tags with DOMParser. |
| **HTTP** | Native `fetch` | built-in | MV3 service workers support fetch natively. No need for axios. |
| **Testing** | Vitest + `@webext-core/fake-browser` | `vitest@2`, latest | Vitest is Vite-native (matches WXT), fake-browser mocks chrome.* APIs. |
| **Linting/format** | Biome | `@biomejs/biome@1.9+` | Single tool replacing ESLint + Prettier, 10x faster. Or ESLint 9 + Prettier if team prefers. |

---

## Extension Architecture

### MV3 pieces and how they fit together

```
┌─────────────────────────────────────────────────────────────┐
│  web.whatsapp.com (host page)                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ content.ts (isolated world)                          │   │
│  │  • MutationObserver on chat list + active chat pane  │   │
│  │  • Parses messages, extracts URLs                    │   │
│  │  • Detects trip-intent signals                       │   │
│  │  • Sends to SW via typed messaging                   │   │
│  │  • NO UI injection needed (side panel is separate)   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ▲ ▼  (chrome.runtime messaging)
┌─────────────────────────────────────────────────────────────┐
│  background.ts (service worker — event-driven, ephemeral)   │
│  • Receives messages/URLs from content script               │
│  • Fetches URL metadata (Airbnb, TikTok, Maps) — has CORS   │
│    bypass via host_permissions                              │
│  • Calls z.AI API (OpenAI SDK with baseURL override)        │
│  • Writes results to chrome.storage.local                   │
│  • Manages side panel lifecycle: sidePanel.setOptions()     │
└─────────────────────────────────────────────────────────────┘
                          ▲ ▼  (chrome.storage + messaging)
┌─────────────────────────────────────────────────────────────┐
│  sidepanel.html (React 19 app)                              │
│  • Subscribes to storage for live updates                   │
│  • Zustand store hydrated from @wxt-dev/storage             │
│  • Renders suggestion cards with booking links              │
│  • User actions → SW → API calls                            │
└─────────────────────────────────────────────────────────────┘
```

### Key architectural decisions

1. **Side panel, not injected sidebar.** Chrome 114+ `chrome.sidePanel` API is a separate document alongside the host page. No Shadow DOM or CSS-reset gymnastics. User can pin it so it stays open across tabs. This is the ideal UX for "don't leave WhatsApp Web."

2. **Content script is read-only.** It observes the DOM and forwards structured data. It does NOT render UI. This dramatically simplifies the code (no Shadow DOM, no React-in-content-script) and keeps WhatsApp Web untouched.

3. **All network/API calls happen in the service worker.** Per Chrome's 2021+ policy change, content scripts' `fetch` is subject to the host page's CORS; only the service worker can bypass CORS via `host_permissions`. This is non-negotiable in MV3.

4. **Service worker is ephemeral.** It can be killed any time. State must live in `chrome.storage.local` (or IndexedDB for >10MB). Never hold state in SW module-level variables — they vanish.

5. **Manifest key structure (MV3):**

```json
{
  "manifest_version": 3,
  "name": "JRNY Copilot",
  "version": "0.1.0",
  "permissions": ["sidePanel", "storage", "tabs", "scripting"],
  "host_permissions": [
    "https://web.whatsapp.com/*",
    "https://api.z.ai/*",
    "https://www.airbnb.com/*",
    "https://www.tiktok.com/*",
    "https://www.google.com/maps/*"
  ],
  "background": { "service_worker": "background.js", "type": "module" },
  "side_panel": { "default_path": "sidepanel.html" },
  "content_scripts": [
    { "matches": ["https://web.whatsapp.com/*"],
      "js": ["content.js"], "run_at": "document_idle" }
  ],
  "action": { "default_title": "JRNY Copilot" }
}
```

WXT generates this from file conventions (`entrypoints/content.ts`, `entrypoints/background.ts`, `entrypoints/sidepanel/`) — you don't hand-write it.

---

## Key Libraries

### Framework & tooling

- **WXT `0.20.22`** — `npm i -D wxt` — File-based entrypoints (`entrypoints/content.ts`, `entrypoints/background.ts`, `entrypoints/sidepanel/`). Auto-generates `manifest.json`. HMR for content scripts. Cross-browser build (`wxt build -b chrome`, `wxt build -b firefox`). Confidence: **HIGH** (v0.20 is RC for v1.0).
- **`@wxt-dev/module-react`** — React 19 integration module for WXT. `npm i -D @wxt-dev/module-react`.
- **`@wxt-dev/storage` `1.2.8`** — Type-safe `storage.defineItem()` API over `chrome.storage.local`. Supports versioning and migrations.

### UI

- **React `19.x`** + **React DOM `19.x`**.
- **Tailwind CSS `4.x`** — Install via `@tailwindcss/vite` Vite plugin. For Shadow DOM injection (if ever needed), override variable scope: `:root, :host { --...: ... }`. For the side panel (separate HTML doc) no Shadow DOM workaround is needed.
- **shadcn/ui** (latest CLI, Tailwind v4 branch) — `npx shadcn@latest init`. Copy components into the project; fully customize.
- **lucide-react** — icons, pairs with shadcn.

### State & messaging

- **Zustand `5.x`** — `npm i zustand`. Create stores that persist to `@wxt-dev/storage`. Simplest viable option that works across all extension contexts via storage.onChanged.
- **`@webext-core/messaging`** — Type-safe `defineExtensionMessaging<ProtocolMap>()`. Define a single `ProtocolMap` type once, share across content script ⇆ SW ⇆ side panel.

### AI & scraping

- **`openai` SDK `4.x`** — `npm i openai`. Configure:
  ```ts
  import OpenAI from 'openai';
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.z.ai/api/paas/v4',
    dangerouslyAllowBrowser: true, // ONLY in service worker context
  });
  ```
  z.AI is OpenAI-compatible; model names like `glm-4.7`, `glm-4.5-air`, or `glm-5` per user's account tier.
- **URL metadata approach (no dedicated library needed):**
  ```ts
  // In service worker
  const res = await fetch(url, { headers: { 'User-Agent': '...' } });
  const html = await res.text();
  // Use DOMParser (available in SW via offscreen document OR lightweight regex for OG tags)
  ```
  For production robustness, consider `unfurl.js@6` if you spin up a backend proxy later — but for pure-extension MVP, regex-parse `<meta property="og:..."` and `<script type="application/ld+json">` directly.

### Site-specific parsing (pragmatic strategy)

- **Airbnb:** Fetch listing URL from SW. Extract the `<script id="data-deferred-state-0" type="application/json">` blob (contains full listing JSON) OR fall back to OG tags (`og:title`, `og:image`, `og:description`, `og:price:amount`). Flag: Airbnb ToS prohibits automated scraping at scale — for a personal copilot reading links the user already shared, this is lower-risk but document the constraint.
- **TikTok:** Use the **official oEmbed endpoint** `https://www.tiktok.com/oembed?url={video_url}` — no auth, no scraping, returns JSON with `title`, `author_name`, `thumbnail_url`, `html` embed. Confidence: **HIGH**.
- **Google Maps:** Extract lat/lng from URL patterns (`@<lat>,<lng>`, `!3d<lat>!4d<lng>`, or `place/`). For place metadata, resolve shortened `maps.app.goo.gl` links first (follow redirect in SW fetch). Consider Google Places API if budget allows — more reliable than scraping.

---

## What NOT to Use

| Avoid | Reason |
|-------|--------|
| **Plasmo** | Maintenance concerns in 2025; Parcel bundler is slower than Vite; 43% larger bundles than WXT; React-only mindset. WXT supersedes it. |
| **CRXJS alone (without WXT)** | Great plugin but not a framework — you'd re-implement manifest generation, entrypoint conventions, cross-browser packaging. Only choose if you actively want minimalism. |
| **Webpack + manual `manifest.json`** | Slower builds, no HMR for content scripts, hand-maintained manifest drifts from code. Only relevant for legacy projects. |
| **Redux / Redux Toolkit** | Overkill for this scope. Zustand achieves cross-context sync with ~1/10 the code. |
| **`axios`** | Adds ~15 KB for no benefit — native `fetch` works fine in service workers. |
| **Injecting React UI into WhatsApp Web's DOM** | WhatsApp Web is a heavy React SPA that re-renders constantly and uses its own isolation; any injected UI will fight its lifecycle. Use the side panel instead — it's a separate document, no conflicts, pinnable, persistent. |
| **`chrome.storage.sync`** (for primary data) | 100 KB total quota, 8 KB per item. Fine for user settings, useless for conversation history or cached AI responses. Use `chrome.storage.local` (10 MB, or unlimited with permission). |
| **LocalStorage** in content script | Shared with web.whatsapp.com, cleared when the user clears site data, not accessible from SW. Always use `chrome.storage.*`. |
| **Running AI API calls from content script** | Will hit CORS (content script fetch inherits host page CORS in modern Chrome). Must go through SW with `host_permissions`. |
| **Manifest V2 patterns** (background pages, `browser_action`, persistent background) | MV2 is end-of-life. Only MV3 is accepted in Chrome Web Store. Use service worker + `action` + `sidePanel`. |
| **`chrome.runtime.sendMessage` raw** | Untyped, error-prone. Use `@webext-core/messaging` for typed protocols. |
| **Puppeteer / Playwright in the extension** | These are for external automation, not for extensions. For in-page scraping you already have DOM access via content script. |
| **Scraping Airbnb at scale / aggressively** | ToS violation risk. Only parse URLs the user explicitly shared in their own chats (first-party UX). Rate-limit and cache aggressively. |
| **Storing z.AI API key in content script or in public bundle** | Store only in `chrome.storage.local`, read only from SW. Never log it. Add an "enter your key" onboarding screen. |
| **Keeping state in SW module scope** | SW is killed after ~30s idle in MV3. All persistent state → `chrome.storage.local` via `@wxt-dev/storage`. |

---

## Confidence

| Decision | Confidence | Notes |
|----------|------------|-------|
| WXT over Plasmo/CRXJS | **HIGH** | Multiple 2025 comparative analyses converge. WXT active maintenance confirmed (updates days ago). |
| React 19 + TS + Tailwind v4 + shadcn/ui | **HIGH** | Industry default for extension UIs; shadcn has explicit Tailwind v4 + React 19 support. |
| Side panel (`chrome.sidePanel`) for primary UI | **HIGH** | Official Chrome 114+ API; ideal for persistent assistant UX. |
| Content script = read-only observer | **HIGH** | Avoids Shadow DOM complexity; matches WhatsApp Web's SPA constraints. |
| Service worker as API/network hub | **HIGH** | MV3 CORS rules make this mandatory, not optional. |
| Zustand for state | **MEDIUM-HIGH** | Best DX for scope; Jotai is a valid alternative if atomic dependencies grow complex. |
| `@wxt-dev/storage` for persistence | **HIGH** | Native integration with chosen framework, type-safe. |
| `@webext-core/messaging` for IPC | **HIGH** | WXT docs recommend it; type safety worth the dependency. |
| OpenAI SDK with z.AI baseURL | **HIGH** | Confirmed on z.AI docs and multiple community tutorials. |
| TikTok oEmbed (official) | **HIGH** | TikTok developer docs confirm endpoint, no auth required. |
| Airbnb parsing via embedded JSON + OG fallback | **MEDIUM** | Technique works but Airbnb may change markup; plan for defensive parsing + graceful degradation. ToS constraint documented. |
| Google Maps URL parsing (lat/lng regex) | **MEDIUM** | URL formats stable for years but undocumented. Places API is more robust if budget allows. |
| Biome over ESLint+Prettier | **MEDIUM** | Purely preference; ESLint 9 + Prettier is equally fine. |

---

## Sources

- [WXT framework comparison 2025 — Plasmo vs WXT vs CRXJS (redreamality)](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/)
- [WXT official docs — compare](https://wxt.dev/guide/resources/compare)
- [WXT entrypoints docs](https://wxt.dev/guide/essentials/entrypoints.html)
- [WXT messaging docs](https://wxt.dev/guide/essentials/messaging)
- [wxt on npm (0.20.22)](https://www.npmjs.com/package/wxt)
- [@wxt-dev/storage on npm](https://www.npmjs.com/package/@wxt-dev/storage)
- [chrome.sidePanel API reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [Chrome side panel launch blog](https://developer.chrome.com/blog/extension-side-panel-launch)
- [Chrome cross-origin network requests in extensions](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)
- [Changes to cross-origin requests in extension content scripts (Chromium)](https://www.chromium.org/Home/chromium-security/extension-content-script-fetches/)
- [MutationObserver + Chrome extensions](https://developer.chrome.com/blog/detect-dom-changes-with-mutation-observers)
- [Tailwind v4 + Shadow DOM discussion (GitHub #15556)](https://github.com/tailwindlabs/tailwindcss/discussions/15556)
- [shadcn/ui — Tailwind v4 support](https://ui.shadcn.com/docs/tailwind-v4)
- [WXT + React + shadcn + Tailwind boilerplate](https://github.com/imtiger/wxt-react-shadcn-tailwindcss-chrome-extension)
- [z.AI developer docs — Quick Start](https://docs.z.ai/guides/overview/quick-start)
- [Access GLM using OpenAI-Compatible API](https://developer.puter.com/tutorials/access-glm-using-openai-compatible-api/)
- [TikTok oEmbed / embed videos docs](https://developers.tiktok.com/doc/embed-videos/)
- [metascraper on npm](https://www.npmjs.com/package/metascraper)
- [unfurl.js on npm](https://www.npmjs.com/package/unfurl.js)
- [open-graph-scraper on npm](https://www.npmjs.com/package/open-graph-scraper)
- [chrome.storage API reference](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [webext-bridge on npm](https://www.npmjs.com/package/webext-bridge)
- [State management in 2025 — Zustand vs Jotai vs Redux](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k)
