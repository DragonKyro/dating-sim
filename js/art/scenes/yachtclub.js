// The Saltwick Yacht Club terrace on the night of the Commodore's Ball:
// string lights overhead, a white balustrade, candle lanterns on the tables,
// the harbor full of moored boats beyond and the clubhouse windows glowing
// with the party inside.
import {
  W, H, sky, sunDisc, moon, stars, cloudBand, ridge, sea, gulls, glow, stringLights,
  linearV, rng, uid, shade, tint, mix,
} from "../kit.js";

const f = (n) => Math.round(n * 10) / 10;
const WARM = "#ffd58a";
const CANDLE = "#ffc970";

export function yachtclub({ pal, time }) {
  const parts = [];
  const night = pal.stars ?? 0;          // 0.3 at dusk, 1 at night
  const isNight = night >= 0.9;
  const horizon = 470;

  parts.push(sky(pal));
  if (night) parts.push(`<g opacity="${night}">${stars(Math.round(25 + 75 * night), 52, 380)}</g>`);
  const lx = isNight ? 1330 : 1250, ly = isNight ? 112 : 418;
  parts.push(isNight ? moon(lx, ly, 28) : sunDisc(pal, lx, ly, 46));
  parts.push(cloudBand(pal, { seed: 6, y0: 40, y1: 250, count: 5, speed: 230, opacity: isNight ? 0.28 : 0.7 }));

  // The far shore across the harbor, a few houses lighting up.
  parts.push(ridge({ y: horizon - 30, amp: 20, color: mix(pal.far, pal.sky[0], 0.45), seed: 5, x0: 240, x1: 1150, bottom: horizon + 2, steps: 12 }));
  parts.push(ridge({ y: horizon - 14, amp: 14, color: mix(pal.far, pal.sky[0], 0.18), seed: 8, x0: 760, x1: 1720, bottom: horizon + 2, steps: 10 }));
  parts.push(shoreLights(pal, horizon, night));

  const glint = isNight ? "#f4f1dc" : pal.sun;
  parts.push(sea(pal, { top: horizon, bottom: 700, seed: 14, glint, glints: 30, glintOpacity: 0.4 }));
  parts.push(lightPath(glint, lx, horizon, isNight ? 0.32 : 0.55));
  parts.push(boats(pal, night));
  if (!isNight) parts.push(gulls(3, { seed: 15, y0: 150, y1: 320, color: shade(pal.ink, 0.1) }));

  // The terrace: clubhouse on the left, flagpole on the right, lights between.
  parts.push(clubhouse(pal, night));
  parts.push(flagpole(pal, night, 1540));
  const wire = shade(pal.ink, 0.25);
  parts.push(wash(pal, night));
  parts.push(stringLights(318, 74, 1536, 104, 52, { count: 24, color: WARM, wire, seed: 3 }));
  parts.push(stringLights(318, 190, 800, -10, 40, { count: 11, color: WARM, wire, seed: 5 }));
  parts.push(stringLights(1536, 176, 1090, -10, 40, { count: 10, color: WARM, wire, seed: 7 }));
  parts.push(balustrade(pal, night));
  parts.push(deck(pal, night));
  parts.push(planter(pal, night, 350, 700));
  parts.push(table(pal, night, 452, 600, 66, 11));
  parts.push(table(pal, night, 1170, 604, 64, 12));
  parts.push(sideTable(pal, night, 1436, 616));
  return parts;
}

// ---- sky & water -----------------------------------------------------------------

function shoreLights(pal, horizon, night) {
  const r = rng(81);
  let out = "";
  const n = Math.round(6 + 16 * night);
  for (let i = 0; i < n; i++) {
    const x = 300 + r() * 1300, y = horizon - 4 - r() * 12;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.2 + r() * 1.2)}" fill="${WARM}" class="a-twinkle-soft" style="animation-delay:-${f(r() * 4)}s"/>`;
  }
  return `<g opacity="${f(0.5 + 0.5 * night)}">${out}</g>`;
}

function lightPath(color, x, horizon, op) {
  const r = rng(43);
  let out = "";
  for (let i = 0; i < 18; i++) {
    const t = i / 18, y = horizon + 6 + t * t * 200, w = 26 + t * 120 + r() * 30;
    out += `<path d="M${f(x - w / 2 + (r() - 0.5) * 30)} ${f(y)} h${f(w)}" stroke="${color}" stroke-width="${f(2 + t * 3)}" stroke-linecap="round" opacity="${f(op - t * 0.15)}" class="a-wave" style="animation-delay:-${f(r() * 5)}s"/>`;
  }
  return out;
}

