// Aboard Marguerite, a 1962 wooden sloop, on Lantern Night. The whole harbor
// has put paper lanterns on the water and into the sky; the last ferry slides
// past, lit up end to end, and Saltwick glows along the shore.
import { W, H, sky, moon, stars, ridge, rng, uid, shade, tint, mix } from "../kit";
import type { Palette, Part, Layer, SceneInput } from "../kit";

type Pt = [number, number];

const HORIZON = 472;
const MAST = 1262;
const WARM = "#ffc46a";

/** The sheer (port deck edge): high at the bow on the left, sweeping down to the right. */
const BOW: Pt = [130, 500];
const sheerY = (x: number): number => BOW[1] + 140 * (1 - Math.exp(-Math.max(0, x - BOW[0]) / 520));
/** The starboard rail, running from the bow back toward us (off the bottom-left). */
const starPt = (t: number): Pt => [BOW[0] - 150 * t - 40 * t * t, BOW[1] + 360 * t * t + 60 * t];

export function sailing({ pal }: SceneInput): Part[] {
  const P: Part[] = [];
  const L = lanternDefs();
  P.push(L.part);
  P.push(styles());
  P.push(sky(pal));
  P.push(stars(80, 61, HORIZON - 40));
  P.push(moon(430, 112, 30));
  P.push(skyGlow());

  // Saltwick across the harbor, its lights doubled in the water.
  P.push(shore(pal));
  P.push(water(pal));
  P.push(moonPath(430));
  P.push(ferry());

  // Lanterns: drifting on the water, rising into the sky.
  P.push(floating(L));
  P.push(rising(L, false));

  // The boat.
  P.push(sail(pal));
  P.push(rigging());
  P.push(...hull());
  P.push(mast());
  P.push(...boatLantern());
  P.push(rising(L, true));
  return P;
}

// ---- helpers ------------------------------------------------------------------

const f = (n: number): string => (+n).toFixed(1).replace(/\.0$/, "");

function soft(x: number, y: number, r: number, color: string, op: number, cls = ""): Layer {
  const g = uid("sl-soft");
  const st = [[0, 1], [0.25, 0.7], [0.5, 0.36], [0.75, 0.12], [1, 0]];
  return {
    defs: `<radialGradient id="${g}">${st.map(([o, k]) => `<stop offset="${o}" stop-color="${color}" stop-opacity="${(op * k).toFixed(3)}"/>`).join("")}</radialGradient>`,
    body: `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})" class="${cls}"/>`,
  };
}

function styles(): string {
  return `<style>
    @keyframes sailing-ferry { from { transform: translateX(0); } to { transform: translateX(150px); } }
    .sailing-ferry { animation: sailing-ferry 80s ease-in-out infinite alternate; }
  </style>`;
}

/** Gradient ids shared by every lantern, plus the part that defines them. */
interface Lanterns {
  paper: string;
  halo: string;
  water: string;
  wglow: string;
  part: Layer;
}

/** Shared gradients for every lantern (one set of defs, many lanterns). */
function lanternDefs(): Lanterns {
  const paper = uid("sl-paper"), halo = uid("sl-halo"), water = uid("sl-wl"), wglow = uid("sl-wg");
  return {
    paper, halo, water, wglow,
    part: {
      defs: `<radialGradient id="${paper}" cx=".5" cy=".85" r=".8"><stop offset="0" stop-color="#fff4c8"/><stop offset=".45" stop-color="#ffc25a"/><stop offset="1" stop-color="#e2623a"/></radialGradient>
        <radialGradient id="${halo}"><stop offset="0" stop-color="${WARM}" stop-opacity=".55"/><stop offset=".4" stop-color="${WARM}" stop-opacity=".2"/><stop offset="1" stop-color="${WARM}" stop-opacity="0"/></radialGradient>
        <linearGradient id="${water}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc45a"/><stop offset=".6" stop-color="#ff9a40"/><stop offset="1" stop-color="#d8543a"/></linearGradient>
        <radialGradient id="${wglow}"><stop offset="0" stop-color="#ffb050" stop-opacity=".7"/><stop offset=".35" stop-color="#ff9a40" stop-opacity=".3"/><stop offset="1" stop-color="#ff9a40" stop-opacity="0"/></radialGradient>`,
      body: "",
    },
  };
}

