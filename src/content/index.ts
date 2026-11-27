// Authored content, bundled at build time. Drop a file into characters/,
// levels/ or prompts/personas/ and it's picked up — no registry to edit.
// Levels are ordered by filename (NN-slug).

import type { Chapter, Character, Level } from '@/game/types';
import chaptersJson from './levels/chapters.json';
import characterPrompt from './prompts/character.md?raw';
import judgePrompt from './prompts/judge.md?raw';

const characterFiles = import.meta.glob<Character>('./characters/*.json', { eager: true, import: 'default' });
const levelFiles = import.meta.glob<Level>('./levels/[0-9]*.json', { eager: true, import: 'default' });
const personaFiles = import.meta.glob<string>('./prompts/personas/*.md', { eager: true, import: 'default', query: '?raw' });

const byFile = <T>(files: Record<string, T>) => Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
const idOf = (path: string) => path.split('/').pop()!.replace(/\.\w+$/, '');
function firstScene(id: string): number {
  const i = byFile(levelFiles).findIndex((l) => l.characters.includes(id));
  return i < 0 ? Infinity : i;
}

export const LEVELS: Level[] = byFile(levelFiles);
/** Characters in story order (by the first level they appear in). */
export const CHARACTER_LIST: Character[] = byFile(characterFiles).sort((a, b) => firstScene(a.id) - firstScene(b.id));
export const CHARACTERS: Record<string, Character> = Object.fromEntries(CHARACTER_LIST.map((c) => [c.id, c]));
export const CHAPTERS: Chapter[] = chaptersJson as Chapter[];
export const PERSONAS: Record<string, string> = Object.fromEntries(Object.entries(personaFiles).map(([p, text]) => [idOf(p), text]));
export const PROMPTS = { character: characterPrompt, judge: judgePrompt };

const levelById = new Map(LEVELS.map((l) => [l.id, l]));
export function getLevel(id: string): Level | undefined {
  return levelById.get(id);
}
export function getCharacter(id: string): Character | undefined {
  return CHARACTERS[id];
}
/** The one character who speaks in a level (multi-speaker is future work). */
export const speakerOf = (level: Level): string => level.characters[0]!;
