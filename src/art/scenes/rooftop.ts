// The flat tar roof above Second Spin on Wharf Street, 1:30 a.m. Noor's
// home-made antenna mast blinks over the sleeping town; past the gray
// shingles lie the harbor, the wharf lights and, out on the north point,
// the dark shape of the North Light.
import type { Palette, Part, Layer, SceneInput } from "../kit";
import { W, H, sky, moon, stars, cloudBand, ridge, sea, glow, radial, rng, uid, shade, tint, mix } from "../kit";

type Pt = [number, number];

/** Colors for one depth of town houses (see townColors). */
interface TownColors {
  wall: string;
  wallSh: string;
  roof: string;
  roofSh: string;
  roofHi: string;
  trim: string;
  glass: string;
}

/** Window-glow gradient ids shared by every house. */
interface TownCtx {
  wg: string;
  tvg: string;
}

interface HouseOpts {
  x: number;
  w: number;
  base: number;
  top: number;
  peak: number;
  kind: "front" | "side";
  seed: number;
  lit?: number;
  tv?: boolean;
  dormer?: boolean;
}

const f = (n: number): number => Math.round(n * 10) / 10;
const WARM = "#ffcf86";
const LED = "#ff3b30";

export function rooftop({ pal }: SceneInput): Part[] {
  const parts: Part[] = [];
  const night = pal.stars ?? 1;
  const horizon = 405;

  parts.push(sky(pal));
  parts.push(milkyWay(night));
  parts.push(`<g opacity="${f(Math.max(0.15, night))}">${stars(115, 61, 400)}</g>`);
  parts.push(meteor(night));
  parts.push(moon(1150, 148, 30));
  parts.push(cloudBand(pal, { seed: 12, y0: 70, y1: 250, count: 3, speed: 260, opacity: 0.16 }));

  // Far: the north point with the lighthouse, a low island to the east.
  parts.push(northPoint(pal, horizon));
  parts.push(ridge({ y: horizon - 12, amp: 10, color: mix(pal.far, pal.sky[0], 0.45), seed: 3, x0: 1180, x1: 1720, bottom: horizon + 2, steps: 8 }));

  // The harbor, the moon on the water, the wharf and its lamps.
  parts.push(sea(pal, { top: horizon, bottom: 640, seed: 9, glint: "#f4f1dc", glints: 26, glintOpacity: 0.3 }));
  parts.push(moonPath(1150, horizon));
  parts.push(wharf(pal, horizon));

  // The town below: gray shingles, a steeple, a few lights still on.
  parts.push(town(pal, night));
  parts.push(streetGlow());

  // Our roof: parapet, chimney, the gear Noor dragged up here.
  parts.push(parapet(pal));
  parts.push(roofDeck(pal));
  parts.push(chimney(pal, 118, 262));
  parts.push(toolbox(pal, 296, 584));
  parts.push(campLantern(pal, 462, 584));
  parts.push(mug(pal, 520, 584));
  parts.push(chair(pal, 1196, 652));
  parts.push(mast(pal, 1392));
  return parts;
}

// ---- sky ---------------------------------------------------------------------

function milkyWay(night: number): Layer {
  const g = uid("rtmw");
  const r = rng(71);
  let dust = "";
  for (let i = 0; i < 32; i++) {
    const t = r(), x = -60 + t * 980, y = 40 + t * 250 + (r() - 0.5) * 90;
    dust += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.5 + r() * 0.9)}" fill="#e8ecff" opacity="${f(0.25 + r() * 0.45)}"/>`;
  }
  return {
    defs: `<radialGradient id="${g}"><stop offset="0" stop-color="#b9c3ff" stop-opacity=".16"/><stop offset=".6" stop-color="#9aa6e6" stop-opacity=".06"/><stop offset="1" stop-color="#9aa6e6" stop-opacity="0"/></radialGradient>`,
    body: `<g opacity="${f(night)}"><ellipse cx="420" cy="160" rx="560" ry="70" fill="url(#${g})" transform="rotate(14 420 160)"/>
      <ellipse cx="300" cy="120" rx="260" ry="40" fill="url(#${g})" transform="rotate(16 300 120)"/>${dust}</g>`,
  };
}

