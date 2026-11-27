// Checks the layered scene pipeline (src/art/layers.ts) against the plain
// inline SVG: every scene variant is rendered both ways in headless
// Chrome/Edge with motion on, every animation paused at the same moment, and
// the two screenshots compared pixel by pixel.
//
//   npm run dev                                   (separate terminal)
//   node scripts/layer-diff.mjs                   (all variants)
//   node scripts/layer-diff.mjs harbor            (variants containing "harbor")
//   SAVE=1 node scripts/layer-diff.mjs boat       (also writes both PNGs to playtests/layer-diff/)
//
// Expect a few percent "differ" (antialiasing; pieces past the per-scene caps
// that stay still) and well under 2% "strongly". More than that means something
// is missing, misplaced or out of paint order: look at the saved PNGs.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BASE = process.env.BASE ?? "http://127.0.0.1:5173/dating-sim/";
const W = Number(process.env.W ?? 1440), H = Number(process.env.H ?? 900);
const OUT = "playtests/layer-diff";

const exe = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean).find(existsSync);
if (!exe) throw new Error("No Chrome/Edge found");
const profile = mkdtempSync(join(tmpdir(), "ferry-layers-"));
// A random debug port, read back from our own profile: never a fixed port.
const browser = spawn(exe, ["--headless=new", "--hide-scrollbars", "--remote-debugging-port=0", `--window-size=${W},${H}`, "--force-device-scale-factor=1", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 100 && !ws; i++) {
  try {
    const [port] = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split(/\r?\n/);
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const url = list.find((t) => t.type === "page")?.webSocketDebuggerUrl;
    if (url) ws = new WebSocket(url);
  } catch {}
  if (!ws) await sleep(200);
}
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id) pending.get(m.id)?.(m);
});
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Page.enable");
// Headless Chrome reports prefers-reduced-motion: reduce, and with it the
// game lifts no layers at all. Measure what players see.
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });

async function shot(query) {
  await send("Page.navigate", { url: `${BASE}preview.html?${query}` });
  for (let i = 0; i < 50; i++) {
    if (await evaluate(`return document.body?.dataset.ready === "1"`)) break;
    await sleep(100);
  }
  await sleep(400);
  const info = await evaluate(`for (const a of document.getAnimations()) { a.pause(); a.currentTime = 1500; } await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return document.body.dataset.layers ?? "";`);
  const png = (await send("Page.captureScreenshot", { format: "png" })).result.data;
  return { png, info };
}

await send("Page.navigate", { url: `${BASE}preview.html` });
await sleep(1500);
const scenes = await evaluate(`const m = await import("/dating-sim/src/art/scenes.ts"); return Object.entries(m.SCENES).map(([id, d]) => [id, d.times, d.weathers ?? [null]]);`);
const variants = [];
for (const [scene, times, weathers] of scenes) for (const t of times) for (const w of weathers) variants.push(`scene=${scene}&time=${t}${w ? `&weather=${w}` : ""}`);
const only = process.argv[2];
if (process.env.SAVE) mkdirSync(OUT, { recursive: true });

console.log("variant".padEnd(44), "layers/stills", " differ", " strongly");
for (const v of variants.filter((v) => !only || v.includes(only))) {
  const inline = await shot(v);
  const layered = await shot(`${v}&layered=1`);
  // Compare in the browser (canvas), so this needs no image library.
  const [differ, strongly] = await evaluate(`
    const load = (d) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = "data:image/png;base64," + d; });
    const [x, y] = await Promise.all([load(${JSON.stringify(inline.png)}), load(${JSON.stringify(layered.png)})]);
    const px = (img) => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
    const p = px(x), q = px(y); let n = 0, big = 0;
    for (let i = 0; i < p.length; i += 4) { const d = Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]); if (d > 24) n++; if (d > 96) big++; }
    const total = p.length / 4; return [(100 * n / total).toFixed(2), (100 * big / total).toFixed(2)];`);
  console.log(v.padEnd(44), String(layered.info).padStart(13), `${differ}%`.padStart(7), `${strongly}%`.padStart(9));
  if (process.env.SAVE) {
    const f = v.replace(/[=&]/g, "_");
    writeFileSync(join(OUT, `${f}-inline.png`), Buffer.from(inline.png, "base64"));
    writeFileSync(join(OUT, `${f}-layered.png`), Buffer.from(layered.png, "base64"));
  }
}
ws.close();
browser.kill();
