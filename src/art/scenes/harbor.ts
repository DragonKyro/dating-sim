// Saltwick harbor. On Lantern Night the whole island is out along the wharf
// and paper lanterns float on the water and climb into the sky; at dusk it
// is a quiet harbor with the Persistence at the dock and the first lights
// coming on (that version doubles as the title-screen backdrop).
import type { Palette, Part, Layer, SceneInput } from "../kit";
import {
  W, H, sky, sunDisc, moon, stars, cloudBand, ridge, sea, gulls, glow, stringLights,
  radial, rng, uid, shade, tint, mix,
} from "../kit";

type Pt = [number, number];

/** Colors shared by the harbor-front houses. */
interface HouseColors {
  wall: string;
  roof: string;
  trim: string;
  glass: string;
  wallSh: string;
  roofHi: string;
  roofSh: string;
}

/** Per-row state shared by every house: window-glow gradient id, lit share, rng. */
interface HouseCtx {
  g: string;
  lit: number;
  r: () => number;
}

interface HouseOpts {
  x: number;
  w: number;
  top: number;
  peak: number;
  base: number;
  kind: "front" | "side";
  floors: number;
  dormers?: number;
  door?: boolean;
}

const f = (n: number): number => Math.round(n * 10) / 10;
const WARM = "#ffcf86";
const LANTERN = "#ffaa52";
const LANTERN_HI = "#ffe6a8";

export function harbor({ pal, weather }: SceneInput): Part[] {
  const parts: Part[] = [];
  const night = pal.stars ?? 0;          // 0.3 at dusk, 1 at night
  const isNight = night >= 0.9;
  const festive = weather === "lanterns";
  const lit = isNight ? 0.75 : 0.42;     // share of windows lit
  const horizon = 470;
  const lx = isNight ? 1000 : 830;

  parts.push(styles());
  parts.push(sky(pal));
  if (night) parts.push(`<g opacity="${f(night)}">${stars(Math.round((festive ? 10 : 20) + (festive ? 40 : 80) * night), 77, 420)}</g>`);
  parts.push(isNight ? moon(lx, 112, 32) : sunDisc(pal, lx, horizon - 26, 52));
  parts.push(cloudBand(pal, { seed: 21, y0: 50, y1: 270, count: isNight ? 3 : 6, speed: 220, opacity: isNight ? 0.22 : 0.75 }));

  // Far: the north point with its lighthouse, the town's hill on the right.
  parts.push(ridge({ y: horizon - 14, amp: 12, color: mix(pal.far, pal.sky[0], 0.5), seed: 13, x0: 1120, x1: 1720, bottom: horizon + 2, steps: 8 }));
  parts.push(northPoint(pal, horizon, night));
  parts.push(hillTown(pal, night, lit, horizon));

  parts.push(sea(pal, { top: horizon, seed: 31, glint: isNight ? "#f4f1dc" : pal.sun, glints: 26, glintOpacity: 0.4 }));
  parts.push(lightPath(isNight ? "#f4f1dc" : pal.sun, lx, horizon, isNight ? 0.4 : 0.6));
  if (festive) parts.push(skyLanterns(15, 91));

  // Mid: the Persistence at the wharf (left), the harbor front (right).
  parts.push(ferryBoat(pal, night, festive, lit));
  parts.push(wharf(pal, night));
  parts.push(buildings(pal, night, lit));
  parts.push(reflections(pal, night));
  if (festive) {
    parts.push(crowd(pal, night, 54, 588, 0, 590, 16));
    parts.push(crowd(pal, night, 58, 608, 1058, 1600, 8));
    parts.push(waterLanterns(11, 47));
    parts.push(risingLanterns(17, 63));
  } else if (!isNight) {
    parts.push(gulls(4, { seed: 17, y0: 130, y1: 330, color: shade(pal.ink, 0.1) }));
  }
  parts.push(perchedGull(pal, night, 598, 540));
  parts.push(foreDock(pal, night));
  return parts;
}

function styles(): string {
  return `<style>
    @keyframes harbor-float { 0% { transform: translate(0, 0); opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translate(14px, -130px); opacity: 0; } }
    .harbor-float { animation: harbor-float 50s linear infinite; }
  </style>`;
}

/** Merge {defs, body} parts into one. */
function join(items: Part[]): Layer {
  let defs = "", body = "";
  for (const p of items) {
    if (typeof p === "string") body += p;
    else { defs += p.defs ?? ""; body += p.body ?? ""; }
  }
  return { defs, body };
}