/** A shooting star every so often, upper left. */
function meteor(night: number): Layer {
  const g = uid("rtmet");
  return {
    defs: `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff" stop-opacity=".95"/></linearGradient>`,
    body: `<style>
      @keyframes rooftop-meteor { 0%, 90% { transform: translate(0, 0); opacity: 0; } 91% { opacity: 1; } 95% { transform: translate(-300px, 120px); opacity: 0; } 100% { transform: translate(-300px, 120px); opacity: 0; } }
      .rooftop-meteor { animation: rooftop-meteor 14s linear infinite; animation-delay: -9s; }
      @keyframes rooftop-tv { 0%, 100% { opacity: .55; } 12% { opacity: .95; } 25% { opacity: .62; } 38% { opacity: 1; } 52% { opacity: .7; } 66% { opacity: .9; } 82% { opacity: .5; } }
      .rooftop-tv { animation: rooftop-tv 3.4s steps(1) infinite; }
    </style>
    <g opacity="${f(night)}"><g class="rooftop-meteor"><path d="M640 70 L700 46" stroke="url(#${g})" stroke-width="2.4" stroke-linecap="round" transform="rotate(180 670 58)"/></g></g>`,
  };
}

function northPoint(pal: Palette, horizon: number): string {
  const land = mix(pal.far, pal.sky[0], 0.28);
  const dark = shade(pal.far, 0.35);
  const x = 498, base = 384;
  const r = rng(17);
  let lights = "";
  for (let i = 0; i < 6; i++) {
    const hx = 40 + i * 70 + r() * 30, hw = 14 + r() * 10;
    lights += `<rect x="${f(hx)}" y="${horizon - 9}" width="${f(hw)}" height="8" fill="${mix(land, pal.sky[0], 0.15)}"/><path d="M${f(hx - 2)} ${horizon - 9} L${f(hx + hw / 2)} ${horizon - 15} L${f(hx + hw + 2)} ${horizon - 9} Z" fill="${shade(land, 0.15)}"/>`;
    if (r() > 0.55) lights += `<rect x="${f(hx + hw / 2 - 1.5)}" y="${horizon - 7}" width="3" height="3" fill="${WARM}" opacity=".85"/>`;
  }
  return `<g>
    <path d="M-20 ${horizon + 2} L-20 356 Q120 344 250 360 Q380 374 470 382 Q560 388 620 ${horizon + 2} Z" fill="${land}"/>
    <path d="M-20 ${horizon + 2} L-20 380 Q200 372 380 386 Q520 396 620 ${horizon + 2} Z" fill="${shade(land, 0.12)}"/>
    ${lights}
    <rect x="${x - 34}" y="${base - 10}" width="24" height="12" fill="${dark}"/><path d="M${x - 37} ${base - 10} L${x - 22} ${base - 18} L${x - 7} ${base - 10} Z" fill="${dark}"/>
    <g transform="translate(${x} ${base}) scale(1.45)">
      <path d="M-8 0 L-5 -56 L5 -56 L8 0 Z" fill="${dark}"/>
      <path d="M2 0 L3 -56 L5 -56 L8 0 Z" fill="${mix(dark, "#f4f1dc", 0.12)}"/>
      <rect x="-8" y="-60" width="16" height="4" fill="${dark}"/>
      <rect x="-5" y="-69" width="10" height="9" fill="${mix(dark, pal.sky[1], 0.5)}"/>
      <path d="M-6 -69 L0 -76 L6 -69 Z" fill="${dark}"/><path d="M0 -76 v-4" stroke="${dark}" stroke-width="1.2"/>
    </g>
  </g>`;
}

function moonPath(x: number, horizon: number): string {
  const r = rng(29);
  let out = "";
  for (let i = 0; i < 16; i++) {
    const t = i / 16, y = horizon + 5 + t * t * 160, w = 20 + t * 90 + r() * 26;
    out += `<path d="M${f(x - w / 2 + (r() - 0.5) * 24)} ${f(y)} h${f(w)}" stroke="#f4f1dc" stroke-width="${f(1.6 + t * 2.4)}" stroke-linecap="round" opacity="${f(0.5 - t * 0.2)}" class="a-wave" style="animation-delay:-${f(r() * 5)}s"/>`;
  }
  return out;
}

