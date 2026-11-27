// The old lifeboat station on the east headland, abandoned, in the storm.
// Looking along the shed: the tall launch doors in the gable end on the left
// (rattling, the storm showing through the gaps), the station's last rescue
// boat up on her carriage and rails, oilskins and cork rings on the pegs, and
// a camping lantern on a crate as the only warm light. Time: storm (night).
import { W, H, rng, uid, shade, tint, mix, linearV, glow, windowRain, lightning } from "../kit";
import type { Palette, Part, Layer, SceneInput } from "../kit";

const VP = { x: 900, y: 360 };
const BACK = { x: 380, top: 60, floor: 520 };       // back (long side) wall
const LANTERN = { x: 1404, y: 470 };
const n = (v: number): number => +v.toFixed(1);

// Point on the left (gable) wall: u 0 = nearest edge (x=0) .. 1 = back corner,
// v 0 = floor .. 1 = top of wall. True perspective (depth interpolated in 1/z).
function lw(u: number, v: number): [number, number] {
  const s = 1 / (1 + 0.731 * u);
  return [n(VP.x - VP.x * s), n(VP.y + s * (277 - 796 * v))];
}
const quad = (u0: number, v0: number, u1: number, v1: number): string => `M${lw(u0, v0)} L${lw(u1, v0)} L${lw(u1, v1)} L${lw(u0, v1)} Z`;
// floor y at a depth scale s (1 = near plane)
const floorAt = (s: number): number => VP.y + 277 * s;

export function lifeboat({ pal }: SceneInput): Part[] {
  const m = materials(pal);
  const parts: Part[] = [];
  parts.push(backWall(pal, m));
  parts.push(windowView(pal, m));
  parts.push(wallFixtures(m));
  parts.push(gableWall(pal, m));
  parts.push(floor(pal, m));
  parts.push(boat(m));
  parts.push(crateAndLantern(m));
  parts.push(light(pal, m));
  parts.push(ceiling(m));
  parts.push(`<g opacity=".36">${lightning()}</g>`);
  parts.push(STYLE);
  return parts;
}

function materials(pal: Palette) {
  const g = (c: string, extra = 0): string => shade(mix(c, pal.mid, 0.42), Math.min(0.95, 0.34 + extra));
  return {
    g,
    wall: g("#8a8070"), seam: g("#8a8070", 0.32), beam: g("#6a5e50", 0.14),
    floor: g("#7a7064", 0.06), floorSeam: g("#7a7064", 0.32),
    door: g("#4c6a5c", 0.02), doorDark: g("#4c6a5c", 0.3), iron: g("#2e3034", 0.1),
    navy: g("#2f5584", -0.04), white: g("#ebe6da", -0.04), wood: g("#b59c78"), fender: g("#6a5238"),
    red: g("#b8473a", -0.04), cork: g("#e2d8c0", -0.04),
    warm: "#ffae55", flame: "#ffd27a",
  };
}

type Materials = ReturnType<typeof materials>;

// ---- back wall ---------------------------------------------------------------------

function backWall(pal: Palette, m: Materials): Layer {
  const r = rng(101);
  const sh = uid("lbws");
  let boards = "";
  for (let x = BACK.x - 10; x < W; x += 50 + r() * 12) {
    const w = 50 + r() * 12;
    boards += `<rect x="${n(x)}" y="${BACK.top}" width="${n(w + 1)}" height="${BACK.floor - BACK.top + 4}" fill="${mix(m.wall, r() > 0.5 ? tint(m.wall, 0.15) : shade(m.wall, 0.2), r() * 0.7)}"/>`;
    boards += `<path d="M${n(x)} ${BACK.top} V${BACK.floor}" stroke="${m.seam}" stroke-width="2.4"/>`;
  }
  // water stains streaking down from the eaves
  for (let i = 0; i < 7; i++) {
    const x = BACK.x + 40 + r() * (W - BACK.x - 80), len = 80 + r() * 200;
    boards += `<path d="M${n(x)} ${BACK.top} v${n(len)}" stroke="${shade(m.wall, 0.3)}" stroke-width="${n(6 + r() * 10)}" stroke-linecap="round" opacity=".35"/>`;
  }
  return {
    defs: `<linearGradient id="${sh}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.ink}" stop-opacity=".55"/><stop offset=".5" stop-color="${pal.ink}" stop-opacity=".1"/><stop offset="1" stop-color="${pal.ink}" stop-opacity=".3"/></linearGradient>`,
    body: `${boards}
      <rect x="${BACK.x}" y="${BACK.top + 230}" width="${W - BACK.x}" height="14" fill="${m.beam}"/>
      <rect x="${BACK.x}" y="${BACK.top + 244}" width="${W - BACK.x}" height="3" fill="#0c0e12" opacity=".35"/>
      <rect x="${BACK.x}" y="${BACK.top}" width="${W - BACK.x}" height="${BACK.floor - BACK.top + 4}" fill="url(#${sh})"/>`,
  };
}