function boats(pal, night) {
  const list = [
    { x: 600, y: 492, s: 0.34, far: 0.5, cover: "#2f5d8a" },
    { x: 1460, y: 496, s: 0.4, far: 0.45, cover: "#7a3b3b" },
    { x: 1050, y: 506, s: 0.46, far: 0.35, cover: "#2f5d8a" },
    { x: 486, y: 524, s: 0.62, far: 0.16, cover: "#3b5d4a" },
    { x: 1250, y: 530, s: 0.72, far: 0.12, cover: "#2f5d8a", cabinLight: true },
  ];
  return list.map((b, i) => sailboat(pal, night, { ...b, seed: 60 + i })).join("");
}

/** A moored sloop, sails furled: white hull, thin mast, stays, a reflection. */
function sailboat(pal, night, { x, y, s, far, cover, seed, cabinLight = false }) {
  const r = rng(seed);
  const base = mix("#f4f1ea", pal.sky[1], 0.1 + 0.45 * night);
  const hull = mix(base, pal.sky[0], far);
  const under = shade(hull, 0.22);
  const spar = mix(shade(base, 0.35), pal.sky[0], far * 0.7);
  const stripe = mix("#2a3f66", pal.sky[0], far);
  const L = 120 * s, h = 15 * s, mh = (190 + r() * 40) * s;
  const sx = x - L / 2, bx = x + L / 2, deckY = y - h, mx = x + L * 0.06;
  const mw = Math.max(1.4, 3 * s);
  let boat = "";
  boat += `<path d="M${f(mx)} ${f(deckY - mh)} L${f(bx + 5 * s)} ${f(deckY - 5 * s)} M${f(mx)} ${f(deckY - mh)} L${f(sx + 2 * s)} ${f(deckY)}" stroke="${spar}" stroke-width="1" opacity=".55"/>`;
  boat += `<rect x="${f(mx - mw / 2)}" y="${f(deckY - mh)}" width="${f(mw)}" height="${f(mh)}" fill="${spar}"/>`;
  boat += `<path d="M${f(mx)} ${f(deckY - 22 * s)} L${f(sx + 10 * s)} ${f(deckY - 18 * s)}" stroke="${spar}" stroke-width="${f(Math.max(1.2, 2.4 * s))}"/>`;
  boat += `<rect x="${f(sx + 12 * s)}" y="${f(deckY - 29 * s)}" width="${f(mx - sx - 12 * s)}" height="${f(8 * s)}" rx="${f(4 * s)}" fill="${mix(cover, pal.sky[0], far + 0.25 * night)}"/>`;
  boat += `<rect x="${f(x - L * 0.24)}" y="${f(deckY - 8 * s)}" width="${f(L * 0.34)}" height="${f(9 * s)}" rx="${f(3 * s)}" fill="${hull}"/>`;
  const port = cabinLight && night > 0.2 ? WARM : shade(hull, 0.45);
  boat += `<rect x="${f(x - L * 0.18)}" y="${f(deckY - 5.5 * s)}" width="${f(6 * s)}" height="${f(3 * s)}" rx="1" fill="${port}"/><rect x="${f(x - L * 0.06)}" y="${f(deckY - 5.5 * s)}" width="${f(6 * s)}" height="${f(3 * s)}" rx="1" fill="${port}"/>`;
  boat += `<path d="M${f(sx)} ${f(deckY)} L${f(bx + 6 * s)} ${f(deckY - 5 * s)} Q${f(bx - 4 * s)} ${f(y)} ${f(bx - 20 * s)} ${f(y + 2 * s)} L${f(sx + 8 * s)} ${f(y + 2 * s)} Z" fill="${hull}"/>`;
  boat += `<path d="M${f(sx + 4 * s)} ${f(y - 4 * s)} L${f(bx - 13 * s)} ${f(y - 4 * s)} L${f(bx - 20 * s)} ${f(y + 2 * s)} L${f(sx + 8 * s)} ${f(y + 2 * s)} Z" fill="${under}"/>`;
  boat += `<path d="M${f(sx + 3 * s)} ${f(y - 5 * s)} L${f(bx - 11 * s)} ${f(y - 5 * s)}" stroke="${stripe}" stroke-width="${f(2.2 * s)}"/>`;
  if (night > 0.5) {
    boat += `<g class="a-twinkle-soft" style="animation-delay:-${f(r() * 3)}s"><circle cx="${f(mx)}" cy="${f(deckY - mh - 2)}" r="${f(9 * s + 4)}" fill="#fff6dc" opacity=".22"/><circle cx="${f(mx)}" cy="${f(deckY - mh - 2)}" r="${f(Math.max(1.4, 2.4 * s))}" fill="#fff6dc"/></g>`;
  }
  const dur = 4.5 + r() * 3, delay = r() * dur;
  const refl = `<g opacity=".26"><g class="a-wave" style="animation-duration:${f(dur + 1)}s;animation-delay:-${f(delay)}s">
    <path d="M${f(sx + 8 * s)} ${f(y + 4)} L${f(bx - 20 * s)} ${f(y + 4)} L${f(bx - 26 * s)} ${f(y + 4 + h)} L${f(sx + 14 * s)} ${f(y + 4 + h)} Z" fill="${hull}"/>
    <path d="M${f(mx)} ${f(y + 6)} V${f(Math.min(700, y + mh * 0.6))}" stroke="${spar}" stroke-width="${f(mw)}" stroke-dasharray="7 5"/>
  </g></g>`;
  return `${refl}<g class="a-bob" style="animation-duration:${f(dur)}s;animation-delay:-${f(delay)}s">${boat}</g>`;
}

