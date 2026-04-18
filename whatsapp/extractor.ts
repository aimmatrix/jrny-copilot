import type { Message } from '@/types/message';
import { MSG_BLOCK, MSG_ID_ATTR, MSG_TEXT } from './selectors';

/** Regex: match any http(s) URL in message text. */
const URL_RE = /https?:\/\/[^\s<>"']+/g;

/** data-pre-plain-text format: "[HH:MM, DD/MM/YYYY] Sender Name: " */
const HEADER_RE = /^\[([^\]]+)\]\s+([^:]+):\s*$/;

/**
 * Extract a structured Message from a WhatsApp [role="row"] element.
 * Returns null if the row has no data-id or no body text (non-message rows,
 * system notifications, date dividers all return null).
 *
 * Defensive by design: if the data-pre-plain-text header fails to parse,
 * sender + timestamp fall back to '' but `text` is still returned — passing
 * INFRA-02 even when locale/format drifts (Assumption A1/A2 in RESEARCH.md).
 */
export function parseRow(row: Element): Message | null {
  // data-id may live on the row itself OR a descendant wrapper.
  const idEl =
    row.closest(`[${MSG_ID_ATTR}]`) ?? row.querySelector(`[${MSG_ID_ATTR}]`);
  const dataId = idEl?.getAttribute(MSG_ID_ATTR);
  if (!dataId) return null;

  const block = row.querySelector(MSG_BLOCK);
  if (!block) return null;

  const header = block.getAttribute('data-pre-plain-text') ?? '';
  const m = HEADER_RE.exec(header);
  const timestamp = m?.[1]?.trim() ?? '';
  const sender = m?.[2]?.trim() ?? '';

  // innerText ONLY — raw HTML access is forbidden. Message content is untrusted input.
  const textEl = block.querySelector(MSG_TEXT) as HTMLElement | null;
  const text = (textEl?.innerText ?? '').trim();
  if (!text) return null;

  const urls = Array.from(text.matchAll(URL_RE), (x) => x[0]);

  return { dataId, sender, timestamp, text, urls };
}
