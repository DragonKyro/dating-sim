// Second Spin, Wharf Street: records and radio repair in a building that
// leans a little. Rain on the big front window, the turntable going, a desk
// lamp over whatever Noor is fixing today.
import { W, H, rng, uid, shade, tint, mix, motes, windowRain, stringLights } from "../kit.js";

const WIN = { x: 44, y: 96, w: 392, h: 456 };   // front window glass
const COUNTER = 592;
const FLOOR = 690;
const INK = "#1a1020";
const SPINES = ["#d9a441", "#c4534a", "#2f6f6c", "#3d5a8a", "#e8dcc4", "#6b4a7a", "#e07a4f", "#24222b", "#8fb08a", "#f0c9a0", "#a33b3b", "#4a7fa8", "#c7b26a"];

export function records({ pal, time, weather }) {
  const rainy = weather !== "clear";
  const dusk = time === "dusk";
  const out = outside(pal, dusk, rainy);
  const P = [];
  P.push(styles());
  P.push(room(pal, dusk));
  P.push(windowPart(out, dusk, rainy));
  P.push(posters());
  P.push(sign());
  P.push(shelves());
  P.push(counter(pal));
  P.push(hangingPlant(404, 40));

  // Lighting: settle the room into its time of day, then add the lights.
  P.push(shadowPass(dusk, rainy));
  P.push(soft(WIN.x + WIN.w / 2, WIN.y + WIN.h * 0.45, 560, out.spill, dusk ? 0.22 : rainy ? 0.3 : 0.38));
  if (!rainy && !dusk) P.push(sunShaft());
  P.push(soft(1392, 520, 360, "#ffc670", dusk ? 0.6 : 0.45));
  P.push(soft(1330, 188, 120, "#ffb347", dusk ? 0.55 : 0.35, "a-pulse"));
  P.push(lampBulb());
  P.push(stringLights(18, 62, 560, 58, 46, { count: 13, color: "#ffd58a", wire: "#2a1d22", seed: 29 }));
  P.push(stringLights(1080, 56, 1600, 64, 26, { count: 12, color: "#ffd58a", wire: "#2a1d22", seed: 31 }));
  if (dusk) P.push(soft(290, 120, 300, "#ffd58a", 0.16), soft(1340, 110, 300, "#ffd58a", 0.14));
  P.push(motes(dusk ? 16 : 26, { x0: 120, x1: 1560, y0: 160, y1: 600, color: "#fff2dc", size: [0.8, 2], seed: 37, opacity: 0.45 }));
  return P;
}

// ---- helpers ------------------------------------------------------------------

const f = (n) => (+n).toFixed(1).replace(/\.0$/, "");

function soft(x, y, r, color, op, cls = "") {
  const g = uid("rc-soft");
  const st = [[0, 1], [0.25, 0.7], [0.5, 0.36], [0.75, 0.12], [1, 0]];
  return {
    defs: `<radialGradient id="${g}">${st.map(([o, k]) => `<stop offset="${o}" stop-color="${color}" stop-opacity="${(op * k).toFixed(3)}"/>`).join("")}</radialGradient>`,
    body: `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})" class="${cls}"/>`,
  };
}

function styles() {
  return `<style>
    @keyframes records-rain { from { transform: translateY(0); } to { transform: translateY(${WIN.h}px); } }
    .records-rain { animation: records-rain .6s linear infinite; }
    .records-rain-far { animation: records-rain .95s linear infinite; }
  </style>`;
}

/** Colors for the view through the window. */
function outside(pal, dusk, rainy) {
  const grey = dusk ? "#3c3a58" : "#8d97a5";
  const k = rainy ? (dusk ? 0.42 : 0.62) : 0;
  const sky = pal.sky.map((c) => mix(c, grey, k));
  const haze = sky[1];
  return {
    sky,
    haze,
    far: mix(pal.far, haze, rainy ? 0.55 : 0.25),
    house: mix(dusk ? "#4a4868" : "#8f969c", haze, rainy ? 0.35 : 0.1),
    house2: mix(dusk ? "#3c3a58" : "#a9a49a", haze, rainy ? 0.35 : 0.1),
    trim: mix("#eeeae0", haze, rainy ? 0.45 : 0.15),
    street: mix(dusk ? "#22223a" : "#5b6068", haze, rainy ? 0.2 : 0.05),
    lit: dusk || rainy,
    spill: dusk ? (rainy ? "#8a86c4" : "#f3a27a") : rainy ? "#c9d6e6" : "#fff1d0",
  };
}

