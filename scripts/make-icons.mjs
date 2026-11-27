// The app's icons: a paper lantern rising over night water with the last
// ferry on the horizon, for the PWA / home screen; and a simplified favicon
// (the lantern alone) for browser tabs as favicon.svg, favicon-32.png and
// favicon.ico. Rasterised with headless Chrome (no dependencies; set CHROME
// to the browser if it isn't found). Adapted from BlackJack/scripts/make-icons.mjs.
//
//   node scripts/make-icons.mjs

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public');
mkdirSync(out, { recursive: true });

const DEFS =
  `<defs>` +
  `<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2752"/><stop offset=".62" stop-color="#3b2f63"/><stop offset="1" stop-color="#17121f"/></linearGradient>` +
  `<linearGradient id="paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a8"/><stop offset=".55" stop-color="#ffb35c"/><stop offset="1" stop-color="#ea7040"/></linearGradient>` +
  `<radialGradient id="glow"><stop offset="0" stop-color="#ffcf86" stop-opacity=".75"/><stop offset="1" stop-color="#ffcf86" stop-opacity="0"/></radialGradient>` +
  `</defs>`;

/** A paper lantern centred on (cx, cy), `s` = scale (1 ≈ 34 × 40 units). */
function lantern(cx, cy, s) {
  const w = 17 * s, h = 20 * s;
  return (
    `<circle cx="${cx}" cy="${cy}" r="${30 * s}" fill="url(#glow)"/>` +
    `<path d="M${cx - w} ${cy - h * 0.55} Q${cx} ${cy - h * 1.25} ${cx + w} ${cy - h * 0.55} L${cx + w * 0.92} ${cy + h * 0.6} Q${cx} ${cy + h * 1.08} ${cx - w * 0.92} ${cy + h * 0.6}Z" fill="url(#paper)"/>` +
    [-0.5, 0, 0.5].map((k) => `<path d="M${cx + w * k} ${cy - h * 0.78} Q${cx + w * k * 1.25} ${cy} ${cx + w * k} ${cy + h * 0.78}" fill="none" stroke="#c4552f" stroke-opacity=".45" stroke-width="${1.1 * s}"/>`).join('') +
    `<rect x="${cx - w * 0.42}" y="${cy - h * 1.02}" width="${w * 0.84}" height="${3.2 * s}" rx="${1.2 * s}" fill="#5a2f2a"/>` +
    `<rect x="${cx - w * 0.5}" y="${cy + h * 0.72}" width="${w}" height="${3.2 * s}" rx="${1.2 * s}" fill="#5a2f2a"/>` +
    `<ellipse cx="${cx - w * 0.35}" cy="${cy - h * 0.2}" rx="${3 * s}" ry="${7 * s}" fill="#fff6dc" opacity=".45"/>`
  );
}

