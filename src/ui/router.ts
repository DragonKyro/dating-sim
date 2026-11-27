// Hash routes, so the phone's back button walks back through the game and
// GitHub Pages needs no rewrites:
//   #/                 title
//   #/island           chapter map
//   #/brief/<level>    scene briefing
//   #/scene/<level>    the scene itself
//   #/journal          characters, memories, endings

import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'title' }
  | { name: 'island' }
  | { name: 'brief'; levelId: string }
  | { name: 'scene'; levelId: string }
  | { name: 'journal' };

export function parseHash(hash: string): Route {
  const [a, b] = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (a === 'island') return { name: 'island' };
  if (a === 'journal') return { name: 'journal' };
  if (a === 'brief' && b) return { name: 'brief', levelId: b };
  if (a === 'scene' && b) return { name: 'scene', levelId: b };
  return { name: 'title' };
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  return parseHash(useSyncExternalStore(subscribe, () => window.location.hash));
}

export const paths = {
  title: '#/',
  island: '#/island',
  brief: (id: string) => `#/brief/${id}`,
  scene: (id: string) => `#/scene/${id}`,
  journal: '#/journal',
};

/** Navigate; `replace` swaps the current history entry (no extra back step). */
export function go(path: string, replace = false): void {
  if (replace) window.location.replace(path);
  else window.location.hash = path.slice(1);
}

export const inScene = (): boolean => /^#\/scene\//.test(window.location.hash);
