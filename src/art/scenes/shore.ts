// Low tide at the east rocks, 5:40 a.m. The North Light on its headland, the
// seal ledges off to the right, mist lifting off a flat sea, and tide pools
// holding little pieces of the sky.
import { W, H, sky, sunDisc, cloudBand, ridge, sea, gulls, fogBands, rng, uid, shade, tint, mix } from "../kit";
import type { Palette, Part, Layer, SceneInput } from "../kit";

type Pt = [number, number];

const HORIZON = 472;

export function shore({ pal, time }: SceneInput): Part[] {
  const dawn = time !== "day";
  const sun = dawn ? { x: 1120, y: 446, r: 52 } : { x: 1210, y: 150, r: 44 };
  const P: Part[] = [];
  P.push(sky(pal));
  P.push(soft(sun.x, dawn ? HORIZON - 10 : sun.y, dawn ? 760 : 520, pal.sun, dawn ? 0.45 : 0.25));
  if (dawn) P.push(horizonGlow());
  P.push(sunDisc(pal, sun.x, sun.y, sun.r));
  P.push(streaks(pal, dawn));
  P.push(cloudBand(pal, { seed: dawn ? 14 : 15, y0: 70, y1: dawn ? 230 : 300, count: dawn ? 4 : 5, speed: 200, opacity: dawn ? 0.55 : 0.85 }));

  // Far: the headland with the North Light, the seal ledge.
  P.push(headland(pal, dawn));
  P.push(sealLedge(pal, dawn));

  // The sea, the sun's path across it, and mist lying on the water.
  P.push(sea(pal, { top: HORIZON, seed: 21, glint: tint(pal.sun, 0.2), glints: 34, glintOpacity: dawn ? 0.5 : 0.4 }));
  P.push(sunPath(pal, sun.x, dawn));
  P.push(fogBands(dawn ? 3 : 2, { y0: HORIZON - 14, y1: HORIZON + 80, color: dawn ? tint(pal.cloud, 0.3) : "#ffffff", opacity: dawn ? 0.5 : 0.3, seed: 23 }));
  P.push(midRocks(pal));
  P.push(gulls(dawn ? 3 : 4, { seed: 25, y0: 120, y1: 330, color: shade(pal.ink, 0.1) }));

  // Foreground rocks, pools and their small residents.
  P.push(...leftRocks(pal, dawn));
  P.push(...rightRocks(pal, dawn));
  P.push(fogBands(2, { y0: 600, y1: 760, color: dawn ? tint(pal.cloud, 0.4) : "#ffffff", opacity: dawn ? 0.14 : 0.08, seed: 27 }));
  return P;
}

// ---- helpers ------------------------------------------------------------------

const f = (n: number): string => (+n).toFixed(1).replace(/\.0$/, "");

function soft(x: number, y: number, r: number, color: string, op: number, cls = ""): Layer {
  const g = uid("sh-soft");
  const st = [[0, 1], [0.25, 0.7], [0.5, 0.36], [0.75, 0.12], [1, 0]];
  return {
    defs: `<radialGradient id="${g}">${st.map(([o, k]) => `<stop offset="${o}" stop-color="${color}" stop-opacity="${(op * k).toFixed(3)}"/>`).join("")}</radialGradient>`,
    body: `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})" class="${cls}"/>`,
  };
}

function horizonGlow(): Layer {
  const g = uid("sh-hz");
  return {
    defs: `<linearGradient id="${g}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffc49a" stop-opacity=".55"/><stop offset="1" stop-color="#ffc49a" stop-opacity="0"/></linearGradient>`,
    body: `<rect x="0" y="${HORIZON - 170}" width="${W}" height="172" fill="url(#${g})"/>`,
  };
}

/** Long thin dawn clouds lying along the horizon. */
function streaks(pal: Palette, dawn: boolean): string {
  const r = rng(29);
  let s = "";
  const c = dawn ? tint(pal.cloud, 0.15) : "#ffffff";
  for (let i = 0; i < (dawn ? 7 : 3); i++) {
    const y = (dawn ? 300 : 260) + r() * 130, w = 160 + r() * 320, x = r() * W;
    s += `<g class="a-drift" style="animation-duration:${f(320 + r() * 200)}s;animation-delay:-${f(r() * 300)}s"><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(5 + r() * 7)}" rx="6" fill="${c}" opacity="${f(0.25 + r() * 0.3)}"/></g>`;
  }
  return s;
}