function wharf(pal: Palette, _horizon: number): Layer {
  const lg = uid("rtlamp");
  const wood = mix("#5a4a42", pal.far, 0.55);
  const y = 462;
  let out = `<rect x="880" y="${y}" width="760" height="10" fill="${wood}"/><rect x="880" y="${y}" width="760" height="2" fill="${tint(wood, 0.2)}"/>`;
  let piles = "";
  for (let x = 888; x < W + 20; x += 26) piles += `M${x} ${y + 10} V${y + 26} `;
  out += `<path d="${piles}" stroke="${shade(wood, 0.25)}" stroke-width="4"/>`;
  // Fish shack at the end, boats tied alongside.
  out += `<rect x="884" y="${y - 24}" width="56" height="24" fill="${mix("#7a7f88", pal.far, 0.55)}"/><path d="M880 ${y - 24} L912 ${y - 38} L944 ${y - 24} Z" fill="${shade(wood, 0.2)}"/><rect x="904" y="${y - 17}" width="8" height="8" fill="${WARM}" opacity=".75"/>`;
  out += `<path d="M1022 ${y + 30} q36 6 72 0 l-6 8 h-60 Z" fill="${shade(pal.far, 0.2)}"/><path d="M1052 ${y + 30} V${y - 18}" stroke="${shade(pal.far, 0.1)}" stroke-width="1.5"/>`;
  out += `<path d="M1270 ${y + 30} q30 5 60 0 l-5 7 h-50 Z" fill="${shade(pal.far, 0.2)}"/><rect x="1290" y="${y + 22}" width="18" height="8" fill="${shade(pal.far, 0.15)}"/>`;
  const r = rng(37);
  let lamps = "", refl = "";
  for (let x = 950; x < W; x += 130) {
    lamps += `<rect x="${x - 1}" y="${y - 30}" width="2" height="30" fill="${shade(wood, 0.3)}"/>`;
    lamps += `<g class="a-twinkle-soft" style="animation-delay:-${f(r() * 3)}s"><circle cx="${x}" cy="${y - 32}" r="22" fill="url(#${lg})"/><circle cx="${x}" cy="${y - 32}" r="2.8" fill="#ffe7b0"/></g>`;
    for (let i = 0; i < 6; i++) {
      const yy = y + 32 + i * 9, w = 6 + i * 2.5;
      refl += `<path d="M${f(x - w / 2 + (r() - 0.5) * 6)} ${yy} h${f(w)}" stroke="${WARM}" stroke-width="2" stroke-linecap="round" opacity="${f(0.55 - i * 0.07)}" class="a-wave" style="animation-delay:-${f(r() * 5)}s"/>`;
    }
  }
  return { defs: radial(lg, WARM, 0.55), body: `<g>${refl}${out}${lamps}</g>` };
}

// ---- the town --------------------------------------------------------------

function townColors(pal: Palette, haze: number): TownColors {
  const wall = mix(mix("#8e8b84", pal.mid, 0.6), pal.sky[0], haze);
  const roof = mix(mix("#4f5058", pal.ink, 0.5), pal.sky[0], haze);
  return {
    wall, wallSh: shade(wall, 0.22), roof, roofSh: shade(roof, 0.25), roofHi: tint(roof, 0.14),
    trim: mix(mix("#e6e1d6", pal.mid, 0.55), pal.sky[0], haze), glass: mix(shade(pal.sky[2], 0.2), pal.sky[0], haze),
  };
}

function town(pal: Palette, _night: number): Layer {
  const wg = uid("rtwg"), tvg = uid("rttv");
  const defs = radial(wg, WARM, 0.45) + radial(tvg, "#9fb6ff", 0.5);
  const far = townColors(pal, 0.12), near = townColors(pal, 0);
  const ctx: TownCtx = { wg, tvg };
  let out = "";
  // Church on the hill behind.
  out += steeple(pal, 282, 470);
  out += house(far, ctx, { x: 520, w: 520, base: 600, top: 556, peak: 516, kind: "side", seed: 3, lit: 0.18 });
  out += house(far, ctx, { x: 760, w: 170, base: 600, top: 540, peak: 500, kind: "front", seed: 4, lit: 0.4 });
  out += house(near, ctx, { x: -30, w: 200, base: 610, top: 470, peak: 404, kind: "front", seed: 5, lit: 0.35, dormer: false });
  out += house(near, ctx, { x: 150, w: 232, base: 610, top: 520, peak: 458, kind: "side", seed: 6, lit: 0.3, dormer: true });
  out += house(near, ctx, { x: 364, w: 196, base: 610, top: 528, peak: 470, kind: "front", seed: 7, lit: 0.5, tv: true });
  out += house(near, ctx, { x: 1000, w: 210, base: 610, top: 540, peak: 490, kind: "front", seed: 8, lit: 0.4 });
  out += house(near, ctx, { x: 1190, w: 250, base: 610, top: 560, peak: 508, kind: "side", seed: 9, lit: 0.25, dormer: true });
  out += house(near, ctx, { x: 1428, w: 200, base: 610, top: 526, peak: 468, kind: "front", seed: 10, lit: 0.45 });
  return { defs, body: `<g>${out}</g>` };
}

