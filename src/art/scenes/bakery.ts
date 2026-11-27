// Amaral's Bakery, 4 a.m. The oven has been lit since three, Front Street is
// still dark, and the first trays are cooling on the counter. "blackout" is
// the storm night: power's out, candles everywhere, the oven still roaring.
import { W, H, rng, uid, shade, tint, mix, motes, windowRain } from "../kit";
import type { Palette, Part, Layer, SceneInput } from "../kit";

const WIN = { x: 1296, y: 112, w: 262, h: 326 };   // the shop window (glass area)
const TILE_TOP = 476;                               // azulejo band starts here
const COUNTER = 606;                                // marble counter top
const MOUTH = { x: 244, y: 548, r: 92, h: 92 };     // oven mouth: center x, floor y, arch radius, wall height
const LAMPS = [586, 1022];

export function bakery({ pal, weather }: SceneInput): Part[] {
  const dark = weather === "blackout";
  const P: Part[] = [];
  P.push(styles());
  P.push(wall(pal));
  P.push(tiles());
  P.push(windowView(pal, dark));
  P.push(shelves());
  P.push(clock(1158, 128));
  P.push(oven());
  P.push(peel(500, COUNTER));
  P.push(lamps(dark));
  P.push(counter());
  if (dark) P.push(candles(false));

  // Lighting: darken the whole room, then add the light sources back in.
  P.push(shadowPass(dark));
  P.push(soft(MOUTH.x, MOUTH.y - 40, dark ? 620 : 460, "#ff8a3a", dark ? 0.6 : 0.42, "a-flicker bakery-slow"));
  if (dark) {
    P.push(candles(true));
  } else {
    for (const x of LAMPS) {
      P.push(soft(x, 230, 560, "#ffc670", 0.55));
      P.push(lightCone(x));
    }
    P.push(soft(1420, 300, 260, "#9fb6ff", 0.08));
  }
  P.push(fire());
  if (!dark) P.push(bulbs());
  if (dark) P.push(roomFlash());

  // Air: flour in the lamplight, embers from the oven, steam off the trays.
  P.push(motes(dark ? 18 : 46, { x0: 60, x1: 1540, y0: 170, y1: 600, color: "#fff4e2", size: [0.8, 2.4], seed: 61, opacity: dark ? 0.35 : 0.55 }));
  P.push(motes(14, { x0: MOUTH.x - 70, x1: MOUTH.x + 70, y0: MOUTH.y - 120, y1: MOUTH.y - 20, color: "#ffb35c", size: [1, 2.2], seed: 67, opacity: 0.9 }));
  P.push(steam(dark));
  return P;
}

// ---- helpers ------------------------------------------------------------------

const f = (n: number): string => (+n).toFixed(1).replace(/\.0$/, "");

/** A pool of light with a smooth (not linear) falloff, so big pools don't show a rim. */
function soft(x: number, y: number, r: number, color: string, op: number, cls = ""): Layer {
  const g = uid("bk-soft");
  const st = [[0, 1], [0.25, 0.7], [0.5, 0.36], [0.75, 0.12], [1, 0]];
  return {
    defs: `<radialGradient id="${g}">${st.map(([o, k]) => `<stop offset="${o}" stop-color="${color}" stop-opacity="${+f(op * k * 1000) / 1000}"/>`).join("")}</radialGradient>`,
    body: `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})" class="${cls}"/>`,
  };
}

function styles(): string {
  return `<style>
    .bakery-slow { animation-duration: 3.4s; }
    @keyframes bakery-steam { 0% { transform: translate(0, 0); opacity: 0; } 30% { opacity: .55; } 100% { transform: translate(-10px, -70px); opacity: 0; } }
    .bakery-steam { animation: bakery-steam 6s ease-out infinite; }
    @keyframes bakery-rain { from { transform: translateY(0); } to { transform: translateY(${WIN.h}px); } }
    .bakery-rain { animation: bakery-rain .55s linear infinite; }
    @keyframes bakery-sec { to { transform: rotate(360deg); } }
    .bakery-sec { animation: bakery-sec 60s steps(60) infinite; transform-box: view-box; }
  </style>`;
}

function wall(pal: Palette): Layer {
  const plaster = mix("#f6d9a6", pal.light, 0.1);
  const g = uid("bk-ceil");
  const r = rng(71);
  let blotches = "";
  for (let i = 0; i < 14; i++) {
    blotches += `<ellipse cx="${f(r() * W)}" cy="${f(60 + r() * 380)}" rx="${f(40 + r() * 120)}" ry="${f(20 + r() * 50)}" fill="${shade(plaster, 0.12)}" opacity="${f(0.05 + r() * 0.07)}"/>`;
  }
  const beam = "#4a2f22";
  let joists = "";
  for (let x = 60; x < W; x += 260) joists += `<rect x="${x}" y="30" width="26" height="14" fill="${shade(beam, 0.25)}"/>`;
  return {
    defs: `<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1812" stop-opacity=".55"/><stop offset=".5" stop-color="#2a1812" stop-opacity="0"/></linearGradient>`,
    body: `<rect width="${W}" height="${H}" fill="${plaster}"/>${blotches}
      <rect width="${W}" height="${TILE_TOP}" fill="url(#${g})"/>
      <rect x="0" y="0" width="${W}" height="34" fill="${beam}"/>
      <rect x="0" y="30" width="${W}" height="4" fill="${shade(beam, 0.35)}"/>${joists}`,
  };
}