/** A sky lantern centered at 0,0 (scale with a wrapper). */
function skyLantern(L: Lanterns): string {
  return `<circle r="34" fill="url(#${L.halo})"/>
    <path d="M-11 -14 Q0 -18 11 -14 L8 12 Q0 15 -8 12 Z" fill="url(#${L.paper})"/>
    <ellipse cx="0" cy="12" rx="8" ry="2.4" fill="#7a3a24"/>
    <circle cx="0" cy="9" r="2.4" fill="#fff8e0"/>`;
}

function skyGlow(): Layer {
  // The harbor's lanterns light the low sky a little.
  const g = uid("sl-hz");
  return {
    defs: `<linearGradient id="${g}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff9a5a" stop-opacity=".28"/><stop offset="1" stop-color="#ff9a5a" stop-opacity="0"/></linearGradient>`,
    body: `<rect x="0" y="${HORIZON - 220}" width="${W}" height="222" fill="url(#${g})"/>`,
  };
}

// ---- far shore, water, ferry ------------------------------------------------------

function shore(pal: Palette): string {
  const far = mix(pal.far, pal.sky[0], 0.15), near = shade(pal.far, 0.2);
  let s = ridge({ y: HORIZON - 44, amp: 26, color: far, seed: 63, x0: -40, x1: 1320, bottom: HORIZON + 1, steps: 14 });
  s += ridge({ y: HORIZON - 18, amp: 14, color: near, seed: 65, x0: -40, x1: 1240, bottom: HORIZON + 1, steps: 16 });
  // Houses and their lit windows, the church, the wharf lights.
  const r = rng(67);
  const wall = shade(pal.far, 0.05), roof = shade(pal.far, 0.35);
  for (let i = 0; i < 26; i++) {
    const x = 20 + i * 46 + r() * 16, w = 18 + r() * 14, h = 10 + r() * 12, y = HORIZON - 10 - h - r() * 26 * Math.sin((i / 26) * Math.PI);
    s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h + 12)}" fill="${wall}"/><path d="M${f(x - 2)} ${f(y)} L${f(x + w / 2)} ${f(y - 7 - r() * 4)} L${f(x + w + 2)} ${f(y)} Z" fill="${roof}"/>`;
    if (r() > 0.25) s += `<rect x="${f(x + w * 0.3)}" y="${f(y + h * 0.35)}" width="4" height="4" fill="${WARM}" opacity=".9"/>`;
    if (r() > 0.6) s += `<rect x="${f(x + w * 0.65)}" y="${f(y + h * 0.35)}" width="4" height="4" fill="${WARM}" opacity=".75"/>`;
  }
  s += `<path d="M742 ${HORIZON - 56} l9 -36 l9 36 Z" fill="${roof}"/><rect x="740" y="${HORIZON - 56}" width="22" height="46" fill="${wall}"/><rect x="747" y="${HORIZON - 46}" width="8" height="10" fill="${WARM}" opacity=".85"/>`;
  // Wharf: a line of lantern-lights along the water's edge.
  for (let x = 30; x < 1220; x += 22 + (x % 3) * 4) {
    s += `<circle cx="${x}" cy="${HORIZON - 4}" r="2" fill="#ffd89a"${x % 3 ? "" : ` class="a-twinkle-soft" style="animation-delay:-${f((x % 7) * 0.5)}s"`}/>`;
  }
  s += `<rect x="0" y="${HORIZON - 3}" width="1240" height="3" fill="${shade(pal.far, 0.45)}"/>`;
  return s;
}

