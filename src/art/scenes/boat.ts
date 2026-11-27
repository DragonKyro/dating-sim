// Tamsin's little survey boat adrift off the seal ledges. In fog the world
// ends a few boat-lengths out: the ledges and their seals are ghosts and a
// buoy blinks somewhere. In "day" the fog has burned off and the ledges are
// full of grey seals.
import type { Palette, Part, Layer, SceneInput } from "../kit";
import { W, H, sky, sunDisc, cloudBand, ridge, sea, gulls, fogBands, glow, rng, uid, shade, tint, mix } from "../kit";

type Pt = [number, number];

/** One hauled-out seal on a ledge: t = position along the ledge (0..1). */
interface SealSpec {
  t: number;
  s: number;
  flip?: boolean;
  bull?: boolean;
  look?: number;
}

const f = (n: number): number => Math.round(n * 10) / 10;

export function boat({ pal, time }: SceneInput): Part[] {
  const fog = time === "fog";
  const parts: Part[] = [];
  const horizon = 432;
  parts.push(styles());
  parts.push(sky(pal));
  if (fog) parts.push(paleSun());
  else {
    parts.push(sunDisc(pal, 1290, 118, 42));
    parts.push(cloudBand(pal, { seed: 5, y0: 60, y1: 250, count: 5, speed: 200 }));
  }

  // Everything out on the water rocks gently as the boat drifts.
  const world: Part[] = [];
  const skyH = mix(pal.sky[1], pal.sky[2], 0.55);       // sky colour at the horizon
  const ghost = (t: number): string => mix(shade(pal.ink, 0.1), skyH, t); // things dissolving into fog
  world.push(ridge({ y: horizon - 46, amp: 30, color: fog ? ghost(0.86) : mix(pal.far, pal.sky[0], 0.32), seed: 9, x0: 620, x1: 1720, bottom: horizon + 2, steps: 12 }));
  world.push(ridge({ y: horizon - 18, amp: 14, color: fog ? ghost(0.92) : mix(pal.far, pal.sky[0], 0.5), seed: 4, x0: -120, x1: 520, bottom: horizon + 2, steps: 8 }));
  if (fog) world.push(fogBands(2, { y0: 340, y1: 440, color: "#f4f6f6", opacity: 0.85, seed: 21 }));
  world.push(sea(pal, { top: horizon, bottom: H, seed: 6, glint: fog ? "#f6f8f6" : "#ffffff", glints: fog ? 20 : 40, glintOpacity: fog ? 0.35 : 0.5 }));
  world.push(veil(pal, horizon, fog));
  world.push(ledge(pal, { x0: 20, x1: 500, top: 446, base: 496, amp: 26, seed: 31, haze: fog ? 0.72 : 0.16, foamOp: fog ? 0.3 : 0.7, seals: [
    { t: 0.26, s: 0.7 }, { t: 0.5, s: 0.8, bull: true, look: 2 }, { t: 0.73, s: 0.66, flip: true },
  ] }));
  world.push(rock(pal, 560, 494, 34, 16, fog ? 0.74 : 0.18));
  world.push(rock(pal, 1050, 512, 40, 20, fog ? 0.66 : 0.08));
  world.push(ledge(pal, { x0: 1060, x1: 1620, top: 426, base: 510, amp: 40, seed: 37, haze: fog ? 0.7 : 0.06, foamOp: fog ? 0.35 : 0.8, seals: [
    { t: 0.16, s: 0.95 }, { t: 0.33, s: 1.2, bull: true, look: 0 }, { t: 0.5, s: 0.95, flip: true },
    { t: 0.64, s: 0.9, look: 5 }, { t: 0.8, s: 1.05, flip: true, bull: true },
  ] }));
  if (fog) world.push(fogBands(2, { y0: 480, y1: 580, color: "#f1f4f4", opacity: 0.6, seed: 23 }));
  world.push(buoy(pal, fog, 330, 560));
  world.push(sealHead(pal, fog, 1476, 574));
  parts.push(group(`<g class="boat-rock">`, world));
  if (!fog) parts.push(gulls(4, { seed: 18, y0: 150, y1: 330, color: "#3a4a58" }));
  parts.push(fog
    ? fogBands(1, { y0: 620, y1: 620, color: "#eef1f2", opacity: 0.45, seed: 29 })
    : fogBands(1, { y0: 436, y1: 436, color: "#ffffff", opacity: 0.22, seed: 29 }));

  // The boat: gunwales running up to the bow, Tamsin's kit along the sides.
  parts.push(whip(pal, fog, 70, 770));
  parts.push(hull(pal, fog));
  parts.push(rope(pal, fog, 1128, 676));
  parts.push(gearCase(pal, fog, 140, 602));
  parts.push(thermos(pal, fog, 1290, 732));
  parts.push(cup(pal, fog, 1372, 690));
  if (fog) parts.push(fogBands(1, { y0: 230, y1: 230, color: "#f4f6f6", opacity: 0.3, seed: 41 }));
  return parts;
}