/** Blue-and-white azulejo band along the lower wall. */
function tiles(): Layer {
  const id = uid("bk-azul");
  const s = 46, c = s / 2;
  const white = "#eef0ec", blue = "#2f5c9a", pale = "#8fb0d6";
  const corner = (x: number, y: number): string => `<circle cx="${x}" cy="${y}" r="${s * 0.22}" fill="${blue}"/><circle cx="${x}" cy="${y}" r="${s * 0.1}" fill="${white}"/>`;
  const defs = `<pattern id="${id}" x="0" y="${TILE_TOP + 18}" width="${s}" height="${s}" patternUnits="userSpaceOnUse">
      <rect width="${s}" height="${s}" fill="${white}"/>
      ${corner(0, 0)}${corner(s, 0)}${corner(0, s)}${corner(s, s)}
      <circle cx="${c}" cy="${c}" r="${s * 0.27}" fill="none" stroke="${pale}" stroke-width="2.5"/>
      <path d="M${c} ${s * 0.18} Q${s * 0.6} ${s * 0.4} ${s * 0.82} ${c} Q${s * 0.6} ${s * 0.6} ${c} ${s * 0.82} Q${s * 0.4} ${s * 0.6} ${s * 0.18} ${c} Q${s * 0.4} ${s * 0.4} ${c} ${s * 0.18} Z" fill="${blue}"/>
      <circle cx="${c}" cy="${c}" r="3" fill="${white}"/>
      <rect x=".5" y=".5" width="${s - 1}" height="${s - 1}" fill="none" stroke="#c9ccd0" stroke-width="1"/>
    </pattern>`;
  const rail = "#6b4429";
  return {
    defs,
    body: `<rect x="0" y="${TILE_TOP}" width="${W}" height="${H - TILE_TOP}" fill="url(#${id})"/>
      <rect x="0" y="${TILE_TOP}" width="${W}" height="18" fill="${blue}"/>
      <rect x="0" y="${TILE_TOP + 6}" width="${W}" height="3" fill="${white}" opacity=".85"/>
      <rect x="0" y="${TILE_TOP - 12}" width="${W}" height="14" fill="${rail}"/>
      <rect x="0" y="${TILE_TOP - 12}" width="${W}" height="3" fill="${tint(rail, 0.3)}"/>
      <rect x="0" y="${TILE_TOP + 18}" width="${W}" height="6" fill="#1a1020" opacity=".12"/>`,
  };
}