function steeple(pal: Palette, x: number, base: number): string {
  const white = mix(mix("#e9e4da", pal.mid, 0.5), pal.sky[0], 0.1);
  const sh = shade(white, 0.25);
  return `<g>
    <rect x="${x - 20}" y="${base - 110}" width="40" height="110" fill="${white}"/><rect x="${x + 8}" y="${base - 110}" width="12" height="110" fill="${sh}"/>
    <rect x="${x - 23}" y="${base - 118}" width="46" height="10" fill="${tint(white, 0.1)}"/>
    <rect x="${x - 16}" y="${base - 158}" width="32" height="42" fill="${white}"/><rect x="${x + 6}" y="${base - 158}" width="10" height="42" fill="${sh}"/>
    <path d="M${x - 8} ${base - 122} V${base - 144} Q${x} ${base - 152} ${x + 8} ${base - 144} V${base - 122} Z" fill="${shade(white, 0.5)}"/>
    <path d="M${x - 18} ${base - 158} L${x} ${base - 232} L${x + 18} ${base - 158} Z" fill="${white}"/><path d="M${x} ${base - 232} L${x + 18} ${base - 158} L${x + 6} ${base - 158} Z" fill="${sh}"/>
    <circle cx="${x}" cy="${base - 80}" r="9" fill="${shade(white, 0.4)}"/>
  </g>`;
}

/** A gray-shingled island house. kind "front" shows the gable, "side" the roof. */
function house(c: TownColors, ctx: TownCtx, { x, w, base, top, peak, kind, seed, lit = 0.3, tv = false, dormer = false }: HouseOpts): string {
  const r = rng(seed);
  let out = "";
  let courses = "";
  if (kind === "front") {
    const cx = x + w / 2;
    out += `<path d="M${x} ${base} V${top} L${cx} ${peak + 8} L${x + w} ${top} V${base} Z" fill="${c.wall}"/>`;
    out += `<path d="M${cx} ${peak + 8} L${x + w} ${top} V${base} H${cx + w * 0.3} Z" fill="${c.wallSh}" opacity=".35"/>`;
    for (let y = top - 40; y < base; y += 9) courses += `M${x} ${y} h${w} `;
    out += `<path d="${courses}" stroke="${c.wallSh}" stroke-width="1.2" stroke-dasharray="7 5" opacity=".55"/>`;
    // Rakes, with a sliver of moonlit roof on the far side.
    out += `<path d="M${x - 10} ${top + 8} L${cx} ${peak} L${x + w + 10} ${top + 8} L${x + w + 10} ${top + 16} L${cx} ${peak + 10} L${x - 10} ${top + 16} Z" fill="${c.roof}"/>`;
    out += `<path d="M${cx} ${peak} L${x + w + 10} ${top + 8}" stroke="${c.roofHi}" stroke-width="2.5"/>`;
    out += window(c, ctx, cx - 8, peak + (top - peak) * 0.45, 16, 16, r() < lit, false, true);
  } else {
    out += `<rect x="${x}" y="${top}" width="${w}" height="${base - top}" fill="${c.wall}"/>`;
    for (let y = top + 8; y < base; y += 9) courses += `M${x} ${y} h${w} `;
    out += `<path d="${courses}" stroke="${c.wallSh}" stroke-width="1.2" stroke-dasharray="7 5" opacity=".55"/>`;
    out += `<path d="M${x - 10} ${top + 4} L${x + 26} ${peak} L${x + w - 26} ${peak} L${x + w + 10} ${top + 4} Z" fill="${c.roof}"/>`;
    let rc = "";
    for (let y = peak + 8; y < top; y += 8) rc += `M${x} ${y} H${x + w} `;
    out += `<path d="${rc}" stroke="${c.roofSh}" stroke-width="1.2" opacity=".6"/>`;
    out += `<path d="M${x + 26} ${peak} H${x + w - 26}" stroke="${c.roofHi}" stroke-width="3"/>`;
    if (dormer) {
      const dx = x + w * (0.3 + r() * 0.3), dw = 34;
      out += `<rect x="${f(dx)}" y="${peak + 6}" width="${dw}" height="${top - peak - 6}" fill="${c.wall}"/><path d="M${f(dx - 5)} ${peak + 10} L${f(dx + dw / 2)} ${peak - 6} L${f(dx + dw + 5)} ${peak + 10} Z" fill="${c.roof}"/>`;
      out += window(c, ctx, dx + 9, peak + 12, 16, Math.max(10, top - peak - 14), r() < lit + 0.2, false, true);
    }
  }
  // Chimney.
  const chx = x + w * (0.2 + r() * 0.6);
  out += `<rect x="${f(chx)}" y="${f(peak + (kind === "front" ? 30 : 0) - 18)}" width="14" height="22" fill="${c.roofSh}"/><rect x="${f(chx - 2)}" y="${f(peak + (kind === "front" ? 30 : 0) - 20)}" width="18" height="4" fill="${c.roofHi}"/>`;
  // Windows across the floors.
  const cols = Math.max(2, Math.floor(w / 60));
  let tvDone = false;
  for (let fl = 0; fl < 2; fl++) {
    const wy = top + 14 + fl * 48;
    if (wy + 20 > base) break;
    for (let i = 0; i < cols; i++) {
      const wx = x + (w / cols) * (i + 0.5) - 8;
      const isTv = tv && !tvDone && i === cols - 1;
      if (isTv) tvDone = true;
      out += window(c, ctx, wx, wy, 16, 20, isTv || r() < lit, isTv);
    }
  }
  return out;
}

