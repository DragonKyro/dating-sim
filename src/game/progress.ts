// Progression rules: what's unlocked, how a scene starts, and what a finished
// scene changes in the save. Pure functions over Progress — the save store
// calls them inside its own updates.

import {
  emptyCharacterState, emptyLevelState,
  type CharacterState, type Condition, type Level, type Progress, type ResolvedLevel, type RunSummary,
} from './types';

export interface Unlock {
  ok: boolean;
  reasons: string[];
  /** Set when another level of the same exclusive group was completed. */
  lockedBy?: string;
}

/** Can this level be played? `levels` is the full list (for exclusive groups and titles). */
export function checkUnlock(level: Level, p: Progress, levels: Level[]): Unlock {
  const pre = level.prerequisites ?? {};
  const reasons: string[] = [];
  const done = (id: string) => !!p.levels[id]?.completed;
  const titleOf = (id: string) => levels.find((l) => l.id === id)?.title ?? id;

  for (const id of pre.levels ?? []) if (!done(id)) reasons.push(`Finish “${titleOf(id)}”`);
  for (const flag of pre.flags ?? []) if (!p.storyFlags.includes(flag)) reasons.push(pre.flagHints?.[flag] ?? 'Story event needed');
  for (const [cid, min] of Object.entries(pre.affection ?? {})) {
    if ((p.characters[cid]?.affection ?? 0) < min) reasons.push(`Get closer to ${cid[0]!.toUpperCase() + cid.slice(1)}`);
  }
  if (level.exclusiveGroup) {
    const other = levels.find((l) => l.id !== level.id && l.exclusiveGroup === level.exclusiveGroup && done(l.id));
    if (other) return { ok: false, reasons: ['You spent that night elsewhere'], lockedBy: other.id };
  }
  return { ok: reasons.length === 0, reasons };
}

/** Interest a run starts at: authored base plus a small bond bonus (max +10). */
export function startingInterest(level: Level, charState: Pick<CharacterState, 'affection'> | undefined): number {
  const bonus = Math.min(10, Math.round((charState?.affection ?? 0) / 8));
  return Math.max(1, Math.min(95, (level.startInterest ?? 25) + bonus));
}

/**
 * A level as it should play for this save: `situationIf` lines whose `if`
 * flags are all set (and `ifNot` none) are appended, and the first matching
 * flavor card is picked. Never mutates.
 */
export function resolveLevel(level: Level, p: Progress): ResolvedLevel {
  const has = (f: string) => p.storyFlags.includes(f) || Object.values(p.characters).some((c) => c.flags.includes(f));
  const matches = (e: Condition) => (e.if ?? []).every(has) && !(e.ifNot ?? []).some(has);
  const extra = (level.situationIf ?? []).filter(matches).map((e) => e.text);
  return {
    ...level,
    situation: [level.situation, ...extra].join('\n'),
    flavorCard: (level.flavor ?? []).find(matches) ?? null,
  };
}

/** Journal lines for every secret the player has learned from one character. */
export function knownFacts(levels: Level[], characterId: string, p: Progress): string[] {
  return levels
    .filter((l) => l.characters[0] === characterId)
    .flatMap((l) => l.secrets ?? [])
    .filter((s) => p.storyFlags.includes(s.flag))
    .map((s) => s.journal);
}

const MEMORY_CAP = 12;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function addMemory(ch: CharacterState, text: string): void {
  if (!ch.memories.includes(text)) ch.memories.push(text);
  if (ch.memories.length > MEMORY_CAP) ch.memories.splice(0, ch.memories.length - MEMORY_CAP);
}

function charOf(p: Progress, id: string): CharacterState {
  return (p.characters[id] ??= emptyCharacterState());
}

/**
 * Apply a finished run to the save. Mutates `p` (call inside a store update).
 * @returns the change to the speaker's bond.
 */
export function applyOutcome(p: Progress, level: Level, result: Pick<RunSummary, 'outcome' | 'finalInterest' | 'revealed'>): { affectionGain: number } {
  const won = result.outcome === 'win';
  const cid = level.characters[0]!;
  const ls = (p.levels[level.id] ??= emptyLevelState());
  ls.attempts += 1;
  ls.lastOutcome = result.outcome;
  ls.bestInterest = Math.max(ls.bestInterest, result.finalInterest);
  if (won) {
    ls.completed = true;
    ls.wins += 1;
  }

  const ch = charOf(p, cid);
  ch.met = true;
  const block = (won ? level.onComplete : level.onFail) ?? {};

  // Bond: authored amount, plus a bonus for clearing the bar with room to spare.
  let gain = block.affection?.[cid] ?? (won ? 10 : -2);
  const threshold = level.objective.threshold;
  if (won && threshold) gain += Math.max(0, Math.round((result.finalInterest - threshold) / 5));
  for (const [id, amt] of Object.entries(block.affection ?? {})) {
    if (id === cid) continue;
    const other = charOf(p, id);
    other.affection = clamp(other.affection + amt, 0, 100);
  }
  ch.affection = clamp(ch.affection + gain, 0, 100);

  // Secrets learned this run stick even if the level was lost.
  for (const s of result.revealed) {
    if (s.flag && !p.storyFlags.includes(s.flag)) p.storyFlags.push(s.flag);
    if (s.memory) addMemory(ch, s.memory);
  }
  for (const f of block.flags ?? []) if (!p.storyFlags.includes(f)) p.storyFlags.push(f);
  for (const [id, flags] of Object.entries(block.characterFlags ?? {})) {
    const c = charOf(p, id);
    for (const f of flags) if (!c.flags.includes(f)) c.flags.push(f);
  }
  if (block.memory && !(won && ls.wins > 1)) addMemory(ch, block.memory);
  if (block.ending && !p.endings.includes(block.ending)) p.endings.push(block.ending);
  return { affectionGain: gain };
}