function water(pal: Palette): Layer {
  const g = uid("sl-sea");
  const r = rng(69);
  let glints = "";
  // Shore lights doubled as broken vertical streaks.
  for (let i = 0; i < 20; i++) {
    const x = 30 + r() * 1180, len = 20 + r() * 40;
    glints += `<path d="M${f(x)} ${HORIZON + 4} v${f(len)}" stroke="${WARM}" stroke-width="${f(1.5 + r() * 2)}" stroke-dasharray="4 5" opacity="${f(0.25 + r() * 0.3)}" class="a-wave" style="animation-delay:-${f(r() * 5)}s"/>`;
  }
  // Ripples catching lantern light.
  for (let i = 0; i < 26; i++) {
    const t = r(), y = HORIZON + 8 + t * t * 260, x = r() * W, len = 14 + t * 70;
    glints += `<path d="M${f(x)} ${f(y)} h${f(len)}" stroke="${r() > 0.5 ? WARM : "#c9d4f0"}" stroke-width="${f(1 + t * 2)}" stroke-linecap="round" opacity="${f(0.15 + t * 0.3)}" class="a-wave" style="animation-delay:-${f(r() * 5)}s"/>`;
  }
  return {
    defs: `<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(pal.sea[0], "#6a4a6a", 0.25)}"/><stop offset=".4" stop-color="${pal.sea[0]}"/><stop offset="1" stop-color="${pal.sea[1]}"/></linearGradient>`,
    body: `<rect x="0" y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#${g})"/>${glints}`,
  };
}

function moonPath(x: number): string {
  const r = rng(71);
  let s = "";
  for (let i = 0; i < 14; i++) {
    const t = i / 14, y = HORIZON + 6 + t * 110, w = 14 + t * 50 + r() * 20;
    s += `<path d="M${f(x - w / 2 + (r() - 0.5) * 16)} ${f(y)} h${f(w)}" stroke="#f4f1dc" stroke-width="${f(1.5 + t * 2)}" stroke-linecap="round" opacity="${f(0.55 - t * 0.25)}" class="a-wave" style="animation-delay:-${f(r() * 5)}s"/>`;
  }
  return s;
}

function ferry(): string {
  // Persistence on the last crossing, every window lit.
  const x = 150, y = HORIZON - 2, hull = "#141a30", house = "#232a48";
  let win = "";
  for (let i = 0; i < 11; i++) win += `<rect x="${x + 22 + i * 11}" y="${y - 20}" width="6" height="4" fill="#ffdc9a"/>`;
  for (let i = 0; i < 7; i++) win += `<rect x="${x + 44 + i * 11}" y="${y - 31}" width="6" height="4" fill="#ffdc9a" opacity=".9"/>`;
  let refl = "";
  for (let i = 0; i < 5; i++) refl += `<path d="M${x + 20 + i * 4} ${y + 8 + i * 7} h${130 - i * 14}" stroke="#ffd08a" stroke-width="2" stroke-linecap="round" opacity="${f(0.4 - i * 0.06)}" class="a-wave" style="animation-delay:-${i}s"/>`;
  return `<g class="sailing-ferry">
    ${refl}
    <path d="M${x} ${y - 12} H${x + 176} L${x + 166} ${y} H${x + 10} Z" fill="${hull}"/>
    <rect x="${x + 16}" y="${y - 25}" width="134" height="13" fill="${house}"/>
    <rect x="${x + 38}" y="${y - 36}" width="88" height="11" fill="${house}"/>
    <rect x="${x + 98}" y="${y - 50}" width="12" height="15" fill="${hull}"/><rect x="${x + 98}" y="${y - 50}" width="12" height="4" fill="#b8483e"/>
    <path d="M${x + 60} ${y - 36} v-22" stroke="${hull}" stroke-width="2"/>
    <circle cx="${x + 60}" cy="${y - 59}" r="2.2" fill="#ffffff" class="a-twinkle-soft"/>
    <circle cx="${x + 172}" cy="${y - 14}" r="2" fill="#5ee08a"/>
    ${win}
  </g>`;
}

// ---- lanterns ---------------------------------------------------------------------