// ---- the clubhouse ---------------------------------------------------------------

function clubhouse(pal, night) {
  const wall = mix("#efe8dc", pal.sky[1], 0.1 + 0.42 * night);
  const wallSh = shade(wall, 0.16);
  const trim = tint(wall, 0.4);
  const roof = shade(mix("#4a4f5c", pal.mid, 0.45), 0.2);
  const shutter = mix("#2c4a5a", pal.mid, 0.25 + 0.3 * night);
  const gw = uid("ycwin");
  let defs = linearV(gw, ["#f09a5a", "#f7bd78", "#ffe2a8"]);
  let out = "";
  out += `<rect x="-10" y="0" width="344" height="40" fill="${roof}"/>`;
  out += `<rect x="-10" y="40" width="344" height="22" fill="${trim}"/><rect x="-10" y="60" width="344" height="9" fill="${shade(wall, 0.35)}" opacity=".7"/>`;
  out += `<rect x="-10" y="68" width="336" height="640" fill="${wall}"/>`;
  let lines = "";
  for (let y = 92; y < 700; y += 20) lines += `M-10 ${y} H326 `;
  out += `<path d="${lines}" stroke="${wallSh}" stroke-width="2.5" opacity=".6"/>`;
  out += `<rect x="310" y="68" width="20" height="640" fill="${trim}"/><rect x="325" y="68" width="5" height="640" fill="${shade(trim, 0.25)}"/>`;

  // Sign board.
  out += `<rect x="28" y="92" width="268" height="44" rx="3" fill="${mix("#22304c", pal.mid, 0.3)}"/>
    <rect x="34" y="98" width="256" height="32" rx="2" fill="none" stroke="${mix("#d9b45a", pal.mid, 0.25)}" stroke-width="1.5" opacity=".7"/>
    <text x="162" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="15" font-weight="700" fill="${mix("#e8c77a", pal.mid, 0.15)}" letter-spacing="2.2">SALTWICK YACHT CLUB</text>`;

  // Window glow spilling out onto the wall and terrace.
  const spill = [glow(80, 380, 230, CANDLE, 0.22 + 0.2 * night), glow(232, 380, 230, CANDLE, 0.22 + 0.2 * night)];
  defs += spill.map((g) => g.defs).join("");
  out += spill.map((g) => g.body).join("");

  const wins = [{ x: 36, w: 86 }, { x: 190, w: 86 }];
  const y0 = 172, y1 = 562;
  wins.forEach((wn, i) => {
    const d = arch(wn.x, y0, wn.w, y1);
    const clip = uid("ycclip");
    defs += `<clipPath id="${clip}"><path d="${d}"/></clipPath>`;
    out += `<rect x="${wn.x - 28}" y="${y0 + 26}" width="22" height="${y1 - y0 - 26}" fill="${shutter}"/><rect x="${wn.x + wn.w + 6}" y="${y0 + 26}" width="22" height="${y1 - y0 - 26}" fill="${shutter}"/>`;
    let louv = "";
    for (let y = y0 + 36; y < y1 - 6; y += 12) louv += `M${wn.x - 26} ${y} h18 M${wn.x + wn.w + 8} ${y} h18 `;
    out += `<path d="${louv}" stroke="${shade(shutter, 0.3)}" stroke-width="2" opacity=".7"/>`;
    out += `<path d="M${wn.x - 7} ${y1 + 4} V${y0 + wn.w / 2} A${wn.w / 2 + 7} ${wn.w / 2 + 7} 0 0 1 ${wn.x + wn.w + 7} ${y0 + wn.w / 2} V${y1 + 4} Z" fill="${trim}"/>`;
    out += `<path d="${d}" fill="url(#${gw})"/>`;
    out += `<g clip-path="url(#${clip})">${partyInside(pal, wn.x, wn.w, y0, y1, i)}</g>`;
    // Muntins.
    const cx = wn.x + wn.w / 2;
    let m = `M${cx} ${y0} V${y1} M${wn.x} ${y0 + wn.w / 2} H${wn.x + wn.w} `;
    for (let y = y0 + wn.w / 2 + 84; y < y1 - 20; y += 84) m += `M${wn.x} ${y} H${wn.x + wn.w} `;
    m += `M${cx} ${y0 + wn.w / 2} L${wn.x + 10} ${y0 + 18} M${cx} ${y0 + wn.w / 2} L${wn.x + wn.w - 10} ${y0 + 18}`;
    out += `<path d="${m}" stroke="${trim}" stroke-width="4" fill="none"/>`;
    out += `<rect x="${wn.x - 12}" y="${y1}" width="${wn.w + 24}" height="10" fill="${trim}"/><rect x="${wn.x - 12}" y="${y1 + 8}" width="${wn.w + 24}" height="4" fill="${shade(trim, 0.3)}"/>`;
  });

  // Brass sconce between the windows.
  const sc = glow(156, 300, 60, CANDLE, 0.55, "a-flicker");
  defs += sc.defs;
  out += `${sc.body}<rect x="150" y="308" width="12" height="20" rx="2" fill="${mix("#b8893f", pal.mid, 0.2)}"/>
    <path d="M146 306 L166 306 L162 286 L150 286 Z" fill="#ffe7b0" opacity=".9"/><path d="M148 286 L164 286 L156 278 Z" fill="${mix("#8a6630", pal.mid, 0.2)}"/>`;
  return { defs, body: `<g>${out}</g>` };
}