function window(c: TownColors, ctx: TownCtx, x: number, y: number, w: number, h: number, on: boolean, tv = false, small = false): string {
  let out = "";
  if (on) {
    const gid = tv ? ctx.tvg : ctx.wg;
    out += `<circle cx="${f(x + w / 2)}" cy="${f(y + h / 2)}" r="${small ? 20 : 28}" fill="url(#${gid})"${tv ? ' class="rooftop-tv"' : ""}/>`;
  }
  out += `<rect x="${f(x)}" y="${f(y)}" width="${w}" height="${h}" fill="${on ? (tv ? "#a9c0ff" : WARM) : c.glass}" stroke="${c.trim}" stroke-width="2.5" stroke-opacity=".7"${tv ? ' class="rooftop-tv"' : ""}/>`;
  out += `<path d="M${f(x + w / 2)} ${f(y)} v${h} M${f(x)} ${f(y + h / 2)} h${w}" stroke="${c.trim}" stroke-width="1.5" opacity=".8"/>`;
  return out;
}

/** Sodium light coming up from Wharf Street, just behind the parapet. */
function streetGlow(): Layer {
  const g = uid("rtst");
  return {
    defs: `<radialGradient id="${g}"><stop offset="0" stop-color="#ffb35c" stop-opacity=".32"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient>`,
    body: `<ellipse cx="380" cy="600" rx="420" ry="70" fill="url(#${g})"/><ellipse cx="1240" cy="604" rx="460" ry="64" fill="url(#${g})"/>`,
  };
}

// ---- our roof ----------------------------------------------------------------

function parapet(pal: Palette): string {
  const brick = mix("#8a4b3c", pal.mid, 0.6);
  const mortar = shade(brick, 0.3);
  const cap = mix("#a9a49a", pal.mid, 0.5);
  let rows = "";
  for (let y = 612, i = 0; y < 690; y += 13, i++) {
    rows += `M0 ${y} H${W} `;
    for (let x = (i % 2) * 22; x < W; x += 44) rows += `M${x} ${y} v-13 `;
  }
  return `<g>
    <rect x="0" y="596" width="${W}" height="96" fill="${brick}"/>
    <path d="${rows}" stroke="${mortar}" stroke-width="1.6" opacity=".55"/>
    <rect x="0" y="596" width="${W}" height="14" fill="${shade(brick, 0.25)}" opacity=".7"/>
    <rect x="-10" y="580" width="${W + 20}" height="18" fill="${cap}"/>
    <rect x="-10" y="580" width="${W + 20}" height="3" fill="${tint(cap, 0.35)}"/>
    <rect x="-10" y="594" width="${W + 20}" height="5" fill="${shade(cap, 0.35)}"/>
  </g>`;
}

