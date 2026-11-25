// Loads authored content (characters, levels, prompts) and applies the
// progression rules (prerequisites, exclusive groups, onComplete/onFail).
//
// A static site can't list directories, so characters/index.json and
// levels/index.json register what exists. The fetcher is pluggable so the
// same code runs in the browser (fetch) and in Node tools (fs).

let readText = async (path) => {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`fetch ${path} -> ${res.status}`);
  return res.text();
};

/** Node tools call this with an fs-based reader. */
export function setTextReader(fn) { readText = fn; clearContentCache(); }

const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn().catch((err) => { cache.delete(key); throw err; }));
  return cache.get(key);
}
export function clearContentCache() { cache.clear(); }

export const loadText = (path) => cached(`t:${path}`, () => readText(path));
export const loadJson = (path) => cached(`j:${path}`, async () => JSON.parse(await readText(path)));

export async function listLevelIds() { return loadJson("levels/index.json"); }
export async function listCharacterIds() { return loadJson("characters/index.json"); }
export const loadLevel = (id) => loadJson(`levels/${id}.json`);
export const loadCharacter = (id) => loadJson(`characters/${id}.json`);
export async function loadAllLevels() { return Promise.all((await listLevelIds()).map(loadLevel)); }
export async function loadAllCharacters() {
  const list = await Promise.all((await listCharacterIds()).map(loadCharacter));
  return Object.fromEntries(list.map((c) => [c.id, c]));
}

/**
 * A level as it should play for this save: situation lines whose `if` flags
 * are all set (and `ifNot` flags all unset) are appended, and the first
 * matching flavor card is picked. Returns a new object; never mutates.
 */
export function resolveLevel(level, state) {
  const has = (f) => state.storyFlags.includes(f) || Object.values(state.characters).some((c) => c.flags?.includes(f));
  const matches = (e) => (e.if ?? []).every(has) && !(e.ifNot ?? []).some(has);
  const extra = (level.situationIf ?? []).filter(matches).map((e) => e.text);
  return {
    ...level,
    situation: [level.situation, ...extra].join("\n"),
    flavorCard: (level.flavor ?? []).find(matches) ?? null,
  };
}

/** The one character who speaks in a level (multi-speaker is future work). */
export function speakerOf(level) { return level.characters[0]; }

// ---- progression -------------------------------------------------------------

/**
 * Can this level be played? Returns { ok, reasons[], lockedBy? }.
 * `levels` is the full level list (needed for exclusive groups).
 */
export function checkUnlock(level, state, levels = []) {
  const p = level.prerequisites ?? {};
  const reasons = [];
  const done = (id) => !!state.levels[id]?.completed;
  const titleOf = (id) => levels.find((l) => l.id === id)?.title ?? id;

  for (const id of p.levels ?? []) if (!done(id)) reasons.push(`Finish “${titleOf(id)}”`);
  for (const flag of p.flags ?? []) if (!state.storyFlags.includes(flag)) reasons.push(p.flagHints?.[flag] ?? `Story event needed`);
  for (const [cid, min] of Object.entries(p.affection ?? {})) {
    if ((state.characters[cid]?.affection ?? 0) < min) reasons.push(`Get closer to ${cid[0].toUpperCase() + cid.slice(1)}`);
  }
  if (level.exclusiveGroup) {
    const other = levels.find((l) => l.id !== level.id && l.exclusiveGroup === level.exclusiveGroup && done(l.id));
    if (other) return { ok: false, reasons: [`You spent that night elsewhere`], lockedBy: other.id };
  }
  return { ok: reasons.length === 0, reasons };
}

/** Interest a level run starts at: authored base plus a small bond bonus. */
export function startingInterest(level, charState) {
  const bonus = Math.min(10, Math.round((charState?.affection ?? 0) / 8));
  return Math.max(1, Math.min(95, (level.startInterest ?? 25) + bonus));
}

/**
 * Apply a finished run to the save. `result` comes from engine.summarizeRun.
 * Mutates `state` (call inside updateState).
 */
export function applyOutcome(state, level, result) {
  const won = result.outcome === "win";
  const cid = speakerOf(level);
  const ls = state.levels[level.id] ?? (state.levels[level.id] = { completed: false, attempts: 0, wins: 0, bestInterest: 0, lastOutcome: null });
  ls.attempts += 1;
  ls.lastOutcome = result.outcome;
  ls.bestInterest = Math.max(ls.bestInterest, result.finalInterest);
  if (won) { ls.completed = true; ls.wins += 1; }

  const ch = state.characters[cid] ?? (state.characters[cid] = { affection: 0, met: false, flags: [], memories: [], notes: [] });
  ch.met = true;
  const block = (won ? level.onComplete : level.onFail) ?? {};

  // Affection: authored amount, plus a bonus for clearing the bar with room to spare.
  let gain = block.affection?.[cid] ?? (won ? 10 : -2);
  if (won && level.objective?.threshold) gain += Math.max(0, Math.round((result.finalInterest - level.objective.threshold) / 5));
  for (const [id, amt] of Object.entries(block.affection ?? {})) {
    if (id === cid) continue;
    const other = state.characters[id] ?? (state.characters[id] = { affection: 0, met: false, flags: [], memories: [], notes: [] });
    other.affection = clamp(other.affection + amt, 0, 100);
  }
  ch.affection = clamp(ch.affection + gain, 0, 100);

  // Secrets learned this run stick even if the level was lost.
  for (const s of result.revealed) {
    if (s.flag && !state.storyFlags.includes(s.flag)) state.storyFlags.push(s.flag);
    if (s.memory) addMemory(ch, s.memory);
  }
  for (const f of block.flags ?? []) if (!state.storyFlags.includes(f)) state.storyFlags.push(f);
  for (const [id, flags] of Object.entries(block.characterFlags ?? {})) {
    const c = state.characters[id] ?? (state.characters[id] = { affection: 0, met: false, flags: [], memories: [], notes: [] });
    for (const f of flags) if (!c.flags.includes(f)) c.flags.push(f);
  }
  if (block.memory && !(won && ls.wins > 1)) addMemory(ch, block.memory);
  if (block.ending && !state.endings.includes(block.ending)) state.endings.push(block.ending);
  return { affectionGain: gain };
}

function addMemory(ch, text) {
  if (!ch.memories.includes(text)) ch.memories.push(text);
  if (ch.memories.length > 12) ch.memories.splice(0, ch.memories.length - 12);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
