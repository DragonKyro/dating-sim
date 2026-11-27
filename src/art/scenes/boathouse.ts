// The Highwater boathouse: the Whitlocks' old shingled boathouse on the bluff.
// Water doors open at the back onto the sound, Marguerite (1962) up on her
// cradle to the right, bench and pegboard to the left, the unstepped mast
// laid across the tie beam.
//   dusk  - calm; golden-purple light through the doors, sanding dust hanging
//           in the air, both lanterns lit.
//   storm - night; the doors bang, rain blows in, the slip overflows across
//           the floor, and one swinging lantern is the only warm light.
import { W, H, rng, uid, shade, tint, mix, linearV, radial, glow, motes, lightning } from "../kit";
import type { Palette, Part, Layer, SceneInput } from "../kit";

const FLOOR = 560;                                  // back-wall floor line
const DOOR = { x0: 600, x1: 1000, y0: 186, y1: FLOOR };
const HORIZON = 458;
const VP = { x: 800, y: 392 };
const BEAM = { y0: 128, y1: 162 };                  // foreground tie beam
const LAMP_L = 468, LAMP_R = 1222;                  // lantern hook x positions
const n = (v: number): number => +v.toFixed(1);

export function boathouse({ pal, time }: SceneInput): Part[] {
  const storm = time === "storm";
  const m = materials(pal, storm);
  const parts: Part[] = [];
  parts.push(outside(pal, storm));
  parts.push(backWall(pal, m, storm));
  parts.push(pegboard(m));
  parts.push(rightWall(pal, m));
  parts.push(floor(pal, m, storm));
  parts.push(workbench(m));
  parts.push(doorLeaves(pal, m, storm));
  parts.push(boat(pal, m, storm));
  parts.push(atmosphere(pal, storm));
  parts.push(roofFrame(m));
  parts.push(lanterns(pal, m, storm));
  if (storm) {
    parts.push(`<g opacity=".4">${lightning()}</g>`);
    parts.push(STYLE);
  } else {
    parts.push(motes(26, { x0: 590, x1: 1480, y0: 200, y1: 560, color: pal.sun, size: [1, 2.6], seed: 77, opacity: 0.7 }));
  }
  return parts;
}

// ---- palette -------------------------------------------------------------------

function materials(pal: Palette, storm: boolean) {
  // Every surface is a daylight color pulled toward the time-of-day mid tone,
  // then pushed into shadow (the room is lit from the doors / lanterns only).
  const k = storm ? 0.45 : 0.24, d = storm ? 0.4 : 0.14;
  const g = (c: string, extra = 0): string => shade(mix(c, pal.mid, k), Math.min(0.95, d + extra));
  return {
    g,
    wall: g("#8f6e56"), seam: g("#8f6e56", 0.34),
    beam: g("#6e503d", 0.1), beamTop: g("#a07a5a"),
    floor: g("#8a6b51", 0.02), floorSeam: g("#8a6b51", 0.3),
    door: g("#7f939f", 0.08), doorDark: g("#7f939f", 0.36),
    peg: g("#b8915f"), steel: g("#b3bac2"), steelDark: g("#7d858e"), handle: g("#ad7742"),
    bench: g("#9a7552"), benchTop: g("#bb9367"),
    hull: g("#ad5a2b"), hullLit: g("#dc9655"), sanded: g("#dcbc90"), bottom: g("#74342c", 0.1),
    rope: g("#cdb07c"), ropeDark: g("#cdb07c", 0.25),
    gold: mix("#ecc778", pal.light, 0.15),
    flame: storm ? "#ffc56a" : mix("#ffcf7e", pal.light, 0.3),
  };
}

type Materials = ReturnType<typeof materials>;

// ---- outside the water doors ------------------------------------------------------

function outside(pal: Palette, storm: boolean): Layer {
  const { x0, x1, y0, y1 } = DOOR;
  const clip = uid("bhd"), skyG = uid("bhs"), seaG = uid("bhse");
  const r = rng(storm ? 71 : 70);
  let defs = `<clipPath id="${clip}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"/></clipPath>`
    + linearV(skyG, storm ? pal.sky : pal.sky.slice(0, 3))
    + `<linearGradient id="${seaG}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.sea[0]}"/><stop offset="1" stop-color="${pal.sea[1]}"/></linearGradient>`;
  let b = `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${HORIZON - y0 + 2}" fill="url(#${skyG})"/>`;

  if (!storm) {
    const sg = uid("bhsun");
    defs += radial(sg, pal.sun, 0.8);
    b += `<circle cx="946" cy="${HORIZON}" r="170" fill="url(#${sg})" class="a-pulse"/>`;
    b += `<circle cx="946" cy="${HORIZON + 6}" r="30" fill="${pal.sun}"/>`;
    // long thin evening clouds
    for (const [cx, cy, rx] of [[650, 250, 70], [700, 268, 46], [960, 232, 60], [930, 300, 40], [640, 336, 36]]) {
      b += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="5" fill="${pal.cloud}" opacity=".75"/>`;
    }
  } else {
    // heavy cloud masses rolling over
    const c1 = shade(pal.cloud, 0.25), c2 = tint(pal.cloud, 0.08);
    b += `<g class="a-fog" style="animation-duration:24s">`;
    for (let i = 0; i < 9; i++) {
      const cx = x0 - 60 + r() * (x1 - x0 + 120), cy = y0 + 10 + r() * 150;
      b += `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(80 + r() * 90)}" ry="${n(24 + r() * 26)}" fill="${i % 3 ? c1 : c2}" opacity=".85"/>`;
    }
    b += `</g>`;
    b += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#eef3ff" class="a-lightning"/>`;
    b += `<path d="M962 ${y0} l-16 54 l14 4 l-22 62 l12 2 l-26 74" stroke="#f6f9ff" stroke-width="3.5" fill="none" stroke-linejoin="round" class="a-lightning"/>`;
  }

  // the far headland with the North Light on its point, low hills across the sound
  const far = storm ? mix(pal.far, pal.sky[1], 0.3) : mix(pal.far, pal.sky[0], 0.25);
  b += `<path d="M590 ${HORIZON + 1} V${HORIZON - 16} Q630 ${HORIZON - 30} 676 ${HORIZON - 26} Q726 ${HORIZON - 20} 780 ${HORIZON + 1} Z" fill="${far}"/>`;
  b += `<path d="M872 ${HORIZON + 1} Q930 ${HORIZON - 12} 1010 ${HORIZON - 8} V${HORIZON + 1} Z" fill="${far}"/>`;
  const lh = tint(far, storm ? 0.25 : 0.55);
  b += `<path d="M634 ${HORIZON - 28} l2 -22 h6 l2 22 Z" fill="${lh}"/><rect x="634" y="${HORIZON - 55}" width="10" height="5" fill="${shade(far, 0.3)}"/>`;

  // the sound
  b += `<rect x="${x0}" y="${HORIZON}" width="${x1 - x0}" height="${y1 - HORIZON}" fill="url(#${seaG})"/>`;
  if (!storm) {
    for (let i = 0; i < 22; i++) {
      const t = r(), y = HORIZON + 4 + t * t * (y1 - HORIZON - 8), len = 12 + t * 50;
      b += `<path d="M${n(x0 + r() * (x1 - x0))} ${n(y)} h${n(len)}" stroke="${pal.sun}" stroke-width="${n(1 + t * 2)}" stroke-linecap="round" opacity="${n(0.25 + t * 0.3)}" class="a-wave" style="animation-delay:-${n(r() * 5)}s"/>`;
    }
    for (let i = 0; i < 10; i++) {
      const t = i / 10, y = HORIZON + 6 + t * t * 96, w = 18 + t * 60;
      b += `<path d="M${n(946 - w / 2 + (r() - 0.5) * 16)} ${n(y)} h${n(w)}" stroke="${pal.sun}" stroke-width="${n(2 + t * 3)}" stroke-linecap="round" opacity="${n(0.7 - t * 0.3)}" class="a-wave" style="animation-delay:-${n(r() * 5)}s"/>`;
    }
  } else {
    const foam = tint(pal.sea[0], 0.55);
    for (let i = 0; i < 11; i++) {
      const t = r(), y = HORIZON + 6 + t * (y1 - HORIZON - 14), w = 14 + t * 40, x = x0 + r() * (x1 - x0);
      b += `<path d="M${n(x)} ${n(y)} q${n(w * 0.3)} -${n(2 + t * 3)} ${n(w * 0.6)} -1 t${n(w * 0.4)} 2" stroke="${foam}" stroke-width="${n(1.5 + t * 2)}" fill="none" stroke-linecap="round" opacity="${n(0.25 + t * 0.3)}" class="a-wave" style="animation-duration:3s;animation-delay:-${n(r() * 3)}s"/>`;
    }
    b += rainIn(x0 - 80, x1 + 40, { seed: 72, count: 44, angle: 20, color: "#cdd8e4" });
  }
  return { defs, body: `<g clip-path="url(#${clip})">${b}</g>` };
}

