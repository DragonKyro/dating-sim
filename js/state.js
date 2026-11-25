// Persistent game state: one JSON blob in localStorage, optionally mirrored to
// Firestore by cloud.js. Everything reads and writes through getState() /
// updateState() so listeners (cloud sync, HUD) see every change.
//
// Schema changes: bump SAVE_VERSION and add a branch to migrate(). Never
// silently break a player's save.

const SAVE_KEY = "dating-sim-save-v1"; // historical name; the version lives inside
export const SAVE_VERSION = 2;

// Keys that stay on this device and are never uploaded: the player's Gemini
// key, the cloud bookkeeping itself, and any half-finished conversation.
const DEVICE_ONLY_KEYS = ["byok", "cloud", "run"];

function freshState() {
  return {
    version: SAVE_VERSION,
    updatedAt: 0,                 // ms; last change to synced (non-device) data
    byok: { apiKey: "", voiceModel: "auto", judgeModel: "auto" },
    settings: {
      playerName: "",
      pronouns: "they",           // how characters refer to the player: he | she | they
      textSpeed: "normal",        // slow | normal | fast | instant
      reduceMotion: false,
      temperature: 0.9,
    },
    // { [characterId]: { affection, met, flags[], memories[], notes[] } }
    //   affection: 0-100 lasting bond, changed only when a level ends
    //   memories:  authored one-liners about past scenes (from level onComplete)
    //   notes:     what this character has learned about the player
    characters: {},
    // { [levelId]: { completed, attempts, wins, bestInterest, lastOutcome } }
    levels: {},
    storyFlags: [],
    endings: [],                  // ending ids the player has reached
    notices: [],                  // one-time messages to show (e.g. migration)
    cloud: { enabled: false, uid: null, lastSyncedAt: 0 },
    run: null,                    // in-progress level (see engine.js newRun)
  };
}

let cache = null;
const listeners = new Set();
let storage = globalThis.localStorage ?? null;

/** Tests swap in a fake storage object ({ getItem, setItem }). */
export function _setStorage(fake) { storage = fake; cache = null; }

function load() {
  if (cache) return cache;
  try {
    const raw = storage?.getItem(SAVE_KEY);
    cache = raw ? migrate(JSON.parse(raw)) : freshState();
  } catch (err) {
    console.warn("[state] unreadable save, starting fresh", err);
    cache = freshState();
  }
  return cache;
}

function persist({ touch = true } = {}) {
  if (touch) cache.updatedAt = Date.now();
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error("[state] failed to persist", err);
  }
  for (const fn of listeners) {
    try { fn(cache, { touch }); } catch (err) { console.error(err); }
  }
}

/** Fill any keys missing from `target` with defaults (one level of nesting). */
function withDefaults(target) {
  const base = freshState();
  const out = { ...base, ...target };
  for (const k of ["byok", "settings", "cloud"]) out[k] = { ...base[k], ...(target[k] ?? {}) };
  return out;
}

export function migrate(raw) {
  if (!raw || typeof raw !== "object") return freshState();
  let s = raw;
  if (!s.version || s.version < 2) {
    // v1 -> v2: the story and cast were rewritten (Last Ferry), so v1
    // characters and levels no longer exist. Keep the player's key and name,
    // drop the obsolete progress, and tell them once.
    const next = freshState();
    next.byok.apiKey = s.byok?.apiKey ?? "";
    next.settings.playerName = s.settings?.playerName ?? "";
    const hadProgress = (s.levelsCompleted?.length ?? 0) > 0 || Object.keys(s.characters ?? {}).length > 0;
    if (hadProgress) next.notices.push("v2-new-story");
    s = next;
  }
  return withDefaults(s);
}

export function getState() {
  return load();
}

/**
 * Mutate state and persist. Pass { touch: false } for device-only changes
 * (API key, cloud bookkeeping, in-progress run) so they don't mark the save
 * as needing a cloud upload.
 */
export function updateState(mutator, opts) {
  const state = load();
  mutator(state);
  persist(opts);
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function ensureCharacter(id) {
  const state = load();
  if (!state.characters[id]) {
    state.characters[id] = { affection: 0, met: false, flags: [], memories: [], notes: [] };
  }
  return state.characters[id];
}

export function getCharacterState(id) {
  return load().characters[id] ?? { affection: 0, met: false, flags: [], memories: [], notes: [] };
}

export function getLevelState(id) {
  return load().levels[id] ?? { completed: false, attempts: 0, wins: 0, bestInterest: 0, lastOutcome: null };
}

export function isLevelCompleted(id) {
  return !!load().levels[id]?.completed;
}

export function hasApiKey() {
  return !!load().byok.apiKey;
}

/** Wipe story progress but keep the API key, model choice, settings and cloud link. */
export function resetProgress() {
  const old = load();
  const next = freshState();
  next.byok = old.byok;
  next.settings = old.settings;
  next.cloud = old.cloud;
  cache = next;
  persist();
  return cache;
}

// ---- Cloud helpers (used by cloud.js) --------------------------------------

/** The synced part of the save: everything except device-only keys. */
export function exportProgress() {
  const s = load();
  const out = {};
  for (const [k, v] of Object.entries(s)) {
    if (!DEVICE_ONLY_KEYS.includes(k)) out[k] = structuredClone(v);
  }
  return out;
}

/** Replace synced data with a cloud copy, keeping device-only keys. */
export function importProgress(save) {
  const s = load();
  const keep = Object.fromEntries(DEVICE_ONLY_KEYS.map((k) => [k, s[k]]));
  cache = withDefaults({ ...migrate({ ...save }), ...keep });
  persist({ touch: false });
}

/** Rough size of a save, for "which save do you want to keep?" prompts. */
export function summarizeProgress(save) {
  const levels = Object.values(save?.levels ?? {}).filter((l) => l.completed).length;
  const met = Object.values(save?.characters ?? {}).filter((c) => c.met).length;
  return { levels, met, endings: (save?.endings ?? []).length, updatedAt: save?.updatedAt ?? 0 };
}

export function hasProgress(save) {
  const s = summarizeProgress(save);
  return s.levels > 0 || s.met > 0;
}