// ---- the window, streaming ------------------------------------------------------------

const WIN = { x: 1104, y: 112, w: 224, h: 220 };

function windowView(pal: Palette, m: Materials): Layer {
  const { x, y, w, h } = WIN;
  const clip = uid("lbwc"), skyG = uid("lbws");
  const frame = m.g("#d8d2c4", 0.05), frameDk = shade(frame, 0.3);
  let v = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${skyG})"/>`;
  v += `<ellipse cx="${x + 60}" cy="${y + 50}" rx="120" ry="36" fill="${shade(pal.cloud, 0.25)}"/><ellipse cx="${x + 190}" cy="${y + 90}" rx="110" ry="30" fill="${shade(pal.cloud, 0.1)}"/>`;
  v += `<path d="M${x - 10} ${y + h - 40} Q${x + 70} ${y + h - 62} ${x + 150} ${y + h - 50} T${x + w + 10} ${y + h - 48} V${y + h} H${x - 10} Z" fill="${shade(pal.sea[1], 0.1)}"/>`;
  v += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#eef3ff" class="a-lightning"/>`;
  v += `<path d="M${x + 150} ${y} l-14 46 l12 3 l-20 52 l10 2 l-16 50" stroke="#f6f9ff" stroke-width="3" fill="none" stroke-linejoin="round" class="a-lightning"/>`;
  v += rainIn(x - 40, x + w + 60, { seed: 102, count: 26, angle: 22 });
  v += windowRain(x, y, w, h, { seed: 103, count: 12, color: "#dfe8f2" });
  const bars = `
    <rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" fill="none" stroke="${frame}" stroke-width="16"/>
    <rect x="${x + w / 2 - 5}" y="${y}" width="10" height="${h}" fill="${frame}"/>
    <rect x="${x}" y="${y + h / 2 - 5}" width="${w}" height="10" fill="${frame}"/>
    <rect x="${x - 24}" y="${y + h + 8}" width="${w + 48}" height="12" fill="${frame}"/>
    <rect x="${x - 24}" y="${y + h + 20}" width="${w + 48}" height="4" fill="#0c0e12" opacity=".35"/>
    <path d="M${x - 6} ${y - 6} h40 M${x + w - 30} ${y + h + 6} h36 M${x + w + 6} ${y + 60} v50" stroke="${m.g("#b59c78")}" stroke-width="5" opacity=".8"/>
    <rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" fill="none" stroke="${frameDk}" stroke-width="2"/>`;
  return {
    defs: `<clipPath id="${clip}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>` + linearV(skyG, [pal.sky[1], pal.sky[2], pal.sky[3]]),
    body: `<g clip-path="url(#${clip})">${v}</g>${bars}`,
  };
}

function rainIn(
  x0: number,
  x1: number,
  { seed = 1, count = 40, angle = 14, color = "#cfd9e6", opacity = 1 }: { seed?: number; count?: number; angle?: number; color?: string; opacity?: number } = {},
): string {
  const r = rng(seed);
  let near = "", far = "";
  for (let i = 0; i < count; i++) {
    const x = x0 + r() * (x1 - x0), y = r() * H, len = 18 + r() * 30;
    const line = `<path d="M${n(x)} ${n(y)} l${n(-len * Math.tan((angle * Math.PI) / 180))} ${n(len)}" stroke="${color}" stroke-width="${i % 3 === 0 ? 2.2 : 1.3}" stroke-linecap="round"/>`;
    if (i % 3 === 0) near += line; else far += line;
  }
  return `<g opacity="${opacity}"><g class="a-rain-far" opacity=".4">${far}<g transform="translate(0 -${H})">${far}</g></g>
    <g class="a-rain-near" opacity=".6">${near}<g transform="translate(0 -${H})">${near}</g></g></g>`;
}

// ---- service board, life rings, rope, oilskins ---------------------------------------------

function lifeRing(x: number, y: number, rad: number, m: Materials, { sway = false }: { sway?: boolean } = {}): string {
  const sw = rad * 0.52;
  const ring = `
    <path d="M${x} ${y - rad - sw / 2 - 18} v16" stroke="${m.iron}" stroke-width="4"/>
    <circle cx="${x + 5}" cy="${y + 6}" r="${rad}" fill="none" stroke="#0c0e12" stroke-width="${sw}" opacity=".3"/>
    <circle cx="${x}" cy="${y}" r="${rad}" fill="none" stroke="${m.cork}" stroke-width="${sw}"/>
    <circle cx="${x}" cy="${y}" r="${rad}" fill="none" stroke="${m.red}" stroke-width="${sw}" stroke-dasharray="${n(rad * 0.5)} ${n(rad * 1.07)}" stroke-dashoffset="${n(rad * 0.25)}"/>
    <circle cx="${x}" cy="${y}" r="${rad}" fill="none" stroke="${m.g("#5a4a3a")}" stroke-width="2" stroke-dasharray="4 9"/>
    <circle cx="${x}" cy="${y}" r="${n(rad + sw / 2 + 3)}" fill="none" stroke="${m.g("#8a7a5a")}" stroke-width="2.5" stroke-dasharray="${n(rad * 0.9)} ${n(rad * 0.7)}"/>
    <circle cx="${x}" cy="${y}" r="${n(rad - sw / 2)}" fill="none" stroke="#0c0e12" stroke-width="2" opacity=".25"/>`;
  return sway ? `<g class="a-sway" style="animation-duration:5s">${ring}</g>` : ring;
}