// ---- far ---------------------------------------------------------------------

function northPoint(pal: Palette, horizon: number, night: number): string {
  const land = mix(pal.far, pal.sky[0], 0.38);
  const x = 668, base = horizon - 30;
  const white = mix(tint(pal.far, 0.7), pal.far, 0.6 * night);
  const red = mix(shade("#c6534a", 0.15), pal.far, 0.5 * night);
  return `<g>
    <path d="M360 ${horizon + 2} Q420 ${horizon - 26} 500 ${horizon - 34} Q600 ${horizon - 42} 680 ${horizon - 30} Q730 ${horizon - 20} 780 ${horizon + 2} Z" fill="${land}"/>
    <path d="M${x - 10} ${base} L${x - 7} ${base - 64} L${x + 7} ${base - 64} L${x + 10} ${base} Z" fill="${white}"/>
    <path d="M${x + 3} ${base} L${x + 4} ${base - 64} L${x + 7} ${base - 64} L${x + 10} ${base} Z" fill="${shade(white, 0.2)}"/>
    <rect x="${x - 7}" y="${base - 44}" width="14" height="9" fill="${red}"/>
    <rect x="${x - 9}" y="${base - 73}" width="18" height="10" fill="${shade(pal.far, 0.4)}"/>
    <path d="M${x - 9} ${base - 73} L${x} ${base - 82} L${x + 9} ${base - 73} Z" fill="${red}"/>
    <rect x="${x - 46}" y="${base - 8}" width="26" height="12" fill="${white}"/><path d="M${x - 49} ${base - 8} L${x - 33} ${base - 17} L${x - 17} ${base - 8} Z" fill="${shade(land, 0.3)}"/>
  </g>`;
}

const HILL: Pt[] = [[880, 474], [960, 446], [1040, 412], [1140, 378], [1260, 336], [1380, 304], [1500, 284], [1620, 274], [1720, 270]];
const hillAt = (x: number): number => {
  for (let i = 1; i < HILL.length; i++) if (x <= HILL[i][0]) {
    const [ax, ay] = HILL[i - 1], [bx, by] = HILL[i];
    return ay + ((by - ay) * (x - ax)) / (bx - ax);
  }
  return HILL[HILL.length - 1][1];
};

function hillTown(pal: Palette, night: number, lit: number, horizon: number): string {
  const r = rng(33);
  const land = mix(pal.far, pal.sky[0], 0.22);
  let d = `M${HILL[0][0]} ${horizon + 2} L${HILL[0][0]} ${HILL[0][1]}`;
  for (let i = 1; i < HILL.length; i++) {
    const [px, py] = HILL[i - 1], [cx, cy] = HILL[i];
    d += ` Q${px} ${py} ${(px + cx) / 2} ${(py + cy) / 2}`;
  }
  d += ` L${W + 20} ${HILL[HILL.length - 1][1]} L${W + 20} ${horizon + 2} Z`;
  const wall = mix(tint(pal.far, 0.25), pal.sky[0], 0.1), roof = shade(pal.far, 0.25);
  let out = `<path d="${d}" fill="${land}"/>`;
  const spots: Pt[] = [];
  for (let i = 0; i < 7; i++) { const x = 900 + i * 30 + r() * 10; spots.push([x, Math.min(horizon - 14, hillAt(x) + 10 + r() * 24)]); }
  for (let i = 0; i < 10; i++) { const x = 1210 + i * 40 + r() * 14; spots.push([x, hillAt(x) + 6 + r() * 10]); }
  for (const [x, y] of spots) {
    const w = 18 + r() * 12, h = 11 + r() * 8;
    out += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${wall}"/>`;
    out += `<path d="M${f(x - 2)} ${f(y)} L${f(x + w / 2)} ${f(y - 7 - r() * 4)} L${f(x + w + 2)} ${f(y)} Z" fill="${roof}"/>`;
    if (r() < lit) out += `<rect x="${f(x + w / 2 - 2)}" y="${f(y + h / 2 - 2)}" width="4" height="4" fill="${WARM}" opacity=".9"/>`;
  }
  // White church steeple above the harbor front.
  const sx = 1150, sb = 410, sw = mix(tint(pal.far, 0.55), pal.far, 0.35 * night);
  out += `<rect x="${sx - 12}" y="${sb - 70}" width="24" height="70" fill="${sw}"/><rect x="${sx + 4}" y="${sb - 70}" width="8" height="70" fill="${shade(sw, 0.2)}"/>
    <rect x="${sx - 9}" y="${sb - 96}" width="18" height="26" fill="${sw}"/><path d="M${sx - 5} ${sb - 74} v-14 q5 -6 10 0 v14 Z" fill="${shade(sw, 0.45)}"/>
    <path d="M${sx - 11} ${sb - 96} L${sx} ${sb - 146} L${sx + 11} ${sb - 96} Z" fill="${sw}"/><path d="M${sx} ${sb - 146} L${sx + 11} ${sb - 96} H${sx + 4} Z" fill="${shade(sw, 0.2)}"/>`;
  return `<g>${out}</g>`;
}