function arch(x, y0, w, y1) {
  return `M${x} ${y1} V${y0 + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y0 + w / 2} V${y1} Z`;
}

/** Guests in silhouette against the warm room: heads, shoulders, a glass. */
function partyInside(pal, x, w, y0, y1, i) {
  const ink = mix(pal.ink, "#5a2f2a", 0.4);
  let out = `<circle cx="${x + w * 0.5}" cy="${y0 + 40}" r="${w * 0.7}" fill="#fff4d6" opacity=".55"/>`;
  out += `<circle cx="${x + w * 0.5}" cy="${y0 + 52}" r="5" fill="#fffbe8"/>`;
  out += `<path d="M${x} ${y1 - 120} H${x + w} V${y1} H${x} Z" fill="${shade("#d98a52", 0.1)}" opacity=".35"/>`;
  if (i === 0) {
    out += `<g fill="${ink}" opacity=".8">${person(x + 26, 318, 1.05, "woman")}${person(x + 70, 300, 1.15, "man")}
      <path d="M${x + 44} 332 l4 -18 M${x + 44} 314 l-3 -1 l2 -14 h6 l2 14 l-3 1" stroke="${ink}" stroke-width="2" fill="none"/></g>`;
  } else {
    out += `<g fill="${ink}" opacity=".8"><g class="a-sway" style="animation-duration:5s;transform-origin:center bottom">${person(x + 34, 304, 1.15, "man")}${person(x + 54, 316, 1.0, "woman")}</g>${person(x + 4, 340, 0.9, "man")}</g>`;
  }
  return out;
}

function person(x, y, s, kind) {
  const sw = kind === "man" ? 24 : 18;
  let d = `<circle cx="${x}" cy="${y}" r="${f(11 * s)}"/>`;
  d += `<path d="M${f(x - sw * s)} ${f(y + 140 * s)} Q${f(x - sw * s - 2)} ${f(y + 24 * s)} ${f(x - 6 * s)} ${f(y + 18 * s)} L${f(x + 6 * s)} ${f(y + 18 * s)} Q${f(x + sw * s + 2)} ${f(y + 24 * s)} ${f(x + sw * s)} ${f(y + 140 * s)} Z"/>`;
  d += `<rect x="${f(x - 4 * s)}" y="${f(y + 8 * s)}" width="${f(8 * s)}" height="${f(12 * s)}"/>`;
  if (kind === "woman") d += `<circle cx="${f(x + 4 * s)}" cy="${f(y - 11 * s)}" r="${f(6 * s)}"/>`;
  return d;
}

function flagpole(pal, night, x) {
  const white = mix("#f4f1ea", pal.sky[1], 0.12 + 0.45 * night);
  return `<g>
    <rect x="${x - 4}" y="58" width="8" height="${560 - 58}" fill="${white}"/>
    <rect x="${x + 1}" y="58" width="3" height="${560 - 58}" fill="${shade(white, 0.3)}" opacity=".6"/>
    <circle cx="${x}" cy="54" r="7" fill="${mix("#d9b45a", pal.sky[1], 0.35 * night)}"/>
    <path d="M${x - 4} 66 v40" stroke="${shade(white, 0.3)}" stroke-width="1.5"/>
    <g class="a-sway" style="animation-duration:2.6s;transform-origin:right center">
      <path d="M${x - 4} 66 L${x - 96} 86 L${x - 4} 106 Z" fill="${mix("#c6534a", pal.mid, 0.25 * night)}"/>
      <path d="M${x - 4} 80 L${x - 60} 86 L${x - 4} 92 Z" fill="${mix("#f4f1ea", pal.mid, 0.3 * night)}"/>
      <circle cx="${x - 28}" cy="86" r="5" fill="${mix("#22304c", pal.mid, 0.2)}"/>
    </g>
  </g>`;
}

