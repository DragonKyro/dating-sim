// Level + character loading and lifecycle.
//
// On a static-hosted site we can't list a directory at runtime. To register a
// new character or level, add an entry to `characters/index.json` or
// `levels/index.json` — each is a simple array of ids the loader fetches.

import { getState, updateState, ensureCharacter } from "./state.js";

const characterCache = new Map();
const levelCache = new Map();
const promptCache = new Map();

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return res.text();
}

/** Returns array of level ids registered in levels/index.json. */
export async function listLevels() {
  try {
    const idx = await fetchJson("levels/index.json");
    return Array.isArray(idx) ? idx : [];
  } catch {
    return [];
  }
}

/** Returns array of character ids registered in characters/index.json. */
export async function listCharacters() {
  try {
    const idx = await fetchJson("characters/index.json");
    return Array.isArray(idx) ? idx : [];
  } catch {
    return [];
  }
}

export async function loadCharacter(id) {
  if (characterCache.has(id)) return characterCache.get(id);
  const char = await fetchJson(`characters/${id}.json`);
  characterCache.set(id, char);
  return char;
}

export async function loadLevel(id) {
  if (levelCache.has(id)) return levelCache.get(id);
  const level = await fetchJson(`levels/${id}.json`);
  levelCache.set(id, level);
  return level;
}

export async function loadSystemPrompt(character) {
  if (promptCache.has(character.systemPrompt)) return promptCache.get(character.systemPrompt);
  const text = await fetchText(character.systemPrompt);
  promptCache.set(character.systemPrompt, text);
  return text;
}

/** Fill a system prompt template with runtime values for the current player + character. */
export function fillSystemPrompt(template, { character, level, characterState, state }) {
  return template
    .replaceAll("{{characterName}}", character.displayName)
    .replaceAll("{{playerName}}", state.settings.playerName || "the player")
    .replaceAll("{{affection}}", String(characterState.affection))
    .replaceAll("{{flags}}", (characterState.flags ?? []).join(", ") || "none")
    .replaceAll("{{storyFlags}}", (state.storyFlags ?? []).join(", ") || "none")
    .replaceAll("{{objective}}", level?.objective?.label ?? "(none)")
    .replaceAll("{{objectiveThreshold}}", String(level?.objective?.threshold ?? 70))
    .replaceAll("{{location}}", level?.location ?? level?.title ?? "");
}

/** Does the current state satisfy a level's prerequisites? */
export function checkPrerequisites(level, state) {
  const prereq = level.prerequisites ?? {};
  const reasons = [];

  for (const lvl of prereq.levelsCompleted ?? []) {
    if (!state.levelsCompleted.includes(lvl)) reasons.push(`requires level ${lvl}`);
  }
  for (const [cid, min] of Object.entries(prereq.characterAffection ?? {})) {
    const a = state.characters[cid]?.affection ?? 0;
    if (a < min) reasons.push(`requires ${cid} affection ≥ ${min}`);
  }
  for (const flag of prereq.storyFlags ?? []) {
    if (!state.storyFlags.includes(flag)) reasons.push(`requires flag "${flag}"`);
  }
  return { ok: reasons.length === 0, reasons };
}

/** Mark level complete and apply its onComplete state changes. */
export function completeLevel(level) {
  updateState((s) => {
    if (!s.levelsCompleted.includes(level.id)) s.levelsCompleted.push(level.id);
    const oc = level.onComplete ?? {};
    for (const flag of oc.addFlags ?? []) {
      if (!s.storyFlags.includes(flag)) s.storyFlags.push(flag);
    }
    for (const [cid, flagsToAdd] of Object.entries(oc.addCharacterFlags ?? {})) {
      const c = s.characters[cid] ?? (s.characters[cid] = { affection: 0, met: false, flags: [] });
      for (const f of flagsToAdd) if (!c.flags.includes(f)) c.flags.push(f);
    }
    s.currentConversation = { levelId: null, messages: [] };
    s.currentLevel = null;
  });
}

/** First time we open a level, mark its characters as "met". */
export function markMet(characterId) {
  ensureCharacter(characterId);
  updateState((s) => { s.characters[characterId].met = true; });
}
