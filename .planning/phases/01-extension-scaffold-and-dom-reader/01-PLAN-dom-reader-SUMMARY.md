---
phase: 1
plan: 2
subsystem: whatsapp-dom-reader
tags: [content-script, mutation-observer, whatsapp, aria-selectors, typed-messaging, wxt]
dependency_graph:
  requires: [extension-scaffold, messaging-protocol, service-worker]
  provides: [whatsapp-dom-reader, chat-delta-sender]
  affects: [02-ai-integration]
tech_stack:
  added: []
  patterns:
    - ARIA-first tiered selector cascade (Tier 1 ARIA, Tier 2 data-*, Tier 3 structural classes)
    - MutationObserver scoped to WhatsApp chat pane with 500ms boot poll
    - 300ms debounce batching with Map<string, Message> flush
    - Set<string> dedupe by data-id (CS lifetime, never cleared)
    - Fire-and-forget sendMessage with .catch (observer callback stays synchronous)
    - wxt/utils/define-content-script (not wxt/sandbox — path does not exist)
key_files:
  created:
    - whatsapp/selectors.ts
    - whatsapp/extractor.ts
    - whatsapp/observer.ts
  modified:
    - entrypoints/content.ts
decisions:
  - whatsapp/ module placed at repo root (not src/whatsapp/) to match WXT @ alias → root convention from Wave 1
  - defineContentScript imported from wxt/utils/define-content-script (wxt/sandbox does not exist in WXT 0.20.25)
  - Hashed class example removed from selectors.ts comment to pass grep-based acceptance test cleanly
  - innerHTML mention removed from extractor.ts comment (replaced with "raw HTML access is forbidden") to pass grep-based no-innerHTML check
metrics:
  duration: "4 minutes"
  completed: "2026-04-18"
  tasks_completed: 3
  files_created: 3
  files_modified: 1
---

# Phase 1 Plan 2: WhatsApp DOM Reader + Typed Messaging to SW Summary

Read-only WhatsApp Web DOM reader: ARIA-first MutationObserver extracts `{dataId, sender, timestamp, text, urls[]}` from message rows, dedupes by `data-id`, debounces at 300ms, and forwards typed `chatDelta` batches to the service worker via `@webext-core/messaging`.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Selector cascade + single-row extractor (pure functions) | 02e748a | Done |
| 2 | MutationObserver + dedupe Set + 300ms debounce | 8c16623 | Done |
| 3 | Content script entrypoint — wire observer → chatDelta → SW | c36ca97 | Done |

## What Was Built

- **`whatsapp/selectors.ts`** (repo root): Single source of truth for all DOM selectors. Three-tier cascade: `[aria-label="Message list"]` → `[data-testid="conversation-panel-messages"]` → `#main [role="application"]` for the chat pane; `[role="row"]` for message rows; `.copyable-text[data-pre-plain-text]` for message blocks; `span.selectable-text` for body text; `data-id` attribute for stable message IDs. No hashed class selectors.

- **`whatsapp/extractor.ts`** (repo root): Pure function `parseRow(row: Element): Message | null`. Reads `data-id` from row or nearest ancestor/descendant, parses `data-pre-plain-text` header with regex for timestamp and sender (graceful fallback to `''` on parse failure), extracts body via `innerText` (never innerHTML), regex-extracts `http(s)://` URLs. Returns `null` for non-message rows (date dividers, system notifications).

- **`whatsapp/observer.ts`** (repo root): `startObserver({ onBatch, signal })` — polls at 500ms for the WhatsApp SPA chat pane (handles late mount), performs initial sweep of visible messages, then wires a `{ childList: true, subtree: true }` MutationObserver. Dedupes all-time by `Set<string>` of `dataId` values. Batches new messages via `Map<string, Message>` flushed on a 300ms debounce timer. Cleans up observer and timers on `AbortSignal` abort.

- **`entrypoints/content.ts`** (updated from Wave 1 no-op stub): `defineContentScript` with `matches: ['https://web.whatsapp.com/*']`, `runAt: 'document_idle'`, `world: 'ISOLATED'`. Boots the observer with `ctx.signal` for WXT lifecycle integration. Calls `sendMessage('chatDelta', { messages })` fire-and-forget with `.catch` to surface delivery errors without blocking the observer callback.

## Build Verification