/** Rain restricted to an x-range (cheaper than full-frame rain when clipped). */
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

// ---- the back (gable) wall ---------------------------------------------------------

const gable = (x: number): number => 150 - 170 * (1 - Math.abs(x - 800) / 800);

function backWall(pal: Palette, m: Materials, storm: boolean): Layer {
  const clip = uid("bhw"), shadeG = uid("bhws");
  const r = rng(73);
  const { x0, x1, y0, y1 } = DOOR;
  const defs = `<clipPath id="${clip}"><path clip-rule="evenodd" d="M0 ${FLOOR + 2} V${gable(0)} L800 ${gable(800)} L${W} ${gable(W)} V${FLOOR + 2} Z M${x0} ${y0} H${x1} V${y1 + 2} H${x0} Z"/></clipPath>`
    + `<linearGradient id="${shadeG}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.ink}" stop-opacity=".55"/><stop offset=".45" stop-color="${pal.ink}" stop-opacity=".12"/><stop offset="1" stop-color="${pal.ink}" stop-opacity="0"/></linearGradient>`;

  // roof underside in the top corners: sarking, rafters, purlins
  const roofC = shade(m.beam, 0.35), raft = shade(m.beam, 0.15);
  let roof = `<path d="M0 0 H706 L0 150 Z" fill="${roofC}"/><path d="M894 0 H${W} V150 Z" fill="${roofC}"/>`;
  for (const k of [34, 80]) {
    roof += `<path d="M0 ${150 - k} L800 ${-20 - k}" stroke="${raft}" stroke-width="${k / 5 + 6}"/><path d="M${W} ${150 - k} L800 ${-20 - k}" stroke="${raft}" stroke-width="${k / 5 + 6}"/>`;
  }
  for (const x of [220, 480, 1120, 1380]) {
    const y = gable(x), dx = x - VP.x, dy = y - VP.y, l = Math.hypot(dx, dy);
    roof += `<path d="M${x} ${n(y)} l${n((dx / l) * 420)} ${n((dy / l) * 420)}" stroke="${raft}" stroke-width="12"/>`;
  }

  let boards = "", seams = "", leaks = "";
  for (let x = -8, i = 0; x < W; x += 54 + r() * 10, i++) {
    const w = 54 + r() * 10;
    boards += `<rect x="${n(x)}" y="-30" width="${n(w + 1)}" height="${FLOOR + 40}" fill="${mix(m.wall, r() > 0.5 ? tint(m.wall, 0.2) : shade(m.wall, 0.2), r() * 0.6)}"/>`;
    seams += `<path d="M${n(x)} -30 V${FLOOR}" stroke="${m.seam}" stroke-width="2.4"/>`;
    if (r() > 0.45) {
      const a = 60 + r() * 220, len = 60 + r() * 180;
      leaks += `<path d="M${n(x)} ${n(a)} v${n(len)}" stroke="${storm ? "#e8f0ff" : pal.sun}" stroke-width="1.6" stroke-linecap="round" opacity="${storm ? 0.9 : n(0.25 + r() * 0.3)}"/>`;
    }
  }
  let knots = "";
  for (let i = 0; i < 8; i++) knots += `<ellipse cx="${n(r() * W)}" cy="${n(180 + r() * 360)}" rx="3.5" ry="6" fill="${m.seam}" opacity=".6"/>`;

  // door frame + a girt along the wall
  const jamb = m.beam, girt = mix(m.beam, m.wall, 0.4);
  const frame = `
    <rect x="0" y="404" width="${x0}" height="15" fill="${girt}"/><rect x="${x1}" y="404" width="${W - x1}" height="15" fill="${girt}"/>
    <rect x="0" y="419" width="${x0}" height="3" fill="${m.seam}" opacity=".6"/><rect x="${x1}" y="419" width="${W - x1}" height="3" fill="${m.seam}" opacity=".6"/>
    <rect x="${x0 - 22}" y="${y0 - 24}" width="${x1 - x0 + 44}" height="24" fill="${jamb}"/>
    <rect x="${x0 - 22}" y="${y0 - 4}" width="${x1 - x0 + 44}" height="4" fill="${shade(jamb, 0.3)}"/>
    <rect x="${x0 - 16}" y="${y0}" width="16" height="${y1 - y0}" fill="${jamb}"/>
    <rect x="${x1}" y="${y0}" width="16" height="${y1 - y0}" fill="${jamb}"/>
    <rect x="${x0 - 2}" y="${y0}" width="2" height="${y1 - y0}" fill="${storm ? "#9fb0c4" : pal.sun}" opacity=".5"/>
    <rect x="${x1}" y="${y0}" width="2" height="${y1 - y0}" fill="${storm ? "#9fb0c4" : pal.sun}" opacity=".5"/>`;

  // "HIGHWATER" carved into the door header
  const sign = `<text x="800" y="${y0 - 6}" text-anchor="middle" font-family="Georgia, serif" font-size="15" font-weight="700" letter-spacing="6" fill="${tint(jamb, 0.32)}">HIGHWATER</text>`;

  return {
    defs,
    body: `${roof}<g clip-path="url(#${clip})">${boards}${knots}${seams}
      <g ${storm ? 'class="a-lightning"' : ""}>${leaks}</g>
      <rect x="0" y="-30" width="${W}" height="${FLOOR + 32}" fill="url(#${shadeG})"/></g>${frame}${sign}`,
  };
}

