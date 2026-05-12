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

// Gemini's responseSchema supports a strict OpenAPI 3.0 subset — no union
// types as arrays. We keep this minimal: the fields the game actually reads.
const JUDGE_SCHEMA = {
  type: "object",
  properties: {
    affection_delta: { type: "integer", minimum: -10, maximum: 10 },
    mood: { type: "string", enum: ["neutral", "happy", "sad", "annoyed", "interested", "flirty"] },
    reasoning: { type: "string" },
  },
  required: ["affection_delta", "mood", "reasoning"],
};

// How many prior exchanges to show the judge as context. Long enough to
// detect repetition and topic continuity; short enough to keep the prompt
// fast and cheap.
const HISTORY_WINDOW = 8;

function formatHistory(history, character) {
  if (!history || history.length === 0) return "(this is the first exchange)";
  const window = history.slice(-HISTORY_WINDOW);
  return window
    .map((m) => `${m.role === "user" ? "Player" : character.displayName}: ${m.text}`)
    .join("\n");
}

/**
 * Score the most recent exchange.
 *
 * @param {object} args
 * @param {object} args.character    - Character config object.
 * @param {object} args.level        - Level config object.
 * @param {string} args.playerText   - The player's last message.
 * @param {string} args.replyText    - The character's last reply.
 * @param {number} args.currentAffection
 * @param {Array<{role: "user"|"model", text: string}>} [args.history]
 *   - Prior conversation messages BEFORE the latest exchange.
 */
export async function judgeExchange({ character, level, playerText, replyText, currentAffection, history = [] }) {
  const state = getState();
  const template = await loadJudgeTemplate();

  const filled = template
    .replaceAll("{{characterName}}", character.displayName)
    .replaceAll("{{personality}}", character.personalitySummary ?? "(see system prompt)")
    .replaceAll("{{objective}}", level?.objective?.label ?? "(no active objective)")
    .replaceAll("{{currentAffection}}", String(currentAffection))
    .replaceAll("{{judgeAddendum}}", level?.judgeAddendum ?? "");

  const historyText = formatHistory(history, character);

  const messages = [
    {
      role: "user",
      text:
        `Recent conversation (most recent last):\n${historyText}\n\n` +
        `THIS exchange (the one you must score):\n` +
        `Player: ${playerText}\n` +
        `${character.displayName}: ${replyText}\n\n` +
        `Score the latest exchange. Use the history above to spot repetition, ` +
        `topic continuity, or awkward shifts. Output JSON.`,
    },
  ];

  const raw = await chat({
    apiKey: state.byok.apiKey,
    model: state.byok.model,
    system: filled,
    messages,
    temperature: 0.2,
    // Judge output is a small JSON object (~30-50 tokens). Cap generously
    // to absorb verbose reasoning, but well below runaway.
    maxOutputTokens: 128,
    responseSchema: JUDGE_SCHEMA,
  });

  try {
    return JSON.parse(raw);
  } catch {
    return { affection_delta: 0, mood: "neutral", reasoning: "(judge returned unparseable output)" };
  }
}