function oilskin(x: number, y: number, c: string, len = 230): string {
  const dk = shade(c, 0.28), hi = tint(c, 0.12);
  return `
    <path d="M${x - 40} ${y + 26} Q${x - 46} ${y + len * 0.6} ${x - 52} ${y + len} H${x + 52} Q${x + 46} ${y + len * 0.6} ${x + 40} ${y + 26} Q${x + 20} ${y + 6} ${x} ${y + 4} Q${x - 20} ${y + 6} ${x - 40} ${y + 26} Z" fill="${c}"/>
    <path d="M${x - 10} ${y + 10} L${x - 4} ${y + len}" stroke="${dk}" stroke-width="3" opacity=".7"/>
    <path d="M${x - 30} ${y + 60} Q${x - 26} ${y + 150} ${x - 34} ${y + len - 8}" stroke="${dk}" stroke-width="2.5" fill="none" opacity=".6"/>
    <path d="M${x + 22} ${y + 50} Q${x + 30} ${y + 140} ${x + 26} ${y + len - 6}" stroke="${dk}" stroke-width="2.5" fill="none" opacity=".6"/>
    <path d="M${x - 40} ${y + 26} Q${x - 52} ${y + 120} ${x - 46} ${y + 170}" stroke="${hi}" stroke-width="3" fill="none" opacity=".5"/>
    <path d="M${x - 16} ${y + 6} Q${x} ${y + 24} ${x + 16} ${y + 6} L${x + 10} ${y} Q${x} ${y + 8} ${x - 10} ${y} Z" fill="${dk}"/>
    <circle cx="${x - 2}" cy="${y + 70}" r="3" fill="${dk}"/><circle cx="${x - 1}" cy="${y + 110}" r="3" fill="${dk}"/><circle cx="${x}" cy="${y + 150}" r="3" fill="${dk}"/>`;
}

function wallFixtures(m: Materials): string {
  const r = rng(104);
  // the station's service board: gold-lettered record of launches
  const board = m.g("#3a2a20", -0.02), gold = m.g("#e0b866", -0.12);
  let rows = "";
  for (let i = 0; i < 7; i++) {
    const y = 124 + i * 9;
    rows += `<path d="M412 ${y} h${n(20 + r() * 10)} M450 ${y} h${n(50 + r() * 40)} M${n(520 + r() * 6)} ${y} h18" stroke="${gold}" stroke-width="1.6" opacity=".7"/>`;
  }
  const service = `
    <rect x="404" y="88" width="160" height="104" rx="3" fill="#0c0e12" opacity=".3" transform="translate(4 5)"/>
    <rect x="404" y="88" width="160" height="104" rx="3" fill="${board}"/>
    <rect x="410" y="94" width="148" height="92" rx="2" fill="none" stroke="${gold}" stroke-width="1.5" opacity=".7"/>
    <text x="484" y="114" text-anchor="middle" font-family="Georgia, serif" font-size="11" font-weight="700" letter-spacing="2" fill="${gold}">SERVICES</text>${rows}`;
  // a coil of old manila hung on a peg
  let coil = `<path d="M1048 166 v12" stroke="${m.iron}" stroke-width="5"/>`;
  for (let i = 0; i < 5; i++) coil += `<ellipse cx="${1048 + i}" cy="${222 + i * 3}" rx="${34 - i}" ry="${48 - i * 1.5}" fill="none" stroke="${i % 2 ? m.g("#a08a62", 0.2) : m.g("#c2a878")}" stroke-width="6"/>`;
  coil += `<path d="M1040 176 q-8 50 2 110 q4 20 -4 40" stroke="${m.g("#c2a878")}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  // peg rail with oilskins and a sou'wester
  const rail = `<rect x="1384" y="164" width="230" height="12" fill="${m.beam}"/>${[1420, 1500, 1580].map((x) => `<rect x="${x - 4}" y="168" width="8" height="14" rx="2" fill="${m.g("#4a3e34")}"/>`).join("")}`;
  const hat = `<path d="M1564 186 Q1580 168 1600 186 L1612 200 Q1588 210 1550 200 Z" fill="${m.g("#c9a536", -0.02)}"/><path d="M1548 200 Q1586 214 1614 200" stroke="${m.g("#c9a536", 0.2)}" stroke-width="4" fill="none"/>`;
  return `${service}${lifeRing(484, 268, 40, m)}${coil}${rail}${oilskin(1420, 174, m.g("#c79a35", -0.04), 240)}${oilskin(1500, 176, m.g("#4f5a3a"), 220)}${hat}${lifeRing(1572, 300, 34, m, { sway: true })}`;
}

