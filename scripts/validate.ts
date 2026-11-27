// Content linter: checks every character and level against what the engine
// expects, cross-references ids/flags/scenes, and simulates a steady good
// player to flag levels that are unfair (or trivial) for their turn budget.
//
//   npm run validate                 (exit code 1 on errors)
//   npm run validate -- --fairness   (print the per-level simulation)

import { CHARACTERS, LEVELS, PERSONAS } from '@/content';
import { SCENES } from '@/art/scenes';
import { EXTRAS, HAIR, OUTFITS } from '@/art/wardrobe';
import { ASK_DELIVERY_BONUS, effectiveDelta } from '@/game/engine';
import { applyOutcome, startingInterest } from '@/game/progress';
import type { Level } from '@/game/types';
import { freshProgress } from '@/store/saveStore';

const errors: string[] = [];
const warnings: string[] = [];
const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
const warn = (where: string, msg: string) => warnings.push(`${where}: ${msg}`);
const showFairness = process.argv.includes('--fairness');

// Fairness model: a steady good player earns about +5 raw per message
// (judge.md: honest effort +3..+4, very good +5..+7), shaped by the engine's
// diminishing-returns curve. They should reach the bar with turns to spare.
const GOOD_RAW = 5;
function turnsToReach(start: number, threshold: number, raw = GOOD_RAW): number {
  let v = start, n = 0;
  while (v < threshold && n < 60) {
    v = Math.min(100, v + effectiveDelta(raw, v));
    n++;
  }
  return n;
}

// ---- characters -------------------------------------------------------------
for (const c of Object.values(CHARACTERS)) {
  const where = `characters/${c.id}.json`;
  for (const k of ['displayName', 'fullName', 'role', 'tagline', 'color'] as const) if (!c[k]) err(where, `missing ${k}`);
  if (!PERSONAS[c.id]) err(where, `no persona at prompts/personas/${c.id}.md`);
  if (!c.judge?.summary) err(where, 'judge.summary missing');
  if ((c.judge?.loves?.length ?? 0) < 2) err(where, 'judge.loves needs 2+ entries');
  if ((c.judge?.hates?.length ?? 0) < 2) err(where, 'judge.hates needs 2+ entries');
  const look = c.look;
  if (!look?.skin || !look.eyes || !look.hair?.color) err(where, 'look needs skin, eyes, hair.color');
  if (look?.hair && !HAIR[look.hair.style]) err(where, `unknown hair style "${look.hair.style}"`);
  for (const o of [look?.outfit, ...Object.values(look?.outfits ?? {})]) if (o && !OUTFITS[o.style]) err(where, `unknown outfit style "${o.style}"`);
  for (const e of [...(look?.extras ?? []), ...Object.values(look?.outfits ?? {}).flatMap((o) => o.extras ?? [])]) if (!EXTRAS[e]) err(where, `unknown extra "${e}"`);
}

// ---- levels -----------------------------------------------------------------
const byId = new Map(LEVELS.map((l) => [l.id, l]));
const produced = new Set<string>();
for (const l of LEVELS) {
  for (const f of [...(l.onComplete?.flags ?? []), ...(l.onFail?.flags ?? [])]) produced.add(f);
  for (const s of l.secrets ?? []) produced.add(s.flag);
}

/** Start interest after winning every prerequisite at threshold+5 (bond bonus included). */
function expectedStart(level: Level): number {
  const p = freshProgress();
  const chain: string[] = [];
  const visit = (id: string) => {
    const l = byId.get(id);
    if (!l) return;
    for (const pre of l.prerequisites?.levels ?? []) visit(pre);
    if (!chain.includes(id)) chain.push(id);
  };
  for (const pre of level.prerequisites?.levels ?? []) visit(pre);
  for (const id of chain) {
    const l = byId.get(id)!;
    applyOutcome(p, l, { outcome: 'win', finalInterest: (l.objective.threshold ?? 60) + 5, revealed: [] });
  }
  return startingInterest(level, p.characters[level.characters[0]!]);
}

