# Requirements — JRNY Copilot

> **Context:** 24-hour hackathon. Live demo on real WhatsApp Web. Scope is ruthlessly cut to what ships and demos in time.

## v1 Requirements (Hackathon Demo)

### Extension Infrastructure
- [ ] **INFRA-01**: Chrome MV3 extension installs and activates automatically on `web.whatsapp.com`
- [ ] **INFRA-02**: Content script reads visible chat messages from the active WhatsApp Web conversation
- [ ] **INFRA-03**: Content script forwards messages to service worker via typed message protocol
- [ ] **INFRA-04**: Extension activates side panel on WhatsApp Web tab
- [ ] **INFRA-05**: z.AI API key configured via environment variable at build time (hardcoded for hackathon)

### AI & Intent Extraction
- [ ] **AI-01**: Service worker sends chat transcript to z.AI API with structured prompt
- [ ] **AI-02**: AI extracts structured trip intent: destination, approximate dates, group size, budget signals
- [ ] **AI-03**: AI produces a clean trip summary: "You're planning a trip to [X] for [N] people around [dates]"
- [ ] **AI-04**: AI surfaces what the group seems to have agreed on vs. still debating
- [ ] **AI-05**: User can type follow-up questions in the JRNY panel and get AI responses (multi-turn)

### Suggestions & Links
- [ ] **SUGG-01**: Panel displays curated flight suggestions as Skyscanner/Google Flights search links
- [ ] **SUGG-02**: Panel displays curated accommodation suggestions as Booking.com/Airbnb search links
- [ ] **SUGG-03**: Panel displays 2-3 activity/things-to-do suggestions with search links
- [ ] **SUGG-04**: Links open in new tab

### Side Panel UI
- [ ] **UI-01**: Side panel opens within WhatsApp Web Chrome tab
- [ ] **UI-02**: Panel shows JRNY branding header
- [ ] **UI-03**: Panel shows trip summary section (destination, dates, group size, budget)
- [ ] **UI-04**: Panel shows flight, hotel, and activity suggestion cards with links
- [ ] **UI-05**: Panel shows a chat input for multi-turn follow-up questions
- [ ] **UI-06**: Panel has a "Refresh / Re-analyze" button to re-read the chat

## v2 Requirements (Post-Hackathon)

- BYOK settings page (user enters their own z.AI API key)
- URL metadata extraction from shared Airbnb/TikTok/Maps links
- Robust WhatsApp DOM selector resilience (remote selector pack)
- Cost splitting feature
- Mobile keyboard integration
- Multi-platform support (Instagram, iMessage)
- Booking execution (direct API integration with flight/hotel providers)

## Out of Scope (v1)

- **Direct booking / payments** — link-out model only; removes regulatory complexity
- **BYOK settings UI** — hardcoded API key acceptable for 24h hackathon demo
- **URL content parsing** — text-only chat reading for v1; shared links treated as text
- **Selector resilience infrastructure** — hardcode best selectors; fix if WhatsApp breaks them
- **Multi-platform** — WhatsApp Web only; iMessage/Instagram are v2+
- **Cost splitting** — v2 feature
- **Analytics / telemetry** — not needed for demo
- **Privacy policy / compliance** — not needed for hackathon; required before public launch

## Traceability

| Requirement | Phase |
|-------------|-------|
| INFRA-01 to INFRA-04 | Phase 1: Extension Scaffold |
| INFRA-05, AI-01 to AI-05 | Phase 2: AI Integration |
| SUGG-01 to SUGG-04 | Phase 2: AI Integration |
| UI-01 to UI-06 | Phase 3: Side Panel UI |