function headland(pal: Palette, dawn: boolean): string {
  const far = mix(pal.far, pal.sky[0], dawn ? 0.22 : 0.2);
  const near = dawn ? mix(pal.mid, pal.ink, 0.18) : mix(pal.mid, pal.sky[0], 0.1);
  const lit = mix(near, pal.light, dawn ? 0.28 : 0.15);
  // Back ridge, then the headland proper with a sunlit right shoulder.
  let s = ridge({ y: HORIZON - 70, amp: 22, color: far, seed: 31, x0: -40, x1: 760, bottom: HORIZON + 2, steps: 10 });
  s += `<path d="M-20 ${HORIZON + 2} L-20 352 Q60 334 150 340 Q230 326 300 334 Q360 338 400 364 Q450 396 520 424 Q560 444 600 ${HORIZON - 12} L620 ${HORIZON + 2} Z" fill="${near}"/>
    <path d="M300 334 Q360 338 400 364 Q450 396 520 424 Q560 444 600 ${HORIZON - 12} L620 ${HORIZON + 2} L560 ${HORIZON + 2} Q520 448 470 420 Q420 394 380 368 Q340 346 300 334 Z" fill="${lit}" opacity=".55"/>
    <path d="M-20 360 Q60 342 150 348 Q230 334 300 342 Q350 346 396 370" stroke="${mix(lit, "#9fbf8a", 0.3)}" stroke-width="5" fill="none" opacity=".5"/>
    <path d="M440 ${HORIZON + 2} L470 444 L520 452 L540 ${HORIZON + 2} Z" fill="${shade(near, 0.12)}"/>`;
  s += lighthouse(pal, 232, 338, dawn);
  return s;
}

function lighthouse(pal: Palette, x: number, base: number, dawn: boolean): string {
  const k = dawn ? 0.18 : 0.1;
  const white = mix("#f4f1ea", pal.sky[0], k), wsh = mix(shade("#f4f1ea", 0.2), pal.sky[0], k);
  const red = mix("#b8483e", pal.sky[0], k), dark = mix("#2c2a36", pal.sky[0], k);
  const cottage = mix("#ece6da", pal.sky[0], k + 0.05), roof = mix("#8a3c34", pal.sky[0], k + 0.05);
  return `<g>
    <rect x="${x + 26}" y="${base - 22}" width="46" height="22" fill="${cottage}"/>
    <path d="M${x + 22} ${base - 22} L${x + 49} ${base - 38} L${x + 76} ${base - 22} Z" fill="${roof}"/>
    <rect x="${x + 34}" y="${base - 15}" width="7" height="7" fill="${dark}" opacity=".7"/><rect x="${x + 56}" y="${base - 15}" width="7" height="7" fill="${dark}" opacity=".7"/>
    <path d="M${x - 12} ${base} L${x - 8} ${base - 96} H${x + 8} L${x + 12} ${base} Z" fill="${white}"/>
    <path d="M${x + 3} ${base} L${x + 4} ${base - 96} H${x + 8} L${x + 12} ${base} Z" fill="${wsh}"/>
    <rect x="${x - 2}" y="${base - 70}" width="4" height="7" fill="${dark}" opacity=".6"/>
    <rect x="${x - 2}" y="${base - 42}" width="4" height="7" fill="${dark}" opacity=".6"/>
    <rect x="${x - 13}" y="${base - 100}" width="26" height="5" fill="${dark}"/>
    <rect x="${x - 7}" y="${base - 114}" width="14" height="14" fill="${dark}"/>
    <rect x="${x - 4}" y="${base - 112}" width="3" height="10" fill="${tint(pal.sun, 0.2)}" opacity=".55" class="a-twinkle-soft"/>
    <path d="M${x - 10} ${base - 114} Q${x} ${base - 128} ${x + 10} ${base - 114} Z" fill="${red}"/>
    <rect x="${x - 1}" y="${base - 132}" width="2" height="7" fill="${dark}"/>
  </g>`;
}

