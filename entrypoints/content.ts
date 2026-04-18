export default defineContentScript({
  matches: ['https://web.whatsapp.com/*'],
  runAt: 'document_idle',
  main() {
    // Plan 02 implements the WhatsApp DOM reader here.
    // Phase 1 stub — no-op.
    console.log('[JRNY] content script loaded on WhatsApp Web');
  },
});
