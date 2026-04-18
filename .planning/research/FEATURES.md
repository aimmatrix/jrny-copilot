# Features Research — JRNY Copilot

**Domain:** AI-assisted group trip planning (Chrome extension on WhatsApp Web)
**Researched:** 2026-04-18
**Confidence:** MEDIUM-HIGH (ecosystem well-documented, WhatsApp-specific placement is novel)

## Executive Summary

The AI travel planning market in 2026 has converged on a predictable feature baseline: conversational itinerary generation, map views, flight/hotel surfacing, and shared editing. Competitors (Layla, Mindtrip, Wanderlog, TripIt, GuideGeek, Vacay, Troupe, Plan Harmony) all ship most of these. Where they consistently fail — and where JRNY's WhatsApp placement creates unique leverage — is at the **pre-itinerary stage**: destination convergence, date alignment, and turning ambient chat chaos into structured intent.

The pain point is well-documented: "47 unread messages, three competing spreadsheets, and one person doing all the actual work." JRNY's insight is that groups already decide in WhatsApp — they don't want to migrate. Every competitor requires migration to a new app/workspace. That's the wedge.

V1 should therefore focus on features that only work because JRNY lives inside the group chat: context extraction, link parsing, silent-ambient presence, and decision surfacing. Full itinerary generation and booking flows are table stakes to meet, not differentiators to win on.

---

## Table Stakes (must-have or users leave)

Features users already expect from any AI travel tool in 2026. Shipping without these signals "incomplete product."

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Natural-language trip intent capture** | Every AI planner does this; it's the price of entry | Low-Med | Must handle WhatsApp's messy/multi-speaker chat, not just clean prompts |
| **Destination + date suggestions** | Baseline output of Layla, GuideGeek, Vacay, Mindtrip | Low | LLM call with structured output |
| **Flight search with real prices** | Layla, Kayak, Google Travel all show live prices; static suggestions feel broken | Med-High | Requires Duffel/Kiwi/Skyscanner API or scraping; live pricing is hard |
| **Hotel/stay search with real prices** | Same as flights; Airbnb + Booking.com baseline | Med-High | Airbnb has no public API — scraping or affiliate workarounds needed |
| **Day-by-day itinerary view** | Every planner (Wanderlog, Mindtrip, Layla) ships this | Low-Med | Timeline UI in sidebar |
| **Map view with pinned places** | Wanderlog, Mindtrip, Google Travel; users expect geographic context | Med | Mapbox/Google Maps embed; pins for stays, activities, restaurants |
| **Shared visibility across group** | Core promise of group planning; Wanderlog, Troupe, Plan Harmony all share state | Low (WhatsApp context) | Inherent to WA placement — everyone already sees the chat |
| **Link-out booking (no in-app purchase)** | Layla, Kayak, Mindtrip all link out; v1 scope confirms this | Low | Affiliate links are bonus; correctness of destination URL matters |
| **Link parsing (Airbnb, Maps, YouTube)** | Mindtrip's "Start Anywhere" feature; users already paste these | Med | oEmbed + scraping; Airbnb/TikTok are fragile |
| **Budget awareness** | Layla, Plan Harmony, Wanderlog track budgets; friend groups bring this up unprompted | Low-Med | Per-person budget capture + filter on results |
| **Export / save itinerary** | TripIt's whole value prop; table stakes for "real" trips | Low | PDF, calendar .ics, or shareable link |
| **Works on mobile-equivalent surface** | WA Web users often also use WA mobile; missing mobile parity is a hole | — | Acknowledge: v1 is desktop-only via extension; flag as known gap |

---

## Differentiators (competitive advantage — features only JRNY can ship well)

