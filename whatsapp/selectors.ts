/**
 * Selector tiers — most stable first.
 *
 * Tier 1 (ARIA / a11y): HIGH stability. WhatsApp preserves these for screen readers.
 * Tier 2 (data-*): MEDIUM-HIGH. `data-id` schema `false_<chat>@s.whatsapp.net_<msg>`
 *   rarely changes; `data-testid` present on some builds.
 * Tier 3 (structural classes .copyable-text / .selectable-text): MEDIUM.
 *   Historically stable for years but not guaranteed across WhatsApp deploys.
 * Tier 4 (hashed classes — short random suffixes): NEVER USE — rotates on every deploy.
 *
 * Source: .planning/research/ARCHITECTURE.md "WhatsApp Web DOM Strategy"
 * Source: .planning/phases/01-extension-scaffold-and-dom-reader/01-RESEARCH.md Pattern 6
 */
export const CHAT_PANE_SELECTORS = [
  '[aria-label="Message list"]',                    // tier 1 (a11y, English locale)
  '[data-testid="conversation-panel-messages"]',    // tier 2
  '#main [role="application"]',                     // tier 1 fallback
] as const;

/** Each rendered message row. Tier 1 ARIA. */
export const MESSAGE_ROW = '[role="row"]';

/** The .copyable-text wrapper carries data-pre-plain-text="[HH:MM, DD/MM/YYYY] Sender: ". */
export const MSG_BLOCK = '.copyable-text[data-pre-plain-text]';

/** The inner span with the actual message body text. */
export const MSG_TEXT = 'span.selectable-text';

/** The data attribute carrying the stable WhatsApp message id. */
export const MSG_ID_ATTR = 'data-id';