for (const l of LEVELS) {
  const where = `levels/${l.id}.json`;
  const required = ['id', 'chapter', 'title', 'characters', 'scene', 'when', 'location', 'card', 'intro', 'situation', 'opening', 'startInterest', 'exit', 'objective'] as const;
  for (const k of required) if (l[k] === undefined || l[k] === '') err(where, `missing ${k}`);
  if (!Array.isArray(l.intro)) err(where, 'intro must be an array of paragraphs');
  for (const cid of l.characters ?? []) if (!CHARACTERS[cid]) err(where, `unknown character "${cid}"`);
  const c = CHARACTERS[l.characters?.[0] ?? ''];

  const sc = SCENES[l.scene?.id];
  if (!sc) err(where, `unknown scene "${l.scene?.id}"`);
  else {
    if (l.scene.time && !sc.times.includes(l.scene.time)) err(where, `scene ${l.scene.id} has no time "${l.scene.time}" (has ${sc.times})`);
    if (l.scene.weather && sc.weathers && !sc.weathers.includes(l.scene.weather)) err(where, `scene ${l.scene.id} has no weather "${l.scene.weather}"`);
  }
  if (l.outfit && !c?.look.outfits?.[l.outfit]) err(where, `character has no outfit "${l.outfit}"`);

  const o = l.objective;
  if (!['ask', 'reach', 'endure'].includes(o?.type)) err(where, 'objective.type must be ask | reach | endure');
  if (!o?.label) err(where, 'objective.label missing');
  if (!o?.success) err(where, 'objective.success (director note) missing');
  const start = l.startInterest ?? 25;
  const realStart = expectedStart(l);
  if (o.type === 'ask' || o.type === 'reach') {
    if (typeof o.threshold !== 'number') err(where, 'objective.threshold missing');
    else {
      const turns = l.maxTurns ?? 12;
      // Asks: a smooth ask lands ASK_DELIVERY_BONUS.smooth under the bar, and
      // the ask itself takes one more turn.
      const bar = o.type === 'ask' ? o.threshold - (ASK_DELIVERY_BONUS.smooth ?? 0) : o.threshold;
      const need = turnsToReach(realStart, bar) + (o.type === 'ask' ? 1 : 0);
      const great = turnsToReach(realStart, bar, 8) + (o.type === 'ask' ? 1 : 0);
      if (o.threshold <= start) err(where, `threshold ${o.threshold} <= startInterest ${start}`);
      if (need > turns) err(where, `a steady good player needs ${need} turns but only has ${turns}`);
      else if (need > turns - 2) warn(where, `tight: a steady good player needs ${need} of ${turns} turns`);
      else if (need < turns / 2 - 1) warn(where, `easy: a steady good player needs only ${need} of ${turns} turns`);
      if (showFairness) console.log(`  ${l.id.padEnd(20)} ${o.type.padEnd(6)} ${realStart}→${o.threshold}: good ~${need}, great ~${great} of ${turns} turns`);
    }
  }
  if (o.type === 'ask') {
    if (!o.move) err(where, 'ask objectives need objective.move (what the judge detects)');
    if (!o.refuse) warn(where, 'ask objective has no refuse note; a generic deflection will be used');
  }
  if (o.type === 'endure') {
    if (typeof o.turns !== 'number' || typeof o.floor !== 'number') err(where, 'endure needs objective.turns and objective.floor');
    else if (o.floor >= start) err(where, `endure floor ${o.floor} >= startInterest ${start}`);
  }

  const seen = new Set<string>();
  for (const s of l.secrets ?? []) {
    const sw = `${where} secret ${s.id}`;
    if (!s.id || seen.has(s.id)) err(sw, 'missing or duplicate id');
    seen.add(s.id);
    for (const k of ['label', 'trigger', 'reveal', 'journal', 'flag'] as const) if (!s[k]) err(sw, `missing ${k}`);
    if (typeof s.minInterest !== 'number') err(sw, 'missing minInterest');
    else if (s.minInterest >= (o.threshold ?? 100)) warn(sw, `minInterest ${s.minInterest} >= objective threshold; players will usually win first`);
  }

  for (const pre of l.prerequisites?.levels ?? []) if (!byId.has(pre)) err(where, `prerequisite level "${pre}" doesn't exist`);
  for (const f of l.prerequisites?.flags ?? []) if (!produced.has(f)) err(where, `prerequisite flag "${f}" is never set by any level`);
  for (const e of [...(l.situationIf ?? []), ...(l.flavor ?? [])]) {
    for (const f of [...(e.if ?? []), ...(e.ifNot ?? [])]) if (!produced.has(f)) err(where, `condition flag "${f}" is never set by any level`);
  }
  if ((l.flavor ?? []).length && !(l.flavor ?? []).some((f) => !f.if?.length && !f.ifNot?.length)) warn(where, 'no unconditional flavor card fallback');
  for (const id of Object.keys(l.onComplete?.affection ?? {})) if (!CHARACTERS[id]) err(where, `onComplete.affection: unknown character ${id}`);
  if (!l.outro?.win || !l.outro?.lose) warn(where, 'outro.win / outro.lose missing');
  if (!l.tips?.length) warn(where, 'no tips for the briefing');
}

// Every level reachable?
const done = new Set<string>();
for (let progress = true; progress; ) {
  progress = false;
  for (const l of LEVELS) {
    if (!done.has(l.id) && (l.prerequisites?.levels ?? []).every((p) => done.has(p))) {
      done.add(l.id);
      progress = true;
    }
  }
}
for (const l of LEVELS) if (!done.has(l.id)) err(`levels/${l.id}.json`, 'unreachable (prerequisite cycle or missing)');

for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`\n${LEVELS.length} levels, ${Object.keys(CHARACTERS).length} characters: ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
