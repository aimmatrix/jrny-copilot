// entrypoints/content.ts
// Source: https://wxt.dev/guide/essentials/entrypoints.html
import { defineContentScript } from 'wxt/utils/define-content-script';
import { sendMessage } from '@/messaging/protocol';
import { startObserver } from '@/whatsapp/observer';

export default defineContentScript({
  matches: ['https://web.whatsapp.com/*'],
  runAt: 'document_idle',
  world: 'ISOLATED',
  main(ctx) {
    console.log('[JRNY][content] booted on', location.href);

    startObserver({
      signal: ctx.signal,
      onBatch: (messages) => {
        // Fire-and-forget. The SW will log the payload (see entrypoints/background.ts).
        // @webext-core/messaging returns a Promise; we don't await to keep the
        // observer callback synchronous, but we DO catch to surface delivery errors.
        sendMessage('chatDelta', { messages }).catch((err) => {
          console.warn('[JRNY][content] chatDelta send failed:', err);
        });
      },
    });
  },
});
