// wxt.config.ts
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'JRNY Copilot',
    description: 'Read-only AI trip-planning assistant for WhatsApp Web.',
    permissions: ['sidePanel', 'storage', 'tabs'],
    host_permissions: ['https://web.whatsapp.com/*'],
    action: {
      default_title: 'Open JRNY Copilot',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