function lightPath(color: string, x: number, horizon: number, op: number): string {
  const r = rng(41);
  let out = "";
  for (let i = 0; i < 18; i++) {
    const t = i / 18, y = horizon + 8 + t * t * 360, w = 30 + t * 150 + r() * 40;
    out += `<path d="M${f(x - w / 2 + (r() - 0.5) * 40)} ${f(y)} h${f(w)}" stroke="${color}" stroke-width="${f(2 + t * 4)}" stroke-linecap="round" opacity="${f(op - t * 0.25)}" class="a-wave" style="animation-delay:-${f(r() * 5)}s"/>`;
  }
  return out;
}

// ---- the Persistence ------------------------------------------------------------

function ferryBoat(pal: Palette, night: number, festive: boolean, lit: number): Layer {
  const white = mix("#f4f1ea", pal.sky[1], 0.1 + 0.45 * night);
  const sh = shade(white, 0.18);
  const blue = mix("#2f5d8a", pal.mid, 0.15 + 0.25 * night);
  const navy = mix("#22304c", pal.mid, 0.2);
  const glass = mix(pal.sky[2], pal.ink, 0.25);
  const r = rng(52);
  let out = "";
  // Hull.
  out += `<path d="M30 508 L530 496 Q506 540 488 580 L40 580 Z" fill="${white}"/>`;
  out += `<path d="M30 548 L512 540 Q500 562 488 580 L40 580 Z" fill="${sh}"/>`;
  out += `<path d="M30 526 L524 515 L518 528 L30 540 Z" fill="${blue}"/>`;
  out += `<path d="M30 508 L530 496" stroke="${tint(white, 0.4)}" stroke-width="3"/>`;
  // Main cabin with its row of windows.
  out += `<rect x="70" y="452" width="372" height="56" fill="${white}"/><rect x="70" y="452" width="372" height="7" fill="${sh}"/>`;
  out += `<rect x="62" y="446" width="388" height="8" rx="2" fill="${tint(white, 0.2)}"/>`;
  out += `<text x="392" y="518" text-anchor="middle" font-family="Georgia, serif" font-size="10" font-weight="700" fill="${navy}" letter-spacing="1.5">PERSISTENCE</text>`;
  let wins = "", winGlow = "";
  for (let x = 84; x < 430; x += 30) {
    const on = r() < lit + 0.15;
    wins += `<rect x="${x}" y="466" width="20" height="22" rx="4" fill="${on ? WARM : glass}"/>`;
    if (on && night > 0.5) winGlow += `<circle cx="${x + 10}" cy="477" r="22" fill="url(#GLOW)"/>`;
  }
  // Upper deck: rail, funnel, wheelhouse, mast.
  let rail = "";
  for (let x = 120; x <= 300; x += 20) rail += `M${x} 446 V428 `;
  out += `<path d="${rail} M116 428 H300" stroke="${sh}" stroke-width="2.5"/>`;
  out += `<rect x="206" y="404" width="36" height="44" fill="${white}"/><rect x="206" y="414" width="36" height="9" fill="${blue}"/><rect x="204" y="398" width="40" height="8" fill="${navy}"/>`;
  out += `<rect x="300" y="404" width="104" height="44" fill="${white}"/><rect x="294" y="398" width="116" height="8" rx="2" fill="${tint(white, 0.2)}"/>`;
  out += `<rect x="312" y="414" width="80" height="16" rx="2" fill="${night > 0.5 ? mix(WARM, glass, 0.35) : glass}"/>`;
  out += `<path d="M332 414 v16 M352 414 v16 M372 414 v16" stroke="${white}" stroke-width="3"/>`;
  out += `<rect x="354" y="336" width="4" height="64" fill="${sh}"/><path d="M336 356 H376" stroke="${sh}" stroke-width="3"/>`;
  if (night > 0.5) {
    out += `<g class="a-twinkle-soft"><circle cx="356" cy="333" r="9" fill="#fff6dc" opacity=".3"/><circle cx="356" cy="333" r="3" fill="#fff6dc"/></g>`;
    out += `<circle cx="404" cy="440" r="3" fill="#7dff9a"/><circle cx="404" cy="440" r="8" fill="#7dff9a" opacity=".25"/>`;
  }
  // Two life rings on the cabin ends.
  for (const x of [76, 436]) out += `<circle cx="${x}" cy="476" r="9" fill="none" stroke="${mix("#e0603f", pal.mid, 0.3 * night)}" stroke-width="5"/>`;
  let flags = "";
  if (festive) {
    flags += bunting([530, 496], [450, 440], [356, 340], 10, 1);
    flags += bunting([356, 340], [200, 400], [40, 448], 12, 4);
  }
  const g = uid("hfglow");
  return {
    defs: radial(g, WARM, 0.4),
    body: `<g>${flags}${winGlow.replaceAll("GLOW", g)}${out}${wins}</g>`,
  };
}