function roofDeck(pal: Palette): string {
  const tar = mix("#2b2a30", pal.ink, 0.35);
  const r = rng(53);
  let grit = "";
  for (let i = 0; i < 26; i++) {
    const t = r();
    grit += `<circle cx="${f(r() * W)}" cy="${f(700 + t * t * 200)}" r="${f(0.8 + t * 1.8)}" fill="${tint(tar, 0.18)}" opacity=".45"/>`;
  }
  return `<g>
    <rect x="0" y="690" width="${W}" height="${H - 690}" fill="${tar}"/>
    <rect x="0" y="690" width="${W}" height="10" fill="${shade(tar, 0.4)}"/>
    <path d="M0 760 Q400 752 820 770 T1600 758 M0 842 Q500 830 980 850 T1600 836" stroke="${shade(tar, 0.25)}" stroke-width="5" fill="none" opacity=".6"/>
    <ellipse cx="1010" cy="790" rx="120" ry="16" fill="${mix(tar, pal.sky[1], 0.35)}"/>
    <path d="M950 788 h70 M990 794 h40" stroke="#f4f1dc" stroke-width="2" stroke-linecap="round" opacity=".35" class="a-wave"/>
    ${grit}
    <path d="M1392 716 C1350 760 1290 730 1240 760 S1120 800 1060 860" stroke="${shade(tar, 0.6)}" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>`;
}

function chimney(pal: Palette, x: number, top: number): Layer {
  const w = 112, base = 702;
  const brick = mix("#9a5040", pal.mid, 0.55);
  const lit = mix(brick, "#f4f1dc", 0.1);
  const mortar = shade(brick, 0.3);
  let rows = "";
  for (let y = top + 30, i = 0; y < base; y += 13, i++) {
    rows += `M${x} ${y} h${w} `;
    for (let bx = x + (i % 2) * 14; bx < x + w; bx += 28) rows += `M${bx} ${y} v-13 `;
  }
  const g = glow(x + w + 10, 560, 150, "#ffd9a0", 0.25);
  return {
    defs: g.defs,
    body: `<g>
      <rect x="${x + 14}" y="${top - 26}" width="26" height="30" fill="${mix("#a8603e", pal.mid, 0.5)}"/><rect x="${x + 11}" y="${top - 30}" width="32" height="6" fill="${mix("#b8704e", pal.mid, 0.45)}"/>
      <rect x="${x + 62}" y="${top - 20}" width="24" height="24" fill="${mix("#a8603e", pal.mid, 0.5)}"/><rect x="${x + 59}" y="${top - 24}" width="30" height="6" fill="${mix("#b8704e", pal.mid, 0.45)}"/>
      <rect x="${x}" y="${top + 16}" width="${w}" height="${base - top - 16}" fill="${brick}"/>
      <rect x="${x + w - 26}" y="${top + 16}" width="26" height="${base - top - 16}" fill="${lit}"/>
      <path d="${rows}" stroke="${mortar}" stroke-width="1.6" opacity=".6"/>
      <rect x="${x - 8}" y="${top}" width="${w + 16}" height="18" fill="${mix("#a9a49a", pal.mid, 0.5)}"/>
      <rect x="${x - 8}" y="${top}" width="${w + 16}" height="3" fill="${tint(mix("#a9a49a", pal.mid, 0.5), 0.3)}"/>
      <rect x="${x}" y="${top + 18}" width="${w}" height="10" fill="${shade(brick, 0.35)}" opacity=".7"/>
      <rect x="${x}" y="${base - 6}" width="${w + 6}" height="8" fill="${shade(brick, 0.5)}" opacity=".7"/>
      ${g.body}
    </g>`,
  };
}

function toolbox(pal: Palette, x: number, y: number): string {
  const red = mix("#b8453a", pal.mid, 0.35);
  const metal = mix("#b6b9bd", pal.mid, 0.4);
  return `<g>
    <rect x="${x}" y="${y - 36}" width="118" height="36" rx="3" fill="${red}"/>
    <rect x="${x}" y="${y - 44}" width="118" height="12" rx="3" fill="${tint(red, 0.12)}"/>
    <rect x="${x + 84}" y="${y - 44}" width="34" height="44" fill="${shade(red, 0.2)}" opacity=".5"/>
    <path d="M${x + 38} ${y - 44} v-10 h42 v10" stroke="${metal}" stroke-width="5" fill="none" stroke-linejoin="round"/>
    <rect x="${x + 50}" y="${y - 34}" width="18" height="7" rx="1.5" fill="${metal}"/>
    <path d="M${x + 112} ${y - 20} l36 -24" stroke="${metal}" stroke-width="4" stroke-linecap="round"/>
    <path d="M${x + 108} ${y - 18} l12 -8" stroke="#e0b33a" stroke-width="7" stroke-linecap="round"/>
    <path d="M${x - 6} ${y - 2} c-6 -14 20 -16 16 -4 c-4 10 -26 6 -18 -6" stroke="${mix("#c9773e", pal.mid, 0.3)}" stroke-width="2" fill="none"/>
  </g>`;
}