// ---- the gable end: launch doors ----------------------------------------------------------

function gableWall(pal: Palette, m: Materials): Layer {
  const r = rng(105);
  const D = { u0: 0.12, u1: 0.9, v1: 0.78 };
  const out = uid("lbout"), clip = uid("lbdc");
  // the wall itself
  let wall = `<path d="${quad(0, 0, 1, 1)}" fill="${shade(m.wall, 0.12)}"/>`;
  for (let i = 0; i <= 14; i++) {
    const u = i / 14;
    wall += `<path d="M${lw(u, 0)} L${lw(u, 1)}" stroke="${m.seam}" stroke-width="${n(3 - u * 1.4)}"/>`;
  }
  // the storm beyond, seen through the gaps
  const outside = `<path d="${quad(D.u0, 0, D.u1, D.v1 + 0.03)}" fill="url(#${out})"/>
    <g clip-path="url(#${clip})">${rainIn(40, 380, { seed: 106, count: 24, angle: 18, color: "#dfe8f2" })}
    <path d="${quad(D.u0, 0, D.u1, D.v1 + 0.03)}" fill="#f0f5ff" class="a-lightning"/></g>`;
  // lintel + jambs
  const frame = `<path d="${quad(D.u0 - 0.03, D.v1 + 0.03, D.u1 + 0.02, D.v1 + 0.08)}" fill="${m.beam}"/>
    <path d="${quad(D.u0 - 0.03, 0, D.u0, D.v1 + 0.03)}" fill="${m.beam}"/><path d="${quad(D.u1, 0, D.u1 + 0.02, D.v1 + 0.03)}" fill="${m.beam}"/>`;
  // two leaves of planks with Z-braces; gaps between boards let the storm in
  const leaf = (a: number, b: number, ph: number): string => {
    let s = "";
    const k = 5;
    for (let i = 0; i < k; i++) {
      const p0 = a + ((b - a) * i) / k + 0.0025, p1 = a + ((b - a) * (i + 1)) / k - 0.0025;
      s += `<path d="${quad(p0, 0.015, p1, D.v1)}" fill="${mix(m.door, i % 2 ? shade(m.door, 0.12) : tint(m.door, 0.06), r())}"/>`;
    }
    for (const [v0, v1] of [[0.1, 0.15], [0.62, 0.67]]) s += `<path d="${quad(a + 0.01, v0, b - 0.01, v1)}" fill="${tint(m.door, 0.16)}"/><path d="${quad(a + 0.01, v0 - 0.008, b - 0.01, v0)}" fill="#0c0e12" opacity=".35"/>`;
    s += `<path d="M${lw(a + 0.02, 0.15)} L${lw(b - 0.02, 0.62)} L${lw(b - 0.02, 0.67)} L${lw(a + 0.02, 0.2)} Z" fill="${tint(m.door, 0.12)}"/>`;
    // peeling paint: bare grey wood showing
    for (let j = 0; j < 4; j++) {
      const u = a + 0.03 + r() * (b - a - 0.06), v = 0.2 + r() * 0.5;
      s += `<path d="${quad(u, v, u + 0.02 + r() * 0.03, v + 0.03 + r() * 0.05)}" fill="${m.g("#a29a8a")}" opacity=".7"/>`;
    }
    // strap hinges + a weathered edge
    const hx = ph < 0 ? a : b;
    for (const v of [0.12, 0.64]) s += `<path d="M${lw(hx, v + 0.015)} L${lw(hx + ph * 0.16, v + 0.015)}" stroke="${m.iron}" stroke-width="5" stroke-linecap="round"/>`;
    return s;
  };
  const mid = (D.u0 + D.u1) / 2;
  const near = leaf(D.u0, mid - 0.009, 1), far = leaf(mid + 0.009, D.u1, -1);
  const bar = `<path d="M${lw(mid - 0.06, 0.42)} L${lw(mid + 0.06, 0.42)}" stroke="${m.iron}" stroke-width="7" stroke-linecap="round"/><path d="${quad(mid - 0.012, 0.38, mid + 0.012, 0.46)}" fill="${m.iron}"/>`;
  // spray blowing in under the doors
  let spray = "";
  for (let i = 0; i < 10; i++) {
    const u = D.u0 + 0.05 + r() * (D.u1 - D.u0 - 0.1), [x, y] = lw(u, 0.01);
    spray += `<path d="M${x} ${y} l${n(14 + r() * 20)} ${n(-2 - r() * 6)}" stroke="#dfe8f2" stroke-width="1.6" stroke-linecap="round" opacity=".5" class="lifeboat-spray" style="animation-delay:-${n(r() * 1.4)}s"/>`;
  }
  // drips through the top gap
  let drips = "";
  for (let i = 0; i < 6; i++) {
    const u = D.u0 + 0.04 + r() * (D.u1 - D.u0 - 0.08), [x, y] = lw(u, D.v1 + 0.02);
    drips += `<g class="a-drip" style="animation-duration:${n(1.6 + r() * 1.6)}s;animation-delay:-${n(r() * 3)}s"><path d="M${x} ${y} v10" stroke="#dfe8f2" stroke-width="2" stroke-linecap="round" opacity=".6"/></g>`;
  }
  return {
    defs: `<clipPath id="${clip}"><path d="${quad(D.u0, 0, D.u1, D.v1 + 0.03)}"/></clipPath>` + linearV(out, [mix(pal.sky[0], "#a9bccf", 0.45), mix(pal.sky[1], "#a9bccf", 0.25)]),
    body: `${wall}${outside}${frame}
      <g class="a-rattle" style="animation-duration:.42s">${near}</g>
      <g class="a-rattle" style="animation-duration:.5s;animation-delay:-.17s">${far}</g>
      <g class="a-rattle" style="animation-duration:.42s">${bar}</g>${drips}${spray}
      <path d="M${lw(D.u0 - 0.03, D.v1 + 0.08)} L${lw(1, D.v1 + 0.08)}" stroke="${shade(m.beam, 0.3)}" stroke-width="3"/>`,
  };
}