/** Merge {defs, body} parts into a single wrapping group. */
function group(open: string, items: Part[]): Layer {
  let defs = "", body = "";
  for (const p of items) {
    if (typeof p === "string") body += p;
    else { defs += p.defs ?? ""; body += p.body ?? ""; }
  }
  return { defs, body: `${open}${body}</g>` };
}

function styles(): string {
  return `<style>
    @keyframes boat-rock { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(5px) rotate(0.25deg); } }
    .boat-rock { animation: boat-rock 7.5s ease-in-out infinite; transform-origin: 800px 500px; }
    @keyframes boat-beacon { 0%, 100% { opacity: .12; } 45%, 55% { opacity: 1; } }
    .boat-beacon { animation: boat-beacon 4s ease-in-out infinite; }
    @keyframes boat-look { 0%, 55%, 100% { transform: rotate(0deg); } 66%, 88% { transform: rotate(-18deg); } }
    .boat-look { animation: boat-look 9s ease-in-out infinite; transform-box: fill-box; transform-origin: 0% 100%; }
    @keyframes boat-ripple { 0% { transform: scale(.5); opacity: .8; } 100% { transform: scale(1.6); opacity: 0; } }
    .boat-ripple { animation: boat-ripple 4s ease-out infinite; transform-box: fill-box; transform-origin: center; }
    @keyframes boat-steam { 0% { transform: translate(0, 0); opacity: 0; } 30% { opacity: .6; } 100% { transform: translate(8px, -54px); opacity: 0; } }
    .boat-steam { animation: boat-steam 4.5s ease-out infinite; }
  </style>`;
}

function paleSun(): Layer {
  const g = glow(1180, 168, 320, "#fffdf2", 0.6, "a-pulse");
  return { defs: g.defs, body: `${g.body}<circle cx="1180" cy="168" r="44" fill="#fbfaf3" opacity=".6"/>` };
}

/** Dissolves the horizon into fog (or a soft haze on clear days). */
function veil(pal: Palette, horizon: number, fog: boolean): Layer {
  const id = uid("bveil");
  const c = mix(pal.sky[1], pal.sky[2], 0.55);
  const op = fog ? 0.95 : 0.35;
  return {
    defs: `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".16" stop-color="${c}" stop-opacity="${op}"/><stop offset=".45" stop-color="${c}" stop-opacity="${f(op * 0.55)}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`,
    body: `<rect x="0" y="${horizon - (fog ? 40 : 14)}" width="${W}" height="${fog ? 250 : 80}" fill="url(#${id})"/>`,
  };
}

// ---- the ledges and their seals --------------------------------------------------

interface LedgeOpts {
  x0: number;
  x1: number;
  top: number;
  base: number;
  amp: number;
  seed: number;
  haze: number;
  foamOp: number;
  seals: SealSpec[];
}

