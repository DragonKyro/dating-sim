import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/lora/latin-400.css';
import '@fontsource/lora/latin-400-italic.css';
import '@fontsource/lora/latin-600.css';
import './ui/styles/art.css';
import './ui/styles/theme.css';
import { initCloud } from './net/cloud';
import { summarizeProgress } from './store/saveStore';
import { App } from './ui/App';
import { formatDate } from './ui/text';
import { choiceDialog } from './ui/uiStore';
import { registerOffline } from './pwa';
import { setPrefs, usePrefs } from './store/prefsStore';

const describe = (s: ReturnType<typeof summarizeProgress>) =>
  `${s.levels} scene${s.levels === 1 ? '' : 's'} complete · ${s.met} met · ${s.endings} ending${s.endings === 1 ? '' : 's'} · saved ${formatDate(s.updatedAt)}`;

initCloud({
  onConflict: (local, remote) =>
    choiceDialog<'local' | 'remote'>({
      title: 'Two saves found',
      body: 'This Google account already has a Last Ferry save, and this device has a different one. Which summer do you want to keep?',
      choices: [
        { value: 'remote', label: 'Keep the cloud save', detail: describe(remote) },
        { value: 'local', label: "Keep this device's save", detail: describe(local) },
      ],
    }),
});
registerOffline();

// Dev only (stripped from builds): a gitignored secrets.local.json
// ({ "apiKey": "AIza..." }) in the repo root pre-fills the Gemini key.
if (import.meta.env.DEV && !usePrefs.getState().apiKey) {
  fetch(`${import.meta.env.BASE_URL}secrets.local.json`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((s: { apiKey?: string } | null) => s?.apiKey && setPrefs({ apiKey: s.apiKey }))
    .catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