function windowView(pal: Palette, dark: boolean): Layer {
  const { x, y, w, h } = WIN;
  const clip = uid("bk-win"), skyG = uid("bk-wsky"), lampG = uid("bk-wlamp"), path = uid("bk-arc");
  // Pre-dawn: the sky over the rooftops is just starting to lift.
  const skyStops = dark ? ["#323a4a", "#262d3c", "#1b212e", "#12161f"] : ["#4a6aa6", "#2e4580", pal.sky[2], pal.sky[3]];
  const street = y + h - 24;
  const houseA = dark ? "#10141d" : "#151c3a", houseB = dark ? "#0c1018" : "#10162f";
  const lit = "#ffcf86";
  let view = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${skyG})"/>`;
  if (!dark) {
    const r = rng(73);
    for (let i = 0; i < 10; i++) view += `<circle cx="${f(x + r() * w)}" cy="${f(y + r() * 120)}" r="${f(0.7 + r() * 1.2)}" fill="#fffbe8" class="a-twinkle" style="animation-delay:-${f(r() * 5)}s"/>`;
  }
  // Houses across Front Street.
  const ridgeY = y + 214;
  view += `<path d="M${x - 10} ${ridgeY + 10} Q${x + 80} ${ridgeY - 16} ${x + w + 10} ${ridgeY - 4} V${street} H${x - 10} Z" fill="${dark ? "#181d28" : "#25335e"}"/>
    <path d="M${x - 10} ${street} V${y + 222} L${x + 58} ${y + 168} L${x + 126} ${y + 222} V${street} Z" fill="${houseA}"/>
    <rect x="${x + 44}" y="${y + 160}" width="12" height="26" fill="${houseA}"/>
    <rect x="${x + 138}" y="${y + 204}" width="${w - 120}" height="${street - y - 204}" fill="${houseB}"/>
    <rect x="${x + 132}" y="${y + 196}" width="${w - 110}" height="10" fill="${shade(houseB, 0.3)}"/>
    <rect x="${x + 20}" y="${y + 240}" width="20" height="28" fill="${dark ? "#1a1f2b" : lit}" opacity="${dark ? 1 : 0.85}"/>
    <rect x="${x + 76}" y="${y + 240}" width="20" height="28" fill="${shade(houseA, 0.3)}"/>
    <rect x="${x + 218}" y="${y + 228}" width="18" height="26" fill="${dark ? "#ffb35c" : shade(houseB, 0.3)}" opacity="${dark ? 0.6 : 1}"/>
    <rect x="${x - 10}" y="${street}" width="${w + 20}" height="40" fill="${dark ? "#0b0e15" : "#1a2244"}"/>
    <rect x="${x - 10}" y="${street}" width="${w + 20}" height="3" fill="${dark ? "#2a3140" : "#3a4a7a"}" opacity=".7"/>`;
  // Streetlamp (dead in the blackout).
  const lx = x + 174, ly = y + 236;
  view += `<rect x="${lx - 2}" y="${ly}" width="5" height="${street - ly}" fill="${dark ? "#07090e" : "#0b0f22"}"/>
    <path d="M${lx - 11} ${ly + 2} h23 l-5 -15 h-13 Z" fill="${dark ? "#07090e" : "#0b0f22"}"/>`;
  if (!dark) {
    view += `<circle cx="${lx}" cy="${ly + 6}" r="120" fill="url(#${lampG})" class="a-pulse"/>
      <rect x="${lx - 8}" y="${ly + 2}" width="17" height="6" fill="#fff0c4"/>
      <ellipse cx="${lx}" cy="${street + 10}" rx="64" ry="7" fill="#ffc874" opacity=".35"/>`;
  } else {
    view += localRain(x, y, w, h);
    view += `<path d="M${x + 196} ${y} l-22 58 l16 2 l-26 70 l12 0 l-20 54" fill="none" stroke="#f2f6ff" stroke-width="3" stroke-linejoin="round" class="a-lightning"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#dfe8ff" class="a-lightning"/>`;
  }
  // Glass: faint reflections + "AMARAL'S" gilded on it, read backwards from inside.
  const cx = x + w / 2;
  view += `<path d="M${x + 30} ${y + h} L${x + 120} ${y} H${x + 150} L${x + 60} ${y + h} Z" fill="#ffffff" opacity=".05"/>
    <path d="M${x + 170} ${y + h} L${x + 240} ${y} H${x + 252} L${x + 182} ${y + h} Z" fill="#ffffff" opacity=".04"/>
    <g transform="translate(${2 * cx} 0) scale(-1 1)" opacity=".9">
      <text font-family="Georgia, 'Times New Roman', serif" font-size="40" font-weight="700" letter-spacing="3" fill="#d6a24a" text-anchor="middle"><textPath href="#${path}" startOffset="50%">AMARAL'S</textPath></text>
      <text x="${cx}" y="${y + 196}" font-family="Georgia, serif" font-size="13" letter-spacing="4" fill="#d6a24a" text-anchor="middle">PADARIA · 1975</text>
      <path d="M${cx - 60} ${y + 206} h120" stroke="#d6a24a" stroke-width="1.5"/>
    </g>`;
  if (dark) view += windowRain(x, y, w, h, { seed: 79, count: 7, color: "#c9d4e4" });

  const frame = "#3a6480", fr = shade(frame, 0.3), sill = "#6b4429";
  const body = `<g clip-path="url(#${clip})">${view}</g>
    <rect x="${x - 18}" y="${y - 18}" width="${w + 36}" height="18" fill="${frame}"/>
    <rect x="${x - 18}" y="${y}" width="18" height="${h}" fill="${frame}"/>
    <rect x="${x + w}" y="${y}" width="18" height="${h}" fill="${frame}"/>
    <rect x="${x}" y="${y + 92}" width="${w}" height="10" fill="${frame}"/>
    <rect x="${x + w / 3 - 4}" y="${y}" width="8" height="92" fill="${frame}"/>
    <rect x="${x + (2 * w) / 3 - 4}" y="${y}" width="8" height="92" fill="${frame}"/>
    <rect x="${x}" y="${y}" width="${w}" height="5" fill="${fr}" opacity=".7"/>
    <rect x="${x}" y="${y + 102}" width="${w}" height="4" fill="${fr}" opacity=".6"/>
    <rect x="${x - 4}" y="${y}" width="4" height="${h}" fill="${fr}"/>
    <rect x="${x - 28}" y="${y + h}" width="${w + 56}" height="16" fill="${sill}"/>
    <rect x="${x - 28}" y="${y + h}" width="${w + 56}" height="4" fill="${tint(sill, 0.3)}"/>
    <rect x="${x - 22}" y="${y + h + 16}" width="${w + 44}" height="6" fill="#1a1020" opacity=".18"/>
    ${pot(x + w - 34, y + h)}`;
  return {
    defs: `<clipPath id="${clip}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>
      <linearGradient id="${skyG}" x1="0" y1="1" x2="0" y2="0">${skyStops.map((c, i) => `<stop offset="${i / 3}" stop-color="${c}"/>`).join("")}</linearGradient>
      <radialGradient id="${lampG}"><stop offset="0" stop-color="#ffc874" stop-opacity=".75"/><stop offset="1" stop-color="#ffc874" stop-opacity="0"/></radialGradient>
      <path id="${path}" d="M${x + 22} ${y + 176} Q${cx} ${y + 122} ${x + w - 22} ${y + 176}"/>`,
    body,
  };
}

/** Rain behind the glass, looping over one window height. */
function localRain(x: number, y: number, w: number, h: number): string {
  const r = rng(83);
  let lines = "";
  for (let i = 0; i < 20; i++) {
    const lx = x + r() * (w + 40), ly = y + r() * h, len = 16 + r() * 22;
    lines += `<path d="M${f(lx)} ${f(ly)} l${f(-len * 0.22)} ${f(len)}" stroke="#aebbd0" stroke-width="${i % 3 ? 1.2 : 2}" stroke-linecap="round"/>`;
  }
  return `<g class="bakery-rain" opacity=".55">${lines}<g transform="translate(0 -${h})">${lines}</g></g>`;
}