// ---- left wall: pegboard, rope ----------------------------------------------------

function pegboard(m: Materials): Layer {
  const pat = uid("bhpeg");
  const X0 = 128, X1 = 472, Y0 = 206, Y1 = 386;
  const defs = `<pattern id="${pat}" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="2" fill="${shade(m.peg, 0.45)}"/></pattern>`;
  const st = m.steel, sd = m.steelDark, hd = m.handle;
  const tools: [string, string][] = [
    // handsaw
    [`M150 236 L270 228 L270 250 L150 264 Z`, st],
    [`M268 224 h30 q12 0 12 12 v20 q0 12 -12 12 h-30 Z`, hd],
    // hammer
    [`M328 240 h8 v72 h-8 Z`, hd], [`M314 226 h36 v14 h-36 Z`, sd], [`M350 228 q10 2 12 12 l-12 -2 Z`, sd],
    // wrenches
    [`M373 240 h6 v62 h-6 Z M376 224 a10 10 0 1 1 -0.1 0 Z`, st],
    [`M391 240 h5 v52 h-5 Z M393.5 228 a8 8 0 1 1 -0.1 0 Z`, st],
    // screwdrivers
    [`M424 232 h3 v28 h-3 Z`, st], [`M420 260 h11 v28 h-11 Z`, m.g("#c0473a")],
    [`M441 232 h3 v24 h-3 Z`, st], [`M437 256 h11 v26 h-11 Z`, m.g("#e0b23a")],
    [`M458 232 h3 v30 h-3 Z`, st], [`M454 262 h11 v24 h-11 Z`, m.g("#3b6ea0")],
    // C-clamps
    [`M156 304 h36 v10 h-26 v34 h26 v10 h-36 Z`, sd], [`M182 314 h6 v34 h-6 Z`, st],
    [`M208 304 h30 v9 h-21 v28 h21 v9 h-30 Z`, sd],
    // chisels
    [`M262 304 h10 v24 h-10 Z`, hd], [`M264 328 h6 v28 l-3 4 l-3 -4 Z`, st],
    [`M282 304 h10 v22 h-10 Z`, hd], [`M284.5 326 h5 v24 l-2.5 3 l-2.5 -3 Z`, st],
    [`M302 304 h10 v26 h-10 Z`, hd], [`M304 330 h6 v30 l-3 4 l-3 -4 Z`, st],
    // pliers
    [`M426 304 l8 26 l-3 34 h-6 l2 -32 Z`, m.g("#c0473a")], [`M450 304 l-8 26 l3 34 h6 l-2 -32 Z`, m.g("#c0473a")],
    [`M432 300 h12 v20 h-12 Z`, sd],
  ];
  let shadow = "", fill = "";
  for (const [d, c] of tools) {
    shadow += `<path d="${d}" fill="#120a14" opacity=".3"/>`;
    fill += `<path d="${d}" fill="${c}"/>`;
  }
  // twine coil + a painted outline where the sanding block lives (it's in use)
  const coil = `<circle cx="372" cy="340" r="22" fill="none" stroke="${m.rope}" stroke-width="11"/><circle cx="372" cy="340" r="22" fill="none" stroke="${m.ropeDark}" stroke-width="1.5" stroke-dasharray="3 4"/>`;
  const outline = `<rect x="160" y="366" width="52" height="14" rx="3" fill="none" stroke="${tint(m.peg, 0.55)}" stroke-width="2" stroke-dasharray="5 3" opacity=".8"/>`;
  // a coil of line hung on a peg left of the board
  let rope = `<path d="M76 222 v10" stroke="${m.beam}" stroke-width="6"/>`;
  for (let i = 0; i < 5; i++) rope += `<ellipse cx="${76 + i * 1.5}" cy="${276 + i * 3}" rx="${30 - i}" ry="${44 - i * 1.4}" fill="none" stroke="${i % 2 ? m.ropeDark : m.rope}" stroke-width="5"/>`;
  rope += `<path d="M70 230 q-6 40 -2 92 q2 30 8 54" stroke="${m.rope}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return {
    defs,
    body: `<rect x="${X0 + 6}" y="${Y0 + 8}" width="${X1 - X0}" height="${Y1 - Y0}" fill="#120a14" opacity=".3"/>
      <rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="${m.peg}"/>
      <rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="url(#${pat})"/>
      <rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="4" fill="${tint(m.peg, 0.2)}"/>
      <g transform="translate(3 4)">${shadow}</g>${fill}${coil}${outline}${rope}`,
  };
}

// ---- right wall: oars, photo, shelf, life ring ----------------------------------------

function rightWall(pal: Palette, m: Materials): string {
  const shaft = m.g("#d2ad78"), blade = m.g("#c99f68"), dark = shade(shaft, 0.35);
  const oar = (y: number, x0: number, x1: number): string => `
    <rect x="${x0 + 4}" y="${y + 5}" width="${x1 - x0 - 120}" height="9" rx="4" fill="#120a14" opacity=".25"/>
    <rect x="${x0}" y="${y}" width="${x1 - x0 - 120}" height="9" rx="4" fill="${shaft}"/>
    <rect x="${x0 + 90}" y="${y - 1}" width="40" height="11" rx="3" fill="${m.g("#6b4a2e")}"/>
    <path d="M${x1 - 124} ${y + 1} Q${x1 - 70} ${y - 16} ${x1} ${y - 8} Q${x1 + 6} ${y + 4} ${x1} ${y + 17} Q${x1 - 70} ${y + 25} ${x1 - 124} ${y + 8} Z" fill="${blade}"/>
    <path d="M${x1 - 110} ${y + 4.5} H${x1 - 6}" stroke="${dark}" stroke-width="2" opacity=".6"/>`;
  const bracket = (x: number): string => `<path d="M${x} 196 v60 h10 v-60 Z" fill="${shade(m.beam, 0.1)}"/><rect x="${x - 4}" y="214" width="18" height="5" fill="${shade(m.beam, 0.2)}"/><rect x="${x - 4}" y="244" width="18" height="5" fill="${shade(m.beam, 0.2)}"/>`;

  // framed photo of Marguerite under sail
  const photo = mix("#d9c29a", pal.light, 0.1);
  const frame = `
    <rect x="1094" y="266" width="76" height="60" fill="#120a14" opacity=".3" transform="translate(3 4)"/>
    <rect x="1094" y="266" width="76" height="60" fill="${m.g("#3a2a22")}"/>
    <rect x="1101" y="273" width="62" height="46" fill="${m.g(photo)}"/>
    <rect x="1101" y="306" width="62" height="13" fill="${m.g(shade(photo, 0.2))}"/>
    <path d="M1130 279 v26 h-16 Z M1132 282 l14 22 h-14 Z" fill="${m.g(tint(photo, 0.6))}"/>
    <path d="M1112 306 h40 l-6 5 h-28 Z" fill="${m.g(shade(photo, 0.5))}"/>`;

  // shelf of varnish tins and brushes
  const tin = (x: number, w: number, h: number, c: string, label: string): string => `<rect x="${x}" y="${300 - h}" width="${w}" height="${h}" rx="2" fill="${m.g(c)}"/><rect x="${x}" y="${300 - h}" width="${w}" height="4" fill="${m.g(tint(c, 0.3))}"/><rect x="${x + 3}" y="${300 - h * 0.7}" width="${w - 6}" height="${h * 0.4}" fill="${m.g(label)}"/>`;
  const shelf = `
    ${tin(1256, 30, 34, "#9aa3ab", "#e8d9b0")}${tin(1292, 26, 28, "#7e8790", "#c0473a")}${tin(1324, 22, 40, "#5a4a3a", "#e0c07a")}
    <path d="M1356 300 v-38 h10 v38 Z" fill="${m.g("#c8a36e")}"/><path d="M1354 262 h14 v-8 h-14 Z" fill="${m.g("#333a44")}"/>
    <rect x="1376" y="274" width="30" height="26" rx="3" fill="${m.g("#b24a3a")}"/>
    <rect x="1250" y="300" width="170" height="9" fill="${m.beam}"/>
    <rect x="1250" y="309" width="170" height="3" fill="#120a14" opacity=".3"/>
    <path d="M1266 309 l16 18 v-18 Z M1402 309 l-16 18 v-18 Z" fill="${shade(m.beam, 0.15)}"/>`;

  // life ring by the end post
  const lr = (x: number, y: number): string => `
    <path d="M${x} ${y - 56} v10" stroke="${m.ropeDark}" stroke-width="3"/>
    <circle cx="${x + 4}" cy="${y + 5}" r="42" fill="none" stroke="#120a14" stroke-width="24" opacity=".25"/>
    <circle cx="${x}" cy="${y}" r="42" fill="none" stroke="${m.g("#f1ece2")}" stroke-width="24"/>
    <circle cx="${x}" cy="${y}" r="42" fill="none" stroke="${m.g("#d65a3c")}" stroke-width="24" stroke-dasharray="33 33" stroke-dashoffset="16"/>
    <circle cx="${x}" cy="${y}" r="42" fill="none" stroke="${m.ropeDark}" stroke-width="2" stroke-dasharray="6 20" opacity=".9"/>`;

  return `${bracket(1160)}${bracket(1372)}${oar(214, 1100, 1450)}${oar(244, 1110, 1440)}${frame}${shelf}${lr(1508, 262)}`;
}

// ---- floor + slip ---------------------------------------------------------------

function floor(pal: Palette, m: Materials, storm: boolean): Layer {
  const water = uid("bhsl");
  const r = rng(74);
  const k = (H - VP.y) / (FLOOR - VP.y);
  const atBottom = (x: number): number => VP.x + (x - VP.x) * k;
  const s0 = 668, s1 = 932;               // slip edges at the floor line
  let seams = "";
  for (let x = -60; x <= W + 60; x += 46) {
    if (x > s0 - 10 && x < s1 + 10) continue;
    seams += `<path d="M${x} ${FLOOR} L${n(atBottom(x))} ${H}" stroke="${m.floorSeam}" stroke-width="2" opacity=".7"/>`;
  }
  const defs = `<linearGradient id="${water}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${storm ? pal.sea[0] : mix(pal.sea[0], pal.sun, 0.25)}"/><stop offset="1" stop-color="${shade(pal.sea[1], 0.2)}"/></linearGradient>`;
  const curb = m.beam, curbTop = m.beamTop;
  let slip = `<path d="M${s0} ${FLOOR} L${s1} ${FLOOR} L${n(atBottom(s1))} ${H} L${n(atBottom(s0))} ${H} Z" fill="url(#${water})"/>`;
  for (let i = 0; i < 12; i++) {
    const t = r(), y = FLOOR + 6 + t * 300, half = (140 + (y - FLOOR) * 1.6) * (0.2 + r() * 0.5);
    slip += `<path d="M${n(800 - half / 2 + (r() - 0.5) * 120)} ${n(y)} h${n(half)}" stroke="${storm ? tint(pal.sea[0], 0.4) : pal.sun}" stroke-width="${n(1.5 + t * 3)}" stroke-linecap="round" opacity="${n(storm ? 0.4 : 0.5 - t * 0.2)}" class="a-wave" style="animation-delay:-${n(r() * 5)}s"/>`;
  }
  slip += `<path d="M${s0} ${FLOOR} L${n(atBottom(s0))} ${H}" stroke="${curb}" stroke-width="14"/><path d="M${s1} ${FLOOR} L${n(atBottom(s1))} ${H}" stroke="${curb}" stroke-width="14"/>`;
  slip += `<path d="M${s0 - 6} ${FLOOR} L${n(atBottom(s0 - 6) - 4)} ${H}" stroke="${curbTop}" stroke-width="3"/><path d="M${s1 + 6} ${FLOOR} L${n(atBottom(s1 + 6) + 4)} ${H}" stroke="${curbTop}" stroke-width="3"/>`;

  let flood = "";
  if (storm) {
    // the slip has come up over the boards
    const fg = uid("bhfl");
    flood = `<rect x="0" y="${FLOOR - 1}" width="${W}" height="${H - FLOOR}" fill="url(#${fg})"/>`;
    for (let i = 0; i < 16; i++) {
      const t = r(), y = FLOOR + 8 + t * t * 320, w = 40 + t * 160, x = r() * W;
      flood += `<path d="M${n(x)} ${n(y)} q${n(w / 2)} -6 ${n(w)} 0" stroke="${tint(pal.sea[0], 0.35)}" stroke-width="${n(1.5 + t * 2)}" fill="none" stroke-linecap="round" opacity="${n(0.3 + t * 0.3)}" class="a-wave" style="animation-duration:4s;animation-delay:-${n(r() * 4)}s"/>`;
    }
    // surge coming in over the sill
    flood += `<g class="a-wave" style="animation-duration:3.2s"><path d="M${DOOR.x0} ${FLOOR + 2} q50 -12 100 -2 t100 0 t100 -2 t100 2 L${DOOR.x1 + 40} ${FLOOR + 14} L${DOOR.x0 - 40} ${FLOOR + 14} Z" fill="${tint(pal.sea[0], 0.5)}" opacity=".55"/></g>`;
    return {
      defs: defs + `<linearGradient id="${fg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(pal.sea[0], pal.sky[1], 0.3)}" stop-opacity=".72"/><stop offset="1" stop-color="${pal.sea[1]}" stop-opacity=".6"/></linearGradient>`,
      body: `<rect x="0" y="${FLOOR}" width="${W}" height="${H - FLOOR}" fill="${m.floor}"/>${seams}${slip}${flood}`,
    };
  }
  // a coil of line on the boards by the slip
  let coil = "";
  for (let i = 0; i < 4; i++) coil += `<ellipse cx="300" cy="${606 - i * 5}" rx="${54 - i * 6}" ry="${15 - i}" fill="none" stroke="${i % 2 ? m.ropeDark : m.rope}" stroke-width="6"/>`;
  return { defs, body: `<rect x="0" y="${FLOOR}" width="${W}" height="${H - FLOOR}" fill="${m.floor}"/>${seams}${slip}${coil}` };
}

// ---- workbench ---------------------------------------------------------------------

function workbench(m: Materials): string {
  const top = m.benchTop, body = m.bench, dk = shade(m.bench, 0.3);
  const can = (x: number, y: number, w: number, h: number, c: string, lid: string): string => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${m.g(c)}"/><rect x="${x - 1}" y="${y}" width="${w + 2}" height="5" rx="2" fill="${m.g(lid)}"/>`;
  return `
    <rect x="96" y="460" width="18" height="${FLOOR + 20 - 460}" fill="${dk}"/><rect x="474" y="460" width="18" height="${FLOOR + 20 - 460}" fill="${dk}"/>
    <rect x="96" y="528" width="396" height="10" fill="${body}"/>
    ${can(130, 498, 34, 30, "#7e8a96", "#5e6872")}${can(172, 504, 30, 24, "#b44a3a", "#8a3a2e")}
    <rect x="250" y="500" width="96" height="28" rx="3" fill="${m.g("#b23f33")}"/><rect x="286" y="492" width="24" height="8" rx="2" fill="none" stroke="${m.steelDark}" stroke-width="3"/>
    ${can(380, 496, 40, 32, "#d8c9a6", "#9aa3ab")}
    <rect x="76" y="438" width="436" height="20" fill="${top}"/>
    <rect x="76" y="438" width="436" height="4" fill="${tint(top, 0.25)}"/>
    <rect x="80" y="458" width="428" height="8" fill="${dk}"/>
    <path d="M140 437 h60 l4 -3 h-60 Z" fill="${m.g("#d9c7a0")}"/><path d="M146 434 h54 l3 -3 h-54 Z" fill="${m.g("#c8b28a")}"/>
    ${can(220, 404, 34, 34, "#8d969e", "#a9b0b8")}<rect x="223" y="414" width="28" height="14" fill="${m.g("#e3c77e")}"/>
    <rect x="272" y="412" width="22" height="26" rx="3" fill="${m.g("#a9c4cf")}" opacity=".7"/>
    <path d="M277 412 l-4 -30 M283 412 l2 -34 M289 412 l6 -28" stroke="${m.handle}" stroke-width="4" stroke-linecap="round"/>
    <path d="M272 384 l2 -8 M284 378 v-8 M294 384 l3 -7" stroke="${m.g("#e8d9b8")}" stroke-width="5" stroke-linecap="round"/>
    <rect x="316" y="416" width="20" height="22" rx="3" fill="${m.g("#e9e2d2")}"/><path d="M336 421 q9 1 9 8 q0 6 -9 7" stroke="${m.g("#e9e2d2")}" stroke-width="3" fill="none"/>
    <rect x="356" y="400" width="62" height="38" rx="5" fill="${m.g("#6f8f86")}"/><rect x="362" y="406" width="30" height="26" rx="3" fill="${m.g("#d8cfb4")}"/>
    <circle cx="405" cy="419" r="7" fill="${m.g("#3a3a3a")}"/><path d="M364 400 l12 -24" stroke="${m.steel}" stroke-width="2"/>
    <rect x="454" y="414" width="44" height="18" rx="2" fill="${m.steelDark}"/><rect x="458" y="404" width="10" height="34" fill="${m.steelDark}"/>
    <rect x="446" y="420" width="62" height="5" fill="${m.steel}"/><circle cx="508" cy="422" r="5" fill="${m.steel}"/>`;
}

