// Persistent game state. Single JSON blob in localStorage.
// Bump SAVE_VERSION + add a migration when the schema changes.

const SAVE_KEY = "dating-sim-save-v1";
const SAVE_VERSION = 1;

const DEFAULT_STATE = {
  version: SAVE_VERSION,
  byok: { apiKey: "", model: "gemini-2.5-flash" },
  settings: { temperature: 0.85, playerName: "" },
  characters: {},          // { [characterId]: { affection: 0, met: false, flags: [] } }
  levelsCompleted: [],     // [levelId]
  currentLevel: null,
  currentConversation: { levelId: null, messages: [] },
  storyFlags: [],
};

let cache = null;

function load() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      cache = structuredClone(DEFAULT_STATE);
      return cache;
    }
    const parsed = JSON.parse(raw);
    cache = migrate(parsed);
    return cache;
  } catch (err) {
    console.warn("[state] failed to load save, resetting", err);
    cache = structuredClone(DEFAULT_STATE);
    return cache;
  }
}

function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error("[state] failed to persist", err);
  }
}

function migrate(state) {
  // Future: if state.version < SAVE_VERSION, transform here.
  // For now just merge with defaults to fill any missing top-level keys.
  return { ...structuredClone(DEFAULT_STATE), ...state };
}

export function getState() {
  return load();
}

export function updateState(mutator) {
  const state = load();
  mutator(state);
  persist();
  return state;
}

export function resetState() {
  cache = structuredClone(DEFAULT_STATE);
  persist();
  return cache;
}

// Convenience: ensure a character entry exists before reading/writing.
export function ensureCharacter(characterId) {
  const state = load();
  if (!state.characters[characterId]) {
    state.characters[characterId] = { affection: 0, met: false, flags: [] };
    persist();
  }
  return state.characters[characterId];
}

export function getCharacterState(characterId) {
  return ensureCharacter(characterId);
}

export function adjustAffection(characterId, delta) {
  return updateState((s) => {
    const c = s.characters[characterId] ?? (s.characters[characterId] = { affection: 0, met: false, flags: [] });
    c.affection = Math.max(0, Math.min(100, c.affection + delta));
  }).characters[characterId];
}

export function hasApiKey() {
  return !!load().byok.apiKey;
}