- `npm run build` exits 0
- `npx tsc --noEmit` exits 0
- `.output/chrome-mv3/content-scripts/content.js` present (20.15 kB)
- `.output/chrome-mv3/manifest.json` has `content_scripts` entry with `web.whatsapp.com` match

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `whatsapp/` module placed at repo root, not `src/whatsapp/`**
- **Found during:** Task 1 (pre-task analysis of Wave 1 deviation)
- **Issue:** Plan specifies `src/whatsapp/selectors.ts` etc., but WXT 0.20.25 `@` alias hard-maps to repo root. `@/types/message` resolves to `types/message.ts` at root (not `src/types/message.ts`). Following the `src/` path would break all `@/` imports.
- **Fix:** Created `whatsapp/selectors.ts`, `whatsapp/extractor.ts`, `whatsapp/observer.ts` at repo root, matching the established Wave 1 convention (`types/`, `messaging/`, `lib/` all at root).
- **Files modified:** All three new files created at root instead of `src/`
- **Commits:** 02e748a, 8c16623

**2. [Rule 1 - Bug] `wxt/sandbox` import path does not exist in WXT 0.20.25**
- **Found during:** Task 3 (pre-task verification — same fix applied in Wave 1 for background.ts)
- **Issue:** Plan specifies `import { defineContentScript } from 'wxt/sandbox'` but this export path does not exist. WXT exports `defineContentScript` from `'wxt/utils/define-content-script'`.
- **Fix:** Used `import { defineContentScript } from 'wxt/utils/define-content-script'` — verified against `node_modules/wxt/package.json` exports map.
- **Files modified:** `entrypoints/content.ts`
- **Commit:** c36ca97

**3. [Rule 1 - Bug] Hashed class grep check: comment in selectors.ts triggered false positive**
- **Found during:** Task 1 acceptance verification
- **Issue:** The Tier 4 documentation comment said "like `._ao3e`" which matched the grep pattern `\._[a-z0-9]{4,}`. The acceptance criteria require this grep to return NONZERO (no match).
- **Fix:** Replaced `._ao3e` example with prose description "hashed classes — short random suffixes".
- **Files modified:** `whatsapp/selectors.ts`
- **Commit:** 02e748a

**4. [Rule 1 - Bug] innerHTML grep check: comment in extractor.ts triggered false positive**
- **Found during:** Task 1 acceptance verification
- **Issue:** Comment "never innerHTML" contained the forbidden string, triggering the `grep -q "innerHTML"` check. Acceptance criteria require this grep to return NONZERO.
- **Fix:** Replaced with "raw HTML access is forbidden" — semantically identical, grep-clean.
- **Files modified:** `whatsapp/extractor.ts`
- **Commit:** 02e748a

## End-to-End Smoke Test

Manual smoke test deferred — requires `npm run dev` and a live WhatsApp Web session. Build artifacts are correct:
- Content script bundle present in `.output/chrome-mv3/content-scripts/content.js`
- Manifest has correct `content_scripts` entry with `https://web.whatsapp.com/*` match
- Service worker already registers `onMessage('chatDelta')` handler (from Wave 1)
- All imports resolve; `tsc --noEmit` passes

Expected behavior when tested:
- SW console: `[JRNY] service worker booted` then `[JRNY] chatDelta: N messages` after chat activity
- WhatsApp tab console: `[JRNY][content] booted on https://web.whatsapp.com/` and `[JRNY][content] chat pane found; starting observer`
- Chat switch: SW does NOT re-log previously seen messages (dedupe working)

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Side panel placeholder UI | `entrypoints/sidepanel/App.tsx` | Phase 3 replaces with full suggestion UI |
| `onMessage('chatDelta')` logs only | `entrypoints/background.ts` | Phase 2 adds z.AI call |

## Threat Flags

None. This plan adds a content script that reads DOM text using `innerText`/`textContent` only. No network requests from the content script. No writes to the page. No new auth paths. `sendMessage` uses the already-registered `@webext-core/messaging` typed channel — no new trust boundary introduced.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| whatsapp/selectors.ts | FOUND |
| whatsapp/extractor.ts | FOUND |
| whatsapp/observer.ts | FOUND |
| entrypoints/content.ts (updated) | FOUND |
| .output/chrome-mv3/content-scripts/content.js | FOUND |
| commit 02e748a (Task 1) | FOUND |
| commit 8c16623 (Task 2) | FOUND |
| commit c36ca97 (Task 3) | FOUND |
| tsc --noEmit | PASS |
| npm run build | PASS |
