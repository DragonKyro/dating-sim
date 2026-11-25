// Content linter: checks every character and level JSON against the schema the
// engine expects, cross-references ids/flags/scenes, and flags levels that are
// mathematically too hard for their turn budget. No dependencies.
//
//   node tools/validate.mjs        (exit code 1 on errors)

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { effectiveDelta, ASK_DELIVERY_BONUS } from "../js/engine.js";
import { applyOutcome, startingInterest } from "../js/content.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));
const errors = [], warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

// Fairness model: a steady good player earns about +5 raw per message
// (judge.md: honest effort +3..+4, very good +5..+7), shaped by the engine's
// diminishing-returns curve. They should reach the bar with turns to spare.
const GOOD_RAW = 5;
function turnsToReach(start, threshold, raw = GOOD_RAW) {
  let v = start, n = 0;
  while (v < threshold && n < 60) { v = Math.min(100, v + effectiveDelta(raw, v)); n++; }
  return n;
}

// ---- scenes registry (parsed from source so this runs without the DOM) ----------
const scenesSrc = read("js/art/scenes.js");
const SCENES = {};
for (const m of scenesSrc.matchAll(/^\s+(\w+):\s+\{[^}]*times:\s*\[([^\]]*)\](?:,\s*weathers:\s*\[([^\]]*)\])?/gm)) {
  const list = (s) => (s ?? "").split(",").map((x) => x.trim().replace(/"/g, "")).filter(Boolean);
  SCENES[m[1]] = { times: list(m[2]), weathers: list(m[3]) };
}
for (const id of Object.keys(SCENES)) {
  if (!existsSync(join(root, `js/art/scenes/${id}.js`))) warn(`scene ${id}`, "registered but js/art/scenes/" + id + ".js is missing");
}

// ---- characters -------------------------------------------------------------------
const MOODS = ["neutral", "happy", "laugh", "flirty", "interested", "surprised", "flustered", "annoyed", "sad", "thinking"];
const charIds = json("characters/index.json");
const chars = {};
const wardrobe = read("js/art/wardrobe.js");
for (const id of charIds) {
  const where = `characters/${id}.json`;
  if (!existsSync(join(root, where))) { err(where, "listed in index.json but missing"); continue; }
  const c = json(where);
  chars[id] = c;
  if (c.id !== id) err(where, `id "${c.id}" doesn't match filename`);
  for (const k of ["displayName", "persona", "look", "judge", "color"]) if (!c[k]) err(where, `missing ${k}`);
  if (c.persona && !existsSync(join(root, c.persona))) err(where, `persona file ${c.persona} not found`);
  if (c.judge) {
    if (!c.judge.summary) err(where, "judge.summary missing");
    if (!Array.isArray(c.judge.loves) || c.judge.loves.length < 2) err(where, "judge.loves needs 2+ entries");
    if (!Array.isArray(c.judge.hates) || c.judge.hates.length < 2) err(where, "judge.hates needs 2+ entries");
  }
  const look = c.look ?? {};
  if (!look.skin || !look.eyes || !look.hair?.color) err(where, "look needs skin, eyes, hair.color");
  if (look.hair?.style && !wardrobe.includes(`${look.hair.style}: {`)) err(where, `unknown hair style "${look.hair.style}"`);
  for (const o of [look.outfit, ...Object.values(look.outfits ?? {})]) {
    if (o && !wardrobe.includes(`${o.style}: (`)) err(where, `unknown outfit style "${o.style}"`);
  }
  for (const e of look.extras ?? []) if (!wardrobe.includes(`${e}: {`)) err(where, `unknown extra "${e}"`);
}

// ---- levels -----------------------------------------------------------------------
const levelIds = json("levels/index.json");
const levels = [];
for (const id of levelIds) {
  const where = `levels/${id}.json`;
  if (!existsSync(join(root, where))) { err(where, "listed in index.json but missing"); continue; }
  levels.push(json(where));
}

const producedFlags = new Set();
for (const l of levels) {
  for (const f of [...(l.onComplete?.flags ?? []), ...(l.onFail?.flags ?? [])]) producedFlags.add(f);
  for (const s of l.secrets ?? []) if (s.flag) producedFlags.add(s.flag);
}

const OBJ_TYPES = ["ask", "reach", "endure"];
const byId = Object.fromEntries(levels.map((l) => [l.id, l]));
/** Start interest after winning every prerequisite at threshold+5 (bond bonus included). */
function expectedStart(level) {
  const state = { levels: {}, characters: {}, storyFlags: [], endings: [] };
  const chain = [];
  const visit = (id) => { const l = byId[id]; if (!l) return; for (const p of l.prerequisites?.levels ?? []) visit(p); if (!chain.includes(id)) chain.push(id); };
  for (const p of level.prerequisites?.levels ?? []) visit(p);
  for (const id of chain) applyOutcome(state, byId[id], { outcome: "win", finalInterest: (byId[id].objective?.threshold ?? 60) + 5, revealed: [] });
  return startingInterest(level, state.characters[level.characters?.[0]]);
}
for (const l of levels) {
  const where = `levels/${l.id}.json`;
  const req = ["id", "chapter", "title", "characters", "scene", "when", "location", "card", "intro", "situation", "opening", "startInterest", "exit", "objective"];
  for (const k of req) if (l[k] === undefined || l[k] === "") err(where, `missing ${k}`);
  if (!Array.isArray(l.intro)) err(where, "intro must be an array of paragraphs");

  for (const cid of l.characters ?? []) if (!chars[cid]) err(where, `unknown character "${cid}"`);
  const c = chars[l.characters?.[0]];

  const sc = SCENES[l.scene?.id];
  if (!sc) err(where, `unknown scene "${l.scene?.id}"`);
  else {
    if (l.scene.time && !sc.times.includes(l.scene.time)) err(where, `scene ${l.scene.id} has no time "${l.scene.time}" (has ${sc.times})`);
    if (l.scene.weather && sc.weathers.length && !sc.weathers.includes(l.scene.weather)) err(where, `scene ${l.scene.id} has no weather "${l.scene.weather}"`);
  }
  if (l.outfit && !c?.look?.outfits?.[l.outfit]) err(where, `character has no outfit "${l.outfit}"`);

  // Objective shape + fairness.
  const o = l.objective ?? {};
  if (!OBJ_TYPES.includes(o.type)) err(where, `objective.type must be one of ${OBJ_TYPES}`);
  if (!o.label) err(where, "objective.label missing");
  if (!o.success) err(where, "objective.success (director note) missing");
  const start = l.startInterest ?? 25;
  const realStart = expectedStart(l);
  if (o.type === "ask" || o.type === "reach") {
    if (typeof o.threshold !== "number") err(where, "objective.threshold missing");
    const turns = l.maxTurns ?? 12;
    // Asks: a smooth ask lands ASK_DELIVERY_BONUS.smooth under the bar, and
    // the ask itself takes one more turn.
    const bar = o.type === "ask" ? o.threshold - ASK_DELIVERY_BONUS.smooth : o.threshold;
    const need = turnsToReach(realStart, bar) + (o.type === "ask" ? 1 : 0);
    const great = turnsToReach(realStart, bar, 8) + (o.type === "ask" ? 1 : 0);
    if (o.threshold <= start) err(where, `threshold ${o.threshold} <= startInterest ${start}`);
    if (need > turns) err(where, `a steady good player needs ${need} turns but only has ${turns}`);
    else if (need > turns - 2) warn(where, `tight: a steady good player needs ${need} of ${turns} turns`);
    else if (need < turns / 2 - 1) warn(where, `easy: a steady good player needs only ${need} of ${turns} turns`);
    if (process.argv.includes("--fairness")) console.log(`  ${l.id.padEnd(20)} ${o.type.padEnd(6)} ${realStart}→${o.threshold}: good ~${need}, great ~${great} of ${turns} turns`);
  }
  if (o.type === "ask") {
    if (!o.move) err(where, "ask objectives need objective.move (what the judge detects)");
    if (!o.refuse) warn(where, "ask objective has no refuse note; a generic deflection will be used");
  }
  if (o.type === "endure") {
    if (typeof o.turns !== "number" || typeof o.floor !== "number") err(where, "endure needs objective.turns and objective.floor");
    if (o.floor >= start) err(where, `endure floor ${o.floor} >= startInterest ${start}`);
    if (l.maxTurns && l.maxTurns !== o.turns) warn(where, "endure ignores maxTurns (uses objective.turns)");
  }

  // Secrets.
  const seen = new Set();
  for (const s of l.secrets ?? []) {
    const sw = `${where} secret ${s.id}`;
    if (!s.id || seen.has(s.id)) err(sw, "missing or duplicate id");
    seen.add(s.id);
    for (const k of ["label", "trigger", "reveal", "journal", "flag"]) if (!s[k]) err(sw, `missing ${k}`);
    if (typeof s.minInterest !== "number") err(sw, "missing minInterest");
    const goal = o.threshold ?? 100;
    if (s.minInterest >= goal) warn(sw, `minInterest ${s.minInterest} >= objective threshold ${goal}; players will usually win first`);
  }

  // Cross references.
  for (const p of l.prerequisites?.levels ?? []) if (!levelIds.includes(p)) err(where, `prerequisite level "${p}" doesn't exist`);
  for (const f of l.prerequisites?.flags ?? []) if (!producedFlags.has(f)) err(where, `prerequisite flag "${f}" is never set by any level`);
  for (const e of [...(l.situationIf ?? []), ...(l.flavor ?? [])]) {
    for (const f of [...(e.if ?? []), ...(e.ifNot ?? [])]) if (!producedFlags.has(f)) err(where, `condition flag "${f}" is never set by any level`);
  }
  if (!(l.flavor ?? []).some((f) => !(f.if?.length) && !(f.ifNot?.length)) && (l.flavor ?? []).length) warn(where, "no unconditional flavor card fallback");
  for (const id of Object.keys(l.onComplete?.affection ?? {})) if (!chars[id]) err(where, `onComplete.affection: unknown character ${id}`);
  if (!l.outro?.win || !l.outro?.lose) warn(where, "outro.win / outro.lose missing");
  if (!l.tips?.length) warn(where, "no tips for the briefing");
}

// Every level reachable?
const done = new Set();
let progress = true;
while (progress) {
  progress = false;
  for (const l of levels) {
    if (done.has(l.id)) continue;
    if ((l.prerequisites?.levels ?? []).every((p) => done.has(p))) { done.add(l.id); progress = true; }
  }
}
for (const l of levels) if (!done.has(l.id)) err(`levels/${l.id}.json`, "unreachable (prerequisite cycle or missing)");

for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`\n${levels.length} levels, ${Object.keys(chars).length} characters: ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
