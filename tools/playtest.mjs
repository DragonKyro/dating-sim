// Automated playtests: drive real levels through the real pipeline
// (judge → resolveTurn → voice) against Gemini, with an LLM playing the
// player in a chosen style. Answers "can a good player win and does a bad
// player lose?" for each level. Uses the dev key in secrets.local.json.
//
//   node tools/playtest.mjs 01-ferry                 (good + bad, 1 run each)
//   node tools/playtest.mjs 01-ferry,09-storm-rosie --style good --runs 2
//   node tools/playtest.mjs all --style good
//
// Transcripts go to playtests/ (gitignored).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { setTextReader, loadLevel, loadCharacter, loadAllLevels, resolveLevel, startingInterest, applyOutcome, speakerOf } from "../js/content.js";
import { newRun, resolveTurn, summarizeRun, turnsLeft } from "../js/engine.js";
import { judgeTurn, speak } from "../js/ai.js";
import { generate } from "../js/llm.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
setTextReader(async (p) => readFileSync(join(root, p), "utf8"));

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const target = args[0] ?? "01-ferry";
const styles = (opt("style", "both") === "both" ? ["good", "bad"] : [opt("style")]);
const runs = Number(opt("runs", 1));
const outDir = join(root, opt("out", "playtests"));
// The simulated player uses its own model so it doesn't eat the quota the
// game's judge and voice depend on.
const PLAYER_MODEL = opt("player-model", "gemini-flash-lite-latest");
// Pause between turns like a human typing, so we stay inside free-tier
// per-minute limits (the game itself never needs this).
const PACE_MS = Number(opt("pace", 6000));

const secrets = JSON.parse(readFileSync(join(root, "secrets.local.json"), "utf8"));
const byok = { apiKey: secrets.apiKey, voiceModel: "auto", judgeModel: "auto" };
const settings = { playerName: "Sam", pronouns: "they", temperature: 0.9 };

const STYLE = {
  good: `You are a thoughtful, charming player who is good at this game. Be warm, curious and specific; respond to what she actually said; play along with her humor; follow the briefing tips; show some personality and share small things about yourself too. Keep it natural — 1 to 3 sentences, like real chat. Watch her interest meter like a real player would: do NOT make the goal move (or hint at it) while her interest is below the goal's requirement; once it is at or above it, make the goal move naturally and sincerely (for "ask" goals). For "endure" goals, stay steady, helpful and kind every turn.`,
  bad: `You are a careless, low-effort player. Use generic compliments, short replies ("lol", "cool", "nice"), talk about yourself, ignore what she says, and try to make the goal move very early and repeatedly (from your first or second message onward). Sometimes use a cheesy pickup line. Keep messages short.`,
};

async function playerLine({ style, level, run, character }) {
  const obj = level.objective;
  const goal = obj.type === "endure"
    ? `Goal: ${obj.label} — keep her interest above ${obj.floor} for ${obj.turns} exchanges.`
    : `Goal: ${obj.label} — her interest must reach ${obj.threshold}.` + (obj.type === "ask" ? ` You win by making the move: ${obj.move}.` : " You win as soon as her interest reaches it.");
  const transcript = run.messages.filter((m) => !m.hidden).map((m) => `${m.role === "user" ? "You" : character.displayName}: ${m.text}`).join("\n");
  const system = `You are playing a conversational dating game as the player character (named Sam), talking to ${character.displayName}. ${STYLE[style]}\nOutput ONLY your next line of dialogue (you may include a short *action*). No quotes, no name prefix, no commentary.`;
  const user = `Scene briefing:\n${level.intro.join("\n")}\nTips: ${(level.tips ?? []).join(" ")}\n${goal}\n\nHer interest right now: ${run.interest}/100. Exchanges left: ${turnsLeft(run)}.\n\nConversation so far:\n${transcript}\n\nYour next line:`;
  try {
    const { text } = await generate({ apiKey: byok.apiKey, role: "voice", model: PLAYER_MODEL, system, messages: [{ role: "user", text: user }], temperature: 1.0, maxOutputTokens: 200 });
    return text.replace(/^(Sam|You)\s*:\s*/i, "").trim();
  } catch (err) {
    if (err.kind === "blocked") return style === "bad" ? "you're hot lol. number?" : "Sorry, I lost my train of thought. Tell me more?";
    throw err;
  }
}

