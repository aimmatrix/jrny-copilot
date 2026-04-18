# Research Summary — JRNY Copilot

**Project:** JRNY Copilot — Chrome MV3 extension that overlays WhatsApp Web with an AI-powered group trip-planning assistant
**Synthesized:** 2026-04-18
**Overall confidence:** HIGH on framework/MV3 mechanics and competitive feature baseline; MEDIUM on WhatsApp DOM specifics and site-specific link parsing (inherently fragile domains).

---

## Recommended Stack (one-liner)

**WXT 0.20 (file-based MV3 framework) + React 19 + TypeScript + Tailwind v4 + shadcn/ui**, with a **read-only content script** on WhatsApp Web, a **service worker** as the sole network hub (z.AI via OpenAI SDK with `baseURL` override), an **offscreen document** for `DOMParser`-based link metadata extraction, and a **Chrome `sidePanel`** (not injected UI) as the primary user surface — state synced across contexts via `@wxt-dev/storage` + Zustand and typed messaging via `@webext-core/messaging`.

---

## Table Stakes Features

Must ship in v1 or the product feels incomplete:

- **WhatsApp Web chat ingestion** — MutationObserver-driven read of the active group thread (DOM-based, read-only)
- **Sidebar UI** — docked `chrome.sidePanel`, never auto-posts to chat
- **Trip intent extraction** — LLM turns messy multi-speaker chat into `{destinations, dates, travelers, budget, vibe}`
- **Link parser** — Airbnb (listing JSON/OG), Google Maps (lat/lng from URL), TikTok (official oEmbed), YouTube/Instagram (OG fallback)
- **Flight + stay surfacing** — 3–5 options per category with real prices and link-out (no in-app booking)
- **Day-by-day itinerary draft** — editable, with pinned places on a map
- **Shareable read-only link** — so non-desktop group members can view
- **Budget awareness** — per-person budget capture and filtering
- **BYOK onboarding** — user pastes their own z.AI key; stored encrypted locally
- **Privacy controls** — pause button, per-chat allowlist, activity indicator

---

## Key Architecture Decisions

1. **Side panel, not injected sidebar.** `chrome.sidePanel` (Chrome 114+) is a separate document — no Shadow DOM gymnastics, persists across tabs, pinnable. Ideal for "don't leave WhatsApp Web" UX.
2. **Content script is read-only and UI-free.** It observes DOM via MutationObserver, extracts `{dataId, sender, timestamp, text, urls[]}` per message, and forwards typed messages to the SW. No fetches, no React, no visible injection — this is also the ToS-safe posture.
3. **Service worker is the only network hub.** All z.AI calls and URL fetches happen here (MV3 CORS rules make this mandatory). State is ephemeral — SW dies after ~30s idle, so all persistence goes to `chrome.storage.local` (settings) or `chrome.storage.session` (active trip context, chat text during a debounce window).
4. **Offscreen document for HTML parsing.** SW has no `DOMParser`; spawn an offscreen doc with `reasons: ["DOM_PARSER"]` to extract OG tags / JSON-LD from fetched pages.
5. **Selector strategy layered by stability tier.** Tier 1 = ARIA (`[role="row"]`, `[aria-label="Message list"]`); Tier 2 = `data-id` / `data-pre-plain-text`; Tier 3 = structural classes; never hashed classes. Remote-updatable selector pack (fetched signed JSON as *data*, not code) enables fixes without Chrome Web Store review lag.

---

## Critical Pitfalls to Avoid

1. **Never automate WhatsApp** — read-only, user-initiated, on-device parsing only; frame as "assistant that works alongside WhatsApp Web," never "WhatsApp automation" (Meta actioned 131+ extensions in Oct 2025).
2. **Never bundle an API key** — BYOK model is non-negotiable for v1; encrypt at rest with user passphrase, decrypt only into `chrome.storage.session`.
3. **Never ship remote code** — prompts and configs as JSON *data* only; no `eval`, no `new Function`, no dynamic `import(url)`, strict CSP — or Chrome Web Store will reject.
4. **Never hardcode obfuscated class selectors** — WhatsApp rotates hashed classes on every deploy (~1–3 week cadence); rely on ARIA/`data-*` with a heuristic fallback and selector-health telemetry.
5. **Never concatenate raw chat into the LLM prompt** — wrap untrusted group-chat text in `<user_messages>` delimiters, force JSON-schema output, generate booking URLs yourself from a domain allowlist (prompt-injection defense).

