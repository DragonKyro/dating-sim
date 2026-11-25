// The lamp room at the top of the decommissioned North Light, secretly the
// booth for Low Tide FM (88.1). A ring of tall glass panes with iron mullions
// curving round the room, the old Fresnel lens at the center, Noor's desk of
// radio gear on the left, records and a speaker on the right.
//   storm - night; wind and rain lashing the glass, lightning, the sea far below.
//   night - calm; stars, moonlight on the water, Lantern Night lanterns far below.
import { W, H, rng, uid, shade, tint, mix, linearV, radial, glow, stars, moon, cloudBand, windowRain, lightning, stringLights } from "../kit.js";

const HORIZON = 410;
const MULLIONS = [240, 550, 800, 1050, 1360];
const n = (v) => +v.toFixed(1);
const u2 = (x) => ((x - 800) / 800) ** 2;
// The glazing is a cylinder seen from inside: horizontal members bow away
// from eye level toward the sides.
const yTop = (x) => 92 - 64 * u2(x);
const yMid = (x) => 262 - 30 * u2(x);
const yBot = (x) => 520 + 48 * u2(x);

function curve(fn, x0 = -20, x1 = W + 20, step = 40) {
  let d = "";
  for (let x = x0; x <= x1; x += step) d += `${d ? "L" : "M"}${x} ${n(fn(x))} `;
  return d;
}
function band(fnA, fnB, x0 = -20, x1 = W + 20, step = 40) {
  let d = curve(fnA, x0, x1, step);
  for (let x = x1; x >= x0; x -= step) d += `L${x} ${n(fnB(x))} `;
  return d + "Z";
}

export function lamproom({ pal, time }) {
  const storm = time === "storm";
  const m = materials(pal, storm);
  const glassClip = uid("lrg");
  const parts = [{ defs: `<clipPath id="${glassClip}"><path d="${band(yTop, yBot)}"/></clipPath>`, body: "" }];
  parts.push(view(pal, m, storm, glassClip));
  parts.push(glazing(pal, m, storm, glassClip));
  parts.push(lens(pal, m, storm));
  parts.push(room(pal, m, storm));
  parts.push(rightSide(pal, m, storm));
  parts.push(desk(pal, m, storm));
  parts.push(...lights(pal, m, storm));
  if (storm) parts.push(`<g opacity=".42">${lightning()}</g>`);
  parts.push(STYLE);
  return parts;
}

function materials(pal, storm) {
  const k = storm ? 0.4 : 0.36, d = storm ? 0.3 : 0.28;
  const g = (c, extra = 0) => shade(mix(c, pal.mid, k), Math.min(0.95, d + extra));
  return {
    g,
    iron: g("#3e4b4a", 0.15), ironHi: g("#6f807c"), dome: g("#33403f", 0.25),
    parapet: g("#6f7f78", 0.05), brass: g("#c49a52"), brassHi: g("#e8c47e"),
    wood: g("#8d6545"), woodTop: g("#a97c55"), woodDark: g("#8d6545", 0.3),
    lamp: "#ffc46e", screen: "#8fd6ff", red: "#ff4b3e",
  };
}

// ---- outside the glass ------------------------------------------------------------