function pot(x: number, base: number): string {
  return `<path d="M${x - 14} ${base} l-3 -22 h34 l-3 22 Z" fill="#b8613f"/><rect x="${x - 19}" y="${base - 26}" width="38" height="6" fill="#c97452"/>
    <path d="M${x} ${base - 26} q-22 -14 -20 -38 q12 14 20 38 q4 -30 18 -42 q2 26 -18 42" fill="#4f7a4a"/>`;
}

function clock(cx: number, cy: number): string {
  let ticks = "";
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6, r1 = i % 3 ? 33 : 30;
    ticks += `<path d="M${f(cx + Math.sin(a) * r1)} ${f(cy - Math.cos(a) * r1)} L${f(cx + Math.sin(a) * 37)} ${f(cy - Math.cos(a) * 37)}" stroke="#3a2a24" stroke-width="${i % 3 ? 1.5 : 3}"/>`;
  }
  const hand = (deg: number, len: number, wdt: number): string => {
    const a = (deg * Math.PI) / 180;
    return `<path d="M${cx} ${cy} L${f(cx + Math.sin(a) * len)} ${f(cy - Math.cos(a) * len)}" stroke="#2a1d1a" stroke-width="${wdt}" stroke-linecap="round"/>`;
  };
  // 4:04 — Rosie's been up for an hour.
  return `<circle cx="${cx}" cy="${cy + 4}" r="50" fill="#1a1020" opacity=".15"/>
    <circle cx="${cx}" cy="${cy}" r="48" fill="#5b3a28"/><circle cx="${cx}" cy="${cy}" r="42" fill="#f6eedb"/>
    ${ticks}${hand(122, 20, 4)}${hand(24, 31, 3)}
    <g class="bakery-sec" style="transform-origin:${cx}px ${cy}px"><path d="M${cx} ${cy + 8} V${cy - 35}" stroke="#c0453a" stroke-width="1.5"/></g>
    <circle cx="${cx}" cy="${cy}" r="3.5" fill="#2a1d1a"/>`;
}

// ---- bread ----------------------------------------------------------------------

const CRUST = ["#c98a4b", "#b97a3e", "#d39a58", "#a8682f"];

