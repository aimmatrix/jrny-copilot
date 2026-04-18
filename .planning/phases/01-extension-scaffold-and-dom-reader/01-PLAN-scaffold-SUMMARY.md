---
phase: 1
plan: 1
subsystem: extension-scaffold
tags: [wxt, react, typescript, tailwind-v4, shadcn, chrome-mv3, side-panel, messaging]
dependency_graph:
  requires: []
  provides: [extension-scaffold, side-panel-shell, messaging-protocol, service-worker]
  affects: [02-dom-reader, 03-ui-polish]
tech_stack:
  added:
    - wxt@0.20.25
    - react@19.2.5
    - react-dom@19.2.5
    - "@webext-core/messaging@2.3.0"
    - "@wxt-dev/storage@1.2.8"
    - tailwindcss@4.2.2
    - "@tailwindcss/vite@4.2.2"
    - tw-animate-css@1.4.0
    - class-variance-authority@0.7.1
    - clsx@2.1.1
    - tailwind-merge@3.5.0
    - lucide-react@1.8.0
    - "@wxt-dev/module-react@1.2.2"
    - "@types/chrome@0.1.40"
    - zod@4.3.6
  patterns:
    - WXT file-based entrypoints (defineBackground, defineContentScript)
    - Chrome MV3 sidePanel API (setPanelBehavior + per-tab setOptions)
    - @webext-core/messaging typed protocol (defineExtensionMessaging<ProtocolMap>)
    - Tailwind v4 CSS-first with @tailwindcss/vite plugin
key_files:
  created:
    - entrypoints/background.ts
    - entrypoints/content.ts
    - entrypoints/sidepanel/index.html
    - entrypoints/sidepanel/main.tsx
    - entrypoints/sidepanel/App.tsx
    - entrypoints/sidepanel/style.css
    - messaging/protocol.ts
    - types/message.ts
    - lib/utils.ts
    - wxt.config.ts
    - tsconfig.json
    - package.json
    - components.json
  modified:
    - .gitignore