function floating(L: Lanterns): string {
  // Water lanterns: little glowing paper boxes, nearer ones bigger.
  const spots = [
    [40, 484, 0.45], [300, 498, 0.6], [560, 490, 0.5], [690, 506, 0.7], [860, 494, 0.55], [1010, 512, 0.75],
    [1110, 498, 0.55], [1330, 520, 0.8], [1460, 506, 0.6], [1572, 548, 0.95], [350, 548, 0.8], [600, 560, 1.0],
    [1500, 596, 1.15], [470, 540, 0.85], [230, 524, 0.7], [760, 556, 0.95],
  ];
  const r = rng(73);
  let s = "";
  for (const [x, y, k] of spots) {
    const w = 22 * k, h = 16 * k;
    s += `<g class="a-bob-slow" style="animation-delay:-${f(r() * 8)}s">
      <ellipse cx="${x}" cy="${f(y + h * 0.4)}" rx="${f(w * 2.6)}" ry="${f(h * 1.4)}" fill="url(#${L.wglow})"/>
      <path d="M${f(x - w * 0.3)} ${f(y + h * 0.5 + 3)} h${f(w * 0.6)} M${f(x - w * 0.5)} ${f(y + h * 0.5 + 8 * k)} h${f(w)} M${f(x - w * 0.25)} ${f(y + h * 0.5 + 14 * k)} h${f(w * 0.5)}" stroke="#ffc46a" stroke-width="${f(1.5 * k + 0.5)}" stroke-linecap="round" opacity=".55"/>
      <rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(2 * k)}" fill="url(#${L.water})"/>
      <rect x="${f(x - w * 0.32)}" y="${f(y - h * 0.3)}" width="${f(w * 0.64)}" height="${f(h * 0.6)}" rx="${f(k)}" fill="#fff2c0" opacity=".9"/>
      <rect x="${f(x - w / 2 - 2 * k)}" y="${f(y + h / 2 - 1)}" width="${f(w + 4 * k)}" height="${f(3 * k)}" fill="#3a2418"/>
    </g>`;
  }
  return s;
}

function rising(L: Lanterns, near: boolean): string {
  // Sky lanterns: some already high and drifting, the rest rising from the water.
  const r = rng(near ? 79 : 77);
  let s = "";
  if (!near) {
    const high = [[90, 210, 0.45], [250, 70, 0.35], [620, 160, 0.3], [990, 60, 0.32], [1080, 220, 0.4], [1450, 120, 0.34], [180, 330, 0.5], [1530, 300, 0.45], [880, 290, 0.38]];
    for (const [x, y, k] of high) s += `<g class="a-bob" style="animation-delay:-${f(r() * 5)}s"><g transform="translate(${x} ${y}) scale(${k})">${skyLantern(L)}</g></g>`;
  }
  const n = near ? 5 : 12;
  for (let i = 0; i < n; i++) {
    const x = near ? [140, 470, 1110, 1400, 1520][i] : 40 + r() * (W - 80);
    const y = near ? 640 + r() * 60 : HORIZON + 10 + r() * 90;
    const k = near ? 0.9 + r() * 0.4 : 0.38 + r() * 0.4;
    const dur = near ? 22 + r() * 10 : 30 + r() * 20;
    s += `<g class="a-rise" style="animation-duration:${f(dur)}s;animation-delay:-${f(r() * dur)}s"><g transform="translate(${f(x)} ${f(y)}) scale(${f(k)})">${skyLantern(L)}</g></g>`;
  }
  return s;
}

// ---- the boat -----------------------------------------------------------------------