function campLantern(pal: Palette, x: number, y: number): Layer {
  const g = glow(x, y - 26, 140, "#ffd9a0", 0.5, "a-pulse");
  const body = mix("#3d4a3f", pal.mid, 0.3);
  return {
    defs: g.defs,
    body: `${g.body}<g>
      <rect x="${x - 15}" y="${y - 8}" width="30" height="8" rx="2" fill="${body}"/>
      <rect x="${x - 13}" y="${y - 40}" width="26" height="32" rx="5" fill="#ffe6b4"/>
      <rect x="${x - 13}" y="${y - 40}" width="8" height="32" rx="3" fill="#fff6dc"/>
      <path d="M${x - 13} ${y - 30} h26 M${x - 13} ${y - 20} h26" stroke="#e9b870" stroke-width="1.4" opacity=".6"/>
      <rect x="${x - 15}" y="${y - 46}" width="30" height="7" rx="2" fill="${body}"/>
      <path d="M${x - 9} ${y - 46} q9 -12 18 0" stroke="${body}" stroke-width="2.5" fill="none"/>
    </g>`,
  };
}

function mug(pal: Palette, x: number, y: number): string {
  const c = mix("#d8cbb0", pal.mid, 0.3);
  return `<g>
    <rect x="${x - 10}" y="${y - 22}" width="20" height="22" rx="3" fill="${c}"/>
    <rect x="${x + 2}" y="${y - 22}" width="8" height="22" rx="2" fill="${shade(c, 0.2)}"/>
    <path d="M${x + 10} ${y - 17} q9 0 9 7 q0 7 -9 6" stroke="${c}" stroke-width="3" fill="none"/>
    <ellipse cx="${x}" cy="${y - 22}" rx="10" ry="2.5" fill="${shade(c, 0.45)}"/>
  </g>`;
}

/** Folding camping chair, headphones slung over the back. */
function chair(pal: Palette, x: number, seatY: number): string {
  const canvas = mix("#2f6a5e", pal.mid, 0.35);
  const frame = mix("#9aa0a8", pal.mid, 0.45);
  const cs = shade(canvas, 0.25);
  return `<g>
    <path d="M${x - 64} ${seatY + 90} L${x + 56} ${seatY} M${x + 64} ${seatY + 90} L${x - 56} ${seatY}" stroke="${frame}" stroke-width="5" stroke-linecap="round"/>
    <path d="M${x - 60} ${seatY - 100} L${x - 64} ${seatY + 4} M${x + 60} ${seatY - 100} L${x + 64} ${seatY + 4}" stroke="${frame}" stroke-width="5" stroke-linecap="round"/>
    <path d="M${x - 58} ${seatY - 98} Q${x} ${seatY - 84} ${x + 58} ${seatY - 98} L${x + 60} ${seatY - 34} Q${x} ${seatY - 20} ${x - 60} ${seatY - 34} Z" fill="${canvas}"/>
    <path d="M${x + 20} ${seatY - 90} Q${x + 40} ${seatY - 92} ${x + 58} ${seatY - 98} L${x + 60} ${seatY - 34} Q${x + 40} ${seatY - 26} ${x + 22} ${seatY - 24} Z" fill="${cs}" opacity=".6"/>
    <path d="M${x - 62} ${seatY - 30} Q${x} ${seatY + 6} ${x + 62} ${seatY - 30} L${x + 64} ${seatY + 4} Q${x} ${seatY + 24} ${x - 64} ${seatY + 4} Z" fill="${shade(canvas, 0.12)}"/>
    <rect x="${x - 82}" y="${seatY - 46}" width="30" height="7" rx="3" fill="${frame}"/><rect x="${x + 52}" y="${seatY - 46}" width="30" height="7" rx="3" fill="${frame}"/>
    <rect x="${x + 60}" y="${seatY - 56}" width="16" height="12" rx="2" fill="${cs}"/>
    <path d="M${x - 40} ${seatY - 98} q2 -30 26 -30 q24 0 26 30" stroke="${mix("#3a3a44", pal.mid, 0.2)}" stroke-width="5" fill="none"/>
    <rect x="${x - 48}" y="${seatY - 104}" width="14" height="22" rx="6" fill="${mix("#3a3a44", pal.mid, 0.2)}"/><rect x="${x + 6}" y="${seatY - 104}" width="14" height="22" rx="6" fill="${mix("#3a3a44", pal.mid, 0.2)}"/>
    <circle cx="${x - 41}" cy="${seatY - 93}" r="3" fill="${mix("#d65a4a", pal.mid, 0.2)}"/>
  </g>`;
}

