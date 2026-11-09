// Fonts are bundled with the app, never fetched from a font service (product-brief: Type).
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/atkinson-hyperlegible-next';
import './styles/app.css';
import './styles/hero.css';
import './styles/round1.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';

// Which build is running, for the update check (D53, e2e J7). Set with VITE_BUILD_ID at build time.
document.documentElement.dataset.build = import.meta.env.VITE_BUILD_ID || 'local';

// Offline and safe updates (D53). The worker keeps a copy of the app; a new version waits in the
// background until every Nigiri window has closed. The update function this returns is never called,
// so nothing reloads mid-review. Off in dev (vite.config.ts).
// onNeedReload is a no-op on purpose: the page never reloads itself, even if a new version somehow took
// control of an open window (it can't without skipWaiting, which nothing sends).
if (import.meta.env.PROD && 'serviceWorker' in navigator) registerSW({ immediate: true, onNeedReload: () => {} });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