function room(pal, dusk) {
  const wall = mix("#8a4636", pal.light, 0.08), wd = shade(wall, 0.18);
  const wain = "#4b2e25", floor = "#5a3b2b";
  const r = rng(43);
  // Painted tongue-and-groove boards on the upper wall.
  const bp = uid("rc-boards");
  const boards = `<pattern id="${bp}" width="46" height="10" patternUnits="userSpaceOnUse"><rect width="2" height="10" fill="${wd}" opacity=".55"/></pattern><rect x="0" y="40" width="${W}" height="430" fill="url(#${bp})"/>`;
  let fl = "";
  for (let i = 0; i < 7; i++) {
    const y = FLOOR + 8 + i * i * 4 + i * 12;
    fl += `<path d="M0 ${y + 6} L${W} ${y - 6}" stroke="${shade(floor, 0.3)}" stroke-width="${f(1 + i * 0.4)}" opacity=".6"/>`;
  }
  let patches = "";
  for (let i = 0; i < 8; i++) patches += `<rect x="${f(r() * W)}" y="${f(60 + r() * 360)}" width="${f(30 + r() * 90)}" height="${f(30 + r() * 80)}" fill="${shade(wall, 0.12)}" opacity="${f(0.08 + r() * 0.08)}"/>`;
  // The ceiling slopes a little: it's that kind of building.
  return `<rect width="${W}" height="${H}" fill="${wall}"/>${patches}${boards}
    <path d="M0 0 H${W} V58 L0 42 Z" fill="#2e1d1c"/>
    <path d="M0 42 L${W} 58 V66 L0 50 Z" fill="${shade("#2e1d1c", 0.2)}"/>
    <path d="M0 470 L${W} 478 V${FLOOR} H0 Z" fill="${wain}"/>
    <path d="M0 462 L${W} 470 V482 L0 474 Z" fill="${tint(wain, 0.25)}"/>
    <path d="M0 474 L${W} 482 V488 L0 480 Z" fill="${INK}" opacity=".25"/>
    ${wainPanels(wain)}
    <path d="M0 ${FLOOR} L${W} ${FLOOR - 8} V${H} H0 Z" fill="${floor}"/>${fl}`;
}

function wainPanels(wain) {
  let s = "";
  for (let x = 20; x < W; x += 120) {
    const y = 500 + (x / W) * 8;
    s += `<rect x="${x}" y="${f(y)}" width="96" height="160" rx="3" fill="${shade(wain, 0.25)}"/><rect x="${x + 4}" y="${f(y + 4)}" width="88" height="152" rx="2" fill="${tint(wain, 0.06)}"/>`;
  }
  return s;
}

// ---- window --------------------------------------------------------------------

