// Shared art toolkit: palettes, color math, seeded randomness and the
// reusable scene pieces (sky, sea, clouds, weather, light). Every scene and
// character is built from these, which is what keeps the art consistent.
//
// Everything returns SVG markup strings. Animation is CSS (css/art.css)
// driven by class names, so "reduce motion" can switch it all off at once.

export const W = 1600;
export const H = 900;

// ---- color ---------------------------------------------------------------------

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
/** Mix two colors; t=0 → a, t=1 → b. */
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}
export const shade = (hex, t) => mix(hex, "#1a1020", t);   // darken toward a warm ink
export const tint = (hex, t) => mix(hex, "#fff8ef", t);    // lighten toward warm paper

// ---- randomness ------------------------------------------------------------------

/** Deterministic PRNG so a scene looks the same every time it's drawn. */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

let uidCounter = 0;
export const uid = (p = "a") => `${p}${++uidCounter}`;

// ---- time-of-day palettes ----------------------------------------------------------
// sky: bottom → top. light: color of the key light. ambient: overlay tint.

export const TIMES = {
  dawn: {
    sky: ["#f7cfae", "#e9b6b8", "#a9b8d8", "#7d93c2"], sun: "#fff1d6", light: "#ffd9b0",
    sea: ["#8fa6c4", "#5d789f"], far: "#9aa3bd", mid: "#7c86a6", ink: "#3a3550",
    ambient: "rgba(255,196,170,0.10)", cloud: "#f6dcd0", stars: 0,
  },
  day: {
    sky: ["#e7f4fa", "#bfe2f3", "#86c2e6", "#5ea6da"], sun: "#fffbe8", light: "#fff4d8",
    sea: ["#5fa3c9", "#2f6f9c"], far: "#93b4bd", mid: "#6d9a8f", ink: "#2c3c4a",
    ambient: "rgba(255,250,235,0.04)", cloud: "#ffffff", stars: 0,
  },
  golden: {
    sky: ["#ffd79a", "#f9b27c", "#d98f93", "#8e7fbf"], sun: "#fff0c2", light: "#ffc98a",
    sea: ["#e0a27c", "#5b6f9e"], far: "#b48a98", mid: "#8a6f8c", ink: "#3d2e48",
    ambient: "rgba(255,180,110,0.12)", cloud: "#ffd9b8", stars: 0,
  },
  dusk: {
    sky: ["#f3a27a", "#c97a8e", "#6e5a9a", "#2f2d5e"], sun: "#ffd1a1", light: "#ffb48a",
    sea: ["#7b5f86", "#2c3462"], far: "#5d4f7d", mid: "#463f6a", ink: "#1e1a36",
    ambient: "rgba(120,80,160,0.14)", cloud: "#e59aa0", stars: 0.3,
  },
  night: {
    sky: ["#2a3a6e", "#1c2752", "#121a3c", "#0b1029"], sun: "#f4f1dc", light: "#ffcf86",
    sea: ["#1d2c55", "#0c1430"], far: "#1f2a4f", mid: "#18203f", ink: "#0a0d1f",
    ambient: "rgba(30,40,110,0.18)", cloud: "#3a4778", stars: 1,
  },
  storm: {
    sky: ["#5b6574", "#454f5f", "#333b4a", "#232a36"], sun: "#c9d3dc", light: "#c6d2e0",
    sea: ["#3d4a58", "#1d2630"], far: "#3b4552", mid: "#2c343f", ink: "#12161c",
    ambient: "rgba(40,60,80,0.22)", cloud: "#4b5564", stars: 0,
  },
  fog: {
    sky: ["#dfe3e4", "#cfd6d9", "#bcc6cc", "#aab6bf"], sun: "#f4f4ee", light: "#eef0ea",
    sea: ["#a8b4ba", "#7d8d97"], far: "#c3cbcf", mid: "#a9b4ba", ink: "#4c5860",
    ambient: "rgba(230,235,238,0.18)", cloud: "#eef1f2", stars: 0,
  },
};

export function palette(time) { return TIMES[time] ?? TIMES.day; }

// ---- building blocks ---------------------------------------------------------------