// ---- floor, rails, puddles ---------------------------------------------------------------

function floor(pal: Palette, m: Materials): string {
  const r = rng(107);
  // the floor plane spans the left wall's floor edge and the back wall's foot
  let f = `<path d="M${lw(0, 0)} L${lw(1, 0)} L${W} ${BACK.floor} V${H} H0 Z" fill="${m.floor}"/>`;
  for (let i = 0; i < 9; i++) {
    const y = BACK.floor + 6 + i * i * 5 + i * 6;
    f += `<path d="M0 ${n(y)} H${W}" stroke="${m.floorSeam}" stroke-width="${n(1.4 + i * 0.3)}" opacity=".5"/>`;
  }
  f += `<rect x="${BACK.x}" y="${BACK.floor}" width="${W - BACK.x}" height="5" fill="#0c0e12" opacity=".35"/>`;
  // launch rails running out under the doors
  const rail = (s: number): string => {
    const y = floorAt(s), x0 = VP.x - VP.x * s;
    return `<rect x="${n(x0)}" y="${n(y - 4)}" width="${n(W - x0)}" height="8" fill="${m.g("#5a5e64", -0.05)}"/><rect x="${n(x0)}" y="${n(y - 4)}" width="${n(W - x0)}" height="2.5" fill="${m.g("#a9b0b8")}" opacity=".6"/>`;
  };
  f += rail(0.66) + rail(0.75);
  // puddles from the doors and the leaking roof, catching the light
  const water = mix(pal.sea[0], pal.sky[1], 0.4);
  const pud = (cx: number, cy: number, rx: number, ry: number): string => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${water}" opacity=".7"/><ellipse cx="${cx - rx * 0.2}" cy="${cy - ry * 0.2}" rx="${n(rx * 0.6)}" ry="${n(ry * 0.4)}" fill="${tint(water, 0.25)}" opacity=".4"/>`;
  f += pud(210, 598, 170, 22) + pud(330, 572, 90, 10) + pud(1180, 590, 130, 14) + pud(900, 604, 120, 12);
  // a big coil of line dumped by the bow
  const rope = m.g("#c2a878"), ropeD = m.g("#a08a62", 0.2);
  for (let i = 0; i < 5; i++) f += `<ellipse cx="${470 + i}" cy="${n(592 - i * 6)}" rx="${62 - i * 9}" ry="${16 - i * 1.6}" fill="none" stroke="${i % 2 ? ropeD : rope}" stroke-width="7"/>`;
  f += `<path d="M528 590 q30 10 60 4 t40 8" stroke="${rope}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 5; i++) {
    f += `<ellipse cx="${n(140 + r() * 280)}" cy="${n(584 + r() * 26)}" rx="${n(12 + r() * 20)}" ry="${n(3 + r() * 3)}" fill="none" stroke="${tint(water, 0.4)}" stroke-width="1.4" class="a-wave" style="animation-duration:3s;animation-delay:-${n(r() * 3)}s"/>`;
  }
  return f;
}

// ---- the lifeboat on her carriage ------------------------------------------------------------

function boat(m: Materials): Layer {
  const clip = uid("lbbc"), grad = uid("lbbg");
  // sheer as a function so the bands and loops can follow it
  const sheerY = (x: number): number => { const t = (x - 440) / 810; return 268 + 74 * Math.sin(Math.PI * t) ** 0.8 - 6 * t; };
  const path = (dy: number, x0 = 436, x1 = 1254, step = 30): string => {
    let d = "";
    for (let x = x0; x <= x1 + 0.1; x += step) d += `${d ? "L" : "M"}${n(x)} ${n(sheerY(Math.min(Math.max(x, 440), 1250)) + dy)} `;
    return d;
  };
  let outline = path(0, 440, 1250, 15);
  outline += `C1252 330 1236 400 1170 452 Q840 476 520 452 C466 404 444 336 440 268 Z`;
  const r = rng(108);
  // peeling paint: pale wood showing through the blue
  let peel = "";
  for (let i = 0; i < 12; i++) {
    const x = 480 + r() * 740, y = sheerY(x) + 44 + r() * (90 - Math.abs(x - 845) * 0.05), w = 10 + r() * 30, h = 4 + r() * 8;
    peel += `<path d="M${n(x)} ${n(y)} l${n(w * 0.4)} ${n(-h * 0.3)} l${n(w * 0.6)} ${n(h * 0.4)} l${n(-w * 0.2)} ${n(h * 0.8)} l${n(-w * 0.7)} ${n(h * 0.2)} Z" fill="${m.wood}" opacity=".7"/>`;
  }
  for (let i = 0; i < 5; i++) {
    const x = 500 + r() * 700, y = sheerY(x) + 6 + r() * 8;
    peel += `<rect x="${n(x)}" y="${n(y)}" width="${n(8 + r() * 18)}" height="4" rx="2" fill="${m.wood}" opacity=".6"/>`;
  }
  let strakes = "";
  for (let i = 1; i <= 5; i++) strakes += `<path d="${path(26 + i * 22)}" stroke="${shade(m.navy, 0.35)}" stroke-width="1.5" fill="none" opacity=".55"/>`;
  // grab-lines looped along the side, for anyone in the water
  let loops = "";
  for (let x = 500; x < 1200; x += 46) {
    const y0 = sheerY(x) + 30, y1 = sheerY(x + 46) + 30;
    loops += `<path d="M${x} ${n(y0)} Q${x + 23} ${n((y0 + y1) / 2 + 16)} ${x + 46} ${n(y1)}" stroke="${m.g("#c2a878", 0.05)}" stroke-width="2.5" fill="none"/>`;
  }
  const hull = `<g clip-path="url(#${clip})">
      <rect x="420" y="250" width="850" height="240" fill="url(#${grad})"/>
      <path d="${path(20, 420, 1270)} V240 H420 Z" fill="${m.white}"/>
      <path d="${path(150, 420, 1270)} V500 H420 Z" fill="${m.red}" opacity=".8"/>
      ${strakes}${peel}
      <path d="M420 430 Q840 470 1270 430 V500 H420 Z" fill="#0c0e12" opacity=".3"/>
    </g>
    <path d="${path(24)}" stroke="${m.fender}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="${path(21)}" stroke="${tint(m.fender, 0.25)}" stroke-width="2" fill="none" opacity=".5"/>
    <path d="${path(0)}" stroke="${tint(m.white, 0.1)}" stroke-width="4" fill="none" stroke-linecap="round"/>
    ${loops}
    <path d="M440 268 l-4 -14 M1250 272 l3 -14" stroke="${m.fender}" stroke-width="7" stroke-linecap="round"/>
    <text x="478" y="356" font-family="Georgia, serif" font-size="16" font-weight="700" letter-spacing="3" fill="${m.white}" opacity=".85" transform="rotate(14 478 356)">EAST HEAD</text>`;
  // iron launching carriage with big spoked wheels on the rails
  const iron = m.iron;
  const wheel = (cx: number): string => {
    const cy = floorAt(0.75) - 38, rad = 36;
    let spokes = "";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      spokes += `<path d="M${n(cx - Math.cos(a) * rad)} ${n(cy - Math.sin(a) * rad)} L${n(cx + Math.cos(a) * rad)} ${n(cy + Math.sin(a) * rad)}" stroke="${iron}" stroke-width="3"/>`;
    }
    return `<circle cx="${cx}" cy="${n(cy)}" r="${rad}" fill="none" stroke="${iron}" stroke-width="7"/>${spokes}<circle cx="${cx}" cy="${n(cy)}" r="8" fill="${iron}"/>`;
  };
  const carriage = `
    <path d="M520 452 L540 470 H1150 L1170 452" stroke="${iron}" stroke-width="10" fill="none"/>
    <rect x="530" y="468" width="650" height="16" fill="${iron}"/>
    <path d="M600 484 L620 520 M1080 484 L1060 520" stroke="${iron}" stroke-width="8"/>
    ${wheel(620)}${wheel(1060)}`;
  return {
    defs: `<clipPath id="${clip}"><path d="${outline}"/></clipPath>
      <linearGradient id="${grad}" x1="420" y1="0" x2="1270" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${shade(m.navy, 0.2)}"/><stop offset=".55" stop-color="${m.navy}"/><stop offset="1" stop-color="${tint(m.navy, 0.18)}"/></linearGradient>`,
    body: `${carriage}${hull}`,
  };
}