// ---- the water doors, swung in ------------------------------------------------------

function doorLeaves(pal: Palette, m: Materials, storm: boolean): string {
  const leaf = (hx: number, ox: number): string => {
    const t = (ox - VP.x) / (hx - VP.x);
    const top = (x: number): number => DOOR.y0 + ((VP.y + (DOOR.y0 - VP.y) * t) - DOOR.y0) * ((x - hx) / (ox - hx));
    const bot = (x: number): number => DOOR.y1 + ((VP.y + (DOOR.y1 - VP.y) * t) - DOOR.y1) * ((x - hx) / (ox - hx));
    const at = (u: number, v: number): [number, number] => { const x = hx + (ox - hx) * u; return [n(x), n(top(x) + (bot(x) - top(x)) * v)]; };
    const quad = (u0: number, v0: number, u1: number, v1: number): string => `M${at(u0, v0)} L${at(u1, v0)} L${at(u1, v1)} L${at(u0, v1)} Z`;
    const sh = uid("bhlf");
    let s = `<linearGradient id="${sh}" x1="${hx}" y1="0" x2="${ox}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${pal.ink}" stop-opacity="0"/><stop offset="1" stop-color="${pal.ink}" stop-opacity=".45"/></linearGradient>`;
    s += `<path d="${quad(0, 0, 1, 1)}" fill="${m.door}"/>`;
    for (const u of [0.25, 0.5, 0.75]) s += `<path d="M${at(u, 0)} L${at(u, 1)}" stroke="${m.doorDark}" stroke-width="2"/>`;
    s += `<path d="${quad(0, 0.1, 1, 0.15)}" fill="${tint(m.door, 0.12)}"/><path d="${quad(0, 0.82, 1, 0.87)}" fill="${tint(m.door, 0.12)}"/>`;
    s += `<path d="M${at(0, 0.82)} L${at(1, 0.15)} L${at(1, 0.22)} L${at(0, 0.87)} Z" fill="${tint(m.door, 0.08)}"/>`;
    s += `<path d="${quad(0, 0.1, 0.4, 0.12)}" fill="${shade(m.door, 0.55)}"/><path d="${quad(0, 0.84, 0.4, 0.86)}" fill="${shade(m.door, 0.55)}"/>`;
    // the edge facing the doorway catches the outside light
    s += `<path d="M${at(0, 0)} L${at(0, 1)}" stroke="${storm ? "#9fb0c4" : pal.sun}" stroke-width="3" opacity=".45"/>`;
    s += `<path d="${quad(0, 0, 1, 1)}" fill="url(#${sh})"/>`;
    s += `<path d="M${at(1, 0)} L${at(1, 1)}" stroke="${shade(m.door, 0.4)}" stroke-width="5"/>`;
    return s;
  };
  const L = leaf(DOOR.x0 - 16, DOOR.x0 - 92), R = leaf(DOOR.x1 + 16, DOOR.x1 + 92);
  if (!storm) return `<g>${L}</g><g>${R}</g>`;
  return `<g class="a-rattle" style="animation-duration:.45s"><g class="boathouse-bang" style="transform-origin:${DOOR.x0 - 16}px 370px">${L}</g></g>
    <g class="a-rattle" style="animation-duration:.55s;animation-delay:-.2s"><g class="boathouse-bang" style="transform-origin:${DOOR.x1 + 16}px 370px;animation-duration:5.3s;animation-delay:-2.1s">${R}</g></g>`;
}

