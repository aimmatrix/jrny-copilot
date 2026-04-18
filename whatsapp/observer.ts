import type { Message } from '@/types/message';
import { CHAT_PANE_SELECTORS, MESSAGE_ROW } from './selectors';
import { parseRow } from './extractor';

const DEBOUNCE_MS = 300;
const CHAT_PANE_POLL_MS = 500;

function findChatPane(): Element | null {
  for (const sel of CHAT_PANE_SELECTORS) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

export interface StartObserverOptions {
  /** Called with a batched, deduped array of new messages every ~300ms. */
  onBatch: (msgs: Message[]) => void;
  /** WXT's ctx.signal — aborts observer on content-script reload. */
  signal: AbortSignal;
}

export function startObserver({ onBatch, signal }: StartObserverOptions): void {
  const seen = new Set<string>();              // dedupe by dataId for lifetime of CS
  const pending = new Map<string, Message>();  // batched messages awaiting flush
  let flushTimer: number | null = null;

  function flush(): void {
    flushTimer = null;
    if (pending.size === 0) return;
    const batch = Array.from(pending.values());
    pending.clear();
    onBatch(batch);
  }

  function queue(msg: Message): void {
    if (seen.has(msg.dataId)) return;         // Pitfall 4: dedupe across chat switches
    seen.add(msg.dataId);
    pending.set(msg.dataId, msg);
    if (flushTimer === null) {
      flushTimer = window.setTimeout(flush, DEBOUNCE_MS);
    }
  }

  function scanRoot(root: ParentNode): void {
    root.querySelectorAll(MESSAGE_ROW).forEach((row) => {
      const m = parseRow(row);
      if (m) queue(m);
    });
  }

  // Pitfall 3: WhatsApp is an SPA. At document_idle the chat pane may not be
  // mounted yet. Poll until it appears, then start the real observer.
  const bootInterval = window.setInterval(() => {
    const pane = findChatPane();
    if (!pane) return;
    window.clearInterval(bootInterval);

    console.log('[JRNY][content] chat pane found; starting observer');

    // Initial sweep: emit currently-visible messages so the SW sees something
    // even before any new mutation fires.
    scanRoot(pane);

    const observer = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches(MESSAGE_ROW)) {
            const msg = parseRow(node);
            if (msg) queue(msg);
          } else {
            scanRoot(node);               // handle wrapping div that contains rows
          }
        }
      }
    });
    observer.observe(pane, { childList: true, subtree: true });

    signal.addEventListener('abort', () => {
      observer.disconnect();
      if (flushTimer !== null) {
        window.clearTimeout(flushTimer);
        flushTimer = null;
      }
    });
  }, CHAT_PANE_POLL_MS);

  signal.addEventListener('abort', () => window.clearInterval(bootInterval));
}
