---
phase: 02-ai-integration-and-suggestions
plan: "01"
type: execute
wave: 0
depends_on: []
files_modified:
  - wxt.config.ts
  - .env.local
autonomous: true
requirements:
  - INFRA-05

must_haves:
  truths:
    - "JRNY_Z_AI_KEY is accessible as import.meta.env.JRNY_Z_AI_KEY in the service worker at runtime (non-undefined)"
    - "openai@6.34.0 is installed and resolvable from node_modules"
    - "The WXT build does not fail when JRNY_Z_AI_KEY is set in .env.local"
  artifacts:
    - path: "wxt.config.ts"
      provides: "envPrefix configuration allowing JRNY_ prefix"
      contains: "envPrefix: ['WXT_', 'JRNY_']"
    - path: ".env.local"
      provides: "Local API key for development"
      contains: "JRNY_Z_AI_KEY="
    - path: "node_modules/openai"
      provides: "OpenAI-compatible SDK for z.AI calls"
  key_links:
    - from: ".env.local"
      to: "wxt.config.ts envPrefix"
      via: "Vite env var exposure at build time"
      pattern: "JRNY_Z_AI_KEY"
    - from: "wxt.config.ts"
      to: "entrypoints/background.ts"
      via: "import.meta.env.JRNY_Z_AI_KEY at runtime"
      pattern: "import\\.meta\\.env\\.JRNY_Z_AI_KEY"
---

<objective>
Install the openai SDK and fix the WXT env var prefix so JRNY_Z_AI_KEY is accessible inside the service worker at build time.

Purpose: Without this fix, import.meta.env.JRNY_Z_AI_KEY is undefined at runtime (Vite only exposes WXT_/VITE_ prefixes by default). This is a silent failure that causes a 401 on every AI call. This plan unblocks Wave 1 (lib modules) and Wave 2 (SW handlers).

Output: wxt.config.ts updated with envPrefix, openai@6.34.0 installed, .env.local template created with placeholder.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/ammad/Documents/agently /.planning/ROADMAP.md
@/Users/ammad/Documents/agently /.planning/REQUIREMENTS.md