/** A broad warm wash under the string lights. */
function wash(pal, night) {
  const g = uid("ycwash");
  return {
    defs: `<radialGradient id="${g}"><stop offset="0" stop-color="${WARM}" stop-opacity="${f(0.1 + 0.14 * night)}"/><stop offset="1" stop-color="${WARM}" stop-opacity="0"/></radialGradient>`,
    body: `<ellipse cx="900" cy="150" rx="820" ry="260" fill="url(#${g})"/>`,
  };
}

// ---- the terrace -----------------------------------------------------------------

function balustrade(pal, night) {
  const white = mix(mix("#f4f1ea", pal.sky[1], 0.1 + 0.42 * night), WARM, 0.12);
  const sh = shade(white, 0.22);
  const id = uid("ycbal");
  const top = 574, bot = 668;
  const shape = "M-5 0 H5 V5 C5 12 2 16 3 24 C4 34 10 48 10 62 C10 74 6 80 6 86 L8 88 V94 H-8 V88 L-6 86 C-6 80 -10 74 -10 62 C-10 48 -4 34 -3 24 C-2 16 -5 12 -5 5 Z";
  const half = "M1.5 0 H5 V5 C5 12 2 16 3 24 C4 34 10 48 10 62 C10 74 6 80 6 86 L8 88 V94 H1.5 Z";
  const defs = `<g id="${id}"><path d="${shape}" fill="${white}"/><path d="${half}" fill="${sh}" opacity=".75"/></g>`;
  let body = "";
  for (let x = 344; x < W + 20; x += 30) body += `<use href="#${id}" x="${x}" y="${top}"/>`;
  body += `<rect x="320" y="${bot}" width="${W - 320}" height="16" fill="${white}"/><rect x="320" y="${bot + 11}" width="${W - 320}" height="5" fill="${sh}"/>`;
  body += `<rect x="320" y="556" width="${W - 320}" height="20" rx="4" fill="${white}"/><rect x="320" y="570" width="${W - 320}" height="7" fill="${sh}"/>`;
  body += `<rect x="320" y="555" width="${W - 320}" height="3" fill="${tint(white, 0.4)}" opacity=".7"/>`;
  for (const x of [336, 690, 1050, 1400]) {
    body += `<rect x="${x - 17}" y="552" width="34" height="132" fill="${white}"/><rect x="${x + 7}" y="552" width="10" height="132" fill="${sh}"/>`;
    body += `<rect x="${x - 22}" y="544" width="44" height="12" rx="2" fill="${tint(white, 0.15)}"/><rect x="${x - 22}" y="552" width="44" height="4" fill="${sh}" opacity=".7"/>`;
  }
  return { defs, body };
}

function deck(pal, night) {
  const wood = shade(mix("#b98a5e", pal.light, 0.2), 0.08 + 0.32 * night);
  const dark = shade(wood, 0.32);
  const y0 = 684;
  const gid = uid("ycdeck");
  let d = "";
  for (let xb = -900; xb <= 2500; xb += 84) {
    const xt = 800 + (xb - 800) * ((y0 - 470) / (H - 470));
    d += `M${f(xt)} ${y0} L${xb} ${H} `;
  }
  const pools = [pool(452, 700, 260, 70, CANDLE, 0.25 + 0.2 * night), pool(1170, 704, 250, 66, CANDLE, 0.25 + 0.2 * night), pool(160, 720, 260, 80, CANDLE, 0.2 + 0.15 * night)];
  return {
    defs: linearV(gid, [shade(wood, 0.18), wood, tint(wood, 0.06)]) + pools.map((p) => p.defs).join(""),
    body: `<rect x="0" y="${y0}" width="${W}" height="${H - y0}" fill="url(#${gid})"/><path d="${d}" stroke="${dark}" stroke-width="2" opacity=".4"/>
      <rect x="0" y="${y0 - 2}" width="${W}" height="6" fill="${shade(wood, 0.45)}" opacity=".8"/>${pools.map((p) => p.body).join("")}`,
  };
}

function pool(x, y, rx, ry, color, op) {
  const g = uid("ycpool");
  return {
    defs: `<radialGradient id="${g}"><stop offset="0" stop-color="${color}" stop-opacity="${f(op)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`,
    body: `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#${g})"/>`,
  };
}