function view(pal, m, storm, clip) {
  const r = rng(storm ? 81 : 80);
  const skyG = uid("lrsky"), seaG = uid("lrsea");
  let defs = linearV(skyG, pal.sky)
    + `<linearGradient id="${seaG}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.sea[0]}"/><stop offset="1" stop-color="${shade(pal.sea[1], 0.2)}"/></linearGradient>`;
  let b = `<rect width="${W}" height="${HORIZON + 2}" fill="url(#${skyG})"/>`;
  if (!storm) {
    b += stars(70, 83, HORIZON - 30);
    const mo = moon(1236, 196, 28);
    defs += mo.defs; b += mo.body;
    b += cloudBand(pal, { seed: 84, y0: 200, y1: 330, count: 3, speed: 260, opacity: 0.35 });
  } else {
    b += cloudBand({ ...pal, cloud: shade(pal.cloud, 0.3) }, { seed: 82, y0: 20, y1: 200, count: 7, speed: 90, opacity: 0.95 });
    b += cloudBand(pal, { seed: 85, y0: 120, y1: 360, count: 7, speed: 70, opacity: 0.8 });
    b += `<rect width="${W}" height="${HORIZON}" fill="#e8f0ff" class="a-lightning"/>`;
    b += `<path d="M1262 70 l-22 70 l18 4 l-30 82 l16 2 l-34 104" stroke="#f6f9ff" stroke-width="4" fill="none" stroke-linejoin="round" class="a-lightning"/>`;
    b += `<path d="M1240 140 l-40 30 l-10 40" stroke="#f6f9ff" stroke-width="2" fill="none" class="a-lightning"/>`;
  }
  // far coast to the south-west: Saltwick's lights strung along it
  const coast = storm ? mix(pal.far, pal.sky[0], 0.15) : mix(pal.far, pal.sky[1], 0.45);
  b += `<path d="M-20 ${HORIZON + 1} V${HORIZON - 10} Q80 ${HORIZON - 26} 180 ${HORIZON - 18} Q270 ${HORIZON - 12} 340 ${HORIZON - 16} Q420 ${HORIZON - 20} 520 ${HORIZON + 1} Z" fill="${coast}"/>`;
  b += `<path d="M1420 ${HORIZON + 1} Q1500 ${HORIZON - 9} 1620 ${HORIZON - 6} V${HORIZON + 1} Z" fill="${coast}"/>`;
  if (!storm) {
    for (let i = 0; i < 18; i++) b += `<circle cx="${n(30 + r() * 440)}" cy="${n(HORIZON - 4 - r() * 9)}" r="${n(1 + r() * 0.9)}" fill="#ffd28a" opacity="${n(0.6 + r() * 0.4)}"/>`;
  }
  // the sea, a long way down
  b += `<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#${seaG})"/>`;
  if (!storm) {
    for (let i = 0; i < 26; i++) {
      const t = r(), y = HORIZON + 4 + t * t * 200, len = 14 + t * 70;
      b += `<path d="M${n(r() * W)} ${n(y)} h${n(len)}" stroke="#dfe6f5" stroke-width="${n(1 + t * 1.6)}" stroke-linecap="round" opacity="${n(0.12 + t * 0.2)}" class="a-wave" style="animation-delay:-${n(r() * 5)}s"/>`;
    }
    // moon path
    for (let i = 0; i < 16; i++) {
      const t = i / 16, y = HORIZON + 6 + t * t * 190, w = 20 + t * 90 + r() * 30;
      b += `<path d="M${n(1236 - w / 2 + (r() - 0.5) * 30)} ${n(y)} h${n(w)}" stroke="#f4f1dc" stroke-width="${n(1.5 + t * 3)}" stroke-linecap="round" opacity="${n(0.55 - t * 0.25)}" class="a-wave" style="animation-delay:-${n(r() * 5)}s"/>`;
    }
    // Lantern Night: paper lanterns on the water off the harbor, far below,
    // and a few let go into the air above the town
    for (let i = 0; i < 34; i++) {
      const left = i < 22;
      const x = left ? 30 + r() ** 0.8 * 500 : 1070 + r() * 500, t = r();
      const y = HORIZON + 3 + t * t * 56;
      const s = 0.8 + (t * t) * 1.6;
      b += `<g class="${i % 5 ? "a-twinkle-soft" : "a-firefly"}" style="animation-delay:-${n(r() * 6)}s"><circle cx="${n(x)}" cy="${n(y)}" r="${n(s * 4)}" fill="#ffb560" opacity=".3"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(s * 1.4)}" fill="#ffd690"/></g>`;
    }
    for (let i = 0; i < 9; i++) {
      const x = 60 + r() * 420, y = HORIZON - 30 - r() * 120, dur = 30 + r() * 30;
      b += `<g class="lamproom-rise" style="animation-duration:${n(dur)}s;animation-delay:-${n(r() * dur)}s"><circle cx="${n(x)}" cy="${n(y)}" r="5" fill="#ffb560" opacity=".25"/><circle cx="${n(x)}" cy="${n(y)}" r="1.8" fill="#ffd690"/></g>`;
    }
  } else {
    const foam = tint(pal.sea[0], 0.5);
    for (let i = 0; i < 30; i++) {
      const t = r(), y = HORIZON + 6 + t * t * 210, w = 12 + t * 60, x = r() * W;
      b += `<path d="M${n(x)} ${n(y)} q${n(w * 0.3)} -${n(1.5 + t * 3)} ${n(w * 0.6)} -1 t${n(w * 0.4)} 2" stroke="${foam}" stroke-width="${n(1 + t * 2)}" fill="none" stroke-linecap="round" opacity="${n(0.25 + t * 0.35)}" class="a-wave" style="animation-duration:3s;animation-delay:-${n(r() * 3)}s"/>`;
    }
    b += rainIn(0, W + 200, { seed: 86, count: 64, angle: 24, color: "#cdd8e4" });
  }
  return { defs, body: `<g clip-path="url(#${clip})">${b}</g>` };
}

