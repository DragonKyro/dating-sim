// The save: story progress that syncs to the cloud (characters, levels,
// flags, endings, the player's name). Everything device-only lives in
// prefsStore (key, settings) or runStore (a scene in progress).
//
// Schema changes: bump SAVE_VERSION and handle the old shape in normalize().
// Never silently break a player's save.

import { create } from 'zustand';
import type { Progress, Pronouns } from '@/game/types';
import { legacy, readJson, writeJson } from './storage';
import { setPrefs } from './prefsStore';

export const SAVE_VERSION = 3;
const KEY = 'save';
/** v1 (the original Emma game, live on Pages) and v2 used this un-prefixed key. */
const LEGACY_KEY = 'dating-sim-save-v1';

export function freshProgress(): Progress {
  return { version: SAVE_VERSION, updatedAt: 0, player: { name: '', pronouns: 'they' }, characters: {}, levels: {}, storyFlags: [], endings: [], notices: [] };
}

const PRONOUNS: Pronouns[] = ['he', 'she', 'they'];

/** Fill missing fields so any stored or cloud copy is safe to use. */
export function normalize(raw: unknown): Progress {
  const base = freshProgress();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Progress>;
  const player = (r.player ?? {}) as Partial<Progress['player']>;
  return {
    version: SAVE_VERSION,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : 0,
    player: { name: typeof player.name === 'string' ? player.name : '', pronouns: PRONOUNS.includes(player.pronouns as Pronouns) ? (player.pronouns as Pronouns) : 'they' },
    characters: Object.fromEntries(
      Object.entries(r.characters ?? {}).map(([id, c]) => [id, { affection: c?.affection ?? 0, met: !!c?.met, flags: c?.flags ?? [], memories: c?.memories ?? [], notes: c?.notes ?? [] }]),
    ),
    levels: { ...(r.levels ?? {}) },
    storyFlags: Array.isArray(r.storyFlags) ? r.storyFlags : [],
    endings: Array.isArray(r.endings) ? r.endings : [],
    notices: Array.isArray(r.notices) ? r.notices : [],
  };
}

interface LegacySave {
  version?: number;
  byok?: { apiKey?: string; voiceModel?: string; judgeModel?: string };
  settings?: { playerName?: string; pronouns?: Pronouns; textSpeed?: string; reduceMotion?: boolean; temperature?: number };
  levelsCompleted?: string[];
  characters?: Record<string, unknown>;
  levels?: Progress['levels'];
  storyFlags?: string[];
  endings?: string[];
}

/**
 * Saves from before the "datingSim." prefix.
 * - v1 (the Emma game): its characters and levels no longer exist, so keep
 *   the key and name and tell the player once.
 * - v2 (the first Last Ferry build): same content, so keep everything.
 */
export function migrateLegacy(old: LegacySave): Progress {
  const p = freshProgress();
  p.player.name = old.settings?.playerName ?? '';
  if (old.settings?.pronouns && PRONOUNS.includes(old.settings.pronouns)) p.player.pronouns = old.settings.pronouns;
  if ((old.version ?? 1) >= 2) {
    const kept = normalize({ ...old, player: p.player });
    kept.updatedAt = Date.now();
    return kept;
  }
  const hadProgress = (old.levelsCompleted?.length ?? 0) > 0 || Object.keys(old.characters ?? {}).length > 0;
  if (hadProgress) p.notices.push('v2-new-story');
  return p;
}

function load(): Progress {
  const stored = readJson<unknown>(KEY, null);
  if (stored) return normalize(stored);
  const old = legacy.read(LEGACY_KEY) as LegacySave | null;
  if (!old) return freshProgress();
  const migrated = migrateLegacy(old);
  if (old.byok?.apiKey) setPrefs({ apiKey: old.byok.apiKey, voiceModel: old.byok.voiceModel ?? 'auto', judgeModel: old.byok.judgeModel ?? 'auto' });
  writeJson(KEY, migrated);
  legacy.remove(LEGACY_KEY);
  return migrated;
}

export const useSave = create<Progress>(() => load());

type Listener = (p: Progress, touched: boolean) => void;
const listeners = new Set<Listener>();
/** Cloud sync listens here; `touched` changes need uploading. */
export function onSaveChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function commit(next: Progress, touched: boolean): void {
  useSave.setState(next, true);
  writeJson(KEY, next);
  for (const fn of listeners) fn(next, touched);
}

/** Mutate a copy of the save. `touch: false` for changes that shouldn't count as new progress (e.g. clearing a notice). */
export function updateSave(mutator: (p: Progress) => void, { touch = true }: { touch?: boolean } = {}): Progress {
  const next = structuredClone(useSave.getState());
  mutator(next);
  if (touch) next.updatedAt = Date.now();
  commit(next, touch);
  return next;
}

export const getProgress = (): Progress => useSave.getState();

/** Wipe story progress but keep the player's name. */
export function resetProgress(): void {
  const p = freshProgress();
  p.player = { ...useSave.getState().player };
  p.updatedAt = Date.now();
  commit(p, true);
}

/** Replace the save with a cloud copy. */
export function importProgress(save: unknown): void {
  commit(normalize(save), false);
}

/** Rough size of a save, for "which save do you want to keep?" prompts. */
export function summarizeProgress(p: Progress): { levels: number; met: number; endings: number; updatedAt: number } {
  return {
    levels: Object.values(p.levels).filter((l) => l.completed).length,
    met: Object.values(p.characters).filter((c) => c.met).length,
    endings: p.endings.length,
    updatedAt: p.updatedAt,
  };
}

export function hasProgress(p: Progress): boolean {
  const s = summarizeProgress(p);
  return s.levels > 0 || s.met > 0;
}