function sealLedge(pal: Palette, dawn: boolean): string {
  const rock = mix(shade(pal.mid, 0.25), pal.sky[0], dawn ? 0.2 : 0.1);
  const seal = mix("#4a4652", pal.sky[0], dawn ? 0.14 : 0.08), belly = mix("#7a7480", pal.sky[0], 0.2);
  const y = HORIZON + 2;
  let s = `<path d="M1270 ${y + 8} Q1290 ${y - 12} 1330 ${y - 14} Q1380 ${y - 22} 1430 ${y - 16} Q1480 ${y - 20} 1530 ${y - 12} Q1570 ${y - 8} 1600 ${y - 10} V${y + 10} Z" fill="${rock}"/>
    <path d="M1300 ${y - 10} Q1380 ${y - 20} 1440 ${y - 14}" stroke="${mix(rock, pal.light, 0.3)}" stroke-width="2" fill="none" opacity=".6"/>`;
  // Hauled-out seals: banana shapes, a few with heads up.
  const pos = [[1316, -12, 1, 0], [1352, -16, 0.9, 1], [1392, -19, 1.1, 0], [1424, -15, 0.8, 0], [1460, -18, 1, 1], [1500, -15, 0.9, 0], [1540, -11, 1.05, 0], [1572, -10, 0.85, 1]];
  for (const [sx, dy, k, up] of pos) {
    const by = y + dy;
    s += up
      ? `<path d="M${sx - 13 * k} ${by} Q${sx - 12 * k} ${by - 7 * k} ${sx} ${by - 6 * k} Q${sx + 7 * k} ${by - 7 * k} ${sx + 9 * k} ${by - 14 * k} Q${sx + 14 * k} ${by - 15 * k} ${sx + 13 * k} ${by - 9 * k} Q${sx + 14 * k} ${by} ${sx + 6 * k} ${by} Z" fill="${seal}"/>`
      : `<path d="M${sx - 14 * k} ${by} Q${sx - 12 * k} ${by - 8 * k} ${sx} ${by - 7 * k} Q${sx + 12 * k} ${by - 7 * k} ${sx + 15 * k} ${by - 2 * k} L${sx + 14 * k} ${by} Z" fill="${seal}"/>`;
    s += `<path d="M${sx - 8 * k} ${by - 1} h${12 * k}" stroke="${belly}" stroke-width="1.5" opacity=".5"/>`;
  }
  // Two heads in the water, bobbing.
  for (const [hx, d] of [[1250, 0], [1296, 2.4]]) {
    s += `<g class="a-bob" style="animation-delay:-${d}s"><ellipse cx="${hx}" cy="${y + 14}" rx="5" ry="4.5" fill="${seal}"/><path d="M${hx - 12} ${y + 18} h24" stroke="${tint(pal.sea[0], 0.4)}" stroke-width="1.5" opacity=".6"/></g>`;
  }
  return s;
}

function sunPath(pal: Palette, x: number, dawn: boolean): string {
  const r = rng(33);
  let out = "";
  const n = dawn ? 24 : 14;
  for (let i = 0; i < n; i++) {
    const t = i / n, y = HORIZON + 6 + t * t * 260, w = 24 + t * 150 + r() * 40;
    out += `<path d="M${f(x - w / 2 + (r() - 0.5) * 40)} ${f(y)} h${f(w)}" stroke="${pal.sun}" stroke-width="${f(2 + t * 3.5)}" stroke-linecap="round" opacity="${f((dawn ? 0.6 : 0.35) - t * 0.3)}" class="a-wave" style="animation-delay:-${f(r() * 5)}s"/>`;
  }
  return out;
}

function midRocks(pal: Palette): string {
  const c = mix(shade(pal.mid, 0.35), pal.sea[0], 0.25), foam = tint(pal.sea[0], 0.6);
  return `<path d="M760 552 Q776 534 800 536 Q822 532 836 548 L842 556 H756 Z" fill="${c}"/>
    <path d="M846 556 Q858 546 872 548 L880 556 Z" fill="${c}"/>
    <path d="M744 558 Q800 552 890 558" stroke="${foam}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6" class="a-wave"/>
    <path d="M1000 520 Q1012 510 1030 512 L1040 520 Z" fill="${mix(c, pal.sea[0], 0.3)}"/>
    <path d="M992 522 Q1020 518 1048 522" stroke="${foam}" stroke-width="2" fill="none" opacity=".5" class="a-wave" style="animation-delay:-2s"/>`;
}

// ---- foreground ---------------------------------------------------------------------