/** A stone urn of island hydrangeas where the clubhouse meets the rail. */
function planter(pal, night, x, base) {
  const stone = mix(mix("#e9e3d6", pal.sky[1], 0.12 + 0.42 * night), WARM, 0.1);
  const leaf = mix("#3f6b4a", pal.mid, 0.25 + 0.35 * night);
  const blooms = ["#7f93da", "#a28bd4", "#6c86cf", "#b9a6e6", "#8ea6e8"].map((c) => mix(c, pal.mid, 0.15 + 0.4 * night));
  const r = rng(91);
  let bush = "";
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI, cx = x + Math.cos(a) * 52 * (0.5 + r() * 0.6), cy = base - 120 - Math.sin(a) * 40 + r() * 16;
    bush += `<circle cx="${f(cx)}" cy="${f(cy + 14)}" r="${f(16 + r() * 8)}" fill="${leaf}"/>`;
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI, cx = x + Math.cos(a) * 46 * (0.4 + r() * 0.6), cy = base - 128 - Math.sin(a) * 36 + r() * 14;
    const c = blooms[Math.floor(r() * blooms.length)];
    bush += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(13 + r() * 7)}" fill="${c}"/><circle cx="${f(cx - 4)}" cy="${f(cy - 4)}" r="${f(5 + r() * 3)}" fill="${tint(c, 0.25)}" opacity=".7"/>`;
  }
  return `<g>${bush}
    <path d="M${x - 46} ${base - 104} H${x + 46} L${x + 38} ${base - 70} Q${x + 30} ${base - 46} ${x + 16} ${base - 40} L${x + 22} ${base} H${x - 22} L${x - 16} ${base - 40} Q${x - 30} ${base - 46} ${x - 38} ${base - 70} Z" fill="${stone}"/>
    <path d="M${x + 10} ${base - 104} H${x + 46} L${x + 38} ${base - 70} Q${x + 30} ${base - 46} ${x + 16} ${base - 40} L${x + 22} ${base} H${x + 8} Z" fill="${shade(stone, 0.2)}" opacity=".8"/>
    <rect x="${x - 50}" y="${base - 112}" width="100" height="12" rx="3" fill="${tint(stone, 0.15)}"/>
  </g>`;
}

/** A hurricane lantern: brass base, glass chimney, flickering candle. */
function lantern(x, y, s = 1) {
  const brass = "#b8893f";
  return `<g>
    <rect x="${f(x - 15 * s)}" y="${f(y - 9 * s)}" width="${f(30 * s)}" height="${f(9 * s)}" rx="2" fill="${brass}"/>
    <rect x="${f(x - 15 * s)}" y="${f(y - 9 * s)}" width="${f(30 * s)}" height="${f(3 * s)}" fill="${tint(brass, 0.35)}"/>
    <rect x="${f(x - 4 * s)}" y="${f(y - 34 * s)}" width="${f(8 * s)}" height="${f(25 * s)}" rx="1.5" fill="#fbf1dc"/>
    <g class="a-flicker"><path d="M${f(x)} ${f(y - 50 * s)} Q${f(x + 6 * s)} ${f(y - 40 * s)} ${f(x)} ${f(y - 35 * s)} Q${f(x - 6 * s)} ${f(y - 40 * s)} ${f(x)} ${f(y - 50 * s)} Z" fill="#ffc45e"/>
      <path d="M${f(x)} ${f(y - 45 * s)} Q${f(x + 3 * s)} ${f(y - 39 * s)} ${f(x)} ${f(y - 36 * s)} Q${f(x - 3 * s)} ${f(y - 39 * s)} ${f(x)} ${f(y - 45 * s)} Z" fill="#fff6dc"/></g>
    <path d="M${f(x - 11 * s)} ${f(y - 9 * s)} C${f(x - 20 * s)} ${f(y - 30 * s)} ${f(x - 19 * s)} ${f(y - 52 * s)} ${f(x - 9 * s)} ${f(y - 68 * s)} L${f(x + 9 * s)} ${f(y - 68 * s)} C${f(x + 19 * s)} ${f(y - 52 * s)} ${f(x + 20 * s)} ${f(y - 30 * s)} ${f(x + 11 * s)} ${f(y - 9 * s)} Z" fill="#fff3d6" opacity=".28"/>
    <path d="M${f(x - 12 * s)} ${f(y - 20 * s)} C${f(x - 17 * s)} ${f(y - 36 * s)} ${f(x - 16 * s)} ${f(y - 50 * s)} ${f(x - 9 * s)} ${f(y - 62 * s)}" stroke="#fffbe8" stroke-width="${f(2 * s)}" fill="none" opacity=".55" stroke-linecap="round"/>
    <rect x="${f(x - 11 * s)}" y="${f(y - 74 * s)}" width="${f(22 * s)}" height="${f(7 * s)}" rx="2" fill="${brass}"/>
    <path d="M${f(x - 6 * s)} ${f(y - 74 * s)} q${f(6 * s)} ${f(-10 * s)} ${f(12 * s)} 0" stroke="${shade(brass, 0.2)}" stroke-width="${f(2 * s)}" fill="none"/>
  </g>`;
}