---

## Build Order

Dependency-ordered phases; each is end-to-end demonstrable before the next starts.

**Phase 0 — Foundation & Scope.** Lock down ToS posture (read-only), privacy policy, BYOK decision, minimum-permissions manifest. *No code.* Everything downstream depends on these being right.

**Phase 1 — Skeleton (3-context plumbing).** WXT scaffold, MV3 manifest, content script ↔ SW ↔ side panel messaging round-trip with a "HELLO" echo. Validates the hardest MV3 plumbing first.

**Phase 2 — WhatsApp DOM reader.** Tier-1/2/3 selectors, MutationObserver with 500ms debounce, dedup by `dataId`, selector-health fingerprinting, health banner in side panel. De-risks the single most fragile component.

**Phase 3 — AI integration (dumb loop).** Options page for BYOK, encrypted storage, `callLLM()` in SW with JSON-schema output, system prompt with injection guards, side panel renders structured results. Product is now functional end-to-end (without URL enrichment).

**Phase 4 — URL enrichment (offscreen + fetch).** Offscreen DOM_PARSER, per-domain rate limits + circuit breaker, 10-min session cache, graceful degradation. Pure enhancement on a working pipeline.

**Phase 5 — Privacy controls & UX polish.** Pause button, per-chat allowlist, activity indicator, data-flow log, tokens-used counter. Now the user has everything needed to trust the product.

**Phase 6 — Resilience & release prep.** Remote-fetched signed selector pack, telemetry-free local error ring buffer, Chrome Web Store pre-submission audit (`grep eval`, permission justification, privacy policy URL, ToS-safe copy).

**Explicitly deferred to v2+:** booking flows, authentication/accounts, backend key proxy, trip history, cross-device sync, streaming LLM, non-Chrome browsers, iMessage/Telegram/Discord.

---

## Open Questions

Items that need phase-specific research before or during implementation:

- **Airbnb parsing robustness** — the embedded JSON-LD blob approach may break; need a monitoring + defensive-parsing strategy (research during Phase 4).
- **Google Places API vs. URL regex** — URL-only approach is free but gives coords without place metadata; budget trade-off to revisit when itinerary UI lands (Phase 4).
- **Flight/stay data source** — Duffel, Kiwi, and Skyscanner all have different pricing, coverage, and affiliate terms; needs a commercial/API evaluation before Phase 3 or Phase 4 depending on scope.
- **Implicit consensus detection** — NLP approach for "4 of 6 said Lisbon" is a differentiator but complexity is unclear; prototype needed to validate LLM can do this reliably from chat history (Phase 3 stretch).
- **Preference memory schema** — how to structure per-person, per-group profiles durably across trips without bloating `chrome.storage.local` (Phase 3–5 decision).
- **Remote selector-pack delivery** — requires a minimal backend (signed static JSON hosting); needs infra decision (Phase 6, but architect for it in Phase 2).
- **Selector maintenance cadence** — weekly build cycle assumption needs validation once live traffic reveals breakage frequency (Phase 6).
- **Streaming vs. non-streaming LLM** — v1 skips streaming, but if first-token latency hurts UX, revisit with `chrome.alarms` heartbeat to keep SW alive (Phase 3 or later).
- **Chat-mixed-language handling (Hinglish, Tamil, etc.)** — needs code-mixed fixture set for prompt testing (Phase 3).
- **Local-model fallback (Ollama)** — flagged as a privacy differentiator in pitfalls research; defer but keep the API surface abstract enough to enable later.