function windowPart(o, dusk, rainy) {
  const { x, y, w, h } = WIN;
  const clip = uid("rc-win"), skyG = uid("rc-sky"), bokeh = uid("rc-bokeh");
  const street = y + h - 70;
  let v = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${skyG})"/>`;
  // Harbor glimpse + masts between buildings.
  v += `<rect x="${x + 150}" y="${street - 64}" width="70" height="64" fill="${mix(o.far, o.haze, 0.3)}"/>`;
  for (const mx of [x + 166, x + 196, x + 210]) v += `<rect x="${mx}" y="${street - 170 + (mx % 30)}" width="2" height="${110 + (mx % 30)}" fill="${o.far}"/>`;
  // Buildings across Wharf Street.
  v += house(x - 20, street, 168, 150, 66, o.house, o.trim, o, 1);
  v += `<path d="M${x + 222} ${street} V${street - 214} H${x + 316} V${street} Z" fill="${o.house2}"/>
    <rect x="${x + 216}" y="${street - 222}" width="106" height="10" fill="${o.trim}"/>`;
  v += windowsGrid(x + 236, street - 196, 2, 3, 26, 34, 40, 58, o, 2);
  v += house(x + 320, street, 140, 120, 56, mix(o.house, o.house2, 0.5), o.trim, o, 3);
  // Wet street + curb + reflections.
  v += `<rect x="${x}" y="${street}" width="${w}" height="${h}" fill="${o.street}"/>
    <rect x="${x}" y="${street}" width="${w}" height="5" fill="${o.trim}" opacity=".35"/>
    <rect x="${x}" y="${street + 26}" width="${w}" height="2" fill="${o.trim}" opacity=".2"/>`;
  // Streetlamp.
  const lx = x + 120;
  v += `<rect x="${lx - 2}" y="${street - 150}" width="5" height="150" fill="${shade(o.house, 0.4)}"/>
    <path d="M${lx - 10} ${street - 148} h21 l-4 -14 h-13 Z" fill="${shade(o.house, 0.4)}"/>`;
  if (o.lit) {
    v += `<circle cx="${lx}" cy="${street - 150}" r="${rainy ? 70 : 50}" fill="url(#${bokeh})" class="a-twinkle-soft"/>
      <rect x="${lx - 7}" y="${street - 152}" width="14" height="5" fill="#ffe8b8"/>
      <path d="M${lx - 6} ${street + 6} h12 l6 64 h-24 Z" fill="#ffd08a" opacity="${rainy ? 0.35 : 0.2}"/>`;
  }
  // Blurred lights through the wet glass.
  if (o.lit) {
    const r = rng(47);
    for (let i = 0; i < (rainy ? 9 : 4); i++) {
      v += `<circle cx="${f(x + 20 + r() * (w - 40))}" cy="${f(street - 40 + r() * 70)}" r="${f(8 + r() * 18)}" fill="url(#${bokeh})" class="a-twinkle-soft" style="animation-delay:-${f(r() * 3)}s"/>`;
    }
  }
  if (rainy) v += localRain(x, y, w, h, dusk);
  // Glass: a faint sheen; fogged when it's raining.
  v += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e8eef4" opacity="${rainy ? 0.1 : 0.04}"/>
    <path d="M${x + 40} ${y + h} L${x + 200} ${y} H${x + 250} L${x + 90} ${y + h} Z" fill="#ffffff" opacity=".05"/>`;
  if (rainy) {
    v += windowRain(x, y + 90, w / 2, h - 90, { seed: 53, count: 6, color: "#e6eef6" });
    v += windowRain(x + w / 2, y + 90, w / 2, h - 90, { seed: 59, count: 6, color: "#e6eef6" });
  }

  const frame = "#e6dac2", fd = shade(frame, 0.22), sill = "#6e4630";
  const tilt = `rotate(0.8 ${x + w / 2} ${y + h / 2})`;
  const body = `<g transform="${tilt}">
    <rect x="${x - 26}" y="${y - 26}" width="${w + 52}" height="${h + 40}" fill="${INK}" opacity=".18"/>
    <g clip-path="url(#${clip})">${v}</g>
    <rect x="${x - 20}" y="${y - 20}" width="${w + 40}" height="20" fill="${frame}"/>
    <rect x="${x - 20}" y="${y}" width="20" height="${h}" fill="${frame}"/>
    <rect x="${x + w}" y="${y}" width="20" height="${h}" fill="${fd}"/>
    <rect x="${x}" y="${y + 84}" width="${w}" height="10" fill="${frame}"/>
    <rect x="${x + w / 2 - 5}" y="${y}" width="10" height="${h}" fill="${frame}"/>
    <rect x="${x + w / 4 - 3}" y="${y}" width="6" height="84" fill="${frame}"/>
    <rect x="${x + (3 * w) / 4 - 3}" y="${y}" width="6" height="84" fill="${frame}"/>
    <rect x="${x}" y="${y}" width="${w}" height="5" fill="${fd}" opacity=".6"/>
    <rect x="${x}" y="${y + 94}" width="${w}" height="4" fill="${fd}" opacity=".5"/>
    ${openSign(x + w / 4 + 6, y + 94)}
    <rect x="${x - 34}" y="${y + h}" width="${w + 68}" height="22" fill="${sill}"/>
    <rect x="${x - 34}" y="${y + h}" width="${w + 68}" height="5" fill="${tint(sill, 0.3)}"/>
    <rect x="${x - 28}" y="${y + h + 22}" width="${w + 56}" height="8" fill="${INK}" opacity=".25"/>
    ${crate(x + 300, y + h)}${potPlant(x + 40, y + h)}
  </g>`;
  return {
    defs: `<clipPath id="${clip}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>
      <linearGradient id="${skyG}" x1="0" y1="1" x2="0" y2="0">${o.sky.map((c, i) => `<stop offset="${i / 3}" stop-color="${c}"/>`).join("")}</linearGradient>
      <radialGradient id="${bokeh}"><stop offset="0" stop-color="#ffd08a" stop-opacity=".75"/><stop offset=".5" stop-color="#ffd08a" stop-opacity=".3"/><stop offset="1" stop-color="#ffd08a" stop-opacity="0"/></radialGradient>`,
    body,
  };
}

function house(x, base, w, wallH, roofH, color, trim, o, seed) {
  const top = base - wallH;
  let s = `<path d="M${x} ${base} V${top} L${x + w / 2} ${top - roofH} L${x + w} ${top} V${base} Z" fill="${color}"/>
    <path d="M${x - 6} ${top + 4} L${x + w / 2} ${top - roofH - 2} L${x + w + 6} ${top + 4}" fill="none" stroke="${trim}" stroke-width="5"/>`;
  s += windowsGrid(x + w * 0.16, top + 22, 2, 2, 26, 34, w * 0.42, 54, o, seed);
  s += `<rect x="${f(x + w / 2 - 10)}" y="${f(top - roofH * 0.55)}" width="20" height="22" fill="${shade(color, 0.25)}"/>`;
  return s;
}

function windowsGrid(x, y, cols, rows, ww, wh, dx, dy, o, seed) {
  const r = rng(seed * 7 + 3);
  let s = "";
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const on = o.lit && r() > 0.45;
    s += `<rect x="${f(x + i * dx)}" y="${f(y + j * dy)}" width="${ww}" height="${wh}" fill="${on ? "#ffcf86" : shade(o.house, 0.3)}" opacity="${on ? 0.8 : 0.9}"/>
      <rect x="${f(x + i * dx - 2)}" y="${f(y + j * dy + wh)}" width="${ww + 4}" height="3" fill="${o.trim}" opacity=".6"/>`;
  }
  return s;
}

function localRain(x, y, w, h, dusk) {
  const r = rng(61);
  const mk = (n, len0, sw) => {
    let s = "";
    for (let i = 0; i < n; i++) {
      const lx = x + r() * (w + 60), ly = y + r() * h, len = len0 + r() * 20;
      s += `<path d="M${f(lx)} ${f(ly)} l${f(-len * 0.18)} ${f(len)}" stroke="${dusk ? "#9fa6c8" : "#e2e8ee"}" stroke-width="${sw}" stroke-linecap="round"/>`;
    }
    return s;
  };
  const far = mk(18, 14, 1.1), near = mk(9, 24, 1.8);
  return `<g class="records-rain-far" opacity=".45">${far}<g transform="translate(0 -${h})">${far}</g></g>
    <g class="records-rain" opacity=".6">${near}<g transform="translate(0 -${h})">${near}</g></g>`;
}

