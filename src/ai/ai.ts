// The three model calls a scene makes, wired to the engine's prompt builders.
// Shared by the scene page and scripts/playtest.ts.

import { PERSONAS, PROMPTS } from '@/content';
import { buildJudgeRequest, buildLearnRequest, buildVoiceRequest, cleanReply, normalizeJudge, parseJsonLoose } from '@/game/engine';
import type { Character, CharacterState, JudgeResult, Level, Pronouns, Run } from '@/game/types';
import { generate, LlmError } from './llm';

const JUDGE_MAX_OUTPUT = 400;
const VOICE_MAX_OUTPUT = 320; // prompts ask for <60 words; this is a ceiling, not a target

/** The player's Gemini setup (device-only). */
export interface Byok {
  apiKey: string;
  voiceModel: string;
  judgeModel: string;
}

export interface JudgeOutcome extends JudgeResult {
  model: string;
  /** False when the reply wasn't JSON and a neutral score was used. */
  parsed: boolean;
  /** Gemini's safety filter refused to read the message. */
  blocked?: boolean;
}

/** Score the player's message. Parse problems never throw; network errors do. */
export async function judgeTurn({ byok, level, character, run, playerText }: { byok: Byok; level: Level; character: Character; run: Run; playerText: string }): Promise<JudgeOutcome> {
  const req = buildJudgeRequest({ template: PROMPTS.judge, level, character, run, playerText });
  let text: string, model: string;
  try {
    ({ text, model } = await generate({ apiKey: byok.apiKey, model: byok.judgeModel, system: req.system, messages: req.messages, schema: req.schema, temperature: 0.2, maxOutputTokens: JUDGE_MAX_OUTPUT, timeoutMs: 20000 }));
  } catch (err) {
    // The safety filter refusing to even read the message is itself a
    // verdict: the player said something way over the line.
    if (err instanceof LlmError && err.kind === 'blocked') {
      return { ...normalizeJudge({ delta: -6, mood: 'annoyed', read: 'blocked by the safety filter', feedback: 'That was way over the line.' }, level, run), model: err.model, parsed: true, blocked: true };
    }
    throw err;
  }
  const parsed = parseJsonLoose(text);
  if (!parsed) console.warn('[judge] unparseable:', text);
  return { ...normalizeJudge(parsed, level, run), model, parsed: !!parsed };
}

/** Her next line, steered by the director's note. A filtered reply becomes a silent reaction. */
export async function speak({ byok, temperature, player, level, character, charState, run, direction }: {
  byok: Byok;
  temperature: number;
  player: { name: string; pronouns: Pronouns };
  level: Level;
  character: Character;
  charState: Pick<CharacterState, 'memories' | 'notes'> | undefined;
  run: Run;
  direction: string;
}): Promise<{ text: string; model: string; blocked?: boolean }> {
  const req = buildVoiceRequest({ framework: PROMPTS.character, persona: PERSONAS[character.id] ?? '', level, character, charState, player, run, direction });
  try {
    const { text, model } = await generate({ apiKey: byok.apiKey, model: byok.voiceModel, system: req.system, messages: req.messages, temperature, maxOutputTokens: VOICE_MAX_OUTPUT });
    return { text: cleanReply(text, character), model };
  } catch (err) {
    if (err instanceof LlmError && err.kind === 'blocked') {
      const text = run.status === 'lose' ? '*She shakes her head, and leaves without another word.*' : "*She gives you a long, flat look and doesn't dignify that with an answer.*";
      return { text, model: err.model, blocked: true };
    }
    throw err;
  }
}

/** After a scene: up to three facts she learned about the player. Best effort. */
export async function learnAboutPlayer({ byok, character, run }: { byok: Byok; character: Character; run: Run }): Promise<string[]> {
  if (run.messages.filter((m) => m.role === 'user' && !m.hidden).length < 2) return [];
  try {
    const req = buildLearnRequest({ character, run });
    const { text } = await generate({ apiKey: byok.apiKey, model: byok.judgeModel, system: req.system, messages: req.messages, schema: req.schema, temperature: 0.1, maxOutputTokens: 300, timeoutMs: 15000 });
    const facts = (parseJsonLoose(text) as { facts?: unknown } | null)?.facts;
    return Array.isArray(facts) ? facts.filter((f): f is string => typeof f === 'string' && f.length < 140).slice(0, 3) : [];
  } catch (err) {
    console.warn('[learn] skipped', err);
    return [];
  }
}