// ---- the crate, the lantern, the blanket --------------------------------------------------------

function crateAndLantern(m: Materials): string {
  const { x, y } = LANTERN;
  const top = y + 34, bot = 600;
  const wood = m.g("#a68a60", -0.06), dk = shade(wood, 0.3);
  const crate = `
    <rect x="1284" y="${top}" width="176" height="${bot - top}" fill="${wood}"/>
    <rect x="1284" y="${top}" width="176" height="6" fill="${tint(wood, 0.2)}"/>
    ${[0.33, 0.66].map((t) => `<rect x="1284" y="${n(top + (bot - top) * t)}" width="176" height="3" fill="${dk}"/>`).join("")}
    <path d="M1296 ${top + 12} L1448 ${bot - 10}" stroke="${dk}" stroke-width="8" opacity=".6"/>
    <text x="1408" y="${n(top + 44)}" text-anchor="middle" font-family="Georgia, serif" font-size="12" font-weight="700" letter-spacing="2" fill="${dk}" opacity=".8">FRAGILE</text>`;
  // wool blanket thrown over the crate, one corner hanging down the front,
  // the stripes across its end
  const bl = m.g("#e8dcc0", -0.1), blD = shade(bl, 0.2);
  const stripes: [string, number][] = [["#2f6b4f", 0], ["#d9a62e", 7], ["#b8473a", 14], ["#2a3f72", 21]];
  const bclip = uid("lbbl");
  const drape = `M1290 ${top - 3} Q1330 ${top - 8} 1386 ${top - 4} L1390 ${top + 8} Q1372 ${top + 40} 1350 ${top + 82} Q1318 ${top + 44} 1286 ${top + 12} Z`;
  const blanket = `<clipPath id="${bclip}"><path d="${drape}"/></clipPath>
    <path d="${drape}" fill="#0c0e12" opacity=".3" transform="translate(4 4)"/>
    <path d="${drape}" fill="${bl}"/>
    <g clip-path="url(#${bclip})">
      ${stripes.map(([c, dy]) => `<path d="M1280 ${top + 40 + dy} Q1340 ${top + 34 + dy} 1400 ${top + 42 + dy}" stroke="${m.g(c, -0.08)}" stroke-width="5" fill="none"/>`).join("")}
      <path d="M1290 ${top - 3} Q1330 ${top - 8} 1386 ${top - 4} L1388 ${top + 4} Q1334 ${top} 1288 ${top + 6} Z" fill="${tint(bl, 0.15)}"/>
      <path d="M1316 ${top + 6} Q1330 ${top + 40} 1350 ${top + 82} M1366 ${top + 4} Q1360 ${top + 30} 1352 ${top + 60}" stroke="${blD}" stroke-width="2.5" fill="none"/>
    </g>`;
  // camping lantern: painted base and cap, glass globe, wire bail
  const paint = m.g("#2f6b4f", -0.1), metal = m.g("#5a5e64", -0.1);
  const lantern = `
    <path d="M${x - 20} ${y - 50} Q${x} ${y - 82} ${x + 20} ${y - 50}" stroke="${metal}" stroke-width="2.5" fill="none"/>
    <path d="M${x - 16} ${y - 40} Q${x} ${y - 56} ${x + 16} ${y - 40} Z" fill="${paint}"/>
    <rect x="${x - 18}" y="${y - 42}" width="36" height="6" rx="2" fill="${paint}"/>
    <path d="M${x - 13} ${y - 36} Q${x - 22} ${y - 8} ${x - 13} ${y + 18} H${x + 13} Q${x + 22} ${y - 8} ${x + 13} ${y - 36} Z" fill="#ffe7b0" opacity=".92"/>
    <g class="a-flicker"><path d="M${x} ${y - 22} q10 16 0 30 q-10 -14 0 -30 Z" fill="#fff6dc"/></g>
    <path d="M${x - 8} ${y - 30} q-6 20 0 40" stroke="#ffffff" stroke-width="2" fill="none" opacity=".6"/>
    <path d="M${x - 16} ${y - 36} V${y + 18} M${x + 16} ${y - 36} V${y + 18}" stroke="${metal}" stroke-width="2"/>
    <rect x="${x - 22}" y="${y + 16}" width="44" height="18" rx="4" fill="${paint}"/>
    <rect x="${x - 22}" y="${y + 16}" width="44" height="4" rx="2" fill="${tint(paint, 0.3)}"/>
    <circle cx="${x + 26}" cy="${y + 25}" r="4" fill="${metal}"/>`;
  return `${crate}${blanket}<g transform="translate(${x} ${top}) scale(1.22) translate(${-x} ${-top})">${lantern}</g>`;
}