/** Signal-flag bunting along a quadratic curve. */
function bunting(a: Pt, c: Pt, b: Pt, n: number, seed: number): string {
  const cols = ["#e0603f", "#f2c14e", "#2f5d8a", "#f4f1ea", "#5aa36b"];
  let out = `<path d="M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}" stroke="#2a2230" stroke-width="1.2" fill="none" opacity=".7"/>`;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0];
    const y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1];
    out += `<path d="M${f(x - 5)} ${f(y)} L${f(x + 5)} ${f(y)} L${f(x)} ${f(y + 11)} Z" fill="${cols[(i + seed) % cols.length]}" opacity=".9"/>`;
  }
  return out;
}

// ---- the wharf and the harbor front ------------------------------------------------

function wharf(pal: Palette, night: number): Layer {
  const wood = mix("#6b5446", pal.mid, 0.2 + 0.45 * night);
  const dark = shade(wood, 0.35);
  let piles = "";
  for (let x = 10; x < 590; x += 42) piles += `M${x} 598 V654 `;
  piles = `<path d="${piles}" stroke="${dark}" stroke-width="9"/>`;
  const lampXs = [90, 290, 490];
  const posts = lampXs.map((x) => `<rect x="${x - 3}" y="478" width="6" height="110" fill="${shade(pal.ink, 0.1)}"/>
    <path d="M${x - 9} 478 h18 l-3 -16 h-12 Z" fill="${shade(pal.ink, 0.1)}"/>
    <rect x="${x - 6}" y="464" width="12" height="12" fill="#ffe2a8"/>`).join("");
  const glows = lampXs.map((x) => glow(x, 470, 70, WARM, 0.5 + 0.2 * night, "a-twinkle-soft"));
  const wire = shade(pal.ink, 0.2);
  const stanch = [-10, 190, 390, 572];
  let lights = stanch.map((x) => `<rect x="${x - 2}" y="554" width="4" height="34" fill="${dark}"/>`).join("");
  for (let i = 1; i < stanch.length; i++) lights += stringLights(stanch[i - 1], 556, stanch[i], 556, 16, { count: 7, color: "#ffd58a", wire, seed: 3 + i });
  const dolphin = `<rect x="576" y="540" width="12" height="114" fill="${wood}"/><rect x="590" y="548" width="12" height="106" fill="${shade(wood, 0.15)}"/><rect x="604" y="556" width="11" height="98" fill="${wood}"/>
    <rect x="574" y="566" width="44" height="6" fill="${dark}"/><rect x="574" y="540" width="14" height="3" fill="${tint(wood, 0.2)}"/>`;
  const g = join(glows);
  return {
    defs: g.defs,
    body: `<g>${piles}${dolphin}
      <rect x="-10" y="586" width="584" height="14" fill="${wood}"/><rect x="-10" y="584" width="584" height="4" fill="${tint(wood, 0.2)}"/>
      <rect x="-10" y="596" width="584" height="4" fill="${dark}"/>
      ${posts}${g.body}${lights}</g>`,
  };
}