These exploit the WhatsApp-native placement. No non-extension competitor can replicate them without friction.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Ambient chat intent extraction** | JRNY reads the existing chat — no "start a new trip" step. Zero migration cost. | High | LLM + chat-segmentation; the core moat. Needs to know when "we should go to Lisbon lol" becomes serious intent. |
| **Link unfurling in-place** | TikTok/Airbnb/Reels dropped in chat get auto-parsed into structured options in the sidebar | Med-High | TikTok has no official oEmbed for location metadata; needs LLM-vision or transcript parse. Airbnb listing scrape. |
| **Surfacing consensus from chat** | "4 of 6 people said Lisbon, 2 said Porto" — extract implicit votes without explicit polls | High | NLP on chat history; this is what Troupe does with explicit polls, JRNY does implicitly. Differentiator on friction. |
| **Friction-free invite (none)** | Everyone in the WA group is already "invited." Competitors lose 30-50% of group members at account-creation. | Low (inherent) | This is the structural advantage; call it out in UX copy. |
| **Quiet mode / ambient presence** | JRNY posts to sidebar, not chat — avoids chat spam. Can summon with @mention or keyword. | Low-Med | Important for not annoying the group; failure mode is over-posting. |
| **Group preference memory** | Remembers "Sam hates early flights, Priya is vegan, Jake's budget is $800" across trips | Med | Per-person profile built from chat history; durable across trips the group plans. |
| **Trip reconciliation across threads** | Groups often plan across multiple WA groups (couples + the main group). JRNY can stitch context. | High | Later-stage; v2 probably. Flag as powerful differentiator later. |
| **One-click "convert this thread to trip"** | Transforms 200 messages of chaos into a structured draft in the sidebar | Med | Summary + extraction; the "wow" demo moment. |
| **Decision surfacing** | "You haven't agreed on dates. Poll: May 10-15 vs May 17-22?" prompts, posted only to sidebar | Med | Helps groups unblock themselves; Troupe does this with explicit flows, JRNY does it reactively. |
| **Cost-split preview (not tracking)** | "If you book this Airbnb + flights, it's ~$850/person" — before booking, not after | Low | Splitwise does after-the-fact. Doing it pre-commit is more decision-useful. |

---

## Anti-Features (deliberately NOT build)

Features common in the category that would dilute focus, violate the "link-out only" v1 scope, or hurt the WA-native experience.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **In-app booking / payments** | V1 scope explicitly excludes; booking liability, PCI, customer service are massive | Link out; affiliate when possible |
| **Post-trip expense tracking** | Splitwise owns this; duplicates scope; v1 is planning only | Link out to Splitwise; or do pre-trip cost preview only |
| **Real-time chat UI in the sidebar** | Group is already chatting in WhatsApp — a second chat splits attention | Sidebar is a structured dashboard, not a chat |
| **Posting to the group chat by default** | Bots spamming WA groups get muted or kicked fast | Ambient sidebar; only post when explicitly invoked |
| **Trip journaling / photo logs / post-trip features** | Wanderlog does this; v1 is pre-trip only. Scope creep. | Defer; v2+ question |
| **Social feed / public trip sharing** | Not the job-to-be-done; private groups are the users | Keep it private by default |
| **Non-WhatsApp platforms for v1** | iMessage, Discord, Telegram all plausible — but ship one channel well first | Validate WA wedge before expanding |
| **Explicit polls/voting UI** | Troupe's whole thing; adds friction; groups will just debate in chat anyway | Surface implicit consensus from chat instead |
| **"Travel agent" human handoff** | Some competitors (Layla premium) do this; it's a different business model | Stay software-only |
| **Full AI-generated "surprise me" trips** | Feels gimmicky; group trips require group buy-in, not surprises | Always show options, let group pick |
| **TripIt-style email forwarding for confirmations** | TripIt owns this; doesn't fit the pre-booking use case | Link out to TripIt if users want this |
| **Calendar integration (v1)** | Nice-to-have; adds auth complexity; not core to group decision-making | Defer; add Google Cal export after v1 |

---

## Feature Dependencies

```
Chat ingestion (read WA Web DOM)
   │
   ├─► Intent extraction (LLM)
   │      │
   │      ├─► Destination/date suggestion
   │      │      │
   │      │      └─► Flight + hotel search (APIs)
   │      │             │
   │      │             └─► Day-by-day itinerary
   │      │                    │
   │      │                    ├─► Map view
   │      │                    └─► Cost-split preview
   │      │
   │      └─► Consensus detection
   │             │
   │             └─► Decision surfacing / nudges
   │
   └─► Link parsing (Airbnb, TikTok, Maps, YouTube)
          │
          └─► Enriched option cards (merge with search results)

Preference memory (per-person)
   │
   └─► Personalized filtering (flights, hotels, activities)
         [depends on: chat ingestion + longitudinal storage]

Export (PDF / .ics / share link)
   [depends on: itinerary exists]
```

**Critical path for v1:** Chat ingestion → Intent extraction → Flight/hotel surfacing → Sidebar UI. Everything else is optional or enhances these.

**Forkable:** Link parsing can ship independently of intent extraction (users paste a TikTok → JRNY surfaces a card). This is a good "demoable wedge" early in development.

---

## V1 Recommendation

Given the constraints (trip planning only, link-out model, 3-8 person friend groups, Chrome extension on WA Web), V1 should nail a tight loop that's demoable in 60 seconds:

### V1 Must-Ship (8 features)