function rockColors(pal: Palette, dawn: boolean) {
  const base = mix("#3d3b4a", pal.ink, dawn ? 0.2 : 0.1);
  return {
    base,
    back: mix(base, pal.sky[0], dawn ? 0.16 : 0.12),
    dark: shade(base, 0.38),
    face: mix(base, pal.light, dawn ? 0.3 : 0.2),
    sheen: mix(pal.sky[0], "#ffffff", 0.3),
    weed: ["#5a4a1e", "#6e5a24", "#4a3e1a"],
    bladder: "#8a7430",
    green: "#6f8f45",
  };
}

type RockColors = ReturnType<typeof rockColors>;

/** A tide pool set into the rock, holding a slice of sky, with a ripple. */
function pool(pal: Palette, cx: number, cy: number, rx: number, ry: number, c: RockColors, extra = "", seed = 1): Layer {
  const g = uid("sh-pool");
  const r = rng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, k = 0.85 + r() * 0.25;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const rim = pts.map(([x, y]): Pt => [x, y - 4 - (y < cy ? 2 : 0)]);
  return {
    defs: `<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.sky[2]}"/><stop offset=".55" stop-color="${pal.sky[1]}"/><stop offset="1" stop-color="${mix(pal.sky[0], "#ffffff", 0.2)}"/></linearGradient>`,
    body: `<path d="${blob(rim)}" fill="${c.dark}" opacity=".85"/>
      <path d="${blob(pts)}" fill="url(#${g})"/>
      <path d="M${cx - rx * 0.9} ${cy - ry * 0.2} Q${cx} ${cy - ry * 1.1} ${cx + rx * 0.9} ${cy - ry * 0.2}" stroke="${c.dark}" stroke-width="${f(ry * 0.5)}" fill="none" opacity=".2"/>
      ${extra}
      <path d="M${cx - rx * 0.5} ${cy + ry * 0.2} h${rx * 0.4}" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".5" class="a-wave" style="animation-duration:6s"/>
      <path d="M${cx + rx * 0.1} ${cy + ry * 0.45} h${rx * 0.3}" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity=".4" class="a-wave" style="animation-duration:7s;animation-delay:-3s"/>`,
  };
}

function starfish(x: number, y: number, s: number, color: string, rot = 0): string {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = ((i * 36 + rot - 90) * Math.PI) / 180, rr = i % 2 ? 0.42 * s : s;
    d += `${i ? "L" : "M"}${f(x + Math.cos(a) * rr)} ${f(y + Math.sin(a) * rr * 0.6)} `;
  }
  return `<path d="${d}Z" fill="${color}" stroke="${color}" stroke-width="${f(s * 0.28)}" stroke-linejoin="round"/>
    <circle cx="${x}" cy="${y}" r="${f(s * 0.2)}" fill="${tint(color, 0.3)}"/>`;
}

function barnacles(x: number, y: number, n: number, r: () => number, c: string): string {
  let s = "";
  for (let i = 0; i < n; i++) s += `<ellipse cx="${f(x + (r() - 0.5) * 60)}" cy="${f(y + (r() - 0.5) * 16)}" rx="${f(1.6 + r() * 2)}" ry="${f(1.2 + r() * 1.2)}" fill="${c}" opacity=".7"/>`;
  return s;
}

function mussels(x: number, y: number, n: number, r: () => number): string {
  let s = "";
  for (let i = 0; i < n; i++) {
    const mx = x + (r() - 0.5) * 40, my = y + (r() - 0.5) * 10;
    s += `<ellipse cx="${f(mx)}" cy="${f(my)}" rx="6" ry="3" fill="#232a44" transform="rotate(${f(-30 + r() * 60)} ${f(mx)} ${f(my)})"/>`;
  }
  return s;
}