<interfaces>
<!-- Current wxt.config.ts vite block (lines 19-21): -->
```typescript
vite: () => ({
  plugins: [tailwindcss()],
}),
```
<!-- After fix, must become: -->
```typescript
vite: () => ({
  plugins: [tailwindcss()],
  envPrefix: ['WXT_', 'JRNY_'],
}),
```
<!-- Access in SW after fix: -->
```typescript
import.meta.env.JRNY_Z_AI_KEY  // string | undefined — defined when .env.local is present
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install openai SDK and add envPrefix to wxt.config.ts</name>
  <files>wxt.config.ts, package.json, package-lock.json</files>
  <read_first>
    - /Users/ammad/Documents/agently /wxt.config.ts — read full file before editing; must preserve all existing fields (modules, manifest, vite plugins)
  </read_first>
  <action>
Step 1 — Install openai SDK:
```bash
cd "/Users/ammad/Documents/agently " && npm install openai@6.34.0
```
Verify: `npm list openai` must show `openai@6.34.0`.

Step 2 — Edit wxt.config.ts. The vite() block at lines 19-21 currently reads:
```typescript
vite: () => ({
  plugins: [tailwindcss()],
}),
```
Change it to:
```typescript
vite: () => ({
  plugins: [tailwindcss()],
  envPrefix: ['WXT_', 'JRNY_'],
}),
```
All other fields in the file (modules, manifest, permissions, host_permissions, action, side_panel) MUST remain unchanged.

Do NOT add any other changes to wxt.config.ts.
  </action>
  <verify>
    <automated>cd "/Users/ammad/Documents/agently " && npm list openai 2>&1 | grep "openai@6" && grep "envPrefix" wxt.config.ts</automated>
  </verify>
  <done>
    - `npm list openai` shows `openai@6.34.0`
    - `grep envPrefix wxt.config.ts` returns `envPrefix: ['WXT_', 'JRNY_']`
    - wxt.config.ts still has modules, manifest, permissions, and tailwindcss() plugin intact
  </done>
</task>

<task type="auto">
  <name>Task 2: Create .env.local template with JRNY_Z_AI_KEY placeholder</name>
  <files>.env.local</files>
  <read_first>
    - /Users/ammad/Documents/agently /.gitignore — confirm .env.local is already gitignored before creating it (do not commit secrets)
  </read_first>
  <action>
Step 1 — Check .gitignore contains `.env.local` (it should from WXT scaffold). If not present, add it.

Step 2 — Create `.env.local` at the repo root with this exact content:
```
# Local development secrets — NOT committed to git
# Replace with your actual z.AI API key from https://bigmodel.cn/usercenter/apikeys
JRNY_Z_AI_KEY=your-z-ai-key-here
```

The file must NOT be committed. The key value `your-z-ai-key-here` is a placeholder — the developer replaces it before running the extension.

Step 3 — Add a boot-time guard in `entrypoints/background.ts` inside the `main()` function, immediately after the existing `chrome.sidePanel.setPanelBehavior(...)` call and before the `chatDelta` handler:
```typescript
// Guard: warn if API key is missing at boot
if (!import.meta.env.JRNY_Z_AI_KEY) {
  console.error('[JRNY] JRNY_Z_AI_KEY is missing — AI calls will fail. Set it in .env.local');
}
```
The guard goes inside `main()`, after line 11 (the `.catch` on setPanelBehavior), before the tabs.onUpdated listener.
  </action>
  <verify>
    <automated>cd "/Users/ammad/Documents/agently " && test -f .env.local && grep "JRNY_Z_AI_KEY" .env.local && grep "JRNY_Z_AI_KEY" entrypoints/background.ts</automated>
  </verify>
  <done>
    - `.env.local` exists with `JRNY_Z_AI_KEY=your-z-ai-key-here`
    - `entrypoints/background.ts` contains `import.meta.env.JRNY_Z_AI_KEY` guard inside `main()`
    - `.env.local` does not appear in `git status` as a tracked file (gitignored)
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| .env.local → build bundle | JRNY_Z_AI_KEY baked into SW bundle at build time; never reaches content script |
| SW bundle → page JS | SW context is isolated from page JavaScript; key not inspectable by WhatsApp Web page |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Information Disclosure | JRNY_Z_AI_KEY in wxt.config.ts | mitigate | Key lives in .env.local (gitignored), NOT hardcoded in wxt.config.ts. envPrefix only controls Vite exposure — key value never appears in config file. |
| T-02-02 | Information Disclosure | JRNY_Z_AI_KEY in content script bundle | mitigate | content.ts does NOT import from @/lib/ai-client or reference JRNY_Z_AI_KEY. Key is only baked into background.ts (SW) bundle, which page JS cannot access. |
| T-02-03 | Information Disclosure | .env.local committed to git | mitigate | .gitignore must contain `.env.local`. Task 2 verifies gitignore before creating file. |
</threat_model>

<verification>
After both tasks complete:
1. `npm list openai` → `openai@6.34.0`
2. `grep "envPrefix" wxt.config.ts` → `envPrefix: ['WXT_', 'JRNY_']`
3. `grep "JRNY_Z_AI_KEY" .env.local` → line with placeholder key
4. `grep "JRNY_Z_AI_KEY" entrypoints/background.ts` → boot guard present
5. `git status` does not list `.env.local` as an untracked/tracked file (it is gitignored)
6. `cd "/Users/ammad/Documents/agently " && npm run build` or `npm run dev` exits without TypeScript errors related to envPrefix or openai import
</verification>

<success_criteria>
- openai@6.34.0 is in node_modules
- wxt.config.ts vite() block contains `envPrefix: ['WXT_', 'JRNY_']`
- .env.local exists with JRNY_Z_AI_KEY placeholder (gitignored)
- background.ts has boot-time guard checking import.meta.env.JRNY_Z_AI_KEY
- No regressions to existing build (tailwind, manifest unchanged)
</success_criteria>

<output>
After completion, create `/Users/ammad/Documents/agently /.planning/phases/02-ai-integration-and-suggestions/02-01-SUMMARY.md` using the summary template.
</output>