function buildings(pal: Palette, night: number, lit: number): Layer {
  const wall = mix("#9c9a93", pal.mid, 0.25 + 0.4 * night);
  const roof = mix("#4e5360", pal.ink, 0.2 + 0.4 * night);
  const c: HouseColors = {
    wall,
    roof,
    trim: mix("#f1ece2", pal.sky[1], 0.15 + 0.45 * night),
    glass: mix(pal.sky[2], pal.ink, 0.3),
    wallSh: shade(wall, 0.22), roofHi: tint(roof, 0.16), roofSh: shade(roof, 0.25),
  };
  const g = uid("hbwin");
  const ctx: HouseCtx = { g, lit, r: rng(71) };
  let out = "";
  out += house(c, ctx, { x: 1410, w: 210, top: 432, peak: 346, base: 608, kind: "front", floors: 2 });
  out += house(c, ctx, { x: 1220, w: 206, top: 382, peak: 316, base: 608, kind: "side", floors: 3, dormers: 2 });
  out += house(c, ctx, { x: 1050, w: 186, top: 478, peak: 404, base: 608, kind: "front", floors: 1, door: true });
  // Ferry office sign.
  out += `<rect x="1104" y="440" width="78" height="22" rx="2" fill="${mix("#22304c", pal.mid, 0.25)}"/><text x="1143" y="456" text-anchor="middle" font-family="Georgia, serif" font-size="12" font-weight="700" fill="${mix("#f4f1ea", pal.mid, 0.2)}" letter-spacing="2">FERRY</text>`;
  // Boardwalk on pilings.
  const wood = mix("#6b5446", pal.mid, 0.2 + 0.45 * night);
  let piles = "";
  for (let x = 1046; x < W; x += 38) piles += `M${x} 620 V670 `;
  out += `<path d="${piles}" stroke="${shade(wood, 0.35)}" stroke-width="9"/>`;
  out += `<rect x="1030" y="606" width="${W - 1030}" height="14" fill="${wood}"/><rect x="1030" y="604" width="${W - 1030}" height="4" fill="${tint(wood, 0.2)}"/>`;
  out += stringLights(1040, 498, 1600, 470, 26, { count: 14, color: "#ffd58a", wire: shade(pal.ink, 0.2), seed: 9 });
  return { defs: radial(g, WARM, 0.45), body: `<g>${out}</g>` };
}

function house(c: HouseColors, ctx: HouseCtx, { x, w, top, peak, base, kind, floors, dormers = 0, door = false }: HouseOpts): string {
  const { r, lit, g } = ctx;
  let out = "";
  let courses = "";
  for (let y = top + 10; y < base; y += 10) courses += `M${x} ${y} h${w} `;
  if (kind === "front") {
    const cx = x + w / 2;
    out += `<path d="M${x} ${base} V${top} L${cx} ${peak + 10} L${x + w} ${top} V${base} Z" fill="${c.wall}"/>`;
    for (let y = peak + 20; y < top + 10; y += 10) courses += `M${x} ${y} h${w} `;
    out += `<path d="${courses}" stroke="${c.wallSh}" stroke-width="1.4" stroke-dasharray="9 6" opacity=".55"/>`;
    out += `<path d="M${cx} ${peak + 10} L${x + w} ${top} V${base} H${x + w - 26} Z" fill="${c.wallSh}" opacity=".4"/>`;
    out += `<path d="M${x - 12} ${top + 6} L${cx} ${peak} L${x + w + 12} ${top + 6} L${x + w + 12} ${top + 16} L${cx} ${peak + 12} L${x - 12} ${top + 16} Z" fill="${c.roof}"/>`;
    out += `<path d="M${cx} ${peak} L${x + w + 12} ${top + 6}" stroke="${c.roofHi}" stroke-width="3"/>`;
    out += win(c, g, cx - 11, peak + (top - peak) * 0.42, 22, 22, r() < lit);
  } else {
    out += `<rect x="${x}" y="${top}" width="${w}" height="${base - top}" fill="${c.wall}"/>`;
    out += `<path d="${courses}" stroke="${c.wallSh}" stroke-width="1.4" stroke-dasharray="9 6" opacity=".55"/>`;
    out += `<path d="M${x - 12} ${top + 6} L${x + 30} ${peak} L${x + w - 30} ${peak} L${x + w + 12} ${top + 6} Z" fill="${c.roof}"/>`;
    let rc = "";
    for (let y = peak + 9; y < top + 4; y += 9) rc += `M${x} ${y} H${x + w} `;
    out += `<path d="${rc}" stroke="${c.roofSh}" stroke-width="1.4" opacity=".6"/><path d="M${x + 30} ${peak} H${x + w - 30}" stroke="${c.roofHi}" stroke-width="3"/>`;
    for (let i = 0; i < dormers; i++) {
      const dx = x + w * (0.22 + i * 0.4), dw = 38;
      out += `<rect x="${f(dx)}" y="${peak + 12}" width="${dw}" height="${top - peak - 8}" fill="${c.wall}"/><path d="M${f(dx - 6)} ${peak + 16} L${f(dx + dw / 2)} ${peak - 2} L${f(dx + dw + 6)} ${peak + 16} Z" fill="${c.roof}"/>`;
      out += win(c, g, dx + 10, peak + 22, 18, top - peak - 24, r() < lit);
    }
  }
  out += `<rect x="${f(x + w * 0.66)}" y="${f(peak - 4)}" width="16" height="${kind === "front" ? 36 : 26}" fill="${c.roofSh}"/><rect x="${f(x + w * 0.66 - 2)}" y="${f(peak - 8)}" width="20" height="5" fill="${c.roofHi}"/>`;
  const cols = Math.max(2, Math.round(w / 64));
  for (let fl = 0; fl < floors; fl++) {
    const wy = top + 22 + fl * 64;
    for (let i = 0; i < cols; i++) {
      const wx = x + (w / cols) * (i + 0.5) - 13;
      if (door && i === Math.floor(cols / 2) && cols % 2) continue;
      out += win(c, g, wx, wy, 26, 36, r() < lit);
    }
  }
  if (door) {
    const dx = x + w / 2 - 15;
    out += `<rect x="${dx - 4}" y="${base - 66}" width="38" height="66" fill="${c.trim}"/><rect x="${dx}" y="${base - 62}" width="30" height="62" fill="${r() < lit + 0.4 ? WARM : c.glass}"/>`;
  }
  return out;
}

