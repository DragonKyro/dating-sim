// Scene registry. A level picks a scene with { id, time, weather } and gets
// back a full-frame animated SVG string. Scenes are composed from kit.ts so
// they share palettes, light and weather.

import type { SceneSpec } from '@/game/types';
import { W, H, palette, svgFrame, ambient, type SceneFn } from './kit';
import { ferry } from './scenes/ferry';
import { bakery } from './scenes/bakery';
import { records } from './scenes/records';
import { shore } from './scenes/shore';
import { yachtclub } from './scenes/yachtclub';
import { rooftop } from './scenes/rooftop';
import { boat } from './scenes/boat';
import { boathouse } from './scenes/boathouse';
import { lamproom } from './scenes/lamproom';
import { lifeboat } from './scenes/lifeboat';
import { harbor } from './scenes/harbor';
import { sailing } from './scenes/sailing';

export interface SceneDef {
  label: string;
  draw: SceneFn;
  times: string[];
  weathers?: string[];
}

export const SCENES: Record<string, SceneDef> = {
  ferry: { label: 'Ferry deck', draw: ferry, times: ['golden', 'day', 'dusk'] },
  bakery: { label: "Amaral's Bakery", draw: bakery, times: ['night'], weathers: ['clear', 'blackout'] },
  records: { label: 'Second Spin', draw: records, times: ['day', 'dusk'], weathers: ['rain', 'clear'] },
  shore: { label: 'Tide pools', draw: shore, times: ['dawn', 'day'] },
  yachtclub: { label: 'Yacht club terrace', draw: yachtclub, times: ['dusk', 'night'] },
  rooftop: { label: 'Rooftop, Wharf St.', draw: rooftop, times: ['night'] },
  boat: { label: 'Survey boat', draw: boat, times: ['fog', 'day'] },
  boathouse: { label: 'Highwater boathouse', draw: boathouse, times: ['dusk', 'storm'] },
  lamproom: { label: 'North Light lamp room', draw: lamproom, times: ['storm', 'night'] },
  lifeboat: { label: 'Old lifeboat station', draw: lifeboat, times: ['storm'] },
  harbor: { label: 'Saltwick harbor', draw: harbor, times: ['night', 'dusk'], weathers: ['lanterns', 'clear'] },
  sailing: { label: 'Aboard Marguerite', draw: sailing, times: ['night'] },
};

/** Full-frame SVG markup for a scene. Unknown ids get a plain backdrop. */
export function renderScene(spec: SceneSpec): string {
  const def = SCENES[spec.id];
  if (!def) return svgFrame([`<rect width="${W}" height="${H}" fill="#2a1f30"/>`]);
  const time = spec.time ?? def.times[0]!;
  const weather = spec.weather ?? def.weathers?.[0] ?? 'clear';
  const pal = palette(time);
  const parts = def.draw({ pal, time, weather });
  parts.push(ambient(pal));
  return svgFrame(parts, { cls: `scene-${spec.id} t-${time} w-${weather}` });
}
