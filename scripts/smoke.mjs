// Browser smoke test (dev only): drives headless Edge/Chrome over the DevTools
// protocol through title → map → briefing → a real scene turn → journal,
// saving screenshots and failing on any console error / exception.
//
//   npm run dev                     (separate terminal; or set BASE=http://.../dating-sim/)
//   npm run smoke -- [outDir] [--no-turn] [--mobile]
//
// The real turn uses the key from secrets.local.json. Works against `npm run dev`
// or a production build served by `npm run preview` (BASE=http://127.0.0.1:4173/dating-sim/).

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const outDir = resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "playtests/smoke");
const doTurn = !process.argv.includes("--no-turn");
const BASE = process.env.BASE ?? "http://127.0.0.1:5173/dating-sim/";
mkdirSync(outDir, { recursive: true });

const exe = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find(existsSync);
if (!exe) throw new Error("No Edge/Chrome found");

const profile = mkdtempSync(join(tmpdir(), "lastferry-"));
// Port 0 = let the browser pick a free port and write it to DevToolsActivePort
// in our private profile. Never attach to a fixed port: another browser
// (someone else's session) may already own it.
const browser = spawn(exe, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio", "--remote-debugging-port=0", `--user-data-dir=${profile}`, `--window-size=${process.argv.includes("--mobile") ? "390,844" : "1440,900"}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 100; i++) {
    try {
      const [port] = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split(/\r?\n/);
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === "page" && t.url === "about:blank");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("browser didn't start");
}

const ws = new WebSocket(await target());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
const problems = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === "Runtime.exceptionThrown") problems.push(`exception: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") problems.push(`console.error: ${msg.params.args.map((a) => a.value ?? a.description).join(" ")}`);
  if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error" && !/favicon/.test(msg.params.entry.url ?? "")) problems.push(`log: ${msg.params.entry.text} ${msg.params.entry.url ?? ""}`);
});
const send = (method, params = {}) => new Promise((res, rej) => {
  const n = ++id;
  pending.set(n, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
  ws.send(JSON.stringify({ id: n, method, params }));
});
const evaluate = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const waitFor = async (cond, ms = 15000, label = cond) => {
  const t = Date.now();
  while (Date.now() - t < ms) { if (await evaluate(`return !!(${cond});`)) return; await sleep(150); }
  throw new Error(`timed out waiting for ${label}`);
};
const shot = async (name) => {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(data, "base64"));
  console.log(`  📸 ${name}.png`);
};
const click = (sel) => evaluate(`const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error(${JSON.stringify(`no element ${sel}`)}); el.click(); return true;`);
// React inputs ignore a plain .value write: use the native setter + an input event.
const fill = (sel, text) => evaluate(`const el = document.querySelector(${JSON.stringify(sel)}); const proto = Object.getPrototypeOf(el); Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(text)}); el.dispatchEvent(new Event("input", { bubbles: true })); return true;`);
const clickText = (sel, text) => evaluate(`const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.textContent.includes(${JSON.stringify(text)})); if (!el) throw new Error(${JSON.stringify(`no ${sel} with text ${text}`)}); el.click(); return true;`);

let failed = false;
try {
  await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable");
  console.log("title");
  await send("Page.navigate", { url: BASE });
  await waitFor(`document.querySelector(".title-logo")`);
  // Start clean, with the dev key (from the gitignored secrets.local.json)
  // already in prefs, so this also works against a production build.
  const devKey = existsSync("secrets.local.json") ? JSON.parse(readFileSync("secrets.local.json", "utf8")).apiKey : "";
  await evaluate(`localStorage.clear(); localStorage.setItem("datingSim.prefs", ${JSON.stringify(JSON.stringify({ apiKey: devKey }))}); return true;`);
  await send("Page.navigate", { url: BASE });
  await waitFor(`document.querySelector(".title-logo")`);
  await sleep(900);
  await shot("01-title");

  console.log("name prompt → map");
  await clickText("button", "Begin");
  await waitFor(`document.querySelector(".modal input")`, 8000, "name prompt");
  await shot("02-name");
  await fill(".modal input", "Sam");
  await clickText(".modal button", "Board the ferry");
  await waitFor(`document.querySelector(".level-card")`);
  await sleep(600);
  await shot("03-map");
  const cards = await evaluate(`return [...document.querySelectorAll(".level-card")].map((c) => c.disabled ? "locked" : "open").join(",");`);
  console.log(`  cards: ${cards}`);

  console.log("briefing");
  await click(".level-card:not(.locked)");
  await waitFor(`document.querySelector(".brief-card")`);
  await sleep(500);
  await shot("04-briefing");

  console.log("scene");
  await clickText(".brief-card button", "Begin");
  await waitFor(`document.querySelector(".stage-char svg") && document.querySelector(".line.her .text")?.textContent.length > 20`, 15000, "opening line");
  await sleep(2500);
  await shot("05-scene");

  if (doTurn) {
    console.log("turn (real Gemini call)");
    await waitFor(`!document.querySelector(".composer textarea").disabled`, 20000, "input enabled after her opening line");
    await fill(".composer textarea", "Need a hand? I've lost fights to worse carts than that. *grabs the other end*");
    await click(".composer .btn");
    await waitFor(`document.querySelectorAll(".line.her").length >= 2 && !document.querySelector(".typing")`, 60000, "her reply");
    await sleep(4000);
    await shot("06-after-turn");
    const fb = await evaluate(`return document.querySelector(".fb")?.textContent ?? "(no feedback)";`);
    const meter = await evaluate(`return document.querySelector(".meter-num")?.textContent;`);
    const err = await evaluate(`return document.querySelector(".sys.err")?.textContent ?? "";`);
    console.log(`  feedback: ${fb}\n  meter: ${meter}${err ? `\n  ERROR LINE: ${err}` : ""}`);
    if (err) failed = true;
  }

  console.log("journal");
  await evaluate(`location.hash = "#/journal"; return true;`);
  await waitFor(`document.querySelector(".person")`);
  await sleep(500);
  await shot("07-journal");

  console.log("settings");
  await evaluate(`location.hash = "#/island"; return true;`);
  await waitFor(`document.querySelector(".level-card")`);
  await click('.map-top .icon-btn[title="Settings"]');
  await waitFor(`document.querySelector(".modal h2")`);
  await sleep(300);
  await shot("08-settings");
} catch (err) {
  failed = true;
  console.error("FAILED:", err.message);
  try { await shot("zz-failure"); } catch {}
} finally {
  ws.close();
  browser.kill();
}
if (problems.length) {
  failed = true;
  console.log("\nBrowser problems:");
  for (const p of problems) console.log("  " + p);
}
console.log(failed ? "\nSMOKE TEST FAILED" : "\nsmoke test passed");
process.exit(failed ? 1 : 0);