/** The DIY antenna: mast, dipole, little yagi, guy-wires, blinking LED. */
function mast(pal: Palette, x: number): Layer {
  const steel = mix("#a7b0ba", pal.mid, 0.4);
  const dark = shade(steel, 0.35);
  const wire = mix("#c9d0d8", pal.mid, 0.35);
  const top = 46, base = 716;
  const led = glow(x, top - 10, 40, LED, 0.7);
  const led2 = glow(x + 94, 214, 16, "#7dff9a", 0.6);
  const anchors: Pt[] = [[1150, 790], [1610, 760], [1500, 704]];
  let guys = "";
  for (const cy of [150, 390]) for (const [ax, ay] of anchors) guys += `M${x} ${cy} L${ax} ${ay} `;
  return {
    defs: led.defs + led2.defs,
    body: `<g>
      <path d="${guys}" stroke="${wire}" stroke-width="1.4" opacity=".55"/>
      ${anchors.map(([ax, ay]) => `<rect x="${ax - 5}" y="${ay - 8}" width="10" height="10" fill="${dark}"/>`).join("")}
      <rect x="${x - 4}" y="${top}" width="8" height="${base - top}" fill="${steel}"/>
      <rect x="${x + 1}" y="${top}" width="3" height="${base - top}" fill="${dark}" opacity=".7"/>
      <path d="M${x - 7} ${top + 30} C${x - 9} 260 ${x - 7} 480 ${x - 8} ${base}" stroke="${shade(steel, 0.6)}" stroke-width="2.5" fill="none"/>
      ${[200, 330, 470, 600].map((y) => `<rect x="${x - 10}" y="${y}" width="14" height="4" fill="${shade(steel, 0.55)}"/>`).join("")}
      <rect x="${x - 6}" y="146" width="12" height="9" fill="${dark}"/><rect x="${x - 6}" y="386" width="12" height="9" fill="${dark}"/>
      <rect x="${x - 5}" y="${top + 40}" width="10" height="24" fill="#c9c6bc" opacity=".55"/>
      <path d="M${x} ${top} V${top - 10}" stroke="${steel}" stroke-width="2"/>
      <path d="M${x - 92} 118 Q${x - 46} 112 ${x - 6} 112 M${x + 6} 112 Q${x + 46} 112 ${x + 92} 118" stroke="${steel}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <rect x="${x - 7}" y="106" width="14" height="12" rx="2" fill="#e6e1d4" opacity=".8"/>
      <circle cx="${x - 92}" cy="118" r="3" fill="#e6e1d4" opacity=".7"/><circle cx="${x + 92}" cy="118" r="3" fill="#e6e1d4" opacity=".7"/>
      <path d="M${x} 226 H${x + 120}" stroke="${steel}" stroke-width="3"/>
      <path d="M${x + 30} 204 v44 M${x + 60} 208 v36 M${x + 86} 211 v30 M${x + 110} 214 v24" stroke="${steel}" stroke-width="2.4"/>
      <rect x="${x + 88}" y="230" width="14" height="10" rx="2" fill="${dark}"/>
      <g class="a-led" style="animation-duration:3.1s">${led2.body}<circle cx="${x + 95}" cy="235" r="1.8" fill="#7dff9a"/></g>
      <path d="M${x - 34} ${base} L${x} ${base - 50} L${x + 34} ${base}" stroke="${dark}" stroke-width="5" fill="none"/>
      <rect x="${x - 36}" y="${base - 6}" width="72" height="26" fill="${mix("#7d7a74", pal.mid, 0.4)}"/>
      <rect x="${x - 36}" y="${base - 6}" width="72" height="4" fill="${tint(mix("#7d7a74", pal.mid, 0.4), 0.2)}"/>
      <g class="a-led">${led.body}<circle cx="${x}" cy="${top - 10}" r="4.5" fill="${LED}"/><circle cx="${x - 1.2}" cy="${top - 11.4}" r="1.5" fill="#ffd0cc"/></g>
    </g>`,
  };
}