function win(c: HouseColors, g: string, x: number, y: number, w: number, h: number, on: boolean): string {
  let out = "";
  if (on) out += `<circle cx="${f(x + w / 2)}" cy="${f(y + h / 2)}" r="${f(Math.max(w, h) * 1.1)}" fill="url(#${g})"/>`;
  out += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${on ? WARM : c.glass}" stroke="${c.trim}" stroke-width="3"/>`;
  out += `<path d="M${f(x + w / 2)} ${f(y)} v${f(h)} M${f(x)} ${f(y + h / 2)} h${f(w)}" stroke="${c.trim}" stroke-width="2"/>`;
  return out;
}

/** Light from the lamps and the harbor front, broken up on the water. */
function reflections(pal: Palette, night: number): Layer {
  const r = rng(85);
  const dk = uid("hbdk");
  let out = "";
  const streak = (x: number, y0: number, n: number, w0: number, color: string, op: number): string => {
    let d = "";
    for (let i = 0; i < n; i++) {
      const y = y0 + i * 10 + r() * 6, w = (w0 + i * 2.5) * (0.45 + r() * 0.9) - (i > n * 0.6 ? (i - n * 0.6) * 4 : 0);
      d += `M${f(x - w / 2 + (r() - 0.5) * 16)} ${f(y)} h${f(Math.max(3, w))} `;
    }
    return `<path d="${d}" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-opacity="${f(op)}" class="a-wave" style="animation-delay:-${f(r() * 5)}s"/>`;
  };
  for (const x of [90, 290, 490]) out += streak(x, 664, 10, 8, WARM, 0.75);
  for (const x of [1084, 1204, 1320, 1392, 1450, 1520]) out += streak(x, 680, 7, 12, WARM, 0.3 + 0.35 * night);
  return {
    defs: `<linearGradient id="${dk}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(pal.sea[1], 0.3)}" stop-opacity=".55"/><stop offset="1" stop-color="${shade(pal.sea[1], 0.3)}" stop-opacity="0"/></linearGradient>`,
    body: out,
  };
}

// ---- people and lanterns -------------------------------------------------------