function ledge(pal: Palette, { x0, x1, top, base, amp, seed, haze, foamOp, seals }: LedgeOpts): Layer {
  const r = rng(seed);
  const n = 14, pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, edge = Math.sin(Math.PI * t) ** 0.4;
    const lump = i % 3 === 1 ? 0.15 : 1;
    pts.push([x0 + (x1 - x0) * t, base - (base - top - r() * amp * lump - Math.sin(t * 9 + seed) * amp * 0.25) * edge]);
  }
  let d = `M${x0} ${base} L${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i];
    d += ` Q${f(px)} ${f(py)} ${f((px + cx) / 2)} ${f((py + cy) / 2)}`;
  }
  d += ` L${x1} ${f(pts[n][1])} L${x1} ${base} Z`;
  const topAt = (x: number): number => {
    const t = ((x - x0) / (x1 - x0)) * n, i = Math.min(n - 1, Math.floor(t)), k = t - i;
    const a = (pts[i][1] + pts[Math.max(0, i - 1)][1]) / 2, b = (pts[i][1] + pts[i + 1][1]) / 2;
    return a + (b - a) * k;
  };
  const rock = mix("#7a746d", pal.sky[0], haze);
  const hi = mix("#a39d94", pal.sky[0], haze);
  const wet = mix("#45413f", pal.sky[0], haze);
  const weed = mix("#6a6234", pal.sky[0], haze);
  const clip = uid("bledge");
  let facets = "";
  for (let i = 1; i < n; i += 2) {
    const [px, py] = pts[i];
    const w = (x1 - x0) / n;
    facets += `<path d="M${f(px - w * 0.6)} ${f(py + 10)} L${f(px - w * 0.1)} ${f(py - 2)} L${f(px + w * 0.5)} ${f(py + 4)} L${f(px + w * 0.2)} ${f(py + 16)} Z" fill="${hi}" opacity=".55"/>`;
  }
  let foam = "";
  for (let i = 0; i < 7; i++) {
    const fx = x0 + 20 + r() * (x1 - x0 - 40), w = 20 + r() * 40;
    foam += `<path d="M${f(fx)} ${base + 2 + r() * 4} h${f(w)}" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="${foamOp}" class="a-wave" style="animation-delay:-${f(r() * 5)}s"/>`;
  }
  const sealArt = seals.map((s, i) => {
    const x = x0 + (x1 - x0) * s.t;
    return seal(pal, haze, x, topAt(x) + 3 + 3 * s.s, s, seed + i);
  }).join("");
  return {
    defs: `<clipPath id="${clip}"><path d="${d}"/></clipPath>`,
    body: `<g>
      <path d="${d}" fill="${rock}"/>
      <g clip-path="url(#${clip})">${facets}<path d="M${x0} ${base - 14} Q${f((x0 + x1) / 2)} ${base - 22} ${x1} ${base - 14} V${base} H${x0} Z" fill="${wet}"/><path d="M${x0} ${base - 6} Q${f(x0 + (x1 - x0) * 0.3)} ${base - 11} ${f((x0 + x1) / 2)} ${base - 6} T${x1} ${base - 6} V${base} H${x0} Z" fill="${weed}"/></g>
      ${sealArt}${foam}
    </g>`,
  };
}

/** A lone wet boulder breaking the surface. */
function rock(pal: Palette, x: number, base: number, w: number, h: number, haze: number): string {
  const c = mix("#6f6964", pal.sky[0], haze);
  return `<path d="M${x - w} ${base} Q${x - w * 0.8} ${base - h} ${x - w * 0.1} ${base - h} Q${x + w * 0.7} ${base - h * 0.9} ${x + w} ${base} Z" fill="${c}"/>
    <path d="M${x - w * 0.5} ${base - h * 0.7} Q${x - w * 0.1} ${base - h * 1.02} ${x + w * 0.4} ${base - h * 0.8}" stroke="${mix("#a39d94", pal.sky[0], haze)}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
    <path d="M${x - w - 8} ${base + 2} h${w * 2 + 16}" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="${0.6 - haze * 0.4}" class="a-wave"/>`;
}

/** A grey seal hauled out. Bulls are dark and heavy, cows pale and spotted. */
function seal(pal: Palette, haze: number, x: number, y: number, { s, flip = false, bull = false, look = -1 }: SealSpec, seed: number): string {
  const r = rng(seed);
  const body = mix(bull ? "#57555b" : "#99938a", pal.sky[0], haze);
  const dark = mix(bull ? "#3a383d" : "#6c675f", pal.sky[0], haze);
  const belly = mix(bull ? "#7f7a76" : "#cbc4b6", pal.sky[0], haze);
  const hi = mix(bull ? "#7d7b82" : "#bdb7ac", pal.sky[0], haze);
  let spots = "";
  for (let i = 0; i < 4; i++) spots += `<ellipse cx="${f(-22 + r() * 40)}" cy="${f(-12 + r() * 6)}" rx="${f(2 + r() * 2.5)}" ry="${f(1.4 + r() * 1.2)}" fill="${dark}" opacity=".7"/>`;
  const bw = bull ? 1.12 : 1;
  const headUp = `<path d="M18 -12 Q26 -26 34 -30 L40 -22 Q32 -12 28 -4 Z" fill="${body}"/><ellipse cx="38" cy="-30" rx="${f(9 * bw)}" ry="7" fill="${body}"/><path d="M42 -34 Q52 -31 49 -25 Q44 -24 41 -26 Z" fill="${body}"/><circle cx="40" cy="-32" r="1.4" fill="${shade(dark, 0.4)}" opacity="${f(1 - haze)}"/>`;
  const headDown = `<ellipse cx="31" cy="-7" rx="${f(9 * bw)}" ry="6.5" fill="${body}"/><path d="M36 -11 Q46 -9 44 -3 Q39 -2 36 -4 Z" fill="${body}"/><circle cx="34" cy="-9" r="1.3" fill="${shade(dark, 0.4)}" opacity="${f(1 - haze)}"/>`;
  const head = look >= 0
    ? `<g class="boat-look" style="animation-delay:-${look}s">${headUp}</g>`
    : headDown;
  const sx = flip ? -s : s;
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(sx)} ${f(s)})">
    <path d="M-34 -2 L-47 -10 L-44 -1 L-48 7 Z" fill="${dark}"/>
    <path d="M-36 0 Q-40 -11 -24 -${f(15 * bw)} Q-4 -${f(23 * bw)} 16 -${f(17 * bw)} Q27 -14 31 -8 Q35 -2 28 1 Z" fill="${body}"/>
    <path d="M-32 -1 Q-2 4 27 0 Q0 -5 -32 -1 Z" fill="${belly}"/>
    ${spots}
    <path d="M-24 -${f(14 * bw)} Q-4 -${f(21 * bw)} 14 -${f(16 * bw)}" stroke="${hi}" stroke-width="2.4" fill="none" opacity=".7" stroke-linecap="round"/>
    <ellipse cx="10" cy="-2" rx="7" ry="2.4" fill="${dark}"/>
    ${head}
  </g>`;
}

