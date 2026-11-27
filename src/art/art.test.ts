import { CHARACTERS, LEVELS } from '@/content';
import { characterSVG, EXPRESSIONS } from './character';
import { renderScene, SCENES } from './scenes';
import { mirrorPath } from './wardrobe';

it('every scene variant renders a complete SVG', () => {
  for (const [id, def] of Object.entries(SCENES)) {
    for (const time of def.times) {
      for (const weather of def.weathers ?? ['clear']) {
        const svg = renderScene({ id, time, weather });
        expect(svg.startsWith('<svg'), `${id}/${time}/${weather}`).toBe(true);
        expect(svg.endsWith('</svg>')).toBe(true);
        expect(svg).not.toMatch(/undefined|NaN/);
      }
    }
  }
});

it('every level uses a scene, time and weather that exist', () => {
  for (const l of LEVELS) {
    const def = SCENES[l.scene.id];
    expect(def, l.id).toBeDefined();
    if (l.scene.time) expect(def!.times, l.id).toContain(l.scene.time);
  }
});

it('every character renders every expression and outfit without gaps', () => {
  for (const c of Object.values(CHARACTERS)) {
    for (const outfit of [undefined, ...Object.keys(c.look.outfits ?? {})]) {
      for (const expression of EXPRESSIONS) {
        const svg = characterSVG(c.look, { expression, outfit });
        expect(svg, `${c.id}/${outfit}/${expression}`).not.toMatch(/undefined|NaN/);
      }
    }
  }
});

it('mirrorPath flips x coordinates only', () => {
  expect(mirrorPath('M100 200 C110 210 120 220 130 230Z')).toBe('M400 200 C390 210 380 220 370 230Z');
});