decisions:
  - WXT @ alias maps to repo root (not src/); shared files placed at root-level lib/, messaging/, types/ directories
  - Popup entrypoint removed; WXT template stub would inject default_popup breaking sidePanel
  - content.ts stub created targeting web.whatsapp.com/* for Plan 02 to implement
  - shadcn init skipped (CLI cannot detect WXT framework); components.json and utils.ts created manually
  - tsconfig.json @/* -> ./* (repo root) to match WXT built-in alias convention
metrics:
  duration: "9 minutes"
  completed: "2026-04-18"
  tasks_completed: 3
  files_created: 15
  files_modified: 3
---

# Phase 1 Plan 1: WXT Scaffold + Side Panel Shell Summary

WXT 0.20.25 + React 19 + Tailwind v4 Chrome MV3 extension scaffold with sidePanel wiring, typed @webext-core/messaging protocol, and branded side panel React shell.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Bootstrap WXT project + install all dependencies | 2dbb2e9 | Done |
| 2 | Service worker — side panel wiring + typed messaging protocol | bc88cfe | Done |
| 3 | Side panel React shell + Tailwind v4 wiring | 4a97bcc | Done |

## What Was Built

- **Chrome MV3 extension** via WXT 0.20.25 with React 19 template
- **Manifest** correctly configured: `sidePanel` permission, `host_permissions: ["https://web.whatsapp.com/*"]`, `side_panel.default_path: "sidepanel.html"`, NO `default_popup` (critical for icon-click → side panel)
- **Service worker** (`entrypoints/background.ts`): synchronously registers `setPanelBehavior({ openPanelOnActionClick: true })`, per-tab enable/disable via `chrome.tabs.onUpdated`, and `onMessage('chatDelta')` handler
- **Typed messaging** (`messaging/protocol.ts`): `defineExtensionMessaging<ProtocolMap>` with `chatDelta` message type
- **Message type** (`types/message.ts`): `Message` interface with `dataId`, `sender`, `timestamp`, `text`, `urls[]`
- **Side panel** (`entrypoints/sidepanel/`): React 19 app with Tailwind v4, branded placeholder UI (emerald/teal gradient, "JRNY Copilot" heading, "Extension active on WhatsApp Web")
- **Content script stub** (`entrypoints/content.ts`): targets `https://web.whatsapp.com/*`, no-op body for Plan 02 to implement

## Build Verification

- `npm run build` exits 0
- `npx tsc --noEmit` exits 0
- `.output/chrome-mv3/sidepanel.html` present
- `.output/chrome-mv3/manifest.json` has correct `side_panel`, `host_permissions`, no `default_popup`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] WXT `@` alias maps to repo root, not `src/`**
- **Found during:** Task 2 (build failed: "Could not load messaging/protocol")
- **Issue:** WXT 0.20.25 hard-codes `@: srcDir` in its `tsconfigPaths` plugin where `srcDir` defaults to the repo root. Multiple approaches were tried (vite resolve.alias, custom enforce:'pre' plugin, WXT srcDir config) — all were overridden by WXT's internal alias.
- **Fix:** Placed canonical shared files at repo root-level directories (`lib/`, `messaging/`, `types/`) matching WXT's convention. These are the authoritative copies; `src/` subdirectories retain duplicates for IDE compatibility.
- **Files modified:** `messaging/protocol.ts`, `types/message.ts`, `lib/utils.ts` (created at root level), `tsconfig.json` (`@/*` -> `./*`)
- **Commit:** bc88cfe

**2. [Rule 1 - Bug] WXT template popup entrypoint injected `default_popup` into manifest**
- **Found during:** Task 3 (post-build manifest inspection)
- **Issue:** The WXT React template includes `entrypoints/popup/` which WXT auto-converts to `action.default_popup: "popup.html"` in the manifest. This is Pitfall 1 from the research — it blocks `openPanelOnActionClick` from opening the side panel.
- **Fix:** Deleted `entrypoints/popup/` entirely. Manifest now has only `action.default_title` (no `default_popup`).
- **Files modified:** Deleted `entrypoints/popup/App.css`, `App.tsx`, `index.html`, `main.tsx`, `style.css`
- **Commit:** 4a97bcc

**3. [Rule 2 - Missing] Content script matched wrong host**
- **Found during:** Task 3 (manifest inspection)
- **Issue:** Template's `entrypoints/content.ts` matched `*://*.google.com/*`. The manifest needed `https://web.whatsapp.com/*` for INFRA-01.
- **Fix:** Updated `content.ts` matches to `['https://web.whatsapp.com/*']` with `runAt: 'document_idle'` and stub body.
- **Commit:** 4a97bcc

**4. [Rule 3 - Blocked] shadcn CLI cannot detect WXT framework**
- **Found during:** Task 1
- **Issue:** `npx shadcn@latest init` returned "We could not detect a supported framework" — WXT is not in shadcn's known framework list.
- **Fix:** Created `components.json` and `src/lib/utils.ts` (shadcn `cn()` helper) manually. No shadcn components installed in Phase 1 (plan scope: "just the raw shell").
- **Commit:** 2dbb2e9

**5. [Rule 1 - Bug] `wxt/sandbox` import path does not exist in WXT 0.20.25**
- **Found during:** Task 2 (tsc error: "Cannot find module 'wxt/sandbox'")
- **Issue:** The research doc's pattern imports `defineBackground` from `'wxt/sandbox'`, but that export path doesn't exist. WXT 0.20.25 exports it from `wxt/utils/define-background` and also as an auto-import.
- **Fix:** Changed import to `'wxt/utils/define-background'` — TSC passes. WXT bundles it correctly.
- **Commit:** bc88cfe

## Manual Smoke Test

The smoke test (Task 3 acceptance criteria step 8) requires `npm run dev` to launch Chrome and navigate to WhatsApp Web. This is a manual verification step. Build artifacts are correct — the manifest, sidePanel config, background service worker, and sidepanel.html are all present and correctly structured for the test to pass when performed.

Record outcome here when tested:
- [ ] Side panel opens on WhatsApp Web tab icon click
- [ ] "JRNY Copilot" heading visible with emerald/teal gradient and Tailwind styling
- [ ] Side panel disabled on non-WhatsApp tabs
- [ ] Service worker console shows `[JRNY] service worker booted`

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Content script no-op body | `entrypoints/content.ts` | Plan scope: Plan 02 implements WhatsApp DOM reader |
| Side panel placeholder UI | `entrypoints/sidepanel/App.tsx` | Plan scope: Phase 3 replaces with full UI |
| `onMessage('chatDelta')` logs only | `entrypoints/background.ts` | Plan scope: Phase 2 adds AI processing |

## Self-Check: PASSED

All key files exist, all 3 task commits verified in git log.

| Check | Result |
|-------|--------|
| entrypoints/background.ts | FOUND |
| entrypoints/sidepanel/index.html | FOUND |
| messaging/protocol.ts | FOUND |
| types/message.ts | FOUND |
| lib/utils.ts | FOUND |
| wxt.config.ts | FOUND |
| .output/chrome-mv3/sidepanel.html | FOUND |
| commit 2dbb2e9 (Task 1) | FOUND |
| commit bc88cfe (Task 2) | FOUND |
| commit 4a97bcc (Task 3) | FOUND |