// ---- Marguerite, up on her cradle ---------------------------------------------------------

function boat(pal: Palette, m: Materials, storm: boolean): Layer {
  const hullClip = uid("bhh"), hullG = uid("bhhg"), gleam = uid("bhgl");
  const sheer = `M1070 342 C1200 368 1420 388 1594 360`;
  const outline = `${sheer} L1574 404 C1546 418 1510 430 1484 446 L1462 548 L1252 556 C1196 542 1154 504 1132 466 C1108 426 1086 384 1070 342 Z`;
  const wl = 436;   // the waterline she'll float to
  const lit = storm ? tint(m.hull, 0.22) : m.hullLit;
  const stops: [number, string][] = storm
    ? [[0, shade(m.hull, 0.15)], [0.3, lit], [0.62, m.hull], [1, shade(m.hull, 0.3)]]
    : [[0, lit], [0.5, m.hull], [1, shade(m.hull, 0.25)]];
  const defs = `<clipPath id="${hullClip}"><path d="${outline}"/></clipPath>
    <linearGradient id="${hullG}" x1="1060" y1="0" x2="1600" y2="0" gradientUnits="userSpaceOnUse">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>
    ${radial(gleam, tint(lit, 0.7), 0.6)}`;
  const r = rng(75);
  let planks = "";
  for (let i = 1; i <= 4; i++) {
    const dy = i * 19;
    planks += `<path d="M1060 ${342 + dy} C1200 ${368 + dy} 1420 ${388 + dy * 0.8} 1600 ${360 + dy * 0.6}" stroke="${shade(m.hull, 0.32)}" stroke-width="1.5" fill="none" opacity=".6"/>`;
  }
  // aft of the cabin she's already sanded back to bare wood (matte, pale, ragged
  // edge); forward is still the old gloss varnish
  let edge = "M1620 320 L1356 320";
  for (let y = 330; y <= 560; y += 14) edge += ` L${n(1338 + r() * 30 + (y - 330) * 0.08)} ${y}`;
  edge += " L1620 560 Z";
  let sand = `<path d="${edge}" fill="${m.sanded}" opacity=".55"/>`;
  for (let i = 1; i <= 4; i++) {
    const dy = i * 19 - 9, x0 = 1300 + r() * 40;
    sand += `<path d="M${n(x0)} ${n(370 + dy + (x0 - 1300) * 0.04)} L1360 ${n(372 + dy)}" stroke="${m.sanded}" stroke-width="${n(6 + r() * 5)}" stroke-linecap="round" opacity=".45"/>`;
  }
  for (let j = 0; j < 7; j++) sand += `<ellipse cx="${n(1380 + r() * 200)}" cy="${n(380 + r() * 50)}" rx="${n(7 + r() * 8)}" ry="${n(3 + r() * 2)}" fill="none" stroke="${shade(m.sanded, 0.2)}" stroke-width="1" opacity=".6"/>`;
  const hull = `<g clip-path="url(#${hullClip})">
      <rect x="1060" y="320" width="560" height="250" fill="url(#${hullG})"/>
      ${planks}${sand}
      <path d="M1060 ${wl} H1620 V580 H1060 Z" fill="${m.bottom}"/>
      <rect x="1060" y="${wl - 7}" width="560" height="8" fill="${m.g("#ece4d2")}"/>
      <rect x="1060" y="${wl + 1}" width="560" height="3" fill="${shade(m.bottom, 0.3)}"/>
      <ellipse cx="${storm ? 1230 : 1150}" cy="374" rx="${storm ? 90 : 70}" ry="13" fill="url(#${gleam})" transform="rotate(8 1150 374)"/>
      <path d="M1060 510 C1200 532 1400 540 1600 510 V580 H1060 Z" fill="#120a14" opacity=".28"/>
    </g>
    <path d="M1066 350 C1200 376 1420 396 1596 368" stroke="${m.gold}" stroke-width="2" fill="none" opacity=".85"/>
    <path d="${sheer}" stroke="${tint(m.hull, storm ? 0.3 : 0.45)}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M1070 343 L1062 336" stroke="${m.steel}" stroke-width="4" stroke-linecap="round"/>
    <text x="1112" y="390" font-family="Georgia, serif" font-style="italic" font-size="21" font-weight="700" letter-spacing="2" fill="${m.gold}" transform="rotate(10 1112 390)">Marguerite</text>`;
  // cabin trunk, coaming, tiller: drawn first so the hull hides their feet
  const teak = m.g("#c79a63"), white = m.g("#efe8da");
  const deck = `
    <path d="M1258 380 L1266 340 C1320 332 1400 334 1446 342 L1452 386 Z" fill="${white}"/>
    <path d="M1266 340 C1320 332 1400 334 1446 342 L1448 335 C1400 326 1320 326 1264 333 Z" fill="${teak}"/>
    ${[1292, 1332, 1372, 1412].map((x) => `<ellipse cx="${x}" cy="${354 + (x - 1292) * 0.02}" rx="7" ry="5" fill="${shade(pal.sky[1], storm ? 0.5 : 0.2)}" stroke="${m.gold}" stroke-width="2"/>`).join("")}
    <path d="M1470 392 L1474 368 H1560 L1558 388 Z" fill="${teak}"/>
    <path d="M1520 370 L1584 354" stroke="${teak}" stroke-width="5" stroke-linecap="round"/>`;
  // the cradle: keel blocks + two poppets, mostly behind the dialog box
  const tim = m.g("#7a5a40"), timL = m.g("#9a7756");
  const cradle = `
    <rect x="1262" y="556" width="190" height="20" fill="${tim}"/><rect x="1276" y="576" width="160" height="22" fill="${timL}"/><rect x="1262" y="598" width="190" height="26" fill="${tim}"/>
    <path d="M1186 640 L1196 476 h16 L1204 640 Z" fill="${tim}"/><rect x="1182" y="468" width="30" height="10" fill="${timL}"/>
    <path d="M1500 640 L1484 452 h16 L1518 640 Z" fill="${tim}"/><rect x="1476" y="444" width="30" height="10" fill="${timL}"/>
    <rect x="1160" y="620" width="380" height="16" fill="${timL}"/>`;
  return { defs, body: `${cradle}${deck}${hull}` };
}