function sail(pal: Palette): Layer {
  // The main, up and drawing a little, its edge along the mast; lit warm from below.
  const g = uid("sl-sail"), lit = uid("sl-saillit");
  const cloth = mix("#efe6d2", pal.sky[1], 0.5);
  const boomY = 486;
  const d = `M${MAST + 12} -10 Q${MAST + 40} 220 ${MAST + 22} ${boomY} L${W + 10} ${boomY + 12} L${W + 10} -10 Z`;
  let seams = "";
  for (let i = 1; i < 8; i++) {
    const y = i * 64;
    seams += `<path d="M${MAST + 26 + Math.sin((y / boomY) * Math.PI) * 14} ${y} L${W + 10} ${y - 40}" stroke="${shade(cloth, 0.18)}" stroke-width="1.5" opacity=".6"/>`;
  }
  return {
    defs: `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(cloth, 0.12)}"/><stop offset=".35" stop-color="${cloth}"/><stop offset="1" stop-color="${shade(cloth, 0.25)}"/></linearGradient>
      <linearGradient id="${lit}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${WARM}" stop-opacity=".45"/><stop offset=".55" stop-color="${WARM}" stop-opacity=".08"/><stop offset="1" stop-color="${WARM}" stop-opacity="0"/></linearGradient>`,
    body: `<path d="${d}" fill="url(#${g})"/><path d="${d}" fill="url(#${lit})"/>${seams}
      <path d="M${MAST + 12} -10 Q${MAST + 40} 220 ${MAST + 22} ${boomY}" stroke="${shade(cloth, 0.3)}" stroke-width="4" fill="none"/>
      <path d="M1510 120 l60 -6 M1500 260 l70 -8 M1494 400 l76 -8" stroke="${tint(cloth, 0.3)}" stroke-width="4" stroke-linecap="round" opacity=".5"/>
      ${boom(boomY)}`,
  };
}

function boom(y: number): string {
  const wood = "#9a5f34";
  return `<path d="M${MAST} ${y - 2} L${W + 10} ${y + 10} L${W + 10} ${y + 32} L${MAST} ${y + 20} Z" fill="${shade(wood, 0.2)}"/>
    <path d="M${MAST} ${y - 2} L${W + 10} ${y + 10} L${W + 10} ${y + 17} L${MAST} ${y + 5} Z" fill="${tint(wood, 0.25)}"/>
    <rect x="${MAST + 8}" y="${y - 4}" width="14" height="26" rx="3" fill="#8a7040"/>`;
}

function rigging(): string {
  // Forestay to the bow, shrouds to the chainplates, a halyard slapping the mast.
  const wire = "#8a93b0";
  return `<path d="M${MAST} -20 L${BOW[0] + 4} ${BOW[1] - 10}" stroke="${wire}" stroke-width="1.6" opacity=".55"/>
    <path d="M${MAST - 2} -20 L${MAST - 150} ${f(sheerY(MAST - 150))}" stroke="${wire}" stroke-width="2" opacity=".75"/>
    <path d="M${MAST + 2} -20 L${MAST + 170} ${f(sheerY(MAST + 170) + 20)}" stroke="${wire}" stroke-width="2.4" opacity=".75"/>
    <path d="M${MAST - 150} ${f(sheerY(MAST - 150))} l-2 -40 M${MAST + 170} ${f(sheerY(MAST + 170) + 20)} l2 -40" stroke="#c9a060" stroke-width="3" stroke-linecap="round"/>`;
}