/** A seal "bottling" in the water, watching the boat. */
function sealHead(pal: Palette, fog: boolean, x: number, y: number): string {
  const haze = fog ? 0.35 : 0;
  const c = mix("#4c4a50", pal.sky[0], haze);
  const ring = fog ? "#eef1f2" : "#ffffff";
  return `<g>
    <ellipse cx="${x}" cy="${y + 4}" rx="34" ry="7" fill="none" stroke="${ring}" stroke-width="2" class="boat-ripple" opacity=".6"/>
    <ellipse cx="${x}" cy="${y + 4}" rx="34" ry="7" fill="none" stroke="${ring}" stroke-width="2" class="boat-ripple" style="animation-delay:-2s" opacity=".6"/>
    <g class="a-bob-slow">
      <path d="M${x - 14} ${y + 4} Q${x - 16} ${y - 18} ${x - 2} ${y - 22} Q${x + 12} ${y - 24} ${x + 20} ${y - 14} Q${x + 24} ${y - 8} ${x + 15} ${y - 6} Q${x + 14} ${y} ${x + 12} ${y + 4} Z" fill="${c}"/>
      <path d="M${x - 8} ${y - 16} Q${x} ${y - 21} ${x + 10} ${y - 19}" stroke="${tint(c, 0.25)}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="${x + 7}" cy="${y - 14}" r="2" fill="${shade(c, 0.5)}"/><circle cx="${x + 7.6}" cy="${y - 14.6}" r=".7" fill="#ffffff" opacity=".7"/>
      <path d="M${x + 16} ${y - 10} l7 -1 M${x + 16} ${y - 9} l7 2" stroke="${tint(c, 0.4)}" stroke-width=".8" opacity=".7"/>
      <path d="M${x - 16} ${y + 4} h32" stroke="${ring}" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>
    </g>
  </g>`;
}

