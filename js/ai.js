// The three model calls a scene makes, wired to engine.js prompt builders.
// Shared by the browser (scene.js) and Node tools (tools/playtest.mjs).

import { generate, LlmError } from "./llm.js";
import { loadText } from "./content.js";
import {
  buildJudgeRequest, normalizeJudge, parseJsonLoose,
  buildVoiceRequest, cleanReply, buildLearnRequest,
} from "./engine.js";

const JUDGE_MAX_OUTPUT = 400;
const VOICE_MAX_OUTPUT = 320;   // prompts ask for <60 words; this is a ceiling, not a target

/** Score the player's message. Never throws for parse problems; network errors propagate. */
export async function judgeTurn({ byok, level, character, run, playerText }) {
  const template = await loadText("prompts/judge.md");
  const req = buildJudgeRequest({ template, level, character, run, playerText });
  let text, model;
  try {
    ({ text, model } = await generate({
      apiKey: byok.apiKey, role: "judge", model: byok.judgeModel,
      system: req.system, messages: req.messages, schema: req.schema,
      temperature: 0.2, maxOutputTokens: JUDGE_MAX_OUTPUT, timeoutMs: 20000,
    }));
  } catch (err) {
    // Gemini's safety filter refusing to even read the message is itself a
    // verdict: the player said something way over the line.
    if (err instanceof LlmError && err.kind === "blocked") {
      return { ...normalizeJudge({ delta: -6, mood: "annoyed", read: "blocked by the safety filter", feedback: "That was way over the line." }, level, run), model: err.model, parsed: true, blocked: true };
    }
    throw err;
  }
  const parsed = parseJsonLoose(text);
  if (!parsed) console.warn("[judge] unparseable:", text);
  return { ...normalizeJudge(parsed, level, run), model, parsed: !!parsed };
}

/** Get the character's next line, steered by the director's note. */
export async function speak({ byok, settings, level, character, charState, run, direction }) {
  const [framework, persona] = await Promise.all([
    loadText("prompts/character.md"),
    loadText(character.persona),
  ]);
  const req = buildVoiceRequest({ framework, persona, level, character, charState, settings, run, direction });
  try {
    const { text, model } = await generate({
      apiKey: byok.apiKey, role: "voice", model: byok.voiceModel,
      system: req.system, messages: req.messages,
      temperature: settings.temperature ?? 0.9, maxOutputTokens: VOICE_MAX_OUTPUT,
    });
    return { text: cleanReply(text, character), model };
  } catch (err) {
    // A filtered reply shouldn't break the scene: she just doesn't answer that.
    if (err instanceof LlmError && err.kind === "blocked") {
      const line = run.status === "lose"
        ? "*She shakes her head, and leaves without another word.*"
        : "*She gives you a long, flat look and doesn't dignify that with an answer.*";
      return { text: line, model: err.model, blocked: true };
    }
    throw err;
  }
}

/** After a scene: what did she learn about the player? Best-effort; returns []. */
export async function learnAboutPlayer({ byok, character, run }) {
  if (run.messages.filter((m) => m.role === "user" && !m.hidden).length < 2) return [];
  try {
    const req = buildLearnRequest({ character, run });
    const { text } = await generate({
      apiKey: byok.apiKey, role: "judge", model: byok.judgeModel,
      system: req.system, messages: req.messages, schema: req.schema,
      temperature: 0.1, maxOutputTokens: 300, timeoutMs: 15000,
    });
    const facts = parseJsonLoose(text)?.facts;
    return Array.isArray(facts) ? facts.filter((f) => typeof f === "string" && f.length < 140).slice(0, 3) : [];
  } catch (err) {
    console.warn("[learn] skipped", err);
    return [];
  }
}