export function linearV(id, stops) {
  const n = stops.length - 1;
  return `<linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0">${stops.map((c, i) => `<stop offset="${(i / n).toFixed(3)}" stop-color="${c}"/>`).join("")}</linearGradient>`;
}

export function radial(id, color, opacity = 1) {
  return `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
}

/** Full-frame sky gradient. */
export function sky(pal, { h = H } = {}) {
  const id = uid("sky");
  return { defs: linearV(id, pal.sky), body: `<rect width="${W}" height="${h}" fill="url(#${id})"/>` };
}

export function sunDisc(pal, x, y, r = 60) {
  const g = uid("sun");
  return {
    defs: radial(g, pal.sun, 0.75),
    body: `<circle cx="${x}" cy="${y}" r="${r * 4}" fill="url(#${g})" class="a-pulse"/><circle cx="${x}" cy="${y}" r="${r}" fill="${pal.sun}"/>`,
  };
}

export function moon(x, y, r = 34) {
  const g = uid("moon");
  return {
    defs: radial(g, "#f4f1dc", 0.35),
    body: `<circle cx="${x}" cy="${y}" r="${r * 3.5}" fill="url(#${g})"/><circle cx="${x}" cy="${y}" r="${r}" fill="#f4f1dc"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.2}" r="${r * 0.22}" fill="#e2dcc0" opacity=".6"/><circle cx="${x - r * 0.3}" cy="${y + r * 0.3}" r="${r * 0.14}" fill="#e2dcc0" opacity=".6"/>`,
  };
}

export function stars(count, seed = 7, maxY = H * 0.6) {
  const r = rng(seed);
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = r() * W, y = r() * maxY, s = 0.6 + r() * 1.8;
    const delay = (r() * 6).toFixed(2);
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(2)}" fill="#fffbe8" class="a-twinkle" style="animation-delay:-${delay}s"/>`;
  }
  return out;
}

/** A soft cumulus puff built from overlapping circles. */
export function cloud(x, y, scale, color, opacity = 0.9) {
  const s = scale;
  return `<g opacity="${opacity}" transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="0" rx="110" ry="34" fill="${color}"/>
    <circle cx="-50" cy="-12" r="38" fill="${color}"/><circle cx="0" cy="-30" r="50" fill="${color}"/>
    <circle cx="52" cy="-14" r="36" fill="${color}"/>
    <ellipse cx="0" cy="10" rx="105" ry="16" fill="${shade(color, 0.08)}" opacity=".5"/>
  </g>`;
}

/** A band of slowly drifting clouds. */
export function cloudBand(pal, { seed = 3, y0 = 80, y1 = 320, count = 5, speed = 140, opacity = 0.85 } = {}) {
  const r = rng(seed);
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = r() * W, y = y0 + r() * (y1 - y0), s = 0.6 + r() * 0.9;
    const dur = speed + r() * speed;
    out += `<g class="a-drift" style="animation-duration:${dur.toFixed(0)}s;animation-delay:-${(r() * dur).toFixed(0)}s">${cloud(x, y, s, pal.cloud, opacity)}</g>`;
  }
  return out;
}