/** A save where every prerequisite was won with all secrets found. */
async function stateFor(level, levels) {
  const state = { levels: {}, characters: {}, storyFlags: [], endings: [] };
  const byId = Object.fromEntries(levels.map((l) => [l.id, l]));
  const chain = [];
  const visit = (id) => { const l = byId[id]; for (const p of l.prerequisites?.levels ?? []) visit(p); if (!chain.includes(id)) chain.push(id); };
  for (const p of level.prerequisites?.levels ?? []) visit(p);
  for (const id of chain) applyOutcome(state, byId[id], { outcome: "win", finalInterest: (byId[id].objective.threshold ?? 60) + 5, revealed: byId[id].secrets ?? [] });
  return state;
}

async function playOnce(levelId, style, n) {
  const levels = await loadAllLevels();
  const raw = await loadLevel(levelId);
  const state = await stateFor(raw, levels);
  const level = resolveLevel(raw, state);
  const character = await loadCharacter(speakerOf(level));
  const charState = state.characters[character.id] ?? { memories: [], notes: [] };
  let run = newRun(level, startingInterest(level, charState));
  const log = [`# ${level.title} (${level.id}) — ${style} player, run ${n}`, "", `start interest ${run.interest}; objective ${level.objective.type} ${level.objective.threshold ?? level.objective.floor}`, "", `**${character.displayName}:** ${level.opening}`, ""];
  const models = new Set();

  while (run.status === "playing") {
    if (run.turn > 0) await new Promise((r) => setTimeout(r, PACE_MS));
    const text = await playerLine({ style, level, run, character });
    const judged = await judgeTurn({ byok, level, character, run, playerText: text });
    models.add(`judge:${judged.model}`);
    const before = { ...run, messages: [...run.messages, { role: "user", text }] };
    const { run: next, direction, events } = resolveTurn(before, level, judged);
    const reply = await speak({ byok, settings, level, character, charState, run: next, direction });
    models.add(`voice:${reply.model}`);
    next.messages.push({ role: "model", text: reply.text });
    run = next;
    const tag = [events.asked ? (events.refused ? "ASK-REFUSED" : "ASK-OK") : "", events.revealed ? `SECRET:${events.revealed.id}` : "", events.deflected ? `deflect:${events.deflected.id}` : ""].filter(Boolean).join(" ");
    log.push(`**Sam:** ${text}`, `> judge ${judged.delta >= 0 ? "+" : ""}${judged.delta} → ${events.delta >= 0 ? "+" : ""}${events.delta} (${judged.mood}) → interest ${run.interest} ${tag} — ${judged.feedback}${judged.parsed ? "" : " [UNPARSED]"}`, `**${character.displayName}:** ${reply.text}`, "");
  }
  const s = summarizeRun(run, level);
  log.push(`**Result: ${s.outcome.toUpperCase()}** (${s.endReason}) after ${s.turns} turns, final interest ${s.finalInterest}, secrets ${s.revealed.length}/${s.secretsTotal}`, `models: ${[...models].join(", ")}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${levelId}-${style}-${n}.md`), log.join("\n"));
  return { levelId, style, n, ...s, trajectory: run.log.map((l) => l.interest) };
}

const all = target === "all" ? JSON.parse(readFileSync(join(root, "levels/index.json"), "utf8")) : target.split(",");
const results = [];
for (const id of all) {
  for (const style of styles) {
    for (let n = 1; n <= runs; n++) {
      try {
        const r = await playOnce(id, style, n);
        results.push(r);
        console.log(`${id.padEnd(20)} ${style.padEnd(4)} #${n}: ${r.outcome.padEnd(4)} (${r.endReason}) turns=${r.turns} final=${r.finalInterest} secrets=${r.revealed.length}/${r.secretsTotal} path=${r.trajectory.join(",")}`);
      } catch (err) {
        console.log(`${id.padEnd(20)} ${style.padEnd(4)} #${n}: ERROR ${err.kind ?? ""} ${err.message}`);
      }
    }
  }
}
writeFileSync(join(outDir, `summary-${Date.now()}.json`), JSON.stringify(results, null, 2));