function openSign(x, y) {
  // Hangs facing the street, so from in here it reads backwards.
  const cx = x + 40;
  return `<path d="M${x + 12} ${y} L${cx} ${y + 22} L${x + 68} ${y}" fill="none" stroke="#2a1d1a" stroke-width="1.5"/>
    <rect x="${x}" y="${y + 22}" width="80" height="34" rx="4" fill="#a8382f"/>
    <rect x="${x + 3}" y="${y + 25}" width="74" height="28" rx="3" fill="none" stroke="#f2e6cc" stroke-width="1.5" opacity=".7"/>
    <g transform="translate(${2 * cx} 0) scale(-1 1)"><text x="${cx}" y="${y + 46}" text-anchor="middle" font-family="Georgia, serif" font-size="17" font-weight="700" letter-spacing="2" fill="#f2e6cc">OPEN</text></g>`;
}

function crate(x, base) {
  const wood = "#a0774c", dk = shade(wood, 0.3);
  const r = rng(67);
  let sleeves = "";
  for (let i = 0; i < 7; i++) {
    const c = SPINES[Math.floor(r() * SPINES.length)];
    sleeves += `<rect x="${x + 6 + i * 11}" y="${f(base - 70 + r() * 10)}" width="22" height="60" rx="1" fill="${c}" transform="rotate(${f(-8 + i * 2.5)} ${x + 16 + i * 11} ${base - 20})"/>`;
  }
  return `${sleeves}<rect x="${x}" y="${base - 40}" width="104" height="40" fill="${wood}"/>
    <rect x="${x}" y="${base - 40}" width="104" height="5" fill="${tint(wood, 0.3)}"/>
    <rect x="${x + 36}" y="${base - 28}" width="32" height="8" rx="4" fill="${dk}"/>
    <path d="M${x} ${base - 14} H${x + 104}" stroke="${dk}" stroke-width="2"/>`;
}

function potPlant(x, base) {
  return `<path d="M${x - 16} ${base} l-4 -30 h40 l-4 30 Z" fill="#c4704c"/><rect x="${x - 22}" y="${base - 34}" width="44" height="7" fill="#d4825d"/>
    <path d="M${x} ${base - 34} q-30 -20 -34 -56 q22 18 34 56 q-4 -48 16 -66 q8 38 -16 66 q26 -26 46 -24 q-18 22 -46 24" fill="#4f7a4a"/>
    <path d="M${x} ${base - 34} q2 -30 14 -48" stroke="#6f9a62" stroke-width="2" fill="none"/>`;
}

function hangingPlant(x, top) {
  const leaf = (lx, ly, s, c) => `<path d="M${f(lx)} ${f(ly)} q${f(8 * s)} ${f(-6 * s)} ${f(14 * s)} ${f(2 * s)} q${f(-8 * s)} ${f(8 * s)} ${f(-14 * s)} ${f(-2 * s)} Z" fill="${c}"/>`;
  let vines = "";
  const r = rng(71);
  const strands = [[-20, 210], [-6, 290], [12, 240], [24, 170]];
  for (const [dx, len] of strands) {
    vines += `<path d="M${x + dx} 150 q${dx * 0.6} ${len * 0.5} ${f(dx * 0.2 + 6)} ${len}" stroke="#4a6e44" stroke-width="2" fill="none"/>`;
    for (let t = 0.12; t < 1; t += 0.13) {
      const ly = 150 + len * t, lx = x + dx + dx * 0.6 * Math.sin(t * Math.PI) * 0.8 + (r() - 0.5) * 6;
      vines += leaf(lx + (r() > 0.5 ? 0 : -14), ly, 0.8 + r() * 0.5, r() > 0.5 ? "#5c8a50" : "#4a7a46");
    }
  }
  return `<g class="a-sway" style="animation-duration:7s">
    <path d="M${x} ${top} V118 M${x} 118 L${x - 26} 140 M${x} 118 L${x + 26} 140" stroke="#3a2a24" stroke-width="1.5" fill="none"/>
    ${vines}
    <path d="M${x - 30} 136 h60 l-8 28 h-44 Z" fill="#d9cbb0"/><rect x="${x - 32}" y="132" width="64" height="8" rx="3" fill="#e9dcc2"/>
    <path d="M${x - 26} 150 h52" stroke="#c2a882" stroke-width="2"/>
  </g>`;
}

// ---- wall decor ------------------------------------------------------------------

