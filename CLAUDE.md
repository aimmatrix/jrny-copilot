# JRNY Copilot — Claude Code Guide

## What This Project Is

Chrome MV3 extension (WXT framework) that reads WhatsApp Web group chat and surfaces AI-powered trip planning suggestions in a native side panel. Built for a 24-hour hackathon with live demo on real WhatsApp Web.

## Stack

- **Framework**: WXT (Manifest V3, file-based entrypoints)
- **UI**: React 19 + TypeScript + Tailwind v4 + shadcn/ui
- **State**: Zustand + `@wxt-dev/storage` (SW is ephemeral)
- **Messaging**: `@webext-core/messaging` (typed CS ↔ SW ↔ sidePanel)
- **AI**: z.AI API via `openai` SDK (OpenAI-compatible, `baseURL: https://api.z.ai/api/paas/v4`)
- **UI Surface**: `chrome.sidePanel` (NOT injected sidebar)

## Architecture Rules

1. **Content script is read-only** — never writes to the page, never auto-replies
2. **All network calls from the service worker** — content scripts cannot fetch (CORS)
3. **Side panel is the only UI surface** — no injected DOM elements
4. **No persistent chat storage** — chat text lives only in SW memory during processing
5. **ARIA-first selectors** — `[role="row"]`, `[aria-label]`, `data-*` — never hashed class names

## GSD Workflow

This project uses the GSD (Get Shit Done) planning system.

**Current state:** See `.planning/STATE.md`
**Roadmap:** See `.planning/ROADMAP.md`
**Requirements:** See `.planning/REQUIREMENTS.md`

### Phase Commands

```
/gsd-plan-phase 1    # Plan Phase 1: Extension Scaffold & DOM Reader
/gsd-plan-phase 2    # Plan Phase 2: AI Integration & Suggestions
/gsd-plan-phase 3    # Plan Phase 3: Side Panel UI Polish & Multi-turn Chat
```

Always run `/gsd-plan-phase N` before starting work on a phase.

## Key Constraints

- **Hackathon context**: Ship fast, demo well. Don't over-engineer.
- **Privacy**: No chat content leaves the browser except the AI API call (ephemerally)
- **WhatsApp ToS**: Extension is strictly read-only. Never send, mark-read, or automate.
- **API key**: Baked into build via env var (`.env.local` → `JRNY_Z_AI_KEY`). Not committed.
