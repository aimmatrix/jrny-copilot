---
phase: 01-extension-scaffold-and-dom-reader
verified: 2026-04-18T12:00:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Load extension in Chrome, navigate to https://web.whatsapp.com/, click toolbar icon"
    expected: "Side panel docks to the right showing JRNY Copilot heading with emerald/teal gradient square and Tailwind-styled text"
    why_human: "Visual rendering and side panel activation requires a running browser with the loaded extension"
  - test: "Navigate same tab to https://example.com, click toolbar icon"
    expected: "Side panel does NOT open (disabled on non-WhatsApp tabs)"
    why_human: "Per-tab enable/disable behavior requires a live Chrome session"
  - test: "Open a WhatsApp chat, inspect the service worker console at chrome://extensions"
    expected: "SW console shows [JRNY] service worker booted, then [JRNY] chatDelta: N messages with one line per message"
    why_human: "End-to-end message pipeline requires live WhatsApp Web session with real DOM"
  - test: "Switch to a different chat in the same tab"
    expected: "SW console does NOT re-log previously seen messages (dedupe working)"
    why_human: "Dedupe across chat switches requires live interaction"
---

# Phase 1: Extension Scaffold & DOM Reader — Verification Report

**Phase Goal:** A working MV3 extension that auto-activates on WhatsApp Web, opens a side panel, and pipes live chat messages from the page into the service worker over a typed message protocol.
**Verified:** 2026-04-18T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Extension auto-activates on web.whatsapp.com (INFRA-01) | VERIFIED | `wxt.config.ts` has `host_permissions: ['https://web.whatsapp.com/*']`; built manifest confirms `content_scripts[0].matches: ["https://web.whatsapp.com/*"]` with `world: "ISOLATED"`, `run_at: "document_idle"` |
| 2 | Content script reads messages via tiered ARIA selectors, MutationObserver, dedupe by data-id (INFRA-02) | VERIFIED | `whatsapp/selectors.ts` has 3-tier cascade (ARIA → data-testid → structural); `whatsapp/observer.ts` has MutationObserver + 500ms boot poll + 300ms debounce + `Set<string>` dedupe; `whatsapp/extractor.ts` has `parseRow()` using `innerText`, no `innerHTML` |
| 3 | Typed messaging protocol exists (chatDelta) and content script sends to SW (INFRA-03) | VERIFIED | `messaging/protocol.ts` exports `defineExtensionMessaging<ProtocolMap>` with `chatDelta(data: { messages: Message[] }): void`; `entrypoints/content.ts` calls `sendMessage('chatDelta', { messages })`; `entrypoints/background.ts` registers `onMessage('chatDelta')` synchronously in `main()` |
| 4 | Side panel opens on icon click, enabled only on WhatsApp Web tabs (INFRA-04) | VERIFIED | `entrypoints/background.ts` calls `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` and `chrome.tabs.onUpdated.addListener` per-tab `setOptions({ enabled: isWa })`; no `default_popup` in manifest (confirmed); `side_panel.default_path: "sidepanel.html"` in manifest |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `wxt.config.ts` | host_permissions + sidePanel + no default_popup | VERIFIED | Present, correct, no default_popup |
| `entrypoints/background.ts` | setPanelBehavior + tabs listener + onMessage(chatDelta) sync | VERIFIED | All three present, no await before listeners |
| `entrypoints/content.ts` | defineContentScript + startObserver + sendMessage(chatDelta) | VERIFIED | Fully implemented (not a stub) |
| `entrypoints/sidepanel/App.tsx` | JRNY Copilot branded shell | VERIFIED | Present; renders heading + branded section (intentional Phase 1 placeholder UI per plan scope) |
| `messaging/protocol.ts` | defineExtensionMessaging<ProtocolMap> with chatDelta | VERIFIED | 15 lines, fully typed |
| `types/message.ts` | Message interface: dataId, sender, timestamp, text, urls[] | VERIFIED | All 5 fields present with correct types |
| `whatsapp/selectors.ts` | Tiered ARIA-first selectors, no hashed classes | VERIFIED | 3-tier cascade, no `._xxxx` patterns |
| `whatsapp/extractor.ts` | parseRow() using innerText, no innerHTML | VERIFIED | innerText used, innerHTML absent |
| `whatsapp/observer.ts` | startObserver + MutationObserver + Set dedupe + 300ms debounce | VERIFIED | All patterns present |
| `.output/chrome-mv3/manifest.json` | MV3 manifest with correct content_scripts, side_panel, host_permissions | VERIFIED | Confirmed via build output inspection |
| `.output/chrome-mv3/content-scripts/content.js` | Built content script bundle | VERIFIED | 20,152 bytes |
| `.output/chrome-mv3/sidepanel.html` | Side panel HTML entrypoint | VERIFIED | Present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `entrypoints/content.ts` | `whatsapp/observer.ts` | `import { startObserver }` + `startObserver({ signal: ctx.signal, onBatch })` | WIRED | Direct import and call with signal passthrough |
| `entrypoints/content.ts` | `messaging/protocol.ts` | `import { sendMessage }` + `sendMessage('chatDelta', { messages })` | WIRED | Fire-and-forget with .catch |
| `entrypoints/background.ts` | `messaging/protocol.ts` | `import { onMessage }` + `onMessage('chatDelta', handler)` | WIRED | Registered synchronously inside `main()` |
| `whatsapp/observer.ts` | `whatsapp/extractor.ts` | `import { parseRow }` + `parseRow(node)` | WIRED | Called in both initial scan and MutationObserver callback |
| `whatsapp/observer.ts` | `whatsapp/selectors.ts` | `import { CHAT_PANE_SELECTORS, MESSAGE_ROW }` | WIRED | Used in `findChatPane()` and `scanRoot()` |
| `whatsapp/extractor.ts` | `types/message.ts` | `import type { Message }` | WIRED | Return type of `parseRow()` |
| `messaging/protocol.ts` | `types/message.ts` | `import type { Message }` | WIRED | chatDelta payload type |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `whatsapp/observer.ts` | `batch: Message[]` from `onBatch` | MutationObserver on live DOM via `parseRow()` | Yes — reads live WhatsApp DOM nodes via `innerText` | FLOWING |
| `entrypoints/background.ts` | `data.messages` from `chatDelta` | `@webext-core/messaging` channel from content script | Yes — flows from DOM reader | FLOWING |
| `entrypoints/sidepanel/App.tsx` | static branded placeholder | N/A (intentional Phase 1 scope) | N/A — placeholder by plan design | INFO: Phase 3 replaces UI |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Built manifest has correct content_scripts | `cat .output/chrome-mv3/manifest.json \| grep content_scripts` | `"content_scripts":[{"matches":["https://web.whatsapp.com/*"],...}]` | PASS |
| No default_popup in manifest | `grep default_popup .output/chrome-mv3/manifest.json` | no match | PASS |
| Content bundle is substantive | `wc -c .output/chrome-mv3/content-scripts/content.js` | 20,152 bytes | PASS |
| Live chatDelta pipeline (CS → SW) | Requires npm run dev + WhatsApp session | Cannot test without browser | SKIP — routed to human |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INFRA-01 | 01-PLAN-scaffold.md | Extension installs and activates on web.whatsapp.com | SATISFIED | host_permissions + content_scripts in manifest; content.ts matches clause |
| INFRA-02 | 01-PLAN-dom-reader.md | Content script reads visible chat messages | SATISFIED | observer.ts + extractor.ts + selectors.ts implemented and wired |
| INFRA-03 | 01-PLAN-dom-reader.md | Content script forwards messages to SW via typed protocol | SATISFIED | chatDelta channel implemented end-to-end; sendMessage in CS, onMessage in SW |
| INFRA-04 | 01-PLAN-scaffold.md | Extension activates side panel on WhatsApp Web tab | SATISFIED | setPanelBehavior + per-tab setOptions in background.ts |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `entrypoints/sidepanel/App.tsx` | all | Static placeholder UI | INFO | Intentional — plan explicitly scopes this as a Phase 1 branded shell; Phase 3 replaces it. Not a blocker. |
| `entrypoints/background.ts` | 30-37 | onMessage logs only, no AI processing | INFO | Intentional — Phase 2 adds z.AI call. Not a blocker. |