// ---- light and air ----------------------------------------------------------------

function atmosphere(pal: Palette, storm: boolean): Layer {
  const vig = uid("bhv"), pool = uid("bhp");
  const defs = `<radialGradient id="${vig}" cx="800" cy="380" r="980" gradientUnits="userSpaceOnUse"><stop offset=".35" stop-color="${pal.ink}" stop-opacity="0"/><stop offset="1" stop-color="${pal.ink}" stop-opacity="${storm ? 0.55 : 0.5}"/></radialGradient>
    <linearGradient id="${pool}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${storm ? "#b9c8da" : pal.sun}" stop-opacity="${storm ? 0.2 : 0.4}"/><stop offset="1" stop-color="${storm ? "#b9c8da" : pal.sun}" stop-opacity="0"/></linearGradient>`;
  let body = `<rect width="${W}" height="${H}" fill="url(#${vig})"/>`;
  // light spilling in across the slip and boards
  body += `<path d="M${DOOR.x0} ${FLOOR} H${DOOR.x1} L1260 ${H} H340 Z" fill="url(#${pool})"/>`;
  if (!storm) {
    // low sun streaming in: faint shafts through the dusty air, radiating from the sun
    const haze = glow(800, 430, 560, pal.sun, 0.22);
    const ray = uid("bhr"), rc = uid("bhrc");
    const sx = 946, sy = HORIZON;
    let rays = "";
    for (const [a0, a1] of [[163, 168], [192, 197], [204, 206.5], [219, 221], [336, 340]]) {
      const p = (a: number): string => `${n(sx + Math.cos((a * Math.PI) / 180) * 1500)} ${n(sy + Math.sin((a * Math.PI) / 180) * 1500)}`;
      rays += `<path d="M${sx} ${sy} L${p(a0)} L${p(a1)} Z"/>`;
    }
    const { x0, x1, y0, y1 } = DOOR;
    return {
      defs: defs + haze.defs + `<radialGradient id="${ray}" cx="${sx}" cy="${sy}" r="1300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${pal.sun}" stop-opacity=".4"/><stop offset=".35" stop-color="${pal.sun}" stop-opacity=".14"/><stop offset="1" stop-color="${pal.sun}" stop-opacity="0"/></radialGradient>
        <clipPath id="${rc}"><path clip-rule="evenodd" d="M0 0 H${W} V${H} H0 Z M${x0} ${y0} H${x1} V${y1} H${x0} Z"/></clipPath>`,
      body: body + haze.body + `<g clip-path="url(#${rc})" fill="url(#${ray})" class="a-pulse">${rays}</g>`,
    };
  }
  const fl = uid("bhfx");
  body += `<linearGradient id="${fl}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef3ff" stop-opacity=".6"/><stop offset="1" stop-color="#eef3ff" stop-opacity="0"/></linearGradient>`;
  body += `<path d="M${DOOR.x0} ${FLOOR} H${DOOR.x1} L1320 ${H} H280 Z" fill="url(#${fl})" class="a-lightning"/>`;
  // rain gusting in past the jambs
  const clip = uid("bhrc");
  return {
    defs: defs + `<clipPath id="${clip}"><path d="M${DOOR.x0 - 16} ${DOOR.y0} H${DOOR.x1 + 16} L1180 ${H} H420 Z"/></clipPath>`,
    body: body + `<g clip-path="url(#${clip})">${rainIn(380, 1300, { seed: 76, count: 30, angle: 24, color: "#c3cfdc", opacity: 0.55 })}</g>`,
  };
}