/** Layered hills / coastline silhouette from a seeded noise line. */
export function ridge({ y, amp, color, seed = 1, steps = 16, x0 = 0, x1 = W, bottom = H, taper = x0 > 0 || x1 < W }) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    // Taper islands/headlands down to the base at both ends.
    const edge = taper ? Math.sin((Math.PI * i) / steps) ** 0.6 : 1;
    pts.push([x, bottom - (bottom - (y - Math.sin(i * 0.7 + seed) * amp * 0.5 - r() * amp)) * edge]);
  }
  let d = `M${x0} ${bottom} L${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i];
    d += ` Q${px.toFixed(1)} ${py.toFixed(1)} ${((px + cx) / 2).toFixed(1)} ${((py + cy) / 2).toFixed(1)}`;
  }
  d += ` L${x1} ${pts[pts.length - 1][1].toFixed(1)} L${x1} ${bottom} Z`;
  return `<path d="${d}" fill="${color}"/>`;
}

/** Sea from `top` to `bottom` with animated glint lines. */
export function sea(pal, { top = 560, bottom = H, seed = 5, glint = "#ffffff", glints = 26, glintOpacity = 0.35 } = {}) {
  const id = uid("sea");
  const r = rng(seed);
  let lines = "";
  for (let i = 0; i < glints; i++) {
    const t = r();
    const y = top + 6 + t * t * (bottom - top - 10);
    const len = 20 + t * 90;
    const x = r() * W;
    lines += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} h${len.toFixed(0)}" stroke="${glint}" stroke-width="${(1 + t * 2.5).toFixed(1)}" stroke-linecap="round" opacity="${(glintOpacity * (0.4 + t * 0.6)).toFixed(2)}" class="a-wave" style="animation-delay:-${(r() * 5).toFixed(1)}s"/>`;
  }
  return {
    defs: `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.sea[0]}"/><stop offset="1" stop-color="${pal.sea[1]}"/></linearGradient>`,
    body: `<rect x="0" y="${top}" width="${W}" height="${bottom - top}" fill="url(#${id})"/>${lines}`,
  };
}

/** Little flapping gulls drifting across. */
export function gulls(count = 3, { seed = 9, y0 = 120, y1 = 360, color = "#2b2b3a" } = {}) {
  const r = rng(seed);
  let out = "";
  for (let i = 0; i < count; i++) {
    const y = y0 + r() * (y1 - y0), s = 0.6 + r() * 0.7, dur = 38 + r() * 30;
    out += `<g class="a-glide" style="animation-duration:${dur.toFixed(0)}s;animation-delay:-${(r() * dur).toFixed(0)}s">
      <g transform="translate(0 ${y.toFixed(0)}) scale(${s.toFixed(2)})"><g class="a-flap" style="animation-delay:-${(r()).toFixed(2)}s">
        <path d="M-22 0 Q-11 -10 0 0 Q11 -10 22 0" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      </g></g></g>`;
  }
  return out;
}

/** Rain streaks in two depths. intensity 0..1 */
export function rain(intensity = 0.6, { seed = 11, color = "#cfd9e6", angle = 12 } = {}) {
  const r = rng(seed);
  const n = Math.round(60 + intensity * 160);
  let near = "", far = "";
  for (let i = 0; i < n; i++) {
    const x = r() * (W + 300) - 150, y = r() * H, len = 18 + r() * 30;
    const line = `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l${(-len * Math.tan((angle * Math.PI) / 180)).toFixed(1)} ${len.toFixed(0)}" stroke="${color}" stroke-width="${i % 3 === 0 ? 2.2 : 1.3}" stroke-linecap="round"/>`;
    if (i % 3 === 0) near += line; else far += line;
  }
  return `<g class="a-rain-far" opacity="${(0.25 + intensity * 0.2).toFixed(2)}">${far}<g transform="translate(0 -${H})">${far}</g></g>
          <g class="a-rain-near" opacity="${(0.35 + intensity * 0.25).toFixed(2)}">${near}<g transform="translate(0 -${H})">${near}</g></g>`;
}

/** Rain running down a window pane (clip it to the glass). */
export function windowRain(x, y, w, h, { seed = 13, count = 14, color = "#e6eef6" } = {}) {
  const r = rng(seed);
  let out = "";
  for (let i = 0; i < count; i++) {
    const cx = x + r() * w, len = 20 + r() * 60, dur = 3 + r() * 5;
    out += `<g class="a-drip" style="animation-duration:${dur.toFixed(1)}s;animation-delay:-${(r() * dur).toFixed(1)}s"><path d="M${cx.toFixed(0)} ${y} q2 ${len / 2} 0 ${len.toFixed(0)}" stroke="${color}" stroke-width="2" fill="none" opacity=".5" stroke-linecap="round"/><circle cx="${cx.toFixed(0)}" cy="${(y + len).toFixed(0)}" r="2.6" fill="${color}" opacity=".7"/></g>`;
  }
  for (let i = 0; i < count * 3; i++) {
    out += `<circle cx="${(x + r() * w).toFixed(0)}" cy="${(y + r() * h).toFixed(0)}" r="${(0.8 + r() * 1.8).toFixed(1)}" fill="${color}" opacity=".35"/>`;
  }
  return out;
}