/** Bladderwrack draped over a rock lip: a ragged mat of fronds, swaying a little. */
function wrack(x: number, y: number, len: number, c: RockColors, r: () => number, delay = 0, angle = 0): string {
  const w = len * 1.5, lobes = 6;
  let d = `M${f(x - w / 2)} ${f(y - 3)} Q${x} ${f(y - 9)} ${f(x + w / 2)} ${f(y - 3)}`;
  for (let i = lobes; i >= 0; i--) {
    const lx = x - w / 2 + (w * i) / lobes, ly = y + len * (0.45 + r() * 0.55);
    d += ` Q${f(lx + w / lobes / 2)} ${f(ly + 6)} ${f(lx)} ${f(y + len * 0.3)}`;
  }
  let streaks = "";
  for (let i = 1; i < lobes; i += 2) {
    const lx = x - w / 2 + (w * i) / lobes;
    streaks += `<path d="M${f(lx)} ${y} q${f(r() * 4 - 2)} ${f(len * 0.4)} 0 ${f(len * 0.7)}" stroke="${c.weed[2]}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>`;
    streaks += `<ellipse cx="${f(lx + 5)}" cy="${f(y + len * 0.35)}" rx="2.4" ry="3" fill="${c.bladder}" opacity=".8"/>`;
  }
  // skewY keeps the strands hanging straight down while the mat follows the slope.
  return `<g transform="translate(${x} ${y}) skewY(${angle}) translate(${-x} ${-y})"><g class="a-sway" style="animation-duration:${f(5 + r() * 2)}s;animation-delay:-${delay}s"><path d="${d} Z" fill="${c.weed[0]}"/>${streaks}</g></g>`;
}

/** Closed polygon with its corners rounded by up to `rad` (rocks stay angular). */
function rounded(pts: Pt[], rad = 16): string {
  const n = pts.length;
  const cut = (p: Pt, q: Pt, d: number): Pt => {
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, k = Math.min(d, L / 2) / L;
    return [p[0] + dx * k, p[1] + dy * k];
  };
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = pts[i], prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
    const a = cut(p, prev, rad), b = cut(p, next, rad);
    d += `${i ? "L" : "M"}${f(a[0])} ${f(a[1])} Q${f(p[0])} ${f(p[1])} ${f(b[0])} ${f(b[1])} `;
  }
  return d + "Z";
}

/** Smooth closed blob through points (tide pools). */
function blob(pts: Pt[]): string {
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const n = pts.length;
  const m = mid(pts[n - 1], pts[0]);
  let d = `M${f(m[0])} ${f(m[1])}`;
  for (let i = 0; i < n; i++) {
    const q = mid(pts[i], pts[(i + 1) % n]);
    d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f(q[0])} ${f(q[1])}`;
  }
  return d + " Z";
}

/** Open smooth line through points. */
function smooth(pts: Pt[]): string {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const q = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f(q[0])} ${f(q[1])}`;
  }
  const L = pts[pts.length - 1];
  return d + ` L${f(L[0])} ${f(L[1])}`;
}

/**
 * A boulder: body, a sunlit top facet (the top edge pts[a..b] and the same
 * line dropped by `depth`), a shadowed flank and a wet sheen on the lip.
 */
