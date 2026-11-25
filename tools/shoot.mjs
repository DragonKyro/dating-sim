// Headless screenshot helper (dev only). Needs a local server (HOST, default
// 127.0.0.1:8123; e.g. `node tools/serve.mjs 8123`) and Edge or Chrome.
//
//   node tools/shoot.mjs <out.png> "<path?query>" [width] [height]
//   node tools/shoot.mjs shots/ferry.png "tools/preview.html?scene=ferry&time=golden"

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";

const [out, path, w = "1600", h = "900"] = process.argv.slice(2);
if (!out || !path) {
  console.error('usage: node tools/shoot.mjs <out.png> "<path?query>" [width] [height]');
  process.exit(1);
}
const browsers = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const exe = browsers.find(existsSync);
if (!exe) { console.error("No Edge/Chrome found"); process.exit(1); }
const file = resolve(out);
mkdirSync(dirname(file), { recursive: true });
// Each run gets a private profile (parallel runs otherwise share one browser
// process and hang), and the browser is killed as soon as the PNG is written:
// headless Edge sometimes never exits on its own.
const profile = mkdtempSync(join(tmpdir(), "shoot-"));
try { rmSync(file); } catch {}
const child = spawn(exe, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio", `--user-data-dir=${profile}`,
  "--virtual-time-budget=4000", `--window-size=${w},${h}`, `--screenshot=${file}`,
  `http://${process.env.HOST ?? "127.0.0.1:8123"}/${path}`,
], { stdio: "ignore" });
const started = Date.now();
await new Promise((res, rej) => {
  const t = setInterval(() => {
    let size = 0;
    try { size = statSync(file).size; } catch {}
    if (size > 0) { clearInterval(t); setTimeout(res, 300); }
    else if (Date.now() - started > 60000) { clearInterval(t); rej(new Error("screenshot timed out")); }
  }, 150);
});
child.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
console.log(file);