function rainIn(x0, x1, { seed = 1, count = 40, angle = 14, color = "#cfd9e6", opacity = 1 } = {}) {
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

// ---- the glass ring ---------------------------------------------------------------

function glazing(pal, m, storm, clip) {
  const r = rng(87);
  const sheen = uid("lrsh");
  const defs = `<linearGradient id="${sheen}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".045"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>`;
  // a faint tint on the glass + reflections, then weather on the panes
  let g = `<rect width="${W}" height="${H}" fill="${pal.sky[2]}" opacity=".12"/>`;
  for (const [x, w] of [[120, 50], [430, 26], [1150, 40], [1460, 60]]) {
    g += `<path d="M${x} 0 l${w} 0 l-160 ${H} l-${w} 0 Z" fill="url(#${sheen})"/>`;
  }
  if (storm) {
    const panes = [[-20, 240], [240, 550], [550, 800], [800, 1050], [1050, 1360], [1360, 1620]];
    panes.forEach(([a, b], i) => {
      const behindLens = i === 2 || i === 3;
      g += windowRain(a + 8, yTop(a) + 10, b - a - 16, yBot(a) - yTop(a), { seed: 90 + i, count: behindLens ? 3 : 6, color: "#dfe8f2" });
    });
    // wind-flung drops streaking sideways across the glass
    for (let i = 0; i < 28; i++) {
      const x = r() * W, y = 90 + r() * 430, l = 10 + r() * 22;
      g += `<path d="M${n(x)} ${n(y)} l${n(l)} ${n(l * 0.35)}" stroke="#dfe8f2" stroke-width="1.4" stroke-linecap="round" opacity="${n(0.2 + r() * 0.25)}"/>`;
    }
  }
  // iron: top ring, transom, sill, mullions (wider toward the sides: nearer)
  const iron = m.iron, hi = m.ironHi;
  let frame = `<path d="${band((x) => yTop(x) - 14, yTop)}" fill="${iron}"/>`;
  frame += `<path d="${band((x) => yMid(x) - 5, (x) => yMid(x) + 5)}" fill="${iron}"/>`;
  frame += `<path d="${curve((x) => yMid(x) - 5)}" stroke="${hi}" stroke-width="1.5" fill="none" opacity=".6"/>`;
  frame += `<path d="${band(yBot, (x) => yBot(x) + 18)}" fill="${iron}"/>`;
  frame += `<path d="${curve(yBot)}" stroke="${hi}" stroke-width="2" fill="none" opacity=".6"/>`;
  for (const x of MULLIONS) {
    const w = 10 + 9 * u2(x) * 2.2;
    frame += `<path d="M${n(x - w / 2)} ${n(yTop(x) - 4)} L${n(x + w / 2)} ${n(yTop(x) - 4)} L${n(x + w / 2)} ${n(yBot(x) + 2)} L${n(x - w / 2)} ${n(yBot(x) + 2)} Z" fill="${iron}"/>`;
    frame += `<path d="M${n(x + (x < 800 ? w / 2 - 1.5 : -w / 2 + 1.5))} ${n(yTop(x))} V${n(yBot(x))}" stroke="${hi}" stroke-width="1.5" opacity=".5"/>`;
  }
  // the dome above: dark iron with ribs running up to the vent
  let dome = `<path d="${domePath()}" fill="${m.dome}"/>`;
  for (const x of [-260, 120, 470, 800, 1130, 1480, 1860]) {
    dome += `<path d="M${x} ${n(yTop(x) - 12)} L${n(800 + (x - 800) * 0.25)} -60" stroke="${shade(m.dome, 0.25)}" stroke-width="${n(6 + 6 * u2(x))}"/>`;
  }
  dome += `<path d="${curve((x) => yTop(x) - 40 - 10 * u2(x))}" stroke="${shade(m.dome, 0.2)}" stroke-width="5" fill="none"/>`;
  return { defs, body: `<g clip-path="url(#${clip})">${g}</g>${dome}${frame}` };
}

function domePath() {
  let d = `M-20 -20 H${W + 20} V${n(yTop(W + 20) - 12)}`;
  for (let x = W + 20; x >= -20; x -= 40) d += ` L${x} ${n(yTop(x) - 12)}`;
  return d + " Z";
}

// ---- the Fresnel lens (subtle: someone stands in front of it) ---------------------------

function lens(pal, m, storm) {
  const glassG = uid("lrlg"), clip = uid("lrlc"), spec = uid("lrls");
  const cx = 800;
  // half-widths down the beehive
  const prof = [[104, 50], [130, 98], [160, 124], [200, 140], [250, 148], [300, 150], [350, 150], [400, 148], [440, 140], [476, 124], [506, 98], [520, 78]];
  const hw = (y) => {
    for (let i = 1; i < prof.length; i++) {
      if (y <= prof[i][0]) { const [y0, w0] = prof[i - 1], [y1, w1] = prof[i]; return w0 + ((w1 - w0) * (y - y0)) / (y1 - y0); }
    }
    return prof[prof.length - 1][1];
  };
  let outline = `M${cx - prof[0][1]} ${prof[0][0]}`;
  for (const [y, w] of prof) outline += ` L${cx - w} ${y}`;
  for (const [y, w] of [...prof].reverse()) outline += ` L${cx + w} ${y}`;
  outline += " Z";
  const glassC = mix(pal.sky[1], "#bfe3dc", 0.4);
  const defs = `<clipPath id="${clip}"><path d="${outline}"/></clipPath>
    <linearGradient id="${glassG}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(glassC, 0.3)}" stop-opacity=".7"/><stop offset=".3" stop-color="${glassC}" stop-opacity=".32"/><stop offset=".7" stop-color="${glassC}" stop-opacity=".3"/><stop offset="1" stop-color="${shade(glassC, 0.35)}" stop-opacity=".75"/></linearGradient>
    <linearGradient id="${spec}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".16"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>`;
  const light = tint(glassC, 0.6), dark = shade(glassC, 0.4);
  // prism rings: each a soft glass band with a bright lip
  let rings = "";
  const ringYs = [112, 124, 137, 151, 166, 183, 202, 224, 248, 404, 424, 444, 462, 479, 494, 508];
  for (const y of ringYs) {
    const w = hw(y) + 4, sag = (y - HORIZON) * 0.05;
    const arc = (dy) => `M${n(cx - w)} ${y + dy} Q${cx} ${n(y + dy + sag * 2)} ${n(cx + w)} ${y + dy}`;
    rings += `<path d="${arc(3)}" stroke="${light}" stroke-width="7" fill="none" opacity=".12"/>`;
    rings += `<path d="${arc(0)}" stroke="${light}" stroke-width="1.6" fill="none" opacity=".42"/>`;
    rings += `<path d="${arc(7)}" stroke="${dark}" stroke-width="1.2" fill="none" opacity=".3"/>`;
  }
  // dioptric belt with its bullseye
  const belt = `
    <ellipse cx="${cx}" cy="325" rx="60" ry="54" fill="none" stroke="${light}" stroke-width="5" opacity=".1"/>
    <ellipse cx="${cx}" cy="325" rx="60" ry="54" fill="none" stroke="${light}" stroke-width="1.5" opacity=".35"/>
    <ellipse cx="${cx}" cy="325" rx="38" ry="34" fill="none" stroke="${light}" stroke-width="1.5" opacity=".3"/>
    <ellipse cx="${cx}" cy="325" rx="18" ry="16" fill="${light}" opacity=".16"/>
    <rect x="${cx - 112}" y="0" width="70" height="${H}" fill="url(#${spec})"/>`;
  // brass: panel astragals, rims, belt bands
  let brass = "";
  for (const f of [-0.64, 0.64]) {
    let d = "";
    for (let y = 104; y <= 520; y += 26) d += `${d ? "L" : "M"}${n(cx + hw(y) * f)} ${y} `;
    brass += `<path d="${d}" stroke="${m.brass}" stroke-width="2.5" fill="none" opacity=".45"/>`;
  }
  for (const y of [266, 384]) {
    const w = hw(y), sag = (y - HORIZON) * 0.1;
    brass += `<path d="M${n(cx - w)} ${y} Q${cx} ${n(y + sag)} ${n(cx + w)} ${y}" stroke="${m.brass}" stroke-width="6" fill="none" opacity=".9"/>`;
    brass += `<path d="M${n(cx - w)} ${y - 2} Q${cx} ${n(y - 2 + sag)} ${n(cx + w)} ${y - 2}" stroke="${m.brassHi}" stroke-width="1.5" fill="none" opacity=".6"/>`;
  }
  const g = glow(cx, 322, 230, "#ffe0a0", storm ? 0.16 : 0.2, "a-pulse");
  const cap = `
    <path d="M${cx - 54} 106 Q${cx} 72 ${cx + 54} 106 Z" fill="${m.brass}"/>
    <path d="M${cx - 48} 104 Q${cx} 78 ${cx + 48} 104" stroke="${m.brassHi}" stroke-width="2" fill="none" opacity=".6"/>
    <rect x="${cx - 7}" y="66" width="14" height="14" rx="3" fill="${m.brass}"/>
    <path d="M${cx - 80} 518 Q${cx} 530 ${cx + 80} 518" stroke="${m.brass}" stroke-width="6" fill="none"/>`;
  // cast-iron pedestal
  const ped = `
    <path d="M${cx - 84} 520 H${cx + 84} L${cx + 112} 640 H${cx - 112} Z" fill="${m.iron}"/>
    <path d="M${cx - 64} 540 H${cx + 64} L${cx + 74} 620 H${cx - 74} Z" fill="${shade(m.iron, 0.2)}"/>`;
  let spark = "";
  const r = rng(88);
  for (let i = 0; i < 7; i++) {
    const y = ringYs[Math.floor(r() * ringYs.length)], x = cx + (r() - 0.5) * 2 * hw(y) * 0.85;
    spark += `<path d="M${n(x)} ${y - 5} l2 5 l-2 5 l-2 -5 Z" fill="#fffbe8" class="a-twinkle" style="animation-delay:-${n(r() * 4)}s"/>`;
  }
  return {
    defs: defs + g.defs,
    body: `${ped}<path d="${outline}" fill="url(#${glassG})"/>${g.body}
      <g clip-path="url(#${clip})">${rings}${belt}</g>${brass}${cap}${spark}`,
  };
}

// ---- parapet below the glass ------------------------------------------------------------

function room(pal, m, storm) {
  const p = m.parapet;
  let s = `<path d="${band((x) => yBot(x) + 18, () => H + 20)}" fill="${p}"/>`;
  // riveted panel seams
  for (const x of [100, 400, 680, 920, 1200, 1500]) {
    s += `<path d="M${x} ${n(yBot(x) + 18)} V${H}" stroke="${shade(p, 0.3)}" stroke-width="3"/>`;
  }
  s += `<path d="${curve((x) => yBot(x) + 60)}" stroke="${shade(p, 0.25)}" stroke-width="3" fill="none"/>`;
  s += `<path d="${curve((x) => yBot(x) + 20)}" stroke="${tint(p, 0.2)}" stroke-width="2" fill="none" opacity=".7"/>`;
  return s;
}

// ---- right: records, speaker, the station sign -----------------------------------------------

function rightSide(pal, m, storm) {
  const r = rng(89);
  const top = 478;
  const wood = m.wood, wt = m.woodTop, wd = m.woodDark;
  // the station sign, cardboard taped to the glass
  const card = m.g("#c9a676", -0.12), ink = m.g("#2b2730");
  const sign = `<g transform="rotate(-3 1475 296)">
    <rect x="1392" y="258" width="170" height="80" rx="3" fill="#120a14" opacity=".25" transform="translate(4 5)"/>
    <rect x="1392" y="258" width="170" height="80" rx="3" fill="${card}"/>
    <text x="1477" y="288" text-anchor="middle" font-family="'Trebuchet MS', sans-serif" font-weight="700" font-size="21" fill="${ink}" letter-spacing="1">LOW TIDE FM</text>
    <text x="1477" y="324" text-anchor="middle" font-family="'Trebuchet MS', sans-serif" font-weight="700" font-size="30" fill="${m.g("#c4473a", -0.1)}">88.1</text>
    <path d="M1406 330 q8 -6 16 0 t16 0 M1516 330 q8 -6 16 0 t16 0" stroke="${ink}" stroke-width="2" fill="none"/>
    <rect x="1384" y="252" width="26" height="10" fill="${m.g("#e8e0c8")}" opacity=".75" transform="rotate(-30 1397 257)"/>
    <rect x="1546" y="252" width="26" height="10" fill="${m.g("#e8e0c8")}" opacity=".75" transform="rotate(30 1559 257)"/>
  </g>`;
  // low cabinet
  const cab = `
    <rect x="1150" y="${top}" width="420" height="${H - top}" fill="${wood}"/>
    <rect x="1140" y="${top - 6}" width="440" height="14" rx="2" fill="${wt}"/>
    <rect x="1170" y="${top + 26}" width="180" height="120" rx="3" fill="${wd}"/><rect x="1370" y="${top + 26}" width="180" height="120" rx="3" fill="${wd}"/>
    <circle cx="1338" cy="${top + 80}" r="4" fill="${m.brass}"/><circle cx="1382" cy="${top + 80}" r="4" fill="${m.brass}"/>`;
  // crate of records
  let recs = "";
  const cols = ["#c4473a", "#e0b23a", "#3a8f8a", "#2f4f7a", "#efe6d2", "#7a3f6a", "#1d1b22", "#d97a3a"];
  for (let i = 0; i < 16; i++) {
    const x = 1172 + i * 7.6, h = 54 + r() * 10;
    recs += `<rect x="${n(x)}" y="${n(top - 6 - h)}" width="6.4" height="${n(h)}" fill="${m.g(cols[Math.floor(r() * cols.length)], -0.05)}" transform="rotate(${n((r() - 0.5) * 6)} ${n(x)} ${top - 6})"/>`;
  }
  const crate = `${recs}<rect x="1164" y="${top - 46}" width="132" height="40" fill="${m.g("#b48a5c")}"/><rect x="1164" y="${top - 46}" width="132" height="5" fill="${m.g("#d0a878")}"/><rect x="1164" y="${top - 26}" width="132" height="3" fill="${m.g("#8a6644")}"/>`;
  // a sleeve propped up front
  const sleeve = `<g transform="rotate(-6 1330 ${top - 6})"><rect x="1300" y="${top - 72}" width="66" height="66" fill="${m.g("#2f6f6c", -0.05)}"/><circle cx="1333" cy="${top - 39}" r="20" fill="${m.g("#e9b44c", -0.05)}"/><circle cx="1333" cy="${top - 39}" r="5" fill="${m.g("#2f6f6c")}"/></g>`;
  // thermos + plant
  const plant = `
    <rect x="1384" y="${top - 44}" width="34" height="38" rx="4" fill="${m.g("#b65a3a")}"/>
    <path d="M1401 ${top - 44} q-30 -20 -24 -52 q18 18 24 52 Z M1401 ${top - 44} q4 -40 26 -56 q2 30 -26 56 Z M1401 ${top - 44} q-6 -30 6 -66 q10 34 -6 66 Z" fill="${m.g("#5f8a5a")}"/>`;
  // monitor speaker
  const spk = `
    <rect x="1448" y="${top - 112}" width="96" height="106" rx="6" fill="${m.g("#26262c", -0.05)}"/>
    <circle cx="1496" cy="${top - 44}" r="30" fill="${m.g("#3a3a42")}"/><circle cx="1496" cy="${top - 44}" r="13" fill="${m.g("#55555e")}"/>
    <circle cx="1496" cy="${top - 92}" r="10" fill="${m.g("#3a3a42")}"/><circle cx="1496" cy="${top - 92}" r="4" fill="${m.g("#6a6a74")}"/>
    <circle cx="1532" cy="${top - 18}" r="3" fill="#7fffb0" class="a-led"/>
    <rect x="1470" y="${top - 138}" width="22" height="26" rx="3" fill="${m.g("#e9e2d2", -0.04)}"/><path d="M1492 ${top - 132} q9 2 9 9 q0 7 -9 7" stroke="${m.g("#e9e2d2", -0.04)}" stroke-width="4" fill="none"/>
    <path d="M1474 ${top - 128} h14" stroke="${m.g("#3aa39b")}" stroke-width="3"/>`;
  return `${sign}${cab}${crate}${sleeve}${plant}${spk}`;
}

// ---- left: the broadcast desk ------------------------------------------------------------

function desk(pal, m, storm) {
  const top = 470, r = rng(90);
  const wt = m.woodTop, wd = m.woodDark;
  const dark = m.g("#2a2a30", -0.05), mid = m.g("#4a4a54"), steel = m.g("#a9b0b8");
  const desk = `
    <rect x="16" y="${top + 14}" width="540" height="${H - top}" fill="${wd}"/>
    <rect x="10" y="${top}" width="552" height="18" rx="2" fill="${wt}"/>
    <rect x="10" y="${top}" width="552" height="3" fill="${tint(wt, 0.25)}"/>
    <rect x="16" y="${top + 18}" width="540" height="6" fill="#120a14" opacity=".3"/>`;

  // anglepoise lamp at the end of the desk, head tipped down over the letters
  const lampC = m.g("#2f5d5a", -0.08);
  const lamp = `
    <ellipse cx="44" cy="${top - 3}" rx="28" ry="7" fill="${lampC}"/>
    <path d="M44 ${top - 6} L68 334 L126 312" stroke="${lampC}" stroke-width="7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M48 ${top - 8} L72 336" stroke="${steel}" stroke-width="1.5" opacity=".45"/>
    <circle cx="68" cy="334" r="7" fill="${lampC}"/><circle cx="126" cy="312" r="5" fill="${lampC}"/>
    <path d="M118 306 L146 300 L174 340 L114 354 Z" fill="${lampC}"/>
    <path d="M118 306 L146 300 L150 306 L124 312 Z" fill="${tint(lampC, 0.2)}"/>
    <path d="M116 352 L172 340" stroke="#fff3cf" stroke-width="5" stroke-linecap="round"/>`;

  // the letters: a stack of listeners' mail, tied with red string, one open on top
  let stack = "";
  for (let i = 0; i < 7; i++) {
    const y = top - 5 - i * 4.6, x = 62 + (r() - 0.5) * 8;
    stack += `<rect x="${n(x)}" y="${n(y)}" width="74" height="4.6" rx="1" fill="${m.g(i % 2 ? "#efe6d2" : "#ddd0b4", -0.12)}" transform="rotate(${n((r() - 0.5) * 5)} ${n(x + 37)} ${n(y)})"/>`;
  }
  stack += `<path d="M100 ${top - 37} V${top}" stroke="${m.g("#c0453a", -0.1)}" stroke-width="2"/>
    <g transform="rotate(-7 100 ${top - 38})"><rect x="64" y="${top - 46}" width="78" height="12" rx="1" fill="${m.g("#f6efe0", -0.16)}"/>
    <path d="M70 ${top - 42} q6 -2 12 0 t12 0 t12 0 t12 0 t10 0 M70 ${top - 38} q6 -2 12 0 t12 0 t12 0 t8 0" stroke="${m.g("#33427a")}" stroke-width="1" fill="none" opacity=".85"/></g>`;

  const mug = (x, c) => `<rect x="${x}" y="${top - 28}" width="22" height="28" rx="3" fill="${m.g(c, -0.06)}"/><path d="M${x + 22} ${top - 22} q10 2 10 10 q0 8 -10 8" stroke="${m.g(c, -0.06)}" stroke-width="4" fill="none"/><ellipse cx="${x + 11}" cy="${top - 27}" rx="10" ry="2.5" fill="${m.g("#3a2418")}"/>`;

  // laptop, screen showing the waveform of whatever's on air
  let wave = "M220 424";
  for (let i = 1; i <= 26; i++) wave += ` L${n(220 + i * 3.9)} ${n(424 + (r() - 0.5) * (6 + 22 * Math.sin((i / 26) * Math.PI)))}`;
  const laptop = `
    <path d="M206 382 L326 376 L330 456 L210 458 Z" fill="${dark}"/>
    <path d="M212 388 L320 383 L323 450 L216 452 Z" fill="${m.g("#16323c", -0.25)}"/>
    <path d="${wave}" stroke="#7fe0d0" stroke-width="2" fill="none" opacity=".9"/>
    <rect x="222" y="396" width="40" height="5" rx="2" fill="#7fe0d0" opacity=".45"/>
    <circle cx="310" cy="398" r="4" fill="${m.red}" class="a-led"/>
    <path d="M194 ${top} L210 456 L332 454 L346 ${top} Z" fill="${mid}"/>
    <path d="M216 462 H330" stroke="${dark}" stroke-width="3" opacity=".5"/>`;

  // the mixer: faders, knobs, lit buttons
  let mixer = `<path d="M354 ${top} L364 432 H486 L496 ${top} Z" fill="${dark}"/><path d="M364 432 H486 L488 438 H362 Z" fill="${mid}"/>`;
  for (let i = 0; i < 6; i++) {
    const x = 376 + i * 20;
    mixer += `<circle cx="${x}" cy="443" r="3.4" fill="${mid}"/><path d="M${x} 449 V465" stroke="#0c0a10" stroke-width="3"/>`;
    mixer += `<rect x="${x - 4}" y="${n(451 + r() * 10)}" width="8" height="4" rx="1" fill="${steel}"/>`;
  }
  ["#7fffb0", "#ffd36a", "#7fffb0", "#ff6a5a", "#7fd8ff", "#ffd36a"].forEach((c, i) => {
    mixer += `<rect x="${368 + i * 20}" y="436" width="7" height="3" rx="1" fill="${c}"${i % 2 ? ` class="a-led" style="animation-delay:-${n(r() * 2.4)}s;animation-duration:${n(1.2 + r() * 2)}s"` : ""}/>`;
  });

  // boom arm from the desk's back corner, mic hanging over the mixer,
  // spare headphones slung over the arm
  const arm = m.g("#2a2a30", -0.05);
  const boom = `
    <rect x="530" y="${top - 12}" width="22" height="16" rx="2" fill="${arm}"/>
    <path d="M541 ${top - 10} L560 318 L436 262" stroke="${arm}" stroke-width="7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M545 ${top - 10} L563 318 L440 264" stroke="${steel}" stroke-width="1.2" fill="none" opacity=".4"/>
    <circle cx="560" cy="318" r="7" fill="${arm}"/>
    <path d="M438 262 q-6 24 -2 38" stroke="${arm}" stroke-width="3" fill="none"/>
    <g transform="rotate(-10 420 300)">
      <ellipse cx="420" cy="300" rx="28" ry="11" fill="none" stroke="${arm}" stroke-width="3"/>
      <rect x="404" y="262" width="32" height="74" rx="14" fill="${m.g("#33333b", -0.05)}"/>
      <rect x="404" y="262" width="32" height="30" rx="14" fill="${m.g("#5a5a64")}"/>
      <path d="M408 272 h24 M407 280 h26 M408 288 h24" stroke="${m.g("#2a2a30")}" stroke-width="1.5"/>
      <rect x="412" y="306" width="16" height="3" rx="1" fill="${m.red}" opacity=".8"/>
    </g>
    <path d="M536 392 Q536 352 556 352 Q576 352 574 392" stroke="${m.g("#2f6f6c", -0.06)}" stroke-width="6" fill="none"/>
    <rect x="524" y="384" width="22" height="26" rx="8" fill="${dark}"/><rect x="566" y="384" width="22" height="26" rx="8" fill="${dark}"/>
    <rect x="527" y="388" width="6" height="18" rx="3" fill="${m.g("#2f6f6c", -0.06)}"/>`;

  // cables tumbling off the desk edge
  const cable = m.g("#1d1b22", -0.05);
  const cables = `
    <path d="M400 ${top + 16} q-10 60 30 110 t10 80" stroke="${cable}" stroke-width="4" fill="none"/>
    <path d="M270 ${top + 16} q10 50 -30 90 t-20 90" stroke="${cable}" stroke-width="3.5" fill="none"/>
    <path d="M520 ${top + 16} q24 40 4 100" stroke="${m.g("#c4473a", -0.05)}" stroke-width="3" fill="none"/>`;

  return `${desk}${cables}${lamp}${stack}${mug(150, "#c4473a")}${laptop}${mixer}${boom}`;
}

// ---- light ----------------------------------------------------------------------------

function lights(pal, m, storm) {
  const parts = [];
  const vig = uid("lrv");
  // pull the corners into the dark, keep the middle open
  parts.push({
    defs: `<radialGradient id="${vig}" cx="800" cy="360" r="1000" gradientUnits="userSpaceOnUse"><stop offset=".4" stop-color="${pal.ink}" stop-opacity="0"/><stop offset="1" stop-color="${pal.ink}" stop-opacity=".5"/></radialGradient>`,
    body: `<rect width="${W}" height="${H}" fill="url(#${vig})"/>`,
  });
  // desk lamp: cone + pool on the desk + warm wash on the glass behind
  const cone = uid("lrc");
  parts.push({
    defs: `<linearGradient id="${cone}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.lamp}" stop-opacity=".34"/><stop offset="1" stop-color="${m.lamp}" stop-opacity=".02"/></linearGradient>`,
    body: `<path d="M116 352 L172 340 L222 470 L52 470 Z" fill="url(#${cone})"/>`,
  });
  parts.push(glow(130, 456, 300, m.lamp, 0.42));
  parts.push(glow(144, 348, 70, "#fff0c8", 0.55));
  // laptop glow + ON AIR
  parts.push(glow(268, 420, 120, m.screen, 0.2));
  const onair = glow(240, 168, 150, m.red, 0.45, "lamproom-onair");
  parts.push(onair);
  parts.push(`<g>
    <rect x="228" y="186" width="24" height="12" fill="${m.iron}"/>
    <rect x="192" y="148" width="96" height="40" rx="5" fill="${m.g("#1d1b22", -0.1)}"/>
    <rect x="198" y="154" width="84" height="28" rx="3" fill="#c8322a"/>
    <rect x="198" y="154" width="84" height="28" rx="3" fill="#ff5a48" class="lamproom-onair"/>
    <text x="240" y="174" text-anchor="middle" font-family="'Trebuchet MS', sans-serif" font-weight="700" font-size="16" letter-spacing="2" fill="#fff1e8">ON AIR</text>
  </g>`);
  // string lights along the top of the glass, both sides
  parts.push(stringLights(-10, 104, 548, 86, 46, { count: 10, color: "#ffd58a", wire: shade(m.iron, 0.3), seed: 91 }));
  parts.push(stringLights(1052, 86, 1610, 104, 46, { count: 10, color: "#ffd58a", wire: shade(m.iron, 0.3), seed: 92 }));
  // speaker LED + lamp catch on the cabinet
  parts.push(glow(1360, 470, 240, m.lamp, 0.12));
  if (!storm) parts.push(glow(1236, 300, 420, "#c9d6ff", 0.08));
  return parts;
}

const STYLE = `<style>
@keyframes lamproom-onair { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
.lamproom-onair { animation: lamproom-onair 2.8s ease-in-out infinite; }
@keyframes lamproom-rise { 0% { transform: translate(0, 0); opacity: 0; } 10% { opacity: 1; } 85% { opacity: .8; } 100% { transform: translate(24px, -90px); opacity: 0; } }
.lamproom-rise { animation: lamproom-rise 40s linear infinite; }
</style>`;