No innerHTML, no hashed class selectors, no await before sync listeners, no TODO/FIXME blockers found in any core file.

### Architecture Rule Compliance

| Rule | Status | Evidence |
|------|--------|----------|
| Content script is read-only | PASS | No DOM writes in content.ts, observer.ts, extractor.ts |
| All network calls from service worker | PASS | Content script uses messaging only; no fetch in content.ts |
| Side panel is only UI surface | PASS | No injected DOM elements |
| No persistent chat storage | PASS | `seen` Set and `pending` Map live only in CS module scope |
| ARIA-first selectors | PASS | `[aria-label="Message list"]` is Tier 1; no `._ao3e` patterns |
| Listeners registered sync in SW | PASS | `onMessage` and `tabs.onUpdated.addListener` called without preceding await |

### Human Verification Required

**1. Side panel visual rendering**

**Test:** Load the extension in Chrome (`npm run dev`), navigate to https://web.whatsapp.com/, click the JRNY Copilot toolbar icon.
**Expected:** Side panel docks to the right of the tab. Shows the emerald/teal gradient square icon, "JRNY Copilot" heading, and "Extension active on WhatsApp Web." subtitle — all visibly styled with Tailwind utility classes (not unstyled HTML).
**Why human:** Visual appearance and browser side panel activation cannot be verified programmatically.

**2. Per-tab side panel enable/disable**

**Test:** After the above, navigate the same tab to https://example.com, click the toolbar icon.
**Expected:** The side panel does NOT open on non-WhatsApp tabs.
**Why human:** Requires live browser with the tabs.onUpdated listener actively firing.

**3. End-to-end chatDelta pipeline**

**Test:** With extension loaded, navigate to WhatsApp Web, sign in, open any chat. Inspect the service worker console at `chrome://extensions → JRNY Copilot → "service worker" → Inspect`.
**Expected:** SW console shows `[JRNY] service worker booted`, then within ~1s of chat activity: `[JRNY] chatDelta: N messages` followed by one line per message in format `  TIMESTAMP SENDER: TEXT`.
**Why human:** Requires live WhatsApp Web DOM with real message nodes for the MutationObserver to trigger.

**4. Dedupe on chat switch**

**Test:** After the above, switch to a different chat in the same tab.
**Expected:** SW console does NOT re-log messages already seen before the chat switch.
**Why human:** Requires observing SW log output across an interactive chat switch action.

### Gaps Summary

No functional gaps. All 4 requirements (INFRA-01 through INFRA-04) are fully implemented and wired in the codebase. Build artifacts are correct. The only unverified items are behavioral/visual tests requiring a live Chrome session with WhatsApp Web, which is expected for a browser extension at this stage.

---

_Verified: 2026-04-18T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