/** The full art in a 100 × 100 box. `bleed`: full square (maskable / iOS), art scaled into the safe zone. */
function svg({ bleed = false } = {}) {
  const art =
    `<circle cx="74" cy="22" r="5.5" fill="#f4f1dc" opacity=".9"/>` +
    [[18, 16], [30, 28], [86, 40], [12, 44], [62, 12]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#fffbe8"/>`).join('') +
    // the island and the last ferry on the horizon
    `<path d="M0 70 Q14 63 30 68 Q42 64 52 70 L52 72 L0 72Z" fill="#2a2450"/>` +
    `<rect x="58" y="66.5" width="22" height="4" rx="1.4" fill="#f2ede4"/><rect x="62" y="63" width="12" height="3.8" rx="1" fill="#e9e2d6"/>` +
    [61, 65, 69, 73, 77].map((x) => `<rect x="${x}" y="67.6" width="1.6" height="1.4" fill="#ffcf86"/>`).join('') +
    `<rect x="0" y="72" width="100" height="28" fill="#15183a"/>` +
    `<path d="M50 72 L46 100 L54 100Z" fill="#ffcf86" opacity=".22"/>` +
    [78, 84, 91].map((y, i) => `<path d="M${10 + i * 6} ${y} q8 -3 16 0 t16 0 t16 0 t16 0" fill="none" stroke="#6fc3c0" stroke-opacity="${0.55 - i * 0.12}" stroke-width="1.6" stroke-linecap="round"/>`).join('') +
    lantern(50, 42, 1.15) +
    lantern(24, 55, 0.42) +
    lantern(80, 52, 0.36);
  const inner = bleed ? `<g transform="translate(10 10) scale(.8)">${art}</g>` : art;
  // Bleed: the art is scaled into the safe zone, so carry the sea out to the edges.
  const bg = bleed ? `<rect width="100" height="100" fill="url(#night)"/><rect y="67.6" width="100" height="32.4" fill="#15183a"/>` : `<rect width="100" height="100" rx="22" fill="url(#night)"/>`;
  const clip = bleed ? '' : `<clipPath id="r"><rect width="100" height="100" rx="22"/></clipPath>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${DEFS.replace('</defs>', `${clip}</defs>`)}${bg}<g${bleed ? '' : ' clip-path="url(#r)"'}>${inner}</g></svg>`;
}

/** Tabs: one bold lantern on the night square, legible at 16 px. */
function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${DEFS}<rect width="100" height="100" rx="22" fill="url(#night)"/>${lantern(50, 50, 1.9)}</svg>`;
}

function writeIco(file, pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  writeFileSync(file, Buffer.concat([header, ...pngs.map((p) => p.data)]));
}

function findChrome() {
  const candidates = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('No Chrome found; set CHROME to a Chrome / Edge / Chromium binary.');
  return found;
}

/**
 * Headless Chrome sometimes writes the screenshot and then never exits, so
 * wait for the PNG to appear and kill the browser ourselves.
 */
async function rasterise(chrome, markup, size, file, tmp) {
  const html = join(tmp, `${size}.html`);
  writeFileSync(html, `<!doctype html><html><body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  rmSync(file, { force: true });
  const child = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    `--user-data-dir=${join(tmp, `profile-${size}-${Date.now()}`)}`,
    `--window-size=${size},${size}`,
    `--screenshot=${file}`,
    pathToFileURL(html).href,
  ], { stdio: 'ignore' });
  const started = Date.now();
  try {
    for (;;) {
      let bytes = 0;
      try { bytes = statSync(file).size; } catch { /* not yet */ }
      if (bytes > 0) break;
      if (Date.now() - started > 60000) throw new Error(`timed out rendering ${file}`);
      await new Promise((r) => setTimeout(r, 150));
    }
    await new Promise((r) => setTimeout(r, 250));
  } finally {
    child.kill();
  }
}

const chrome = findChrome();
const tmp = mkdtempSync(join(tmpdir(), 'ferry-icons-'));
try {
  writeFileSync(join(out, 'favicon.svg'), faviconSvg());
  await rasterise(chrome, faviconSvg(), 32, join(out, 'favicon-32.png'), tmp);
  const sizes = [16, 32, 48];
  for (const n of sizes) await rasterise(chrome, faviconSvg(), n, join(tmp, `fav-${n}.png`), tmp);
  writeIco(join(out, 'favicon.ico'), sizes.map((n) => ({ size: n, data: readFileSync(join(tmp, `fav-${n}.png`)) })));
  await rasterise(chrome, svg(), 192, join(out, 'icon-192.png'), tmp);
  await rasterise(chrome, svg(), 512, join(out, 'icon-512.png'), tmp);
  await rasterise(chrome, svg({ bleed: true }), 512, join(out, 'icon-maskable-512.png'), tmp);
  await rasterise(chrome, svg({ bleed: true }), 180, join(out, 'apple-touch-icon.png'), tmp);
  console.log('icons written to', out);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