// ---- light -------------------------------------------------------------------------------

function light(pal: Palette, m: Materials): Layer {
  const vig = uid("lbv");
  const { x, y } = LANTERN;
  const big = glow(x, y, 640, m.warm, 0.5), mid = glow(x, y, 260, "#ffc277", 0.5), core = glow(x, y - 6, 80, "#fff0c8", 0.8);
  const puddleGlow = glow(1180, 590, 160, m.warm, 0.4);
  const r = rng(109);
  // the lantern's reflection breaking up in the puddle
  let refl = "";
  for (let i = 0; i < 5; i++) {
    const yy = 582 + i * 5, w = 30 + r() * 30;
    refl += `<path d="M${n(1186 - w / 2)} ${yy} h${n(w)}" stroke="#ffcf8a" stroke-width="2" stroke-linecap="round" opacity="${n(0.55 - i * 0.07)}" class="a-wave" style="animation-duration:2.4s;animation-delay:-${n(r() * 2.4)}s"/>`;
  }
  const wl = uid("lbwl");
  const winLight = `<linearGradient id="${wl}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9c8da" stop-opacity=".16"/><stop offset="1" stop-color="#b9c8da" stop-opacity="0"/></linearGradient>
    <path d="M${WIN.x} ${WIN.y + WIN.h + 20} H${WIN.x + WIN.w} L${WIN.x + WIN.w - 120} 640 H${WIN.x - 300} Z" fill="url(#${wl})"/>`;
  // lightning: cold light thrown through the window and the door gaps
  const flashes = `<g class="a-lightning">
    <path d="M${WIN.x} ${WIN.y + WIN.h + 20} H${WIN.x + WIN.w} L${WIN.x + WIN.w - 120} ${H} H${WIN.x - 300} Z" fill="#eef3ff" opacity=".25"/>
    <path d="M${lw(0.5, 0.0)} L${lw(0.52, 0)} L760 ${H} L640 ${H} Z" fill="#eef3ff" opacity=".35"/>
    <path d="M${lw(0.2, 0.0)} L${lw(0.22, 0)} L380 ${H} L300 ${H} Z" fill="#eef3ff" opacity=".2"/>
  </g>`;
  return {
    defs: `<radialGradient id="${vig}" cx="${x}" cy="${y}" r="1500" gradientUnits="userSpaceOnUse"><stop offset=".2" stop-color="${pal.ink}" stop-opacity="0"/><stop offset="1" stop-color="${pal.ink}" stop-opacity=".55"/></radialGradient>`
      + big.defs + mid.defs + core.defs + puddleGlow.defs,
    body: `<rect width="${W}" height="${H}" fill="url(#${vig})"/>
      ${winLight}<g class="lifeboat-flicker">${big.body}${mid.body}</g>${core.body}${puddleGlow.body}${refl}${flashes}`,
  };
}