/** A lighted bell buoy, slowly blinking red. */
function buoy(pal: Palette, fog: boolean, x: number, y: number): Layer {
  const haze = fog ? 0.55 : 0.04;
  const red = mix("#c6534a", pal.sky[0], haze);
  const redSh = shade(red, 0.25);
  const steel = mix("#3e434a", pal.sky[0], haze);
  const light = glow(x, y - 92, fog ? 70 : 40, "#ff5a4a", fog ? 0.75 : 0.5, "boat-beacon");
  return {
    defs: light.defs,
    body: `<g>
      <g opacity=".35"><g class="a-wave"><path d="M${x - 22} ${y + 6} h44 M${x - 16} ${y + 14} h32 M${x - 10} ${y + 22} h20" stroke="${red}" stroke-width="4" stroke-linecap="round"/></g></g>
      <g class="a-bob-slow" style="animation-duration:6s">
        <path d="M${x - 15} ${y - 26} L${x - 6} ${y - 84} M${x + 15} ${y - 26} L${x + 6} ${y - 84} M${x - 13} ${y - 40} L${x + 12} ${y - 40} M${x - 10} ${y - 58} L${x + 10} ${y - 58} M${x - 13} ${y - 40} L${x + 10} ${y - 58} M${x - 8} ${y - 72} L${x + 8} ${y - 72}" stroke="${red}" stroke-width="3.5"/>
        <rect x="${x - 9}" y="${y - 64}" width="18" height="20" fill="${red}"/>
        <text x="${x}" y="${y - 49}" text-anchor="middle" font-family="Georgia, serif" font-size="13" font-weight="700" fill="${mix("#f4f1ea", pal.sky[0], haze)}">7</text>
        <rect x="${x - 5}" y="${y - 90}" width="10" height="8" fill="${steel}"/>
        <path d="M${x - 30} ${y} Q${x - 30} ${y - 22} ${x - 20} ${y - 26} H${x + 20} Q${x + 30} ${y - 22} ${x + 30} ${y} Z" fill="${red}"/>
        <path d="M${x + 8} ${y - 26} H${x + 20} Q${x + 30} ${y - 22} ${x + 30} ${y} H${x + 10} Z" fill="${redSh}"/>
        <rect x="${x - 31}" y="${y - 8}" width="62" height="8" fill="${steel}"/>
        ${light.body}
        <circle cx="${x}" cy="${y - 92}" r="4" fill="#ff7a6a" class="boat-beacon"/>
      </g>
    </g>`,
  };
}

// ---- the boat ------------------------------------------------------------------

const qpt = (a: Pt, c: Pt, b: Pt, t: number): Pt => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];

function hull(pal: Palette, fog: boolean): string {
  const alu = mix("#aeb6bc", pal.light, 0.22);
  const aluHi = tint(alu, 0.5);
  const aluSh = shade(alu, 0.3);
  const inner = shade(mix("#8d969d", pal.light, 0.1), 0.38);
  const floor = shade(mix("#8d969d", pal.light, 0.1), 0.18);
  const rub = mix("#2e3337", pal.sky[0], 0.08);
  const outer = "M-40 744 Q380 646 800 628 Q1220 646 1640 744";
  const innerEdge = "M-40 792 Q380 684 794 642 L806 642 Q1220 684 1640 792";
  // Ribs down the inside of the hull, left and right.
  let ribs = "";
  for (const t of [0.12, 0.3, 0.48, 0.66]) {
    const [lx, ly] = qpt([-40, 792], [380, 684], [794, 642], t);
    const [fx, fy] = qpt([260, H + 10], [560, 740], [790, 676], t);
    ribs += `M${f(lx)} ${f(ly)} L${f(fx)} ${f(fy)} M${f(W - lx)} ${f(ly)} L${f(W - fx)} ${f(fy)} `;
  }
  let treads = "";
  for (let i = -3; i <= 3; i++) treads += `M800 680 L${800 + i * 150} ${H + 10} `;
  // Cleats and water beads along the cap.
  const [c1x, c1y] = qpt([-40, 744], [380, 646], [800, 628], 0.58);
  const [c2x, c2y] = qpt([1640, 744], [1220, 646], [800, 628], 0.52);
  const cleat = (x: number, y: number): string => `<path d="M${f(x - 16)} ${f(y + 2)} q16 -10 32 0 l-6 2 h-20 Z" fill="${shade(alu, 0.5)}"/>`;
  let beads = "";
  if (fog) {
    const r = rng(77);
    for (let i = 0; i < 22; i++) {
      const left = r() < 0.5, t = 0.05 + r() * 0.9;
      const [bx, by] = left ? qpt([-40, 744], [380, 646], [800, 628], t) : qpt([1640, 744], [1220, 646], [800, 628], t);
      beads += `<circle cx="${f(bx)}" cy="${f(by + 6 + r() * 10)}" r="${f(1.2 + r() * 1.6)}" fill="#ffffff" opacity=".7"/>`;
    }
  }
  return `<g>
    <path d="${outer} V${H + 10} H-40 Z" fill="${inner}"/>
    <path d="M790 676 Q560 740 260 ${H + 10} H1340 Q1040 740 810 676 Z" fill="${floor}"/>
    <path d="${treads}" stroke="${shade(floor, 0.14)}" stroke-width="3" opacity=".5"/>
    <path d="${ribs}" stroke="${shade(inner, 0.2)}" stroke-width="9" stroke-linecap="round" opacity=".55"/>
    <path d="${outer} L1640 792 Q1220 684 806 642 L794 642 Q380 684 -40 792 Z" fill="${alu}"/>
    <path d="${innerEdge}" stroke="${aluSh}" stroke-width="5" fill="none"/>
    <path d="M-40 760 Q380 660 800 634 Q1220 660 1640 760" stroke="${aluSh}" stroke-width="2" fill="none" opacity=".35"/>
    <path d="${outer}" stroke="${aluHi}" stroke-width="3" fill="none" opacity=".85"/>
    <path d="M-40 738 Q380 640 800 622 Q1220 640 1640 738" stroke="${rub}" stroke-width="7" fill="none"/>
    <path d="M788 616 h24 l-4 14 h-16 Z" fill="${shade(alu, 0.45)}"/><circle cx="800" cy="612" r="5" fill="none" stroke="${shade(alu, 0.45)}" stroke-width="3"/>
    ${cleat(c1x, c1y)}${cleat(c2x, c2y)}
    ${beads}
  </g>`;
}