function posters() {
  const p1 = `<g transform="rotate(-2.5 540 200)">
      <rect x="474" y="112" width="136" height="186" fill="${INK}" opacity=".2" transform="translate(4 5)"/>
      <rect x="474" y="112" width="136" height="186" fill="#efe3c8"/>
      <rect x="482" y="120" width="120" height="120" fill="#e07a4f"/>
      <circle cx="542" cy="196" r="38" fill="#f2c94c"/>
      <path d="M482 214 q30 -16 60 0 t60 0 V240 H482 Z" fill="#2f5d8a"/>
      <path d="M482 226 q30 -12 60 0 t60 0 V240 H482 Z" fill="#26487a"/>
      <text x="542" y="264" text-anchor="middle" font-family="'Trebuchet MS', Verdana, sans-serif" font-size="17" font-weight="700" fill="#2a1d22" letter-spacing="1">GULL PARADE</text>
      <text x="542" y="284" text-anchor="middle" font-family="'Trebuchet MS', Verdana, sans-serif" font-size="10" fill="#6b3a30" letter-spacing="2">LIVE · THE GRANGE</text>
    </g>`;
  const p2 = `<g transform="rotate(1.8 536 400)">
      <rect x="480" y="326" width="112" height="146" fill="${INK}" opacity=".2" transform="translate(4 5)"/>
      <rect x="480" y="326" width="112" height="146" fill="#24222b"/>
      <circle cx="536" cy="384" r="38" fill="#e8dcc4"/><circle cx="536" cy="384" r="12" fill="#c4534a"/><circle cx="536" cy="384" r="2.5" fill="#24222b"/>
      <path d="M498 384 a38 38 0 0 1 20 -33" stroke="#24222b" stroke-width="2" fill="none" opacity=".4"/>
      <text x="536" y="446" text-anchor="middle" font-family="Georgia, serif" font-size="13" font-style="italic" fill="#e8dcc4">the fog machines</text>
      <path d="M500 456 h72" stroke="#d9a441" stroke-width="2"/>
    </g>`;
  return p1 + p2;
}

function sign() {
  return `<g transform="rotate(-1.6 800 86)">
    <path d="M660 58 L650 66 M940 58 L950 66" stroke="#2a1d1a" stroke-width="2"/>
    <rect x="626" y="60" width="348" height="56" rx="6" fill="${INK}" opacity=".25" transform="translate(3 4)"/>
    <rect x="626" y="60" width="348" height="56" rx="6" fill="#26393a"/>
    <rect x="632" y="66" width="336" height="44" rx="4" fill="none" stroke="#d9a441" stroke-width="1.5" opacity=".8"/>
    <text x="800" y="96" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="27" font-weight="700" letter-spacing="5" fill="#efe3c8">SECOND SPIN</text>
  </g>`;
}

// ---- shelves, records, radios -------------------------------------------------------

function shelves() {
  const x0 = 1076, x1 = 1590, top = 226, rows = [236, 358, 480, 600];
  const wood = "#6e4630", dk = shade(wood, 0.3), lt = tint(wood, 0.2);
  const cols = 4, cw = (x1 - x0) / cols;
  const r = rng(73);
  // LP spines are all the same height, so a stripe pattern does the bulk of
  // the work; each cubby then gets a few strays and maybe a face-out sleeve.
  const pats = [uid("rc-lpA"), uid("rc-lpB")];
  const defs = pats.map((id, k) => spinePattern(id, 167 + k * 34, rng(91 + k))).join("");
  const faceOut = { 2: 0, 7: 1, 8: 2 };
  let b = `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${rows[3] - top}" fill="#2a1a18"/>`;
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < cols; i++) {
      const k = i + j * cols;
      const cx = x0 + i * cw + 8, cy = rows[j] + 10, w = cw - 16, h = rows[j + 1] - rows[j] - 10;
      b += cubby(cx, cy, w, h, r, pats[k % 2], faceOut[k]);
    }
  }
  for (let i = 0; i <= cols; i++) b += `<rect x="${f(x0 + i * cw - 5)}" y="${top}" width="10" height="${rows[3] - top}" fill="${i === cols ? dk : wood}"/>`;
  for (const y of rows) b += `<rect x="${x0 - 8}" y="${y}" width="${x1 - x0 + 16}" height="10" fill="${wood}"/><rect x="${x0 - 8}" y="${y}" width="${x1 - x0 + 16}" height="3" fill="${lt}"/>`;
  b += radios();
  b += `<g transform="rotate(4 1560 236)"><path d="M1560 236 v12" stroke="#2a1d1a" stroke-width="1.2"/><rect x="1534" y="248" width="52" height="24" rx="2" fill="#efe3c8"/><text x="1560" y="265" text-anchor="middle" font-family="'Trebuchet MS', Verdana, sans-serif" font-size="10" font-weight="700" fill="#6b3a30" letter-spacing="1">REPAIRS</text></g>`;
  // The whole unit lists a degree to the left, like the building.
  return { defs, body: `<g transform="rotate(-0.9 1333 420)">${b}</g>` };
}

function spinePattern(id, pw, r) {
  let stripes = "";
  let x = 0;
  while (x < pw - 2) {
    const sw = Math.min(2.5 + r() * 4.5, pw - x);
    const c = SPINES[Math.floor(r() * SPINES.length)];
    stripes += `<rect x="${f(x)}" y="0" width="${f(sw - 0.8)}" height="400" fill="${c}"/>`;
    if (r() > 0.75) stripes += `<rect x="${f(x)}" y="16" width="${f(sw - 0.8)}" height="3" fill="${tint(c, 0.55)}"/>`;
    x += sw;
  }
  return `<pattern id="${id}" x="0" y="0" width="${pw}" height="400" patternUnits="userSpaceOnUse"><rect width="${pw}" height="400" fill="#1d1418"/>${stripes}</pattern>`;
}

