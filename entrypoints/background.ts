import { defineBackground } from 'wxt/utils/define-background';
import { onMessage } from '@/messaging/protocol';

export default defineBackground({
  type: 'module',
  main() {
    // ---------- INFRA-04: side panel opens on action (icon) click ----------
    // Source: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.error('[JRNY] setPanelBehavior failed:', err));

    // ---------- INFRA-04: per-tab enable/disable ----------
    // Enable side panel only for WhatsApp Web tabs; disable elsewhere
    // so the icon click on other tabs does not open the panel.
    chrome.tabs.onUpdated.addListener((tabId, _info, tab) => {
      if (!tab.url) return;
      const isWa = tab.url.startsWith('https://web.whatsapp.com/');
      chrome.sidePanel
        .setOptions({
          tabId,
          path: 'sidepanel.html',
          enabled: isWa,
        })
        .catch((err) => console.error('[JRNY] setOptions failed:', err));
    });

    // ---------- INFRA-03 endpoint (Plan 02 wires the sender) ----------
    // Registered SYNCHRONOUSLY at top level — Pitfall 2 in 01-RESEARCH.md.
    onMessage('chatDelta', ({ data }) => {
      console.log(`[JRNY] chatDelta: ${data.messages.length} messages`);
      data.messages.forEach((m) => {
        const preview = m.text.length > 80 ? m.text.slice(0, 80) + '…' : m.text;
        console.log(`  ${m.timestamp} ${m.sender}: ${preview}`);
        if (m.urls.length) console.log('    urls:', m.urls);
      });
    });

    console.log('[JRNY] service worker booted');
  },
});