1. **WA Web chat ingestion** — read the active group thread's recent messages (DOM-based)
2. **Sidebar UI** — docked panel, never posts to chat by default
3. **Trip intent extraction** — "summon" button or ambient detection turns chat into `{destination(s), dates, travelers, budget, vibe}`
4. **Link parser** — Airbnb (listing scrape), Google Maps (place extract), TikTok (title + description, location if present), YouTube (title + description)
5. **Flight surfacing** — via Duffel or Kiwi API; 3-5 options with link-out
6. **Stay surfacing** — Booking.com affiliate + Airbnb links extracted from chat; surface as cards
7. **Day-by-day itinerary draft** — lightweight, editable, with pinned places on a map
8. **Shareable link** — read-only URL to view itinerary outside extension (for group members not on desktop)

### V1 Stretch (if time permits)

- Implicit consensus surfacing ("4 of 6 mentioned Lisbon")
- Preference memory (per-person, per-group)
- Cost-split preview ("~$850/person total")
- Export to .ics or PDF

### V1 Explicitly Out

- Booking flows, payments, refund handling
- Post-trip features (journal, photos, expense reconciliation)
- Non-Chrome browsers, WA mobile, iMessage/Discord/Telegram
- Explicit voting/polling UI
- Email digests, push notifications, native mobile app

### Why This Subset

- **Demonstrates the wedge** (WA-native, zero-friction) within 60 seconds of first use
- **Avoids commodity competition** on booking UX where Kayak/Google/Layla win
- **Keeps data/API surface small** enough to ship in 6-10 weeks
- **Table-stakes parity** on itinerary/map/flight surfacing so users don't bounce
- **Has one clear differentiator visible in v1** (link parsing + chat ingestion combined — nobody else can do this without living inside WA)

### V1 Success Metric (suggested)

"Group goes from chaotic WhatsApp thread → shared, editable itinerary with real flight+stay prices in under 5 minutes, without any group member creating an account." If this works, the moat is real.

---

## Sources

- [Wanderlog travel planner](https://wanderlog.com/) — HIGH confidence, official
- [Wanderlog group trip planning features](https://www.whistleout.com/CellPhones/Guides/wanderlog-group-trip-planning-app) — MED confidence, review site
- [Layla AI travel planner](https://layla.ai/) — HIGH confidence, official
- [Layla AI review](https://aitravel.tools/layla-ai-review/) — MED confidence
- [TripIt itinerary features](https://www.tripit.com/web) — HIGH confidence, official
- [TripIt review 2026](https://www.going.com/guides/tripit-review) — MED confidence
- [5 best group travel planning apps (TripIt blog)](https://www.tripit.com/web/blog/travel-tips/best-group-travel-planning-app) — MED confidence, vendor blog
- [Plan Harmony group trip planner](https://www.planharmony.com/group-trip-planning/) — HIGH confidence, official
- [Troupe group trip planner](https://www.troupe.com/group-travel/group-trip-planner-app/) — HIGH confidence, official
- [SquadTrip: best tools for group trip planning 2026](https://squadtrip.com/guides/best-tools-for-group-trip-planning/) — MED confidence
- [Best group vacation cost splitting apps 2026 (AvantStay)](https://avantstay.com/blog/best-apps-planning-splitting-costs-group-vacation/) — MED confidence
- [Vacay Chatbot](https://www.usevacay.com/chatbot) — HIGH confidence, official
- [Mindtrip AI trip planner](https://mindtrip.ai) — HIGH confidence, official
- [Mindtrip launch coverage (PhocusWire)](https://www.phocuswire.com/mindtrip-ai-trip-planner-travel-startup) — MED confidence, trade press
- [GuideGeek](https://guidegeek.com/) — HIGH confidence, official
- [Best AI travel planners 2026 comparison](https://blog.searchspot.ai/comparing-best-ai-travel-planners-2026/) — MED confidence
- [AI travel planning 2026 tools & strategies](https://siliconvalleytime.com/travel/ai-assisted-trip-planning-2026-digital-nomads/) — LOW-MED confidence
- [KAYAK flight/hotel aggregation](https://www.kayak.com/) — HIGH confidence, official
- [Best AI tools to search flights and hotels together 2026](https://stardrift.ai/resources/ai-tools-consolidate-flight-hotel-search) — MED confidence
- [Making plans in a group chat (design case study)](https://medium.com/design-diary-nikita-singh-gautam/making-plans-in-a-group-chat-124407093d79) — MED confidence, qualitative UX research
- [European summer road trip without group chat chaos (Pin Drop)](https://pindrop.it/blog/european-summer-road-trip-2026-planning) — MED confidence, qualitative pain points