/** Cocktail table under a floor-length cloth, lantern on top. */
/** A cocktail high-top in a fitted cloth, cinched with a navy sash and bow. */
function drape(pal, night, x, y, r, seed) {
  const cloth = mix(mix("#f6f1e8", pal.sky[1], 0.08 + 0.38 * night), WARM, 0.18);
  const sh = shade(cloth, 0.2);
  const sash = mix("#263a63", pal.mid, 0.2 + 0.2 * night);
  const bottom = 800, wy = y + 92, wr = r * 0.4, br = r * 0.78;
  const rr = rng(seed);
  const side = (k) => `C${f(x + k * r)} ${y + 40} ${f(x + k * wr)} ${y + 58} ${f(x + k * wr)} ${wy} C${f(x + k * wr)} ${y + 132} ${f(x + k * br * 0.95)} ${y + 168} ${f(x + k * br)} ${bottom}`;
  let folds = "";
  for (let i = 0; i < 4; i++) {
    const t = -0.6 + i * 0.4 + (rr() - 0.5) * 0.1;
    folds += `M${f(x + t * r)} ${y + 12} Q${f(x + t * wr * 1.3)} ${y + 60} ${f(x + t * wr)} ${wy - 8} M${f(x + t * wr)} ${wy + 10} Q${f(x + t * br * 0.8)} ${y + 150} ${f(x + t * br)} ${bottom} `;
  }
  return `<g>
    <path d="M${x - r} ${y} ${side(-1)} H${f(x + br)} C${f(x + br * 0.95)} ${y + 168} ${f(x + wr)} ${y + 132} ${f(x + wr)} ${wy} C${f(x + wr)} ${y + 58} ${f(x + r)} ${y + 40} ${x + r} ${y} Z" fill="${cloth}"/>
    <path d="M${f(x + wr * 0.2)} ${wy} C${f(x + wr * 0.3)} ${y + 140} ${f(x + br * 0.3)} ${y + 170} ${f(x + br * 0.35)} ${bottom} H${f(x + br)} C${f(x + br * 0.95)} ${y + 168} ${f(x + wr)} ${y + 132} ${f(x + wr)} ${wy} Z" fill="${sh}" opacity=".7"/>
    <path d="M${f(x + r * 0.3)} ${y + 6} C${f(x + r * 0.32)} ${y + 40} ${f(x + wr * 0.3)} ${y + 60} ${f(x + wr * 0.2)} ${wy} H${f(x + wr)} C${f(x + wr)} ${y + 58} ${f(x + r)} ${y + 40} ${x + r} ${y} Z" fill="${sh}" opacity=".6"/>
    <path d="${folds}" stroke="${sh}" stroke-width="2" fill="none" opacity=".5"/>
    <rect x="${f(x - wr - 2)}" y="${wy - 8}" width="${f(wr * 2 + 4)}" height="14" rx="3" fill="${sash}"/>
    <path d="M${x - 4} ${wy - 1} L${x - 22} ${wy - 12} L${x - 20} ${wy + 10} Z M${x + 4} ${wy - 1} L${x + 22} ${wy - 12} L${x + 20} ${wy + 10} Z" fill="${sash}"/>
    <path d="M${x - 3} ${wy + 2} L${x - 12} ${wy + 34} L${x - 4} ${wy + 30} Z M${x + 3} ${wy + 2} L${x + 10} ${wy + 36} L${x + 2} ${wy + 30} Z" fill="${shade(sash, 0.15)}"/>
    <circle cx="${x}" cy="${wy - 1}" r="5" fill="${tint(sash, 0.15)}"/>
    <ellipse cx="${x}" cy="${y}" rx="${r}" ry="${f(r * 0.2)}" fill="${tint(cloth, 0.22)}"/>
  </g>`;
}