function boulder(pts0: Pt[], [a, b]: [number, number], fill: string, c: RockColors, { depth = 22, lit = 0.6, flank = "left", rad = 18 }: { depth?: number; lit?: number; flank?: string; rad?: number } = {}): Layer {
  const pts = pts0.map(([x, y]): Pt => [x, y >= H ? H + 80 : y]);
  const top = pts.slice(a, b + 1);
  const band = [...top, ...top.slice().reverse().map(([x, y], i, arr): Pt => [x, y + depth * (0.6 + 0.4 * Math.sin((Math.PI * i) / (arr.length - 1 || 1)))])];
  const xs = pts.map((p) => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const fl = flank === "left" ? x0 + (x1 - x0) * 0.28 : x1 - (x1 - x0) * 0.28;
  const ys = pts.map((p) => p[1]), yb = Math.max(...ys);
  const flankPath = flank === "left"
    ? `M${x0 - 4} ${yb} V${Math.min(...ys) + depth} Q${fl - 20} ${(Math.min(...ys) + yb) / 2} ${fl} ${yb} Z`
    : `M${x1 + 4} ${yb} V${Math.min(...ys) + depth} Q${fl + 20} ${(Math.min(...ys) + yb) / 2} ${fl} ${yb} Z`;
  const clip = uid("sh-rk");
  return {
    defs: `<clipPath id="${clip}"><path d="${rounded(pts, rad)}"/></clipPath>`,
    body: `<path d="${rounded(pts, rad)}" fill="${fill}"/>
      <g clip-path="url(#${clip})">
        <path d="${flankPath}" fill="${c.dark}" opacity=".45"/>
        <path d="${rounded(band, 10)}" fill="${c.face}" opacity="${lit}"/>
      </g>
      <path d="${smooth(top)}" stroke="${c.sheen}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".45"/>`,
  };
}

function leftRocks(pal: Palette, dawn: boolean): Part[] {
  const c = rockColors(pal, dawn);
  const r = rng(41);
  return [
    boulder([[-30, 900], [-30, 470], [36, 442], [118, 436], [178, 458], [214, 506], [236, 600], [250, 900]], [1, 6], c.back, c, { depth: 30, lit: 0.55, flank: "left" }),
    boulder([[110, 900], [138, 572], [200, 546], [320, 534], [440, 546], [530, 574], [610, 614], [668, 662], [700, 900]], [1, 7], c.base, c, { depth: 26, lit: 0.6, flank: "left" }),
    pool(pal, 330, 562, 104, 13, c, `${starfish(380, 566, 11, "#c75a7a", 12)}<ellipse cx="282" cy="564" rx="20" ry="4" fill="${c.green}" opacity=".7"/>`, 3),
    boulder([[-30, 900], [-30, 646], [50, 616], [140, 610], [204, 636], [236, 704], [250, 900]], [1, 5], shade(c.base, 0.12), c, { depth: 20, lit: 0.5, flank: "right" }),
    barnacles(80, 460, 14, r, "#d8d0c0") + barnacles(470, 568, 10, r, "#d8d0c0") + mussels(600, 628, 9, r) + mussels(180, 548, 6, r) + barnacles(120, 626, 8, r, "#d8d0c0"),
    starfish(500, 592, 14, "#e0703a", -8),
    wrack(210, 516, 28, c, r, 0, 34) + wrack(644, 648, 38, c, r, 4, 30) + wrack(234, 704, 28, c, r, 2, 36),
    foam(pal, 660, 690, 0),
  ];
}

function rightRocks(pal: Palette, dawn: boolean): Part[] {
  const c = rockColors(pal, dawn);
  const r = rng(47);
  return [
    boulder([[1630, 900], [1630, 486], [1566, 466], [1492, 472], [1440, 500], [1412, 556], [1398, 900]], [1, 5], c.back, c, { depth: 30, lit: 0.6, flank: "left" }),
    boulder([[1500, 900], [1478, 590], [1400, 572], [1270, 570], [1160, 588], [1080, 622], [1024, 672], [1000, 900]], [1, 6], c.base, c, { depth: 24, lit: 0.6, flank: "right" }),
    pool(pal, 1270, 594, 104, 13, c, `${starfish(1226, 598, 10, "#e0703a", 30)}<ellipse cx="1324" cy="596" rx="22" ry="4" fill="${c.green}" opacity=".7"/>`, 5),
    boulder([[1630, 900], [1630, 650], [1560, 624], [1478, 630], [1430, 664], [1416, 900]], [1, 4], shade(c.base, 0.12), c, { depth: 20, lit: 0.5, flank: "left" }),
    barnacles(1520, 482, 14, r, "#d8d0c0") + barnacles(1150, 596, 10, r, "#d8d0c0") + mussels(1060, 646, 8, r) + mussels(1440, 584, 6, r),
    starfish(1130, 612, 13, "#8a4a8a", 20),
    wrack(1414, 562, 28, c, r, 1, -34) + wrack(1046, 654, 38, c, r, 3, -30) + wrack(1432, 674, 28, c, r, 5, -34),
    foam(pal, 1040, 708, 1),
    // The shelf we're standing on, mostly under the dialog.
    boulder([[480, 900], [540, 760], [700, 728], [900, 722], [1060, 736], [1150, 780], [1190, 900]], [1, 5], shade(c.base, 0.2), c, { depth: 18, lit: 0.4, flank: "right" }),
  ];
}

function foam(pal: Palette, x: number, y: number, flip: number): string {
  const c = tint(pal.sea[0], 0.7), dir = flip ? 1 : -1;
  return `<g class="a-wave" style="animation-duration:6s">
    <path d="M${x - 60 * dir} ${y + 10} Q${x} ${y - 6} ${x + 70 * dir} ${y + 6}" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/>
    <path d="M${x - 90 * dir} ${y + 30} Q${x - 10 * dir} ${y + 16} ${x + 50 * dir} ${y + 28}" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".35"/>
  </g>`;
}
