// Dev-only: renders one scene, one character or an expression sheet from the
// query string (see preview.html). Not part of the production build.

import '@/ui/styles/art.css';
import { renderScene } from '@/art/scenes';

const q = new URLSearchParams(location.search);
const stage = document.getElementById('stage')!;
// Freeze animation; for the layered view only after the layers are lifted
// (frozen pieces would read as not animated).
const freeze = () => q.get('still') && document.documentElement.classList.add('reduce-motion');
if (!q.get('layered')) freeze();

const sceneId = q.get('scene');
if (sceneId && q.get('layered')) {
  // The game's GPU-friendly pipeline (still image + lifted layers), for
  // checking it against the plain inline render.
  const { layeredScene, VIEW_W, VIEW_H } = await import('@/art/layers');
  const scene = layeredScene({ id: sceneId, time: q.get('time') ?? undefined, weather: q.get('weather') ?? undefined });
  stage.className = 'backdrop';
  stage.innerHTML = `<div class="scene-box"><img class="scene-still" src="${scene.still}"><div class="fx-layer" style="width:${VIEW_W}px;height:${VIEW_H}px"></div></div>`;
  const box = stage.querySelector<HTMLElement>('.scene-box')!;
  const fx = stage.querySelector<HTMLElement>('.fx-layer')!;
  fx.style.zoom = String(box.clientWidth / VIEW_W);
  const band = (o: { src: string; x: number; y: number; w: number; h: number }) => {
    const img = document.createElement('img');
    img.className = 'fx-band';
    img.src = o.src;
    Object.assign(img.style, { left: `${o.x}px`, top: `${o.y}px`, width: `${o.w}px`, height: `${o.h}px` });
    fx.appendChild(img);
  };
  let prev = 0;
  for (const l of scene.layers) {
    scene.overlays.slice(prev, l.band).forEach(band);
    prev = l.band;
    const d = document.createElement('div');
    d.className = 'fx-el';
    Object.assign(d.style, { left: `${l.x}px`, top: `${l.y}px`, width: `${l.w}px`, height: `${l.h}px`, ...l.style });
    d.innerHTML = l.svg;
    fx.appendChild(d);
  }
  scene.overlays.slice(prev).forEach(band);
  document.body.dataset.layers = `${scene.layers.length}/${scene.overlays.length + 1}`;
  freeze();
} else if (sceneId) {
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
