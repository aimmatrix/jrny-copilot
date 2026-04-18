# STATE — JRNY Copilot

## Project Reference
- **Project**: JRNY Copilot — Chrome MV3 extension overlaying WhatsApp Web with AI-powered group trip planning
- **Core Value**: Turn chaotic group chats ("we should go somewhere this summer") into an actionable trip shortlist without leaving WhatsApp Web
- **Current Focus**: Phase 2 — AI Integration & Suggestions (z.AI integration + side panel UI)
- **Stack**: WXT 0.20.25 + React 19 + TypeScript + Tailwind v4 + shadcn/ui; z.AI via OpenAI SDK with `baseURL` override; `@webext-core/messaging` for typed CS ↔ SW ↔ sidePanel; `@wxt-dev/storage` + Zustand for state

## Current Position
- **Phase**: 2 — AI Integration & Suggestions
- **Plan**: 0/4 executed (4 plans planned and verified)
- **Status**: Phase 2 planned — 4 plans verified; ready to execute
- **Progress**: `[███░░░░░░░] 1/3 phases complete (Phase 2 ready to execute)`

## Performance Metrics
- Phases complete: 1/3 (Phase 1 done)
- Plans complete: 2/? (Phase 1 Plans 1+2 done)
- Requirements delivered: INFRA-01, INFRA-02, INFRA-03, INFRA-04
- Time budget: 24h hackathon

## Accumulated Context

### Decisions
- **Browser extension over mobile keyboard** — fastest path to demo, no App Store review, real DOM access on WhatsApp Web.
- **Side panel, not injected sidebar** — `chrome.sidePanel` (Chrome 114+) avoids Shadow DOM gymnastics, persists across tabs, ToS-safer than in-page UI.
- **Read-only, UI-free content script** — MutationObserver extracts `{dataId, sender, timestamp, text, urls[]}` and forwards typed messages to the SW. No fetches, no React in CS, no auto-posting to chat.
- **Service worker is the only network hub** — MV3 CORS requires it; all z.AI calls happen here.
- **Hardcoded z.AI key at build time** — acceptable for 24h hackathon demo (BYOK deferred to v2).
- **Link-out model only** — no in-app booking; removes regulatory / payment / partnership complexity.
- **Tiered selector strategy** — Tier 1 ARIA, Tier 2 `data-*`, Tier 3 structural classes; never hashed classes (WhatsApp rotates them).
- **Coarse granularity, 3 phases** — matches the hackathon build order: skeleton + DOM reader, AI + suggestions, UI polish.
- **WXT @ alias maps to repo root** — WXT 0.20.25 hard-codes `@: srcDir` (root); shared modules live at root-level `lib/`, `messaging/`, `types/` (not `src/`). Plan 02+ must follow this convention.
- **No popup entrypoint** — WXT React template popup deleted; `default_popup` in manifest breaks `openPanelOnActionClick` for sidePanel.

### Todos
- [x] Plan 02: implement WhatsApp DOM reader in `entrypoints/content.ts`
- [x] Plan 02: wire `sendMessage('chatDelta', ...)` from content script
- [x] Phase 2: plan z.AI integration (4 plans verified, ready to execute)
- [ ] Phase 2: execute plans — install openai SDK, wire chatDelta → AI call → side panel UI

### Blockers
- None.

### Risks / Open Items
- WhatsApp DOM selector fragility — rely on ARIA/`data-*`, accept manual fix if demo breaks day-of.
- z.AI latency on large transcripts — may need transcript windowing in Phase 2.
- URL content parsing deferred to v2 — shared links treated as raw text for v1.
- Smoke test (manual): `npm run dev` → Chrome → WhatsApp Web → icon click → side panel. Not yet performed.

## Session Continuity
- **Last session**: 2026-04-18 — Phase 2 planning complete. 4 plans verified by plan-checker: env-and-install (Wave 0), types-and-lib (Wave 1), sw-handler (Wave 2), sidepanel-ui (Wave 3).
- **Next session**: Phase 2 execution — run `/gsd-execute-phase 2`.
- **Files of record**:
  - `.planning/PROJECT.md`
  - `.planning/REQUIREMENTS.md`
  - `.planning/ROADMAP.md`
  - `.planning/phases/01-extension-scaffold-and-dom-reader/01-PLAN-scaffold-SUMMARY.md`
  - `.planning/phases/01-extension-scaffold-and-dom-reader/01-PLAN-dom-reader-SUMMARY.md`
  - `entrypoints/background.ts`
  - `entrypoints/content.ts`
  - `entrypoints/sidepanel/`
  - `messaging/protocol.ts`
  - `types/message.ts`
  - `whatsapp/selectors.ts`
  - `whatsapp/extractor.ts`
  - `whatsapp/observer.ts`
  - `wxt.config.ts`

---
*Last updated: 2026-04-18 — Plan 01-02 complete (Phase 1 done)*
