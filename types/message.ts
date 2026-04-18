/**
 * A WhatsApp Web chat message as extracted by the content script (Plan 02).
 * Fields are Phase 1 contract; Plan 02 MUST produce payloads matching this shape.
 */
export interface Message {
  /** Stable WhatsApp message id, schema `false_<chat>@s.whatsapp.net_<msg>`. Dedupe key. */
  dataId: string;
  /** Sender display name, parsed from data-pre-plain-text. '' if parse fails. */
  sender: string;
  /** Timestamp string from data-pre-plain-text header. '' if parse fails. */
  timestamp: string;
  /** innerText body. Never innerHTML. Trimmed, never empty. */
  text: string;
  /** http(s) URLs regex-extracted from `text`. */
  urls: string[];
}
