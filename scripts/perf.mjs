// Frame-rate probe (dev only): opens game screens in headless Chrome/Edge and
// measures, over a few idle seconds, frames per second and how busy the main
// thread is (script, style, layout, and everything else incl. paint).
//
//   npm run dev                                  (separate terminal)
//   node scripts/perf.mjs                        (default screens)
//   node scripts/perf.mjs "#/scene/10-storm-noor" "#/island"
//
// Rendered at devicePixelRatio 2 (DPR=1 to change) like a laptop screen.
// Besides main-thread time it traces paint + raster work on every thread
// (the cost of redrawing art, where animated SVG hurts) and compositing (the
// cost of drawing each frame: headless Chrome composites in software, like a
// PC without GPU acceleration, so this is the column that tracks real lag on
// such machines). Headless fps is noisy (it snaps between ~30 and ~60): trust
// the ms/s columns. Compare before/after a change; absolute numbers depend on
// the machine.
//
//   PREFS='{"motion":"lite","motionChecked":true}'   device prefs to start with
//       (motionChecked stops the first-scene frame-rate check from switching
//       Full to Lite mid-measurement)
//   CSS='.fx-layer{display:none}'   inject a stylesheet, to try a change quickly
//   SECONDS=4 SETTLE=3500           sample length / wait before sampling
//   NAMES=1                         print the costliest trace events
//   REDUCED=1                       keep headless Chrome's reduced motion

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BASE = process.env.BASE ?? "http://127.0.0.1:5173/dating-sim/";
const SECONDS = Number(process.env.SECONDS ?? 4);
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ["#/", "#/island", "#/scene/01-ferry", "#/scene/10-storm-noor", "#/scene/13-lantern-rosie"];

const exe = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean).find(existsSync);
if (!exe) throw new Error("No Chrome/Edge found");
const profile = mkdtempSync(join(tmpdir(), "ferry-perf-"));
// A random debug port, read back from our own profile: never a fixed port.
const browser = spawn(exe, ["--headless=new", "--hide-scrollbars", "--mute-audio", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--window-size=1440,900", `--force-device-scale-factor=${process.env.DPR ?? 2}`, ...(process.env.GPU ? ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : []), "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 100 && !wsUrl; i++) {
  try {
    const [port] = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split(/\r?\n/);
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    wsUrl = list.find((t) => t.type === "page" && t.url === "about:blank")?.webSocketDebuggerUrl;
  } catch {}
  if (!wsUrl) await sleep(200);
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((res) => { const n = ++id; pending.set(n, (m) => res(m.result)); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true }))?.result?.value;
const metrics = async () => Object.fromEntries((await send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
let traceEvents = [];
let traceDone = null;
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Tracing.dataCollected") traceEvents.push(...m.params.value);
  if (m.method === "Tracing.tracingComplete") traceDone?.();
});
const DRAW = process.env.DRAW ?? "DirectRenderer::DrawFrame";
const RASTER = new Set(["Paint", "RasterTask", "PaintImage", "Decode Image", "ImageDecodeTask", "DisplayItemList::Raster", "Layerize", "PrePaint"]);
async function traced(fn) {
  traceEvents = [];
  await send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline,cc,blink,viz", transferMode: "ReportEvents" });
  const out = await fn();
  const done = new Promise((r) => (traceDone = r));
  await send("Tracing.end");
  await done;
  let raster = 0;
  let draw = 0;
  const names = {};
  for (const e of traceEvents) {
    if (e.ph !== "X") continue;
    if (RASTER.has(e.name)) raster += (e.dur ?? 0) / 1000;
    // Compositing the frame (in software, without a GPU, this is the big one).
    if (e.name === DRAW) draw += (e.dur ?? 0) / 1000;
    if (process.env.NAMES) { const n = (names[e.name] ??= [0, 0]); n[0] += (e.dur ?? 0) / 1000; n[1]++; }
  }
  if (process.env.NAMES) console.log(Object.entries(names).sort((a, b) => b[1][0] - a[1][0]).slice(0, 25).map(([k, [ms, n]]) => `${k} ${ms.toFixed(0)}ms ×${n}`).join(String.fromCharCode(10)));
  return { out, raster, draw };
}

await send("Page.enable");
await send("Performance.enable");
// Headless Chrome reports prefers-reduced-motion: reduce, which turns the
// game's animation off. Measure what players actually see (REDUCED=1 to keep it).
if (!process.env.REDUCED) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
await send("Page.navigate", { url: BASE });
await sleep(1500);
await evaluate(`localStorage.setItem("datingSim.save", JSON.stringify({ version: 3, player: { name: "Sam", pronouns: "they" } })); localStorage.setItem("datingSim.prefs", ${JSON.stringify(process.env.PREFS ?? "{}")}); return 1;`);
// Reload so the stores pick the seeded save and prefs up (they load once, at start).
await send("Page.reload");
await sleep(1500);

console.log("screen".padEnd(30), "fps".padStart(5), "main%".padStart(6), "script".padStart(7), "style".padStart(6), "layout".padStart(7), "paint+raster ms/s".padStart(18), "composite ms/s".padStart(15));
for (const t of targets) {
  await send("Page.navigate", { url: `${BASE}${t.startsWith("#") || t.startsWith("?") ? "" : ""}${t}` });
  await evaluate(`location.hash = ${JSON.stringify(t.startsWith("#") ? t : "")}; return 1;`);
  // CSS=... injects a stylesheet, for trying a change without editing the game.
  if (process.env.CSS) await evaluate(`const s = document.createElement("style"); s.textContent = ${JSON.stringify(process.env.CSS)}; document.head.appendChild(s); return 1;`);
  await sleep(Number(process.env.SETTLE ?? 3500)); // let the screen settle (opening line types out)
  const a = await metrics();
  const { out: frames, raster, draw } = await traced(() => evaluate(`return await new Promise((res) => { let n = 0; const end = performance.now() + ${SECONDS * 1000}; const f = (now) => { n++; if (now < end) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); });`));
  const b = await metrics();
  const d = (k) => (b[k] ?? 0) - (a[k] ?? 0);
  const task = d("TaskDuration"), script = d("ScriptDuration"), style = d("RecalcStyleDuration"), layout = d("LayoutDuration");
  const pct = (x) => `${((100 * x) / SECONDS).toFixed(0)}%`;
  // Animations on elements inside an SVG repaint that SVG every frame.
  const inSvg = await evaluate(`const m = {}; for (const e of document.querySelectorAll("svg *")) { const n = getComputedStyle(e).animationName; if (n && n !== "none") m[n] = (m[n] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => k + "×" + v).join(" ");`);
  console.log(t.padEnd(30), (frames / SECONDS).toFixed(0).padStart(5), pct(task).padStart(6), pct(script).padStart(7), pct(style).padStart(6), pct(layout).padStart(7), (raster / SECONDS).toFixed(0).padStart(18), (draw / SECONDS).toFixed(0).padStart(15), inSvg ? `  in-SVG: ${inSvg}` : "");
}
ws.close();
browser.kill();