function crowd(pal: Palette, _night: number, h0: number, foot: number, x0: number, x1: number, n: number): Layer {
  const ink = shade(pal.ink, 0.15);
  const r = rng(Math.round(x0 + n * 7));
  let out = "", lamps = "";
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.2 + r() * 0.6)) / n;
    const child = r() < 0.15;
    const h = h0 * (child ? 0.62 : 0.88 + r() * 0.24);
    const hr = h * 0.095, w = h * (0.26 + r() * 0.08);
    const sy = foot - h + hr * 2.2;
    out += `<path d="M${f(x - w * 0.42)} ${foot} L${f(x - w * 0.5)} ${f(sy + 6)} Q${f(x - w * 0.5)} ${f(sy)} ${f(x - w * 0.25)} ${f(sy)} H${f(x + w * 0.25)} Q${f(x + w * 0.5)} ${f(sy)} ${f(x + w * 0.5)} ${f(sy + 6)} L${f(x + w * 0.42)} ${foot} Z"/>`;
    out += `<circle cx="${f(x)}" cy="${f(sy - hr * 0.9)}" r="${f(hr)}"/>`;
    const kind = r();
    if (kind < 0.18) out += `<path d="M${f(x - hr * 1.5)} ${f(sy - hr * 1.2)} h${f(hr * 3)} v-2 h-${f(hr * 3)} Z"/><rect x="${f(x - hr)}" y="${f(sy - hr * 2.3)}" width="${f(hr * 2)}" height="${f(hr * 1.2)}"/>`;
    else if (kind < 0.36) out += `<circle cx="${f(x + hr * 0.5)}" cy="${f(sy - hr * 1.9)}" r="${f(hr * 0.6)}"/>`;
    // Every third person holds a lantern up, ready to let it go.
    if (i % 3 === 1 && !child) {
      const hx = x + w * 0.5, hy = sy - hr * 3.4;
      out += `<path d="M${f(x + w * 0.35)} ${f(sy + 3)} L${f(hx)} ${f(hy + 4)}" stroke="${ink}" stroke-width="${f(w * 0.2)}" stroke-linecap="round"/>`;
      lamps += skyLantern(hx, hy, 0.8, `<circle cx="${f(hx)}" cy="${f(hy - 10)}" r="30" fill="url(#LG)"/>`);
    }
  }
  const lg = uid("hcl");
  return { defs: radial(lg, LANTERN, 0.55), body: `<g fill="${ink}">${out}</g>${lamps.replaceAll("LG", lg)}` };
}

/** A paper sky lantern, bottom opening at (x, y). */
function skyLantern(x: number, y: number, s: number, glowEl = ""): string {
  return `${glowEl}<path d="M${f(x - 10 * s)} ${f(y - 24 * s)} Q${f(x)} ${f(y - 31 * s)} ${f(x + 10 * s)} ${f(y - 24 * s)} L${f(x + 7 * s)} ${f(y)} L${f(x - 7 * s)} ${f(y)} Z" fill="${LANTERN}"/>
    <path d="M${f(x - 7 * s)} ${f(y - 10 * s)} L${f(x + 7.6 * s)} ${f(y - 10 * s)} L${f(x + 7 * s)} ${f(y)} L${f(x - 7 * s)} ${f(y)} Z" fill="${LANTERN_HI}" opacity=".85"/>
    <ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(6 * s)}" ry="${f(2 * s)}" fill="#fff6dc"/>`;
}

function risingLanterns(n: number, seed: number): Layer {
  const r = rng(seed);
  const lg = uid("hrl");
  let out = "";
  for (let i = 0; i < n; i++) {
    const side = r();
    const x = side < 0.42 ? 20 + r() * 520 : side < 0.8 ? 1060 + r() * 520 : 580 + r() * 460;
    const y = 560 + r() * 240;
    const s = 0.75 + ((y - 560) / 240) * 0.6;
    const dur = 26 + r() * 14;
    out += `<g class="a-rise" style="animation-duration:${f(dur)}s;animation-delay:-${f(r() * dur)}s">${skyLantern(x, y, s, `<circle cx="${f(x)}" cy="${f(y - 12 * s)}" r="${f(40 * s)}" fill="url(#${lg})"/>`)}</g>`;
  }
  return { defs: radial(lg, LANTERN, 0.5), body: out };
}

/** Distant lanterns already high over the harbor. */
function skyLanterns(n: number, seed: number): Layer {
  const r = rng(seed);
  const lg = uid("hsl");
  let out = "";
  for (let i = 0; i < n; i++) {
    const x = r() < 0.75 ? (r() < 0.5 ? r() * 560 : 1040 + r() * 560) : 560 + r() * 480;
    const y = 50 + r() * 360, s = 0.6 + r() * 0.9, dur = 40 + r() * 30;
    out += `<g class="harbor-float" style="animation-duration:${f(dur)}s;animation-delay:-${f(r() * dur)}s"><circle cx="${f(x)}" cy="${f(y)}" r="${f(9 * s)}" fill="url(#${lg})"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(1.8 * s)}" fill="${LANTERN_HI}"/></g>`;
  }
  return { defs: radial(lg, LANTERN, 0.7), body: out };
}

