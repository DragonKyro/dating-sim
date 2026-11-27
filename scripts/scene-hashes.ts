// Prints a hash of every scene × time × weather render, so refactors of the
// art code can prove the output didn't change. Rendering is deterministic
// (seeded RNG). Element ids come from a global counter, so they're
// renumbered per render: each scene's hash depends only on its own code.
//
//   npx vite-node scripts/scene-hashes.ts > before.txt   …edit…   diff

import { createHash } from 'node:crypto';
import { SCENES, renderScene } from '@/art/scenes';

function normalizeIds(svg: string): string {
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]!);
  const map = new Map(ids.map((id, i) => [id, `n${i}`]));
  return svg.replace(/( id="|url\(#|href="#)([^")]+)/g, (all, pre: string, id: string) => (map.has(id) ? pre + map.get(id) : all));
}

for (const [id, def] of Object.entries(SCENES)) {
  for (const time of def.times) {
    for (const weather of def.weathers ?? ['clear']) {
      const svg = normalizeIds(renderScene({ id, time, weather }));
      const hash = createHash('sha256').update(svg).digest('hex').slice(0, 16);
      console.log(`${id.padEnd(10)} ${time.padEnd(7)} ${weather.padEnd(9)} ${hash} ${svg.length}`);
    }
  }
}
