// Scoring engine: after each in-character reply, ask the LLM to judge how the
// exchange went. Returns a structured delta the game uses to update affection
// and swap the character's sprite expression.

import { chat } from "./llm.js";
import { getState } from "./state.js";

let judgeTemplateCache = null;

async function loadJudgeTemplate() {
  if (judgeTemplateCache) return judgeTemplateCache;
  const res = await fetch("prompts/judge.md");
  if (!res.ok) throw new Error("judge prompt missing");
  judgeTemplateCache = await res.text();
  return judgeTemplateCache;
}

const JUDGE_SCHEMA = {
  type: "object",
  properties: {
    affection_delta: { type: "integer", minimum: -5, maximum: 5 },
    mood: { type: "string", enum: ["neutral", "happy", "sad", "annoyed", "interested", "flirty"] },
    objective_signal: { type: ["string", "null"] },
    reasoning: { type: "string" },
  },
  required: ["affection_delta", "mood", "reasoning"],
};

/**
 * Score the most recent exchange.
 *
 * @param {object} args
 * @param {object} args.character    - Character config object.
 * @param {object} args.level        - Level config object.
 * @param {string} args.playerText   - The player's last message.
 * @param {string} args.replyText    - The character's last reply.
 * @param {number} args.currentAffection
 */
export async function judgeExchange({ character, level, playerText, replyText, currentAffection }) {
  const state = getState();
  const template = await loadJudgeTemplate();

  const filled = template
    .replaceAll("{{characterName}}", character.displayName)
    .replaceAll("{{personality}}", character.personalitySummary ?? "(see system prompt)")
    .replaceAll("{{objective}}", level?.objective?.label ?? "(no active objective)")
    .replaceAll("{{currentAffection}}", String(currentAffection));

  const messages = [
    {
      role: "user",
      text: `Player said: "${playerText}"\n${character.displayName} replied: "${replyText}"\n\nScore this exchange as JSON.`,
    },
  ];

  const raw = await chat({
    apiKey: state.byok.apiKey,
    model: state.byok.model,
    system: filled,
    messages,
    temperature: 0.2,
    responseSchema: JUDGE_SCHEMA,
  });

  try {
    return JSON.parse(raw);
  } catch {
    // If structured output failed, fall back to neutral.
    return { affection_delta: 0, mood: "neutral", objective_signal: null, reasoning: "parse-failed" };
  }
}