const COVERS = [
  (x, y, s) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#d9a441"/><circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s * 0.34}" fill="#2f6f6c"/><circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s * 0.18}" fill="#24222b"/><circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s * 0.05}" fill="#d9a441"/>`,
  (x, y, s) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#e07a4f"/><path d="M${x} ${y + s * 0.7} L${x + s * 0.7} ${y} H${x + s * 0.86} L${x} ${y + s * 0.86} Z M${x + s * 0.3} ${y + s} L${x + s} ${y + s * 0.3} V${y + s * 0.46} L${x + s * 0.46} ${y + s} Z" fill="#efe3c8"/>`,
  (x, y, s) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#26355e"/><circle cx="${x + s * 0.58}" cy="${y + s * 0.4}" r="${s * 0.24}" fill="#efe3c8"/><circle cx="${x + s * 0.68}" cy="${y + s * 0.34}" r="${s * 0.22}" fill="#26355e"/><path d="M${x + s * 0.12} ${y + s * 0.84} h${s * 0.5}" stroke="#efe3c8" stroke-width="3"/>`,
];

function cubby(x, y, w, h, r, pat, cover) {
  let s = `<rect x="${f(x)}" y="${f(y + 6)}" width="${f(w - (r() > 0.5 ? 10 : 0))}" height="${f(h - 6)}" fill="url(#${pat})"/>`;
  // A couple of sleeves sticking up out of the row.
  for (let i = 0; i < 2; i++) {
    const sx = x + 6 + r() * (w - 20);
    s += `<rect x="${f(sx)}" y="${f(y + 1)}" width="${f(3 + r() * 3)}" height="${h - 1}" fill="${SPINES[Math.floor(r() * SPINES.length)]}"/>`;
  }
  if (cover !== undefined) {
    const sz = h - 8;
    s += `<g transform="rotate(-4 ${f(x + 6)} ${y + h})">${COVERS[cover](+f(x + 6), +f(y + h - sz), sz)}</g>`;
  }
  return s + `<rect x="${f(x)}" y="${y}" width="${f(w)}" height="14" fill="${INK}" opacity=".35"/>`;
}

function radios() {
  // Cathedral set, a tube tabletop with its dial lit, and a little bakelite.
  return `<g>
    <path d="M1100 226 V160 Q1100 112 1150 110 Q1200 112 1200 160 V226 Z" fill="#7a4a2a"/>
    <path d="M1112 222 V162 Q1112 124 1150 122 Q1188 124 1188 162 V222 Z" fill="#5a341e"/>
    <path d="M1124 206 V164 Q1124 138 1150 136 Q1176 138 1176 164 V206 Z" fill="#c9b48a"/>
    <path d="M1137 206 V146 M1150 206 V138 M1163 206 V146" stroke="#7a4a2a" stroke-width="4"/>
    <circle cx="1130" cy="216" r="4" fill="#e8d8b0"/><circle cx="1170" cy="216" r="4" fill="#e8d8b0"/>
    <rect x="1232" y="150" width="196" height="76" rx="10" fill="#9a6a3e"/>
    <rect x="1232" y="150" width="196" height="8" rx="4" fill="#b8865a"/>
    <rect x="1244" y="164" width="76" height="50" rx="4" fill="#d9c49a"/>
    <path d="M1252 172 h60 M1252 180 h60 M1252 188 h60 M1252 196 h60 M1252 204 h60" stroke="#a88a5e" stroke-width="2"/>
    <rect x="1332" y="168" width="82" height="24" rx="3" fill="#ffcf7a" class="a-pulse"/>
    <path d="M1340 180 h66" stroke="#b07a30" stroke-width="1" opacity=".6"/>
    <path d="M1346 172 v6 M1358 172 v4 M1370 172 v6 M1382 172 v4 M1394 172 v6" stroke="#8a5a2a" stroke-width="1"/>
    <path d="M1344 170 v20" stroke="#c4372a" stroke-width="2"/>
    <circle cx="1348" cy="206" r="8" fill="#3a2418"/><circle cx="1398" cy="206" r="8" fill="#3a2418"/>
    <rect x="1456" y="176" width="110" height="50" rx="14" fill="#2f6f6c"/>
    <rect x="1456" y="176" width="110" height="10" rx="5" fill="#4a8f8a"/>
    <circle cx="1488" cy="203" r="16" fill="#e8dcc4"/><circle cx="1488" cy="203" r="10" fill="none" stroke="#2f6f6c" stroke-width="2"/>
    <rect x="1514" y="194" width="40" height="14" rx="3" fill="#e8dcc4"/>
    <path d="M1470 176 q16 -40 46 -50" stroke="#2a1d1a" stroke-width="2" fill="none"/>
  </g>`;
}

// ---- counter ----------------------------------------------------------------------

