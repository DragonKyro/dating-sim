// Scene registry. A level picks a scene with { id, time, weather } and gets
// back a full-frame animated SVG. Scenes are composed from js/art/kit.js so
// they share palettes, light and weather.

import { W, H, palette, svgFrame, ambient } from "./kit.js";
import { ferry } from "./scenes/ferry.js";
import { bakery } from "./scenes/bakery.js";
import { records } from "./scenes/records.js";
import { shore } from "./scenes/shore.js";
import { yachtclub } from "./scenes/yachtclub.js";
import { rooftop } from "./scenes/rooftop.js";
import { boat } from "./scenes/boat.js";
import { boathouse } from "./scenes/boathouse.js";
import { lamproom } from "./scenes/lamproom.js";
import { lifeboat } from "./scenes/lifeboat.js";
import { harbor } from "./scenes/harbor.js";
import { sailing } from "./scenes/sailing.js";

export const SCENES = {
  ferry:     { label: "Ferry deck",           draw: ferry,     times: ["golden", "day", "dusk"] },
  bakery:    { label: "Amaral's Bakery",      draw: bakery,    times: ["night"], weathers: ["clear", "blackout"] },
  records:   { label: "Second Spin",          draw: records,   times: ["day", "dusk"], weathers: ["rain", "clear"] },
  shore:     { label: "Tide pools",           draw: shore,     times: ["dawn", "day"] },
  yachtclub: { label: "Yacht club terrace",   draw: yachtclub, times: ["dusk", "night"] },
  rooftop:   { label: "Rooftop, Wharf St.",   draw: rooftop,   times: ["night"] },
  boat:      { label: "Survey boat",          draw: boat,      times: ["fog", "day"] },
  boathouse: { label: "Highwater boathouse",  draw: boathouse, times: ["dusk", "storm"] },
  lamproom:  { label: "North Light lamp room", draw: lamproom, times: ["storm", "night"] },
  lifeboat:  { label: "Old lifeboat station", draw: lifeboat,  times: ["storm"] },
  harbor:    { label: "Saltwick harbor",      draw: harbor,    times: ["night", "dusk"], weathers: ["lanterns", "clear"] },
  sailing:   { label: "Aboard Marguerite",    draw: sailing,   times: ["night"] },
};

/**
 * @param {{id:string, time?:string, weather?:string}} spec
 * @returns {string} SVG markup
 */
export function renderScene(spec = {}) {
  const def = SCENES[spec.id];
  if (!def) return svgFrame([`<rect width="${W}" height="${H}" fill="#2a1f30"/>`]);
  const time = spec.time ?? def.times[0];
  const weather = spec.weather ?? def.weathers?.[0] ?? "clear";
  const pal = palette(time);
  const parts = def.draw({ pal, time, weather });
  parts.push(ambient(pal));
  return svgFrame(parts, { cls: `scene-${spec.id} t-${time} w-${weather}` });
}