/** Little paper boat-lanterns drifting on the water, each with its reflection. */
function waterLanterns(n: number, seed: number): Layer {
  const r = rng(seed);
  const lg = uid("hwl");
  let out = "";
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const y = 680 + t * t * 140 + r() * 20;
    const x = (i * 0.618 * W + r() * 180) % W;
    const s = 0.75 + ((y - 680) / 160) * 0.75;
    const w = 16 * s, h = 12 * s;
    const drift = 90 + r() * 80, bob = 4 + r() * 3;
    out += `<g class="a-fog" style="animation-duration:${f(drift)}s;animation-delay:-${f(r() * drift)}s">
      <path d="M${f(x - w * 0.6)} ${f(y + 6 * s)} h${f(w * 1.2)} M${f(x - w * 0.4)} ${f(y + 14 * s)} h${f(w * 0.8)} M${f(x - w * 0.25)} ${f(y + 22 * s)} h${f(w * 0.5)}" stroke="${LANTERN}" stroke-width="${f(2.4 * s)}" stroke-linecap="round" stroke-opacity=".6" class="a-wave" style="animation-delay:-${f(r() * 5)}s"/>
      <g class="a-bob" style="animation-duration:${f(bob)}s;animation-delay:-${f(r() * bob)}s">
        <circle cx="${f(x)}" cy="${f(y - h * 0.6)}" r="${f(34 * s)}" fill="url(#${lg})"/>
        <rect x="${f(x - w * 0.6)}" y="${f(y - 2 * s)}" width="${f(w * 1.2)}" height="${f(4 * s)}" rx="1" fill="#5a3a2a"/>
        <rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="${LANTERN}"/>
        <rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w * 0.55)}" height="${f(h)}" fill="${LANTERN_HI}"/>
        <path d="M${f(x - w * 0.55)} ${f(y - h)} L${f(x)} ${f(y - h - 5 * s)} L${f(x + w * 0.55)} ${f(y - h)} Z" fill="${shade(LANTERN, 0.2)}"/>
      </g>
    </g>`;
  }
  return { defs: radial(lg, LANTERN, 0.5), body: out };
}

function perchedGull(pal: Palette, night: number, x: number, y: number): string {
  const body = mix("#f4f1ea", pal.sky[1], 0.15 + 0.4 * night);
  const wing = mix("#8a919c", pal.mid, 0.3 * night);
  return `<g>
    <path d="M${x - 14} ${y - 2} Q${x - 12} ${y - 14} ${x} ${y - 14} Q${x + 9} ${y - 14} ${x + 10} ${y - 6} L${x + 4} ${y} Z" fill="${body}"/>
    <circle cx="${x + 7}" cy="${y - 18}" r="6" fill="${body}"/>
    <path d="M${x + 12} ${y - 19} l6 1.5 l-6 1.5 Z" fill="#e8b23a"/>
    <path d="M${x - 16} ${y - 4} Q${x - 6} ${y - 14} ${x + 6} ${y - 9} L${x - 2} ${y - 2} Z" fill="${wing}"/>
    <path d="M${x - 16} ${y - 4} l-6 2 l6 1 Z" fill="${shade(wing, 0.5)}"/>
  </g>`;
}

// ---- foreground ------------------------------------------------------------------

function foreDock(pal: Palette, night: number): string {
  const wood = shade(mix("#8a6a52", pal.light, 0.15), 0.1 + 0.4 * night);
  const dark = shade(wood, 0.35);
  let seams = "";
  for (let x = -40; x < W; x += 170) seams += `M${x} 856 v44 `;
  const iron = mix("#2e2a33", pal.ink, 0.3);
  const rope = mix("#d9c69c", pal.mid, 0.2 + 0.35 * night);
  let coil = "";
  for (let i = 0; i < 4; i++) coil += `<ellipse cx="1450" cy="${846 - i * 4}" rx="${58 - i * 9}" ry="${14 - i * 2}" fill="none" stroke="${rope}" stroke-width="7"/>`;
  return `<g>
    <rect x="0" y="842" width="${W}" height="${H - 842}" fill="${wood}"/>
    <rect x="0" y="840" width="${W}" height="5" fill="${tint(wood, 0.25)}"/>
    <path d="M0 872 H${W} ${seams}" stroke="${dark}" stroke-width="2" opacity=".6"/>
    <path d="M150 846 V806 Q150 794 162 792 H178 Q190 794 190 806 V846 Z" fill="${iron}"/>
    <rect x="142" y="786" width="56" height="12" rx="6" fill="${iron}"/><rect x="146" y="786" width="20" height="4" rx="2" fill="${tint(iron, 0.3)}"/>
    <path d="M190 808 Q250 812 268 842 Q282 870 300 ${H + 10}" stroke="${rope}" stroke-width="7" fill="none"/>
    ${coil}
  </g>`;
}