function counter(pal) {
  const wood = "#5e3a28", top = "#8a5a3a";
  return `<g>
    <path d="M1000 ${COUNTER + 16} L${W + 10} ${COUNTER + 12} V${H} H1000 Z" fill="${wood}"/>
    <rect x="1022" y="${COUNTER + 40}" width="${W - 1040}" height="200" rx="4" fill="${shade(wood, 0.2)}"/>
    <rect x="1030" y="${COUNTER + 48}" width="${W - 1056}" height="184" rx="3" fill="${tint(wood, 0.05)}"/>
    <path d="M988 ${COUNTER} L${W + 10} ${COUNTER - 4} V${COUNTER + 14} L988 ${COUNTER + 18} Z" fill="${top}"/>
    <path d="M988 ${COUNTER} L${W + 10} ${COUNTER - 4} V${COUNTER} L988 ${COUNTER + 4} Z" fill="${tint(top, 0.3)}"/>
    <path d="M992 ${COUNTER + 18} L${W + 10} ${COUNTER + 14} V${COUNTER + 24} L992 ${COUNTER + 28} Z" fill="${INK}" opacity=".3"/>
    ${mug(1050, COUNTER + 1)}
    ${turntable(1218, COUNTER - 2)}
    ${chassis(1372, COUNTER - 3)}
    ${deskLamp()}
  </g>`;
}

function mug(x, base) {
  return `<rect x="${x - 15}" y="${base - 34}" width="30" height="34" rx="4" fill="#e8dcc4"/><path d="M${x + 15} ${base - 26} q14 0 12 12 q-2 8 -12 8" stroke="#e8dcc4" stroke-width="5" fill="none"/>
    <rect x="${x - 15}" y="${base - 34}" width="30" height="5" rx="2" fill="#3a2418"/><rect x="${x - 15}" y="${base - 18}" width="30" height="6" fill="#c4534a"/>`;
}

function turntable(cx, base) {
  const plinthW = 230, plinthH = 30;
  // Seen from just above: the platter is a circle squashed into an ellipse, so it can spin properly.
  const pc = { x: cx - 18, y: base - plinthH - 2 };
  return `<g>
    <path d="M${cx - plinthW / 2 + 14} ${base - plinthH - 108} L${cx + plinthW / 2 - 14} ${base - plinthH - 108} L${cx + plinthW / 2} ${base - plinthH - 18} H${cx - plinthW / 2} Z" fill="#cfd8e0" opacity=".14"/>
    <path d="M${cx - plinthW / 2 + 14} ${base - plinthH - 108} H${cx + plinthW / 2 - 14}" stroke="#e8eef4" stroke-width="2" opacity=".35"/>
    <path d="M${cx - plinthW / 2} ${base - plinthH} L${cx - plinthW / 2 + 16} ${base - plinthH - 22} H${cx + plinthW / 2 - 16} L${cx + plinthW / 2} ${base - plinthH} Z" fill="#a8774c"/>
    <rect x="${cx - plinthW / 2}" y="${base - plinthH}" width="${plinthW}" height="${plinthH}" rx="3" fill="#7a5034"/>
    <rect x="${cx - plinthW / 2}" y="${base - plinthH}" width="${plinthW}" height="4" fill="#c49466"/>
    <circle cx="${cx + 82}" cy="${base - 14}" r="4" fill="#e8dcc4"/><circle cx="${cx + 96}" cy="${base - 14}" r="2.5" fill="#ff8a4a" class="a-led"/>
    <g transform="translate(${pc.x} ${pc.y}) scale(1 0.26)">
      <circle r="84" fill="#3a3a40"/>
      <g class="a-spin">
        <circle r="80" fill="#17151b"/>
        <circle r="66" fill="none" stroke="#2c2932" stroke-width="2"/><circle r="52" fill="none" stroke="#2c2932" stroke-width="2"/>
        <path d="M-76 -10 A78 78 0 0 1 -30 -70" stroke="#8a8794" stroke-width="5" fill="none" opacity=".55"/>
        <circle r="26" fill="#d9a441"/><rect x="4" y="-8" width="16" height="6" fill="#c4534a"/>
        <circle r="3" fill="#e8dcc4"/>
      </g>
    </g>
    <circle cx="${cx + 78}" cy="${base - plinthH - 12}" r="7" fill="#b8b8c0"/>
    <path d="M${cx + 78} ${base - plinthH - 12} L${cx + 70} ${base - plinthH - 4} L${cx + 6} ${base - plinthH - 4}" stroke="#d0d0d8" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="${cx - 2}" y="${base - plinthH - 8}" width="12" height="6" rx="1.5" fill="#2a2a30"/>
  </g>`;
}

function chassis(x, base) {
  // A radio with its back off, valves glowing faintly: today's repair.
  return `<g>
    <rect x="${x}" y="${base - 44}" width="94" height="44" rx="4" fill="#4a3426"/>
    <rect x="${x + 6}" y="${base - 38}" width="82" height="32" fill="#2a2024"/>
    <rect x="${x + 14}" y="${base - 34}" width="10" height="22" rx="5" fill="#ffb35c" opacity=".75" class="a-pulse"/>
    <rect x="${x + 30}" y="${base - 30}" width="10" height="18" rx="5" fill="#ffb35c" opacity=".6" class="a-pulse" style="animation-delay:-2s"/>
    <rect x="${x + 48}" y="${base - 26}" width="30" height="14" fill="#7a8a6a"/>
    <path d="M${x + 52} ${base - 20} h22" stroke="#c4534a" stroke-width="2"/>
    <path d="M${x - 40} ${base - 2} l44 -8" stroke="#d9a441" stroke-width="4" stroke-linecap="round"/>
    <path d="M${x - 44} ${base - 1} l12 -2" stroke="#c4534a" stroke-width="6" stroke-linecap="round"/>
  </g>`;
}

