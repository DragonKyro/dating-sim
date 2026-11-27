// Dev-only: renders one scene, one character or an expression sheet from the
// query string (see preview.html). Not part of the production build.

import '@/ui/styles/art.css';
import { renderScene } from '@/art/scenes';

const q = new URLSearchParams(location.search);
const stage = document.getElementById('stage')!;
if (q.get('still')) document.documentElement.classList.add('reduce-motion');

const sceneId = q.get('scene');
if (sceneId) {
  stage.innerHTML = renderScene({ id: sceneId, time: q.get('time') ?? undefined, weather: q.get('weather') ?? undefined });
}

const charId = q.get('char') ?? q.get('sheet');
if (charId) {
  const [{ createCharacter, EXPRESSIONS }, { CHARACTERS }] = await Promise.all([import('@/art/character'), import('@/content')]);
  const look = CHARACTERS[charId]!.look;
  if (q.get('sheet')) {
    const sheet = document.createElement('div');
    sheet.id = 'sheet';
    stage.replaceChildren(sheet);
    for (const e of EXPRESSIONS) {
      const fig = document.createElement('figure');
      fig.innerHTML = `<div></div><figcaption>${e}</figcaption>`;
      const c = createCharacter(look, { expression: e, idle: false, crop: (q.get('crop') as 'face' | 'bust' | 'full') ?? 'face' });
      fig.firstElementChild!.appendChild(c.el);
      sheet.appendChild(fig);
    }
  } else {
    const holder = document.createElement('div');
    holder.id = 'char';
    stage.appendChild(holder);
    const c = createCharacter(look, { expression: q.get('expr') ?? 'neutral', outfit: q.get('outfit') ?? undefined });
    holder.appendChild(c.el);
    if (q.get('talk')) c.talk(true);
  }
}
document.body.dataset.ready = '1';
