# Roadmap — JRNY Copilot

> **Context:** 24-hour hackathon with live demo on real WhatsApp Web. Coarse granularity (3 phases). Each phase must be end-to-end demonstrable before the next begins.

**Granularity:** coarse
**Phases:** 3
**Coverage:** 20/20 v1 requirements mapped

---

## Phases

- [~] **Phase 1: Extension Scaffold & DOM Reader** - MV3 extension installs, side panel opens on WhatsApp Web, content script reads messages and forwards them to the service worker (Plan 1 complete — scaffold + side panel shell done)
- [ ] **Phase 2: AI Integration & Suggestions** - Service worker calls z.AI with structured prompts, produces trip intent + summary + consensus view, and surfaces flight/stay/activity link cards
- [ ] **Phase 3: Side Panel UI Polish & Multi-turn Chat** - Branded side panel renders trip summary, suggestion cards, multi-turn follow-up chat, and a manual re-analyze control for the live demo

---

## Phase Details

### Phase 1: Extension Scaffold & DOM Reader
**Goal**: A working MV3 extension that auto-activates on WhatsApp Web, opens a side panel, and pipes live chat messages from the page into the service worker over a typed message protocol.
**Depends on**: Nothing (foundation)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. User loads `web.whatsapp.com` and the JRNY extension is active on that tab (no manual toggle required for the demo).
  2. User clicks the extension action and a Chrome side panel opens docked to the WhatsApp Web tab.
  3. Content script reads visible messages from the active group thread via tiered ARIA / `data-*` selectors with a MutationObserver debounce and dedupes by message id.
  4. Service worker receives structured `{sender, timestamp, text, urls[]}` payloads from the content script over a typed `@webext-core/messaging` channel and logs them.
**Plans**: Plan 1 (01-PLAN-scaffold.md) — DONE. Plan 2 (DOM reader) — TBD.
**UI hint**: yes

### Phase 2: AI Integration & Suggestions
**Goal**: Given a parsed transcript from Phase 1, produce a structured trip plan from z.AI (destination, dates, group size, budget, consensus vs. debated) and surface curated flight/stay/activity search links to the side panel.
**Depends on**: Phase 1
**Requirements**: INFRA-05, AI-01, AI-02, AI-03, AI-04, AI-05, SUGG-01, SUGG-02, SUGG-03, SUGG-04
**Success Criteria** (what must be TRUE):
  1. z.AI API key is wired at build time (env var baked into the WXT build) and the service worker can successfully call the z.AI OpenAI-compatible endpoint with the live transcript.
  2. A single round-trip returns a JSON-schema response containing trip intent (`{destination, dates, travelers, budget}`), a human-readable one-line summary, and a consensus/debated breakdown.
  3. The side panel renders flight, accommodation, and 2-3 activity suggestion cards whose links deep-link into Skyscanner/Google Flights, Booking.com/Airbnb, and Google search — all opening in new tabs.
  4. User can type a follow-up question in the panel and receive a multi-turn AI response grounded in the current trip context.
**Plans**: TBD

### Phase 3: Side Panel UI Polish & Multi-turn Chat
**Goal**: Ship a demo-worthy JRNY side panel: branded header, trip summary section, suggestion cards, chat input for follow-ups, and a manual re-analyze button — all styled with Tailwind v4 + shadcn/ui and ready for the live hackathon walkthrough.
**Depends on**: Phase 2
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. Side panel opens inside the WhatsApp Web Chrome tab with JRNY branding visible at the top (logo + name).
  2. Panel surfaces a trip summary section showing destination, dates, group size, and budget extracted by the AI.
  3. Panel shows flight, hotel, and activity suggestion cards with working deep-link CTAs styled via shadcn/ui.
  4. Panel exposes a chat input for multi-turn follow-up questions with visible conversation history.
  5. Panel has a visible "Refresh / Re-analyze" button that re-reads the current WhatsApp thread and triggers a fresh AI pass on demand.
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Extension Scaffold & DOM Reader | 1/2 | In progress | - |
| 2. AI Integration & Suggestions | 0/0 | Not started | - |
| 3. Side Panel UI Polish & Multi-turn Chat | 0/0 | Not started | - |

---

## Coverage Map

| Requirement | Phase |
|-------------|-------|
| INFRA-01 | Phase 1 |
| INFRA-02 | Phase 1 |
| INFRA-03 | Phase 1 |
| INFRA-04 | Phase 1 |
| INFRA-05 | Phase 2 |
| AI-01 | Phase 2 |
| AI-02 | Phase 2 |
| AI-03 | Phase 2 |
| AI-04 | Phase 2 |
| AI-05 | Phase 2 |
| SUGG-01 | Phase 2 |
| SUGG-02 | Phase 2 |
| SUGG-03 | Phase 2 |
| SUGG-04 | Phase 2 |
| UI-01 | Phase 3 |
| UI-02 | Phase 3 |
| UI-03 | Phase 3 |
| UI-04 | Phase 3 |
| UI-05 | Phase 3 |
| UI-06 | Phase 3 |

**Mapped:** 20/20 v1 requirements. No orphans, no duplicates.

---
*Last updated: 2026-04-18 at roadmap creation*