/** The VHF whip antenna, swaying a little. */
function whip(pal: Palette, fog: boolean, x: number, base: number): string {
  const c = mix("#e9e7e1", pal.sky[0], fog ? 0.15 : 0);
  return `<g class="a-sway" style="animation-duration:5s;transform-origin:center bottom">
    <path d="M${x} ${base} Q${x + 4} ${base - 280} ${x + 24} ${base - 560}" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M${x} ${base} Q${x + 4} ${base - 280} ${x + 24} ${base - 560}" stroke="${shade(c, 0.3)}" stroke-width="1.6" fill="none" transform="translate(2 0)"/>
    <circle cx="${x + 24}" cy="${base - 562}" r="4" fill="${c}"/>
    <rect x="${x - 7}" y="${base - 40}" width="14" height="40" rx="3" fill="${shade(c, 0.55)}"/>
  </g>`;
}

/** Waterproof equipment case on the bench: binoculars and a tally notebook. */
function gearCase(pal: Palette, _fog: boolean, x: number, y: number): string {
  const w = 220, h = 140;
  const amber = mix("#e2a12f", pal.light, 0.1);
  const amberSh = shade(amber, 0.22);
  const black = "#2c3034";
  return `<g>
    <path d="M${x} ${y} L${x + 12} ${y - 16} H${x + w - 8} L${x + w} ${y} Z" fill="${tint(amber, 0.18)}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${amber}"/>
    <rect x="${x + w - 40}" y="${y}" width="40" height="${h}" rx="10" fill="${amberSh}" opacity=".6"/>
    <rect x="${x}" y="${y + 26}" width="${w}" height="5" fill="${amberSh}"/>
    <rect x="${x + 36}" y="${y + 18}" width="24" height="22" rx="3" fill="${black}"/><rect x="${x + w - 60}" y="${y + 18}" width="24" height="22" rx="3" fill="${black}"/>
    <rect x="${x + 70}" y="${y + 48}" width="96" height="40" rx="3" fill="#f4f1e8"/>
    <text x="${x + 118}" y="${y + 66}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#2f4a5c" letter-spacing="1">SEAL SURVEY</text>
    <text x="${x + 118}" y="${y + 81}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="#2f4a5c" letter-spacing="1">LEDGES · E. HEAD</text>
    <path d="M${x + 22} ${y - 10} l40 -6 l8 10 l-40 6 Z" fill="#6f7f4f"/><path d="M${x + 30} ${y - 9} l24 -4 M${x + 32} ${y - 5} l22 -3" stroke="#e9e4d2" stroke-width="1.4"/>
    <path d="M${x + 100} ${y - 14} q30 -18 60 -6" stroke="${black}" stroke-width="2.5" fill="none"/>
    <rect x="${x + 132}" y="${y - 40}" width="26" height="34" rx="7" fill="${black}"/><rect x="${x + 162}" y="${y - 40}" width="26" height="34" rx="7" fill="${black}"/>
    <rect x="${x + 152}" y="${y - 32}" width="16" height="12" fill="${shade(black, 0.2)}"/>
    <circle cx="${x + 145}" cy="${y - 34}" r="8" fill="#4a5a6a"/><circle cx="${x + 175}" cy="${y - 34}" r="8" fill="#4a5a6a"/>
    <circle cx="${x + 142}" cy="${y - 37}" r="2.5" fill="#cfe0ee" opacity=".8"/><circle cx="${x + 172}" cy="${y - 37}" r="2.5" fill="#cfe0ee" opacity=".8"/>
  </g>`;
}