function hull(): Layer[] {
  // Foredeck seen from the cockpit: teak planking fanning to the bow between
  // the two toe rails, cabin trunk aft, portholes glowing from the lamp below.
  const teak = "#5a371f", rail = "#a8643a", railLit = "#e8a865", dark = "#22140e";
  const shadeG = uid("sl-deck");
  const port: Pt[] = [];
  for (let x = BOW[0]; x <= W + 10; x += 40) port.push([x, sheerY(x)]);
  port.push([W + 10, sheerY(W + 10)]);
  const star: Pt[] = [];
  for (let i = 0; i <= 8; i++) star.push(starPt(i / 8));
  const P = (pts: Pt[], dy = 0): string => pts.map(([x, y], i) => `${i ? "L" : "M"}${f(x)} ${f(y + dy)}`).join(" ");
  const back = (pts: Pt[], dy = 0): string => pts.slice().reverse().map(([x, y]) => `L${f(x)} ${f(y + dy)}`).join(" ");
  const deck = `${P(port)} L${W + 10} ${H + 10} L-40 ${H + 10} ${back(star)} Z`;
  let planks = "";
  for (let k = 1; k <= 10; k++) {
    const t = k / 11;
    const ex = -40 + t * (W + 50), ey = H + 10;
    planks += `<path d="M${BOW[0]} ${BOW[1] + 2} Q${f(BOW[0] + (ex - BOW[0]) * 0.45)} ${f(BOW[1] + 80 + t * 120)} ${f(ex)} ${ey}" stroke="${shade(teak, 0.4)}" stroke-width="${f(1 + t * 1.6)}" fill="none" opacity=".75"/>`;
  }
  // Toe rails: thin at the bow, thicker as they come toward us.
  const railBand = (pts: Pt[], t0: number, t1: number): string => {
    const n = pts.length - 1;
    const top = pts.map(([x, y], i): Pt => [x, y - (t0 + (t1 - t0) * (i / n))]);
    return `${P(top)} ${back(pts, 3)} Z`;
  };
  const cabin = cabinTop();
  return [
    {
      defs: `<linearGradient id="${shadeG}" gradientUnits="userSpaceOnUse" x1="0" y1="${BOW[1]}" x2="0" y2="${H}"><stop offset="0" stop-color="${dark}" stop-opacity="0"/><stop offset="1" stop-color="${dark}" stop-opacity=".65"/></linearGradient>`,
      body: `<path d="${deck}" fill="${teak}"/>
        ${planks}
        <path d="${deck}" fill="url(#${shadeG})"/>
        <path d="${P(port)} ${back(port, 10)} Z" fill="${dark}" opacity=".3"/>
        <path d="${railBand(port, 8, 12)}" fill="${rail}"/>
        <path d="${P(port.map(([x, y], i): Pt => [x, y - 8 - (4 * i) / (port.length - 1)]))}" stroke="${railLit}" stroke-width="2.5" fill="none" opacity=".85"/>
        <path d="${railBand(star, 8, 34)}" fill="${shade(rail, 0.15)}"/>
        <path d="${P(star.map(([x, y], i): Pt => [x, y - 8 - (26 * i) / (star.length - 1)]))}" stroke="${railLit}" stroke-width="3" fill="none" opacity=".6"/>
        <path d="M${BOW[0] - 10} ${BOW[1] - 6} l20 -10 l10 8 l-18 12 Z" fill="#c9a060"/>
        <circle cx="${BOW[0] + 4}" cy="${BOW[1] - 8}" r="3" fill="#e8c890"/>
        ${cleat(330, sheerY(330) + 30)}
        ${coil(460, sheerY(460) + 44)}
        ${hatch(250, 590)}`,
    },
    cabin,
  ];
}

function cleat(x: number, y: number): string {
  return `<path d="M${x - 22} ${y} q4 -10 22 -10 q18 0 22 10 Z" fill="#b08a4a"/><rect x="${x - 8}" y="${y - 8}" width="16" height="8" fill="#8a6a34"/><path d="M${x - 20} ${y - 3} h40" stroke="#e0c080" stroke-width="2" opacity=".6"/>`;
}