function flute(fx, y, s = 1) {
  const p = (dx, dy) => `${f(fx + dx * s)} ${f(y + dy * s)}`;
  return `<path d="M${p(-6, -64)} L${p(6, -64)} L${p(5, -38)} Q${p(0, -32)} ${p(-5, -38)} Z" fill="#f4f1e8" opacity=".35"/>
    <path d="M${p(-5.5, -54)} L${p(5.5, -54)} L${p(5, -38)} Q${p(0, -32)} ${p(-5, -38)} Z" fill="#f3d27a" opacity=".85"/>
    <circle cx="${f(fx - s)}" cy="${f(y - 46 * s)}" r="1" fill="#fff8e0"/><circle cx="${f(fx + 2 * s)}" cy="${f(y - 41 * s)}" r=".8" fill="#fff8e0"/>
    <path d="M${p(0, -34)} V${f(y - 3 * s)}" stroke="#f4f1e8" stroke-width="${f(1.6 * s)}" opacity=".7"/>
    <ellipse cx="${fx}" cy="${f(y - 2 * s)}" rx="${f(7 * s)}" ry="${f(2 * s)}" fill="#f4f1e8" opacity=".7"/>`;
}

function table(pal, night, x, y, r, seed) {
  const g = glow(x - 10, y - 56, 170, CANDLE, 0.35 + 0.25 * night, "a-flicker");
  return {
    defs: g.defs,
    body: `${g.body}${drape(pal, night, x, y, r, seed)}${lantern(x - 12, y + 2, 1.45)}${flute(x + 30, y + 1, 1.1)}`,
  };
}

/** Side table with the champagne on ice and two flutes. */
function sideTable(pal, night, x, y) {
  const silver = mix(mix("#cfd4da", pal.sky[1], 0.15 + 0.3 * night), WARM, 0.15);
  const silverSh = shade(silver, 0.3);
  const bottle = "#1f3b2b";
  const g = glow(x, y - 70, 150, WARM, 0.2 + 0.14 * night);
  return {
    defs: g.defs,
    body: `${g.body}${drape(pal, night, x, y, 58, 13)}<g transform="translate(${x} ${y}) scale(1.3) translate(${-x} ${-y})">
      <g transform="rotate(-16 ${x - 4} ${y - 30})">
        <rect x="${x - 15}" y="${y - 84}" width="22" height="70" rx="6" fill="${bottle}"/>
        <path d="M${x - 15} ${y - 76} Q${x - 15} ${y - 96} ${x - 7} ${y - 100} L${x - 1} ${y - 100} Q${x + 7} ${y - 96} ${x + 7} ${y - 76} Z" fill="${bottle}"/>
        <rect x="${x - 8}" y="${y - 128}" width="8" height="32" fill="${bottle}"/>
        <rect x="${x - 9}" y="${y - 134}" width="10" height="22" rx="2" fill="#d6b25e"/>
        <rect x="${x - 9}" y="${y - 118}" width="10" height="3" fill="${shade("#d6b25e", 0.25)}"/>
        <rect x="${x - 12}" y="${y - 80}" width="3" height="60" rx="1.5" fill="#5f8a6b" opacity=".6"/>
        <rect x="${x - 6}" y="${y - 126}" width="1.6" height="12" fill="#fff3c0" opacity=".7"/>
      </g>
      <path d="M${x - 24} ${y - 58} L${x - 19} ${y - 66} L${x - 12} ${y - 60} Z M${x + 8} ${y - 60} L${x + 14} ${y - 68} L${x + 20} ${y - 59} Z" fill="#e4f1f7" opacity=".9"/>
      <path d="M${x - 28} ${y - 60} L${x + 28} ${y - 60} L${x + 21} ${y - 2} L${x - 21} ${y - 2} Z" fill="${silver}"/>
      <path d="M${x + 6} ${y - 60} L${x + 28} ${y - 60} L${x + 21} ${y - 2} L${x + 4} ${y - 2} Z" fill="${silverSh}" opacity=".6"/>
      <path d="M${x - 18} ${y - 56} L${x - 15} ${y - 6}" stroke="#ffffff" stroke-width="4" opacity=".45" stroke-linecap="round"/>
      <rect x="${x - 31}" y="${y - 64}" width="62" height="8" rx="3" fill="${tint(silver, 0.2)}"/>
      <rect x="${x - 23}" y="${y - 10}" width="46" height="6" rx="2" fill="${silverSh}"/>
      <circle cx="${x - 30}" cy="${y - 44}" r="5" fill="none" stroke="${silverSh}" stroke-width="2.4"/><circle cx="${x + 30}" cy="${y - 44}" r="5" fill="none" stroke="${silverSh}" stroke-width="2.4"/>
      <path d="M${x + 4} ${y - 64} Q${x + 22} ${y - 70} ${x + 32} ${y - 60} L${x + 30} ${y - 26} Q${x + 24} ${y - 22} ${x + 20} ${y - 30} Q${x + 18} ${y - 46} ${x + 8} ${y - 56} Z" fill="#fbf8f2"/>
      <path d="M${x + 22} ${y - 58} L${x + 30} ${y - 26}" stroke="${shade("#fbf8f2", 0.15)}" stroke-width="2" opacity=".7"/>
      ${flute(x + 40, y)}${flute(x - 38, y)}
    </g>`,
  };
}