/** Drifting fog bands. */
export function fogBands(count = 4, { y0 = 380, y1 = 760, color = "#eef1f2", opacity = 0.55, seed = 17 } = {}) {
  const r = rng(seed);
  const g = uid("fog");
  let out = "";
  for (let i = 0; i < count; i++) {
    const y = y0 + ((y1 - y0) * i) / Math.max(1, count - 1), h = 90 + r() * 120;
    out += `<g class="a-fog" style="animation-duration:${(50 + r() * 40).toFixed(0)}s;animation-delay:-${(r() * 40).toFixed(0)}s"><ellipse cx="${(r() * W).toFixed(0)}" cy="${y.toFixed(0)}" rx="${(700 + r() * 500).toFixed(0)}" ry="${h.toFixed(0)}" fill="url(#${g})"/><ellipse cx="${(r() * W - W).toFixed(0)}" cy="${(y + 30).toFixed(0)}" rx="${(600 + r() * 400).toFixed(0)}" ry="${(h * 0.8).toFixed(0)}" fill="url(#${g})"/></g>`;
  }
  return { defs: radial(g, color, opacity), body: out };
}

/** Full-frame lightning flash overlay (animated). */
export function lightning() {
  return `<rect width="${W}" height="${H}" fill="#e8f0ff" class="a-lightning"/>`;
}

/** A soft pool of light. */
export function glow(x, y, r, color, opacity = 0.6, cls = "") {
  const g = uid("glow");
  return { defs: radial(g, color, opacity), body: `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})" class="${cls}"/>` };
}

/** Floating motes (flour dust, embers, fireflies). */
export function motes(count, { x0 = 0, x1 = W, y0 = 0, y1 = H, color = "#fff6e0", size = [1, 3], seed = 19, cls = "a-mote", opacity = 0.6 } = {}) {
  const r = rng(seed);
  let out = "";
  for (let i = 0; i < count; i++) {
    const dur = 8 + r() * 10;
    out += `<circle cx="${(x0 + r() * (x1 - x0)).toFixed(0)}" cy="${(y0 + r() * (y1 - y0)).toFixed(0)}" r="${(size[0] + r() * (size[1] - size[0])).toFixed(1)}" fill="${color}" opacity="${opacity}" class="${cls}" style="animation-duration:${dur.toFixed(1)}s;animation-delay:-${(r() * dur).toFixed(1)}s"/>`;
  }
  return out;
}

/** Warm string lights hung in a catenary from (x1,y1) to (x2,y2). */
export function stringLights(x1, y1, x2, y2, sag = 60, { count = 14, color = "#ffd58a", wire = "#2a2230", seed = 23 } = {}) {
  const r = rng(seed);
  const mx = (x1 + x2) / 2, my = Math.max(y1, y2) + sag;
  let bulbs = "";
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const x = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t * t * x2;
    const y = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * my + t * t * y2;
    bulbs += `<g class="a-twinkle-soft" style="animation-delay:-${(r() * 4).toFixed(2)}s"><circle cx="${x.toFixed(1)}" cy="${(y + 6).toFixed(1)}" r="16" fill="${color}" opacity=".18"/><circle cx="${x.toFixed(1)}" cy="${(y + 6).toFixed(1)}" r="5" fill="${color}"/></g>`;
  }
  return `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${wire}" stroke-width="2"/>${bulbs}`;
}

/** Final color-grade overlay so every scene sits in its time of day. */
export function ambient(pal) {
  return `<rect width="${W}" height="${H}" fill="${pal.ambient}" pointer-events="none"/>`;
}

/** Wrap defs + body into a full scene SVG string. */
export function svgFrame(parts, { cls = "" } = {}) {
  const defs = parts.map((p) => (typeof p === "string" ? "" : p.defs ?? "")).join("");
  const body = parts.map((p) => (typeof p === "string" ? p : p.body ?? "")).join("");
  return `<svg class="scene-art ${cls}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;
}
