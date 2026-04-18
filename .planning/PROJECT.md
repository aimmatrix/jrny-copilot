# JRNY Copilot

## What This Is

JRNY Copilot is a Chrome browser extension that sits on top of WhatsApp Web, reading group chat conversations in real time to help friend groups plan trips. It extracts intent from messages and shared content (Airbnb links, TikToks, locations), surfaces curated destination and activity options with direct booking links, and transforms chaotic group chats into structured, actionable trip plans — without making anyone switch apps.

## Core Value

When friends share a TikTok or drop "we should go somewhere this summer," JRNY turns that chaos into a shortlist they can actually act on.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Chrome extension that overlays on WhatsApp Web
- [ ] Read and parse group chat conversation context
- [ ] Extract trip intent: destination hints, date preferences, budget signals
- [ ] Parse shared links (Airbnb, TikTok, Google Maps, Instagram) for destination context
- [ ] Identify consensus and disagreements within group
- [ ] Generate structured trip summary (destination, dates, group size, budget range)
- [ ] Surface curated flight options with links (Skyscanner, Google Flights)
- [ ] Surface curated accommodation options with links (Airbnb, Booking.com)
- [ ] Surface activity/itinerary suggestions with links
- [ ] Present options in a clean JRNY sidebar panel
- [ ] Allow group to react/vote on suggestions (within JRNY)

### Out of Scope

- Direct booking / payment processing — links out to provider, user books manually
- iMessage / Instagram / Android keyboard integration — v2 after validation
- Cost splitting — v2
- Mobile app — v2
- Multi-platform chat (Telegram, Discord) — post-v1

## Context

- **Integration approach**: Chrome extension on WhatsApp Web — fastest to ship, no App Store approval needed, real access to DOM
- **AI backend**: z.AI API — handles conversation understanding, intent extraction, content parsing
- **Shared content parsing**: TikToks, Airbnb links, Google Maps pins, Instagram posts are signals that indicate destination interest
- **Target scenario**: 3-8 friends in a WhatsApp group with a vague "we should do something" thread — JRNY converts that into an actionable trip shortlist
- **Booking model**: JRNY is the discovery and coordination layer; actual booking happens on provider sites via affiliate or direct links

## Constraints

- **Platform**: Chrome extension (Manifest V3) — WhatsApp Web only for v1
- **AI**: z.AI API — all conversation analysis and suggestion generation routes through this
- **No server-side chat storage**: Privacy-sensitive — chat content processed client-side or ephemerally; no persistent storage of message content
- **No payments**: Out of scope for v1 — link-out model only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser extension over mobile keyboard | Fastest path to ship; no App Store approval; WhatsApp Web has large user base | — Pending |
| Single use case (trip planning) first | Nail one flow before expanding — avoid shallow coverage of many scenarios | — Pending |
| Link-out model (no booking) | Removes regulatory, payment, and partnership complexity from v1 | — Pending |
| z.AI API for AI | User preference; handles conversation understanding and suggestions | — Pending |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-18 after initialization*
