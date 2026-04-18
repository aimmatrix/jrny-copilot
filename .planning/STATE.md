# STATE — JRNY Copilot

## Project Reference
- **Project**: JRNY Copilot — Chrome MV3 extension overlaying WhatsApp Web with AI-powered group trip planning
- **Core Value**: Turn chaotic group chats ("we should go somewhere this summer") into an actionable trip shortlist without leaving WhatsApp Web
- **Current Focus**: Phase 1 — Extension Scaffold & DOM Reader (MV3 plumbing + MutationObserver-driven chat ingestion)
- **Stack**: WXT 0.20 + React 19 + TypeScript + Tailwind v4 + shadcn/ui; z.AI via OpenAI SDK with `baseURL` override; `@webext-core/messaging` for typed CS ↔ SW ↔ sidePanel; `@wxt-dev/storage` + Zustand for state

## Current Position
- **Phase**: 1 — Extension Scaffold & DOM Reader
- **Plan**: none yet (run `/gsd-plan-phase 1`)
- **Status**: Not started
- **Progress**: `[░░░░░░░░░░] 0/3 phases complete`

## Performance Metrics
- Phases complete: 0/3
- Plans complete: 0/0
- Requirements delivered: 0/20
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

### Todos
- [ ] Run `/gsd-plan-phase 1` to decompose Phase 1 into executable plans

### Blockers
- None.

### Risks / Open Items
- WhatsApp DOM selector fragility — rely on ARIA/`data-*`, accept manual fix if demo breaks day-of.
- z.AI latency on large transcripts — may need transcript windowing in Phase 2.
- URL content parsing deferred to v2 — shared links treated as raw text for v1.

## Session Continuity
- **Last session**: 2026-04-18 — roadmap created (3 phases, 100% coverage).
- **Next session**: start Phase 1 planning (`/gsd-plan-phase 1`).
- **Files of record**:
  - `.planning/PROJECT.md`
  - `.planning/REQUIREMENTS.md`
  - `.planning/ROADMAP.md`
  - `.planning/research/SUMMARY.md`
  - `.planning/config.json`

---
*Last updated: 2026-04-18 at roadmap creation*
