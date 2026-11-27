// Offline: the service worker (vite-plugin-pwa / Workbox) precaches the app —
// art, story, fonts and the Firebase SDK — so it opens with no connection
// (the characters still need Gemini to talk). A new build installs in the
// background; the reload that switches to it waits until you're not in the
// middle of a scene.

import { registerSW } from 'virtual:pwa-register';
import { inScene } from './ui/router';

function reloadWhenIdle(): void {
  if (!inScene()) {
    window.location.reload();
    return;
  }
  const onNav = () => {
    if (inScene()) return;
    window.removeEventListener('hashchange', onNav);
    window.location.reload();
  };
  window.addEventListener('hashchange', onNav);
}

export function registerOffline(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  registerSW({ immediate: true, onNeedReload: reloadWhenIdle });
}