// ---- ceiling --------------------------------------------------------------------------------

function ceiling(m: Materials): string {
  const dark = shade(m.beam, 0.35);
  // roof boards above the back wall, rafters running toward us
  let c = `<path d="M${lw(0, 1)} L${lw(1, 1)} L${W} ${BACK.top} V-10 H-10 Z" fill="${shade(m.wall, 0.45)}"/>`;
  for (const x of [520, 760, 1000, 1240, 1480]) {
    const dx = x - VP.x, dy = BACK.top - VP.y, l = Math.hypot(dx, dy);
    c += `<path d="M${x} ${BACK.top} l${n((dx / l) * 300)} ${n((dy / l) * 300)}" stroke="${dark}" stroke-width="16"/>`;
  }
  c += `<path d="M${lw(1, 1)} L${W} ${BACK.top}" stroke="${m.beam}" stroke-width="12"/>`;
  c += `<path d="M${lw(0, 1)} L${lw(1, 1)}" stroke="${m.beam}" stroke-width="10"/>`;
  // a tie beam close overhead
  c += `<rect x="-10" y="0" width="${W + 20}" height="34" fill="${m.beam}"/><rect x="-10" y="30" width="${W + 20}" height="5" fill="${dark}"/>`;
  return c;
}

const STYLE = `<style>
@keyframes lifeboat-flicker { 0%, 100% { opacity: .92; } 18% { opacity: 1; } 33% { opacity: .8; } 47% { opacity: .96; } 61% { opacity: .84; } 80% { opacity: 1; } }
.lifeboat-flicker { animation: lifeboat-flicker 2.2s ease-in-out infinite; }
@keyframes lifeboat-spray { 0% { transform: translate(0, 0); opacity: 0; } 20% { opacity: .7; } 100% { transform: translate(40px, -4px); opacity: 0; } }
.lifeboat-spray { animation: lifeboat-spray 1.4s ease-out infinite; }
</style>`;