// ---- tie beam, mast, posts ----------------------------------------------------------

function roofFrame(m: Materials): string {
  const beam = m.beam, top = m.beamTop, dark = shade(beam, 0.35);
  const spar = m.g("#c58c4e"), sparHi = tint(spar, 0.35);
  return `
    <rect x="236" y="111" width="1300" height="17" rx="8" fill="${spar}"/>
    <rect x="240" y="114" width="1290" height="4" rx="2" fill="${sparHi}" opacity=".7"/>
    <rect x="1490" y="104" width="30" height="24" rx="4" fill="${m.g("#5a5550")}"/>
    <path d="M300 128 q-12 26 4 44 M318 128 q-2 30 14 38" stroke="${m.rope}" stroke-width="3" fill="none"/>
    <rect x="-10" y="${BEAM.y0}" width="${W + 20}" height="${BEAM.y1 - BEAM.y0}" fill="${beam}"/>
    <rect x="-10" y="${BEAM.y0}" width="${W + 20}" height="5" fill="${top}"/>
    <rect x="-10" y="${BEAM.y1 - 5}" width="${W + 20}" height="5" fill="${dark}"/>
    <rect x="-10" y="${BEAM.y1}" width="${W + 20}" height="6" fill="#120a14" opacity=".25"/>
    <path d="M30 300 L170 ${BEAM.y1}" stroke="${beam}" stroke-width="24"/><path d="M${W - 30} 300 L${W - 170} ${BEAM.y1}" stroke="${beam}" stroke-width="24"/>
    <rect x="-10" y="0" width="46" height="${H}" fill="${beam}"/><rect x="30" y="0" width="6" height="${H}" fill="${dark}"/>
    <rect x="${W - 36}" y="0" width="46" height="${H}" fill="${beam}"/><rect x="${W - 36}" y="0" width="6" height="${H}" fill="${top}" opacity=".5"/>`;
}