function boule(x: number, base: number, r: number, crust: string, scoring = "cross"): string {
  const hl = tint(crust, 0.35), dk = shade(crust, 0.3);
  let score = "";
  if (scoring === "cross") {
    score = `<path d="M${f(x - r * 0.45)} ${f(base - r * 0.62)} Q${x} ${f(base - r * 0.82)} ${f(x + r * 0.45)} ${f(base - r * 0.62)}" stroke="${hl}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M${f(x - r * 0.1)} ${f(base - r * 0.9)} Q${f(x + r * 0.05)} ${f(base - r * 0.55)} ${f(x - r * 0.05)} ${f(base - r * 0.3)}" stroke="${hl}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  } else {
    score = `<path d="M${f(x - r * 0.55)} ${f(base - r * 0.45)} Q${x} ${f(base - r * 1.0)} ${f(x + r * 0.55)} ${f(base - r * 0.45)}" stroke="${hl}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  return `<path d="M${f(x - r)} ${base} C${f(x - r)} ${f(base - r * 1.15)} ${f(x + r)} ${f(base - r * 1.15)} ${f(x + r)} ${base} Z" fill="${crust}"/>
    <path d="M${f(x - r * 0.8)} ${f(base - r * 0.35)} C${f(x - r * 0.75)} ${f(base - r * 0.95)} ${f(x + r * 0.1)} ${f(base - r * 1.0)} ${f(x + r * 0.3)} ${f(base - r * 0.82)}" stroke="${hl}" stroke-width="${f(r * 0.18)}" fill="none" stroke-linecap="round" opacity=".45"/>
    <path d="M${f(x - r)} ${base} h${f(2 * r)}" stroke="${dk}" stroke-width="3"/>${score}`;
}

function longLoaf(x: number, base: number, len: number, h: number, crust: string): string {
  const hl = tint(crust, 0.4), dk = shade(crust, 0.3);
  let slashes = "";
  for (let i = 0; i < 4; i++) {
    const sx = x - len * 0.3 + (i * len * 0.6) / 3;
    slashes += `<path d="M${f(sx - 9)} ${f(base - h * 0.45)} l18 ${f(-h * 0.35)}" stroke="${hl}" stroke-width="3" stroke-linecap="round"/>`;
  }
  return `<path d="M${f(x - len / 2)} ${base} C${f(x - len / 2)} ${f(base - h * 1.3)} ${f(x + len / 2)} ${f(base - h * 1.3)} ${f(x + len / 2)} ${base} Z" fill="${crust}"/>
    <path d="M${f(x - len / 2)} ${base} h${len}" stroke="${dk}" stroke-width="3"/>${slashes}`;
}

function basket(x: number, base: number, w: number, h: number, fillWith = "rolls"): string {
  const wick = "#b88a52", dk = shade(wick, 0.3), lt = tint(wick, 0.25);
  let inner = "";
  if (fillWith === "rolls") {
    for (let i = 0; i < 4; i++) {
      const rx = x - w * 0.36 + (i * w * 0.72) / 3;
      inner += boule(rx, base - h + 6, w * 0.15, CRUST[i % 4], "one");
    }
  } else if (fillWith === "sweet") {
    inner = `<path d="M${f(x - w * 0.4)} ${base - h + 6} C${f(x - w * 0.4)} ${f(base - h - w * 0.42)} ${f(x + w * 0.4)} ${f(base - h - w * 0.42)} ${f(x + w * 0.4)} ${base - h + 6} Z" fill="#8a4a22"/>
      <path d="M${f(x - w * 0.22)} ${f(base - h - w * 0.15)} q${f(w * 0.15)} ${f(-w * 0.12)} ${f(w * 0.3)} ${f(-w * 0.04)}" stroke="#d58f57" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`;
  }
  let weave = "";
  for (let i = 1; i < 3; i++) weave += `<path d="M${f(x - w / 2 + i * 3)} ${f(base - h + (i * h) / 3)} H${f(x + w / 2 - i * 3)}" stroke="${dk}" stroke-width="2" opacity=".6"/>`;
  return `${inner}<path d="M${x - w / 2} ${base - h} L${x - w / 2 + 8} ${base} H${x + w / 2 - 8} L${x + w / 2} ${base - h} Z" fill="${wick}"/>${weave}
    <rect x="${x - w / 2 - 3}" y="${base - h - 3}" width="${w + 6}" height="7" rx="3.5" fill="${lt}"/>`;
}

function shelves(): string {
  const x0 = 1066, x1 = 1252, top = 226, rows = [322, 424, 526];
  const wood = "#8a5a36", dk = shade(wood, 0.3), lt = tint(wood, 0.2);
  let s = `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${H - top}" fill="#3a2419" opacity=".32"/>`;
  // Row 0: three round broas
  s += boule(1106, rows[0], 30, CRUST[0]) + boule(1166, rows[0], 27, CRUST[1], "one") + boule(1220, rows[0], 24, CRUST[2]);
  // Row 1: long loaves
  s += longLoaf(1124, rows[1], 92, 26, CRUST[2]) + longLoaf(1204, rows[1], 70, 22, CRUST[0]);
  // Row 2: basket of rolls + sweet bread
  s += basket(1112, rows[2], 76, 34, "rolls") + basket(1204, rows[2], 72, 30, "sweet");
  // On top: stacked baskets
  s += basket(1110, top, 70, 26, "none") + basket(1110, top - 24, 62, 22, "none") + boule(1200, top, 26, CRUST[3], "one");
  // Frame
  s += `<rect x="${x0}" y="${top}" width="12" height="${H - top}" fill="${wood}"/><rect x="${x1 - 12}" y="${top}" width="12" height="${H - top}" fill="${dk}"/>`;
  for (const y of [top, ...rows]) s += `<rect x="${x0 - 6}" y="${y}" width="${x1 - x0 + 12}" height="12" fill="${wood}"/><rect x="${x0 - 6}" y="${y}" width="${x1 - x0 + 12}" height="3" fill="${lt}"/><rect x="${x0}" y="${y + 12}" width="${x1 - x0}" height="8" fill="#1a1020" opacity=".18"/>`;
  return s;
}

// ---- oven -----------------------------------------------------------------------

function oven(): Layer {
  const brick = uid("bk-brick"), shadeG = uid("bk-ovsh"), soot = uid("bk-soot");
  const mortar = "#d8c3a4";
  const b = ["#b4553a", "#a64b33", "#bf6244", "#9c4630"];
  const { x, y: floor, r, h } = MOUTH;
  const archTop = floor - h - r;
  const defs = `<pattern id="${brick}" x="0" y="0" width="64" height="30" patternUnits="userSpaceOnUse">
      <rect width="64" height="30" fill="${mortar}"/>
      <rect x="2" y="2" width="28" height="12" rx="1.5" fill="${b[0]}"/><rect x="34" y="2" width="28" height="12" rx="1.5" fill="${b[1]}"/>
      <rect x="-14" y="17" width="28" height="12" rx="1.5" fill="${b[2]}"/><rect x="18" y="17" width="28" height="12" rx="1.5" fill="${b[3]}"/><rect x="50" y="17" width="28" height="12" rx="1.5" fill="${b[0]}"/>
    </pattern>
    <linearGradient id="${shadeG}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a1020" stop-opacity=".4"/><stop offset=".35" stop-color="#1a1020" stop-opacity="0"/><stop offset=".7" stop-color="#1a1020" stop-opacity="0"/><stop offset="1" stop-color="#1a1020" stop-opacity=".3"/></linearGradient>
    <linearGradient id="${soot}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a14" stop-opacity=".5"/><stop offset="1" stop-color="#2a1a14" stop-opacity="0"/></linearGradient>`;
  const face = `M28 ${COUNTER + 10} V290 Q28 178 ${x} 168 Q460 178 460 290 V${COUNTER + 10} Z`;
  const mouth = `M${x - r} ${floor} V${floor - h} A${r} ${r} 0 0 1 ${x + r} ${floor - h} V${floor} Z`;
  const ring = `M${x - r - 13} ${floor} V${floor - h} A${r + 13} ${r + 13} 0 0 1 ${x + r + 13} ${floor - h} V${floor}`;
  return {
    defs,
    body: `<rect x="184" y="30" width="120" height="150" fill="url(#${brick})"/>
      <rect x="184" y="30" width="120" height="150" fill="url(#${shadeG})"/>
      <rect x="184" y="30" width="120" height="150" fill="url(#${soot})" opacity=".8"/>
      <rect x="176" y="30" width="136" height="12" fill="${b[3]}"/>
      <path d="${face}" fill="url(#${brick})"/>
      <path d="${face}" fill="url(#${shadeG})"/>
      <path d="M28 290 Q28 178 ${x} 168 Q460 178 460 290" fill="none" stroke="${b[3]}" stroke-width="10"/>
      <path d="${ring}" fill="none" stroke="#7e3626" stroke-width="26" stroke-dasharray="17 3"/>
      <path d="${mouth}" fill="#1c0d0a"/>
      <rect x="${x - 34}" y="${archTop - 70}" width="68" height="30" fill="#e8dcc4"/>
      <rect x="${x - 34}" y="${archTop - 70}" width="68" height="30" fill="none" stroke="#7e3626" stroke-width="3"/>
      <text x="${x}" y="${archTop - 48}" text-anchor="middle" font-family="Georgia, serif" font-size="17" font-weight="700" fill="#6b3626" letter-spacing="2">1975</text>
      <rect x="${x - r - 34}" y="${floor}" width="${2 * r + 68}" height="16" fill="#cbbba3"/>
      <rect x="${x - r - 34}" y="${floor}" width="${2 * r + 68}" height="4" fill="#efe3cc"/>
      <rect x="${x - r - 30}" y="${floor + 16}" width="${2 * r + 60}" height="6" fill="#1a1020" opacity=".25"/>
      <path d="M${x + r + 18} ${floor - 4} l26 -10 v-96 l-26 4 Z" fill="#2b2326"/>
      <path d="M${x + r + 22} ${floor - 30} l18 -6" stroke="#5a4a48" stroke-width="3"/>`,
  };
}

/** The fire, drawn after the shadow pass so it stays hot. */
function fire(): Layer {
  const g = uid("bk-fire");
  const { x, y: floor, r, h } = MOUTH;
  const mouth = `M${x - r} ${floor} V${floor - h} A${r} ${r} 0 0 1 ${x + r} ${floor - h} V${floor} Z`;
  const flame = (fx: number, fh: number, w: number, c: string, d: number): string =>
    `<g class="a-flicker" style="animation-duration:${f(1 + d)}s;animation-delay:-${f(d)}s"><path d="M${fx - w} ${floor - 14} Q${fx - w} ${floor - fh * 0.5} ${fx} ${floor - fh} Q${fx + w} ${floor - fh * 0.5} ${fx + w} ${floor - 14} Z" fill="${c}"/></g>`;
  return {
    defs: `<radialGradient id="${g}" cx=".5" cy="1" r=".95"><stop offset="0" stop-color="#ffe7a8"/><stop offset=".3" stop-color="#ffa043"/><stop offset=".65" stop-color="#b8401f"/><stop offset="1" stop-color="#3a120c"/></radialGradient>`,
    body: `<path d="${mouth}" fill="url(#${g})"/>
      ${flame(x - 40, 70, 26, "#ff8a3a", 0.3)}${flame(x + 30, 84, 30, "#ff9b40", 0.8)}${flame(x - 4, 104, 26, "#ffc25e", 0.1)}
      ${flame(x + 2, 66, 16, "#fff0b8", 0.5)}${flame(x - 46, 42, 12, "#ffe08a", 0.9)}
      <path d="M${x - 74} ${floor - 8} l62 -14 l4 10 l-62 14 Z" fill="#3a1a12"/><path d="M${x + 76} ${floor - 8} l-66 -12 l-4 10 l66 12 Z" fill="#2e140e"/>
      <path d="M${x - 70} ${floor - 12} l56 -12" stroke="#ff7a2e" stroke-width="2.5" opacity=".9"/>
      <path d="M${x + 70} ${floor - 12} l-58 -10" stroke="#ff8a3a" stroke-width="2.5" opacity=".9"/>
      <rect x="${x - r}" y="${floor - 6}" width="${2 * r}" height="6" fill="#ffb35c" opacity=".7"/>`,
  };
}

function peel(x: number, base: number): string {
  // Long wooden peel leaning on the wall between oven and counter.
  return `<g>
    <path d="M${x - 6} ${base} L${x + 18} 292" stroke="#7a5434" stroke-width="9" stroke-linecap="round"/>
    <path d="M${x - 2} ${base} L${x + 20} 292" stroke="#9a6d45" stroke-width="3" opacity=".7"/>
    <path d="M${x - 8} 300 Q${x - 12} 220 ${x + 22} 206 Q${x + 54} 216 ${x + 46} 300 Q${x + 20} 312 ${x - 8} 300 Z" fill="#a9784b"/>
    <path d="M${x} 290 Q${x - 2} 230 ${x + 20} 218" stroke="#c4955f" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>
    <path d="M${x - 6} 300 Q${x + 20} 314 ${x + 46} 300 l0 6 Q${x + 20} 320 ${x - 6} 306 Z" fill="#1a1020" opacity=".2"/>
  </g>`;
}

function lamps(dark: boolean): string {
  let out = "";
  for (const x of LAMPS) {
    const enamel = "#2f5a4c";
    out += `<path d="M${x} 34 V122" stroke="#2a1d1a" stroke-width="2.5"/>
      <rect x="${x - 7}" y="118" width="14" height="12" rx="2" fill="#3a2a24"/>
      <path d="M${x - 50} 172 Q${x - 46} 130 ${x} 128 Q${x + 46} 130 ${x + 50} 172 Z" fill="${enamel}"/>
      <path d="M${x - 38} 160 Q${x - 30} 136 ${x - 8} 132" stroke="${tint(enamel, 0.35)}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>
      <ellipse cx="${x}" cy="172" rx="50" ry="7" fill="${dark ? "#4a4d52" : "#fff3d6"}"/>`;
  }
  return out;
}

function bulbs(): string {
  let out = "";
  for (const x of LAMPS) out += `<circle cx="${x}" cy="176" r="24" fill="#ffe7b0" opacity=".3" class="a-twinkle-soft"/><ellipse cx="${x}" cy="173" rx="15" ry="5" fill="#fffbe8"/>`;
  return out;
}

function lightCone(x: number): Layer {
  const g = uid("bk-cone");
  return {
    defs: `<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe3a6" stop-opacity=".14"/><stop offset="1" stop-color="#ffe3a6" stop-opacity="0"/></linearGradient>`,
    body: `<path d="M${x - 48} 174 L${x - 230} ${COUNTER} H${x + 230} L${x + 48} 174 Z" fill="url(#${g})"/>`,
  };
}

// ---- counter & pastries -----------------------------------------------------------

function nata(x: number, base: number, s: number, r: () => number): string {
  const w = 38 * s, h = 13 * s;
  let spots = "";
  for (let i = 0; i < 2; i++) {
    spots += `<ellipse cx="${f(x + (r() - 0.5) * w * 0.55)}" cy="${f(base - h - 1 + (r() - 0.5) * h * 0.3)}" rx="${f((2.5 + r() * 3.5) * s)}" ry="${f((1.5 + r() * 1.5) * s)}" fill="${r() > 0.5 ? "#6b3419" : "#9a5222"}" opacity=".9"/>`;
  }
  return `<path d="M${f(x - w / 2)} ${f(base - h)} L${f(x - w * 0.38)} ${base} H${f(x + w * 0.38)} L${f(x + w / 2)} ${f(base - h)} Z" fill="#c98b45"/>
    <path d="M${f(x - w * 0.2)} ${f(base - h + 2)} V${base} M${f(x + w * 0.05)} ${f(base - h + 2)} V${base} M${f(x + w * 0.28)} ${f(base - h + 2)} V${base}" stroke="#a96d32" stroke-width="1.5"/>
    <ellipse cx="${x}" cy="${f(base - h)}" rx="${f(w / 2)}" ry="${f(h * 0.42)}" fill="#dca35a"/>
    <ellipse cx="${x}" cy="${f(base - h)}" rx="${f(w * 0.4)}" ry="${f(h * 0.3)}" fill="#f4cd55"/>${spots}`;
}

function malasada(x: number, base: number, rad: number, r: () => number): string {
  const dough = "#d89552";
  let sugar = "";
  for (let i = 0; i < 3; i++) sugar += `<circle cx="${f(x + (r() - 0.5) * rad * 1.4)}" cy="${f(base - rad * 0.5 - r() * rad * 0.55)}" r="${f(1 + r() * 1.2)}" fill="#fffaf0" opacity=".9"/>`;
  return `<ellipse cx="${x}" cy="${f(base - rad * 0.55)}" rx="${rad}" ry="${f(rad * 0.62)}" fill="${dough}"/>
    <path d="M${f(x - rad * 0.96)} ${f(base - rad * 0.45)} Q${x} ${f(base - rad * 0.18)} ${f(x + rad * 0.96)} ${f(base - rad * 0.45)}" stroke="#f2d9a6" stroke-width="${f(rad * 0.16)}" fill="none" opacity=".8"/>
    <ellipse cx="${f(x - rad * 0.2)}" cy="${f(base - rad * 0.85)}" rx="${f(rad * 0.55)}" ry="${f(rad * 0.22)}" fill="#fbf3e4" opacity=".55"/>${sugar}`;
}

function tray(x0: number, x1: number, base: number): string {
  return `<rect x="${x0}" y="${base - 6}" width="${x1 - x0}" height="10" rx="3" fill="#8e8f94"/><rect x="${x0}" y="${base - 6}" width="${x1 - x0}" height="3" fill="#c5c7cc"/>`;
}

function counter(): string {
  const marble = "#ece6da", wood = "#6e4429";
  const r = rng(89);
  let veins = "";
  for (let i = 0; i < 7; i++) {
    const vx = r() * W;
    veins += `<path d="M${f(vx)} ${COUNTER + 2} q${f(30 + r() * 40)} ${f(8 + r() * 6)} ${f(80 + r() * 80)} ${f(4 + r() * 12)}" stroke="#bdb3a3" stroke-width="1.2" fill="none" opacity=".7"/>`;
  }
  let panels = "";
  for (let x = 30; x < W; x += 200) {
    panels += `<rect x="${x}" y="${COUNTER + 46}" width="170" height="210" rx="4" fill="${shade(wood, 0.22)}"/><rect x="${x + 10}" y="${COUNTER + 56}" width="150" height="190" rx="3" fill="${tint(wood, 0.06)}"/>`;
  }
  // Trays: natas on the left, malasadas on the right.
  const rr = rng(97);
  let left = tray(70, 450, COUNTER - 2);
  for (let i = 0; i < 7; i++) left += nata(104 + i * 52, COUNTER - 16, 0.86, rr);
  for (let i = 0; i < 7; i++) left += nata(92 + i * 54, COUNTER - 6, 1, rr);
  let right = tray(1130, 1520, COUNTER - 2);
  for (let i = 0; i < 6; i++) right += malasada(1170 + i * 62, COUNTER - 14, 24, rr);
  for (let i = 0; i < 5; i++) right += malasada(1200 + i * 64, COUNTER - 4, 27, rr);
  // A little price card.
  right += `<path d="M1086 ${COUNTER - 2} l6 -40 h44 l6 40 Z" fill="#f4ecd8"/><text x="1114" y="${COUNTER - 22}" text-anchor="middle" font-family="Georgia, serif" font-size="10" fill="#6b3626">malasadas</text><text x="1114" y="${COUNTER - 9}" text-anchor="middle" font-family="Georgia, serif" font-size="10" font-weight="700" fill="#6b3626">$1.50</text>`;
  return `<rect x="0" y="${COUNTER + 26}" width="${W}" height="${H - COUNTER}" fill="${wood}"/>${panels}
    <rect x="0" y="${COUNTER}" width="${W}" height="28" fill="${marble}"/>${veins}
    <rect x="0" y="${COUNTER}" width="${W}" height="4" fill="#fffaf0"/>
    <rect x="0" y="${COUNTER + 24}" width="${W}" height="6" fill="${shade(marble, 0.3)}"/>
    <rect x="0" y="${COUNTER + 30}" width="${W}" height="10" fill="#1a1020" opacity=".25"/>
    ${left}${right}`;
}

const CANDLES = [
  { x: 520, base: COUNTER, h: 46 },
  { x: 1064, base: COUNTER, h: 34 },
  { x: 1330, base: WIN.y + WIN.h, h: 28 },
  { x: 1236, base: 322, h: 24 },
  { x: 1196, base: 424, h: 22 },
];

/** Candle bodies (before shadow) or their flames and pools (after). */
function candles(lit: boolean): Part {
  if (!lit) {
    return CANDLES.map(({ x, base, h }) => `<ellipse cx="${x}" cy="${base - 2}" rx="20" ry="5" fill="#b9b2a6"/><rect x="${x - 9}" y="${base - h}" width="18" height="${h - 2}" rx="3" fill="#f3ead6"/><path d="M${x - 9} ${base - h + 4} q4 10 0 16" stroke="#e2d6bc" stroke-width="4" fill="none"/>`).join("");
  }
  const parts: Layer = { defs: "", body: "" };
  CANDLES.forEach(({ x, base, h }, i) => {
    const pool = soft(x, base - h - 10, 300, "#ff9a40", 0.5, "a-flicker");
    parts.defs += pool.defs;
    const d = (i * 0.37) % 1.3;
    parts.body += pool.body.replace('class="a-flicker"', `class="a-flicker" style="animation-duration:${f(2.2 + i * 0.3)}s;animation-delay:-${f(d)}s"`);
    parts.body += `<rect x="${x - 9}" y="${base - h}" width="18" height="${h - 2}" rx="3" fill="#f0d9b0" opacity=".55"/>
      <g class="a-flicker" style="animation-duration:${f(0.9 + i * 0.13)}s;animation-delay:-${f(d)}s">
        <path d="M${x} ${base - h - 26} Q${x + 8} ${base - h - 12} ${x} ${base - h - 2} Q${x - 8} ${base - h - 12} ${x} ${base - h - 26} Z" fill="#ffd27a"/>
        <path d="M${x} ${base - h - 18} Q${x + 4} ${base - h - 9} ${x} ${base - h - 3} Q${x - 4} ${base - h - 9} ${x} ${base - h - 18} Z" fill="#fff6d8"/>
      </g>
      <path d="M${x} ${base - h} v-5" stroke="#3a2a24" stroke-width="1.5"/>`;
  });
  return parts;
}

function shadowPass(dark: boolean): Layer {
  const g = uid("bk-vig");
  return {
    defs: `<radialGradient id="${g}" cx=".5" cy=".42" r=".72"><stop offset="0" stop-color="#22101c" stop-opacity="0"/><stop offset=".6" stop-color="#22101c" stop-opacity=".1"/><stop offset="1" stop-color="#22101c" stop-opacity="${dark ? 0.7 : 0.5}"/></radialGradient>`,
    body: `${dark ? `<rect width="${W}" height="${H}" fill="#0a0814" opacity=".76"/>` : ""}
      <rect width="${W}" height="${H}" fill="url(#${g})"/>`,
  };
}

/** In the blackout, lightning briefly lights the whole room through the window. */
function roomFlash(): string {
  return `<g opacity=".14" pointer-events="none"><rect width="${W}" height="${H}" fill="#dfe8ff" class="a-lightning"/></g>`;
}

function steam(dark: boolean): string {
  const r = rng(101);
  let out = "";
  const xs = [150, 260, 370, 1210, 1330, 1450];
  xs.forEach((x) => {
    const d = r() * 6;
    out += `<g class="bakery-steam" style="animation-delay:-${f(d)}s;animation-duration:${f(5 + r() * 3)}s"><path d="M${x} ${COUNTER - 30} q-10 -16 0 -32 q10 -16 0 -32" stroke="#fff8ec" stroke-width="6" fill="none" stroke-linecap="round" opacity="${dark ? 0.12 : 0.28}"/></g>`;
  });
  return out;
}