const LAMP = { base: [1532, COUNTER - 2], elbow: [1508, 446], head: [1446, 424], tilt: 34 };

/** Point on the lamp shade (local coords, mouth pointing +y) in scene space. */
function lampPt(px, py) {
  const [hx, hy] = LAMP.head, a = (LAMP.tilt * Math.PI) / 180;
  return [hx + px * Math.cos(a) - py * Math.sin(a), hy + px * Math.sin(a) + py * Math.cos(a)];
}

function deskLamp() {
  const [bx, by] = LAMP.base, [ex, ey] = LAMP.elbow, [hx, hy] = LAMP.head;
  const c = "#2f5d4e";
  const [kx, ky] = lampPt(0, -26);
  return `<g>
    <ellipse cx="${bx}" cy="${by - 4}" rx="30" ry="8" fill="${shade(c, 0.1)}"/>
    <rect x="${bx - 24}" y="${by - 12}" width="48" height="6" rx="3" fill="${c}"/>
    <path d="M${bx} ${by - 10} L${ex} ${ey} L${f(kx)} ${f(ky)}" stroke="${shade(c, 0.25)}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${ex}" cy="${ey}" r="7" fill="${tint(c, 0.2)}"/>
    <g transform="rotate(${LAMP.tilt} ${hx} ${hy})">
      <rect x="${hx - 9}" y="${hy - 34}" width="18" height="12" rx="3" fill="${shade(c, 0.2)}"/>
      <path d="M${hx - 14} ${hy - 24} Q${hx} ${hy - 30} ${hx + 14} ${hy - 24} L${hx + 36} ${hy + 18} H${hx - 36} Z" fill="${c}"/>
      <path d="M${hx - 10} ${hy - 20} L${hx - 26} ${hy + 12}" stroke="${tint(c, 0.35)}" stroke-width="4" stroke-linecap="round" opacity=".6"/>
      <ellipse cx="${hx}" cy="${hy + 18}" rx="36" ry="6" fill="${shade(c, 0.35)}"/>
    </g>
  </g>`;
}

function lampBulb() {
  const g = uid("rc-cone");
  const L = lampPt(-34, 19), R = lampPt(34, 19), M = lampPt(0, 20);
  const a = (LAMP.tilt * Math.PI) / 180;
  const reach = (y0) => (COUNTER - y0) / Math.cos(a);
  const dl = reach(L[1]), dr = reach(R[1]);
  const L2 = [L[0] - Math.sin(a) * dl - dl * 0.3, COUNTER], R2 = [R[0] - Math.sin(a) * dr + dr * 0.3, COUNTER];
  return {
    defs: `<linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${f(M[0])}" y1="${f(M[1])}" x2="${f(M[0] - 120)}" y2="${COUNTER}"><stop offset="0" stop-color="#ffe0a0" stop-opacity=".3"/><stop offset="1" stop-color="#ffe0a0" stop-opacity=".04"/></linearGradient>`,
    body: `<path d="M${f(L[0])} ${f(L[1])} L${f(R[0])} ${f(R[1])} L${f(R2[0])} ${f(R2[1])} L${f(L2[0])} ${f(L2[1])} Z" fill="url(#${g})"/>
      <g transform="rotate(${LAMP.tilt} ${LAMP.head[0]} ${LAMP.head[1]})"><ellipse cx="${LAMP.head[0]}" cy="${LAMP.head[1] + 18}" rx="31" ry="4.5" fill="#fff4d6"/></g>
      <circle cx="${f(M[0])}" cy="${f(M[1] + 6)}" r="22" fill="#fff0c8" opacity=".25"/>`,
  };
}

function shadowPass(dusk, rainy) {
  const g = uid("rc-vig");
  const base = dusk ? 0.42 : rainy ? 0.2 : 0.06;
  return {
    defs: `<radialGradient id="${g}" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#1a0f18" stop-opacity="0"/><stop offset=".6" stop-color="#1a0f18" stop-opacity=".12"/><stop offset="1" stop-color="#1a0f18" stop-opacity=".55"/></radialGradient>`,
    body: `<rect width="${W}" height="${H}" fill="${dusk ? "#140d22" : "#1c1a26"}" opacity="${base}"/><rect width="${W}" height="${H}" fill="url(#${g})"/>`,
  };
}

function sunShaft() {
  // Afternoon sun through the front window, falling across the floor.
  const g = uid("rc-shaft");
  const { x, y, w, h } = WIN;
  return {
    defs: `<linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${x + w / 2}" y1="${y + 120}" x2="${x + w / 2 + 380}" y2="${H}"><stop offset="0" stop-color="#fff1c8" stop-opacity=".16"/><stop offset="1" stop-color="#fff1c8" stop-opacity="0"/></linearGradient>`,
    body: `<path d="M${x + 30} ${y + 100} L${x + w} ${y + 100} L${x + w + 560} ${H} H${x + 280} Z" fill="url(#${g})"/>
      <path d="M${x + 80} ${y + 100} L${x + w - 40} ${y + 100} L${x + w + 440} ${H} H${x + 360} Z" fill="url(#${g})"/>`,
  };
}
