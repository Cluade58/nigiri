import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from /nigiri/ (publishing.md). Routes are hash routes,
// so a refresh never asks GitHub for a page that doesn't exist.
//
// Offline and safe updates (D53, publishing.md "Updates"): a service worker keeps a copy of every
// built file, fonts included. `registerType: 'prompt'` with no prompt shown and no skipWaiting or
// clientsClaim: a new version installs in the background and waits until every Nigiri window has
// closed, so it takes over at the next launch, never mid-session. src/main.tsx registers it and never
// calls the update function. The worker is off in dev; check it against `npm run build && npm run preview`.
export default defineConfig({
  base: '/nigiri/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      injectRegister: false,
      // The globs below already pick up every file in public/ (icons included), so nothing is listed twice.
      includeManifestIcons: false,
      manifest: {
        id: '/nigiri/',
        name: 'Nigiri',
        short_name: 'Nigiri',
        description: 'Flashcards you write yourself.',
        start_url: '/nigiri/',
        scope: '/nigiri/',
        display: 'standalone',
        // Snow's page colour: a manifest can't change per person, so the splash stays Snow (D39d).
        theme_color: '#F5F7FC',
        background_color: '#F5F7FC',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,woff}'], // the plugin adds the manifest itself
        navigateFallback: 'index.html',
        skipWaiting: false,
        clientsClaim: false,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
});