// ---- lanterns -------------------------------------------------------------------

function lantern(x: number, y: number, m: Materials, { lit = true, flame = m.flame }: { lit?: boolean; flame?: string } = {}): string {
  const metal = m.g("#3c3f44"), metalHi = m.g("#6d7279");
  const glass = lit ? tint(flame, 0.35) : m.g("#7f8f9a", 0.2);
  return `
    <path d="M${x} ${BEAM.y1} V${y}" stroke="${metal}" stroke-width="2.5" stroke-dasharray="4 2"/>
    <path d="M${x - 14} ${y + 16} Q${x} ${y - 8} ${x + 14} ${y + 16}" stroke="${metal}" stroke-width="2.5" fill="none"/>
    <path d="M${x - 12} ${y + 18} h24 l-4 -6 h-16 Z" fill="${metal}"/>
    <rect x="${x - 15}" y="${y + 17}" width="30" height="7" rx="3" fill="${metalHi}"/>
    <path d="M${x - 11} ${y + 24} Q${x - 22} ${y + 46} ${x - 11} ${y + 68} H${x + 11} Q${x + 22} ${y + 46} ${x + 11} ${y + 24} Z" fill="${glass}" opacity="${lit ? 0.9 : 0.75}"/>
    ${lit ? `<g class="a-flicker"><path d="M${x} ${y + 34} q8 14 0 26 q-8 -12 0 -26 Z" fill="#fff4d6"/></g>` : ""}
    <path d="M${x - 8} ${y + 28} q-6 18 0 36" stroke="#fff8ef" stroke-width="2" fill="none" opacity=".5"/>
    <path d="M${x - 15} ${y + 24} V${y + 68} M${x + 15} ${y + 24} V${y + 68} M${x} ${y + 24} V${y + 68}" stroke="${metal}" stroke-width="2"/>
    <rect x="${x - 17}" y="${y + 66}" width="34" height="11" rx="3" fill="${metal}"/>
    <rect x="${x - 17}" y="${y + 66}" width="34" height="3" fill="${metalHi}"/>`;
}

function lanterns(pal: Palette, m: Materials, storm: boolean): Layer {
  if (!storm) {
    const g1 = glow(LAMP_L, 250, 250, pal.light, 0.55), g2 = glow(LAMP_R, 242, 230, pal.light, 0.5);
    return {
      defs: g1.defs + g2.defs,
      body: `${g1.body}${g2.body}${lantern(LAMP_L, 204, m)}${lantern(LAMP_R, 196, m)}`,
    };
  }
  // one dead lantern, one lit and swinging: its pool of light swings with it
  const warm = "#ffa24a";
  const big = glow(LAMP_R, 240, 560, warm, 0.5), core = glow(LAMP_R, 240, 170, "#ffd08a", 0.6);
  const pool = glow(LAMP_R, 600, 260, warm, 0.35);
  const rr = rng(78);
  let refl = "";
  for (let i = 0; i < 9; i++) {
    const y = 572 + i * 14 + rr() * 6, w = 16 + i * 6 + rr() * 12;
    refl += `<path d="M${n(LAMP_R - w / 2 + (rr() - 0.5) * 14)} ${n(y)} h${n(w)}" stroke="#ffc477" stroke-width="${n(2 + i * 0.3)}" stroke-linecap="round" opacity="${n(0.55 - i * 0.04)}" class="a-wave" style="animation-duration:2.6s;animation-delay:-${n(rr() * 2.6)}s"/>`;
  }
  return {
    defs: big.defs + core.defs + pool.defs,
    body: `${pool.body}${refl}<g class="boathouse-swing" style="transform-origin:${LAMP_L}px ${BEAM.y1}px;animation-duration:3.4s;animation-delay:-1s">${lantern(LAMP_L, 204, m, { lit: false })}</g>
      <g class="boathouse-swing" style="transform-origin:${LAMP_R}px ${BEAM.y1}px">${big.body}${core.body}${lantern(LAMP_R, 196, m, { flame: "#ffc56a" })}</g>`,
  };
}

const STYLE = `<style>
@keyframes boathouse-swing { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
.boathouse-swing { animation: boathouse-swing 2.6s ease-in-out infinite; transform-box: view-box; }
@keyframes boathouse-bang {
  0%, 100% { transform: scaleX(1); } 5% { transform: scaleX(.55); } 10% { transform: scaleX(1.05); } 13%, 48% { transform: scaleX(1); }
  53% { transform: scaleX(.74); } 58% { transform: scaleX(1.03); } 61% { transform: scaleX(1); }
}
.boathouse-bang { animation: boathouse-bang 4.4s ease-in-out infinite; transform-box: view-box; }
</style>`;