function coil(x: number, y: number): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += `<ellipse cx="${x}" cy="${y - i * 3}" rx="${34 - i * 6}" ry="${9 - i * 1.4}" fill="none" stroke="${i % 2 ? "#c8b48a" : "#e0cda0"}" stroke-width="5"/>`;
  return s + `<path d="M${x + 30} ${y} q30 8 60 4" stroke="#d8c498" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}

function hatch(x: number, y: number): string {
  return `<path d="M${x - 50} ${y} L${x - 44} ${y - 34} H${x + 44} L${x + 50} ${y} Z" fill="#8a5230"/>
    <path d="M${x - 44} ${y - 34} H${x + 44} L${x + 46} ${y - 28} H${x - 46} Z" fill="#d09058"/>
    <path d="M${x - 30} ${y - 20} h60" stroke="#5a3420" stroke-width="2"/>`;
}

function cabinTop(): Layer {
  // Cabin trunk from behind her shoulder to the mast; portholes lit inside.
  const side = "#8a5230", top = "#b8784a";
  const y0 = (x: number): number => sheerY(x) - 46;
  const halo = uid("sl-port");
  let ports = "";
  for (const x of [960, 1060, 1160]) {
    const y = y0(x) + 26;
    ports += `<circle cx="${x}" cy="${f(y)}" r="30" fill="url(#${halo})"/><circle cx="${x}" cy="${f(y)}" r="12" fill="#c9a060"/><circle cx="${x}" cy="${f(y)}" r="8.5" fill="#ffc861" class="a-twinkle-soft"/><circle cx="${x}" cy="${f(y)}" r="4" fill="#fff0c0"/><path d="M${x - 4} ${f(y - 3)} a5 5 0 0 1 5 -3" stroke="#ffffff" stroke-width="1.5" fill="none" opacity=".7"/>`;
  }
  return {
    defs: `<radialGradient id="${halo}"><stop offset="0" stop-color="#ffc46a" stop-opacity=".5"/><stop offset="1" stop-color="#ffc46a" stop-opacity="0"/></radialGradient>`,
    body: `<path d="M860 ${f(sheerY(860) + 6)} L880 ${f(y0(880))} L${MAST + 140} ${f(y0(MAST + 140))} L${MAST + 160} ${f(sheerY(MAST + 160) + 6)} Z" fill="${side}"/>
      <path d="M872 ${f(y0(872) - 6)} L${MAST + 150} ${f(y0(MAST + 150) - 6)} L${MAST + 140} ${f(y0(MAST + 140) + 4)} L880 ${f(y0(880) + 4)} Z" fill="${top}"/>
      <path d="M872 ${f(y0(872) - 6)} L${MAST + 150} ${f(y0(MAST + 150) - 6)}" stroke="#f0b070" stroke-width="2.5" opacity=".7"/>
      ${ports}`,
  };
}

function mast(): string {
  const wood = "#b07440", base = sheerY(MAST) - 46;
  return `<path d="M${MAST - 13} ${f(base)} L${MAST - 10} -10 H${MAST + 10} L${MAST + 13} ${f(base)} Z" fill="${wood}"/>
    <path d="M${MAST - 13} ${f(base)} L${MAST - 10} -10 H${MAST - 4} L${MAST - 5} ${f(base)} Z" fill="#e0a060" opacity=".7"/>
    <path d="M${MAST + 6} ${f(base)} L${MAST + 5} -10 H${MAST + 10} L${MAST + 13} ${f(base)} Z" fill="${shade(wood, 0.35)}"/>
    <path d="M${MAST + 1} -10 V${f(base - 30)}" stroke="#e8dcc4" stroke-width="1.5" opacity=".5"/>
    <rect x="${MAST - 16}" y="${f(base - 18)}" width="32" height="12" rx="3" fill="#c9a060"/>
    <rect x="${MAST - 18}" y="${f(base - 70)}" width="10" height="6" rx="2" fill="#c9a060"/>
    <rect x="${MAST - 16}" y="210" width="32" height="8" rx="2" fill="#8a7040"/>`;
}

function boatLantern(): Part[] {
  // A paper lantern hung from the boom, warming the sail and deck.
  const x = 1452, top = 500, y = 566;
  return [
    soft(x, y, 360, WARM, 0.32, "a-flicker"),
    `<g class="a-sway" style="animation-duration:5s">
      <path d="M${x} ${top} V${y - 26}" stroke="#2a1d1a" stroke-width="1.5"/>
      <rect x="${x - 8}" y="${y - 28}" width="16" height="5" rx="1.5" fill="#3a2418"/>
      <ellipse cx="${x}" cy="${y}" rx="24" ry="26" fill="#e8503a"/>
      <ellipse cx="${x}" cy="${y}" rx="17" ry="24" fill="#ff8a4a"/>
      <ellipse cx="${x}" cy="${y + 2}" rx="9" ry="18" fill="#ffd08a"/>
      <path d="M${x - 24} ${y - 8} h48 M${x - 24} ${y + 8} h48" stroke="#b83a2a" stroke-width="1.2" opacity=".6"/>
      <rect x="${x - 8}" y="${y + 23}" width="16" height="5" rx="1.5" fill="#3a2418"/>
      <path d="M${x} ${y + 28} v10" stroke="#e8503a" stroke-width="2"/>
    </g>`,
  ];
}