function thermos(pal: Palette, _fog: boolean, x: number, base: number): string {
  const green = mix("#3d6b55", pal.light, 0.08);
  const sh = shade(green, 0.3);
  const top = base - 176;
  return `<g>
    <rect x="${x - 24}" y="${top + 30}" width="48" height="${base - top - 30}" rx="10" fill="${green}"/>
    <rect x="${x + 6}" y="${top + 30}" width="18" height="${base - top - 30}" rx="8" fill="${sh}" opacity=".6"/>
    <rect x="${x - 16}" y="${top + 40}" width="5" height="${base - top - 60}" rx="2.5" fill="${tint(green, 0.35)}" opacity=".7"/>
    <rect x="${x - 26}" y="${top}" width="52" height="34" rx="6" fill="${shade(green, 0.18)}"/>
    <rect x="${x - 26}" y="${top + 28}" width="52" height="6" fill="${shade(green, 0.4)}"/>
    <path d="M${x + 24} ${top + 50} q22 4 22 34 q0 30 -22 34" stroke="${shade(green, 0.35)}" stroke-width="7" fill="none"/>
    <rect x="${x - 18}" y="${top + 74}" width="36" height="24" rx="3" fill="#e6dfc6" opacity=".85"/>
  </g>`;
}

/** The thermos cup, balanced on the gunwale, steaming into the fog. */
function cup(pal: Palette, fog: boolean, x: number, base: number): string {
  const c = mix("#3d6b55", pal.light, 0.08);
  const steam = fog ? "#ffffff" : "#fffaf0";
  return `<g>
    <g class="boat-steam"><path d="M${x - 4} ${base - 40} q-8 -12 0 -22 q8 -10 0 -22" stroke="${steam}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/></g>
    <g class="boat-steam" style="animation-delay:-2.2s"><path d="M${x + 6} ${base - 40} q8 -12 0 -22 q-8 -10 0 -22" stroke="${steam}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/></g>
    <path d="M${x - 18} ${base - 38} L${x + 18} ${base - 38} L${x + 14} ${base} L${x - 14} ${base} Z" fill="${c}"/>
    <path d="M${x + 4} ${base - 38} L${x + 18} ${base - 38} L${x + 14} ${base} L${x + 4} ${base} Z" fill="${shade(c, 0.3)}" opacity=".6"/>
    <ellipse cx="${x}" cy="${base - 38}" rx="18" ry="4" fill="${shade(c, 0.45)}"/>
    <ellipse cx="${x}" cy="${base - 37}" rx="14" ry="2.6" fill="#7a5233"/>
  </g>`;
}

/** A coil of line on the bow deck, tail running to a cleat. */
function rope(pal: Palette, _fog: boolean, x: number, y: number): string {
  const c = mix("#d9c69c", pal.light, 0.1);
  const twist = shade(c, 0.3);
  let rings = "";
  for (let i = 0; i < 5; i++) {
    const rx = 66 - i * 9, ry = 18 - i * 2.4, cy = y - i * 4;
    rings += `<ellipse cx="${x}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${c}" stroke-width="8"/>`;
    rings += `<ellipse cx="${x}" cy="${f(cy - 1.5)}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${tint(c, 0.35)}" stroke-width="2" opacity=".7"/>`;
    rings += `<ellipse cx="${x}" cy="${f(cy + 3.5)}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${twist}" stroke-width="1.5" opacity=".6"/>`;
  }
  return `<g>
    <ellipse cx="${x}" cy="${y + 8}" rx="74" ry="16" fill="#000000" opacity=".12"/>
    <path d="M${x - 62} ${y + 4} Q${x - 110} ${y - 6} ${x - 150} ${y - 28}" stroke="${c}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M${x - 62} ${y + 4} Q${x - 110} ${y - 6} ${x - 150} ${y - 28}" stroke="${twist}" stroke-width="8" fill="none" stroke-dasharray="2 5" opacity=".5"/>
    ${rings}
  </g>`;
}
