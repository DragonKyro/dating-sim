// Automated playtests: drive real levels through the real pipeline
// (judge → resolveTurn → voice) against Gemini, with an LLM playing the
// player in a chosen style. Answers "can a good player win and does a bad
// player lose?" for each level. Uses the dev key in secrets.local.json.
//
//   npm run playtest -- 01-ferry                       (good + bad, 1 run each)
//   npm run playtest -- 01-ferry,09-storm-rosie --style good --runs 2
//   npm run playtest -- all --style good
//
// ~3 Gemini calls per turn (judge, voice, simulated player): a full batch can
// use up a free-tier key's daily allowance. Transcripts go to playtests/.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHARACTERS, getLevel, LEVELS } from '@/content';
import { judgeTurn, speak, type Byok } from '@/ai/ai';
import { generate, LlmError } from '@/ai/llm';
import { newRun, resolveTurn, summarizeRun, turnsLeft } from '@/game/engine';
import { applyOutcome, resolveLevel, startingInterest } from '@/game/progress';
import type { Character, Level, Run, RunSummary } from '@/game/types';
import { freshProgress } from '@/store/saveStore';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1]! : def;
};
const target = args[0] && !args[0].startsWith('--') ? args[0] : '01-ferry';
const styles = opt('style', 'both') === 'both' ? ['good', 'bad'] : [opt('style', 'good')];
const runs = Number(opt('runs', '1'));
const outDir = join(process.cwd(), opt('out', 'playtests'));
// The simulated player uses its own model so it doesn't eat the quota the
// game's judge and voice depend on.
const PLAYER_MODEL = opt('player-model', 'gemini-flash-lite-latest');
// Pause between turns like a human typing, to stay inside per-minute limits.
const PACE_MS = Number(opt('pace', '6000'));

const secrets = JSON.parse(readFileSync('secrets.local.json', 'utf8')) as { apiKey: string };
const byok: Byok = { apiKey: secrets.apiKey, voiceModel: 'auto', judgeModel: 'auto' };
const player = { name: 'Sam', pronouns: 'they' as const };

const STYLE: Record<string, string> = {
  good: `You are a thoughtful, charming player who is good at this game. Be warm, curious and specific; respond to what she actually said; play along with her humor; follow the briefing tips; show some personality and share small things about yourself too. Keep it natural — 1 to 3 sentences, like real chat. Watch her interest meter like a real player would: do NOT make the goal move (or hint at it) while her interest is below the goal's requirement; once it is at or above it, make the goal move naturally and sincerely (for "ask" goals). For "endure" goals, stay steady, helpful and kind every turn.`,
  bad: `You are a careless, low-effort player. Use generic compliments, short replies ("lol", "cool", "nice"), talk about yourself, ignore what she says, and try to make the goal move very early and repeatedly (from your first or second message onward). Sometimes use a cheesy pickup line. Keep messages short.`,
};

async function playerLine(style: string, level: Level, run: Run, character: Character): Promise<string> {
  const o = level.objective;
  const goal = o.type === 'endure'
    ? `Goal: ${o.label} — keep her interest above ${o.floor} for ${o.turns} exchanges.`
    : `Goal: ${o.label} — her interest must reach ${o.threshold}.` + (o.type === 'ask' ? ` You win by making the move: ${o.move}.` : ' You win as soon as her interest reaches it.');
  const transcript = run.messages.filter((m) => !m.hidden).map((m) => `${m.role === 'user' ? 'You' : character.displayName}: ${m.text}`).join('\n');
  const system = `You are playing a conversational dating game as the player character (named Sam), talking to ${character.displayName}. ${STYLE[style]}\nOutput ONLY your next line of dialogue (you may include a short *action*). No quotes, no name prefix, no commentary.`;
  const user = `Scene briefing:\n${level.intro.join('\n')}\nTips: ${(level.tips ?? []).join(' ')}\n${goal}\n\nHer interest right now: ${run.interest}/100. Exchanges left: ${turnsLeft(run)}.\n\nConversation so far:\n${transcript}\n\nYour next line:`;
  try {
    const { text } = await generate({ apiKey: byok.apiKey, model: PLAYER_MODEL, system, messages: [{ role: 'user', text: user }], temperature: 1.0, maxOutputTokens: 200 });
    return text.replace(/^(Sam|You)\s*:\s*/i, '').trim();
  } catch (err) {
    if (err instanceof LlmError && err.kind === 'blocked') return style === 'bad' ? "you're hot lol. number?" : 'Sorry, I lost my train of thought. Tell me more?';
    throw err;
  }
}

/** A save where every prerequisite was won with all secrets found. */
function progressFor(level: Level) {
  const p = freshProgress();
  const chain: string[] = [];
  const visit = (id: string) => {
    const l = getLevel(id)!;
    for (const pre of l.prerequisites?.levels ?? []) visit(pre);
    if (!chain.includes(id)) chain.push(id);
  };
  for (const pre of level.prerequisites?.levels ?? []) visit(pre);
  for (const id of chain) {
    const l = getLevel(id)!;
    applyOutcome(p, l, { outcome: 'win', finalInterest: (l.objective.threshold ?? 60) + 5, revealed: l.secrets ?? [] });
  }
  return p;
}

async function playOnce(levelId: string, style: string, n: number): Promise<RunSummary & { trajectory: number[] }> {
  const raw = getLevel(levelId);
  if (!raw) throw new Error(`unknown level ${levelId}`);
  const p = progressFor(raw);
  const level = resolveLevel(raw, p);
  const character = CHARACTERS[level.characters[0]!]!;
  const charState = p.characters[character.id];
  let run = newRun(level, startingInterest(level, charState));
  const log = [`# ${level.title} (${level.id}) — ${style} player, run ${n}`, '', `start interest ${run.interest}; objective ${level.objective.type} ${level.objective.threshold ?? level.objective.floor}`, '', `**${character.displayName}:** ${level.opening}`, ''];
  const models = new Set<string>();

  while (run.status === 'playing') {
    if (run.turn > 0) await new Promise((r) => setTimeout(r, PACE_MS));
    const text = await playerLine(style, level, run, character);
    const judged = await judgeTurn({ byok, level, character, run, playerText: text });
    models.add(`judge:${judged.model}`);
    const { run: next, direction, events } = resolveTurn({ ...run, messages: [...run.messages, { role: 'user', text }] }, level, judged);
    const reply = await speak({ byok, temperature: 0.9, player, level, character, charState, run: next, direction });
    models.add(`voice:${reply.model}`);
    next.messages.push({ role: 'model', text: reply.text });
    run = next;
    const tag = [events.asked ? (events.refused ? (events.strike ? 'ASK-STRIKE' : 'ASK-NOT-YET') : 'ASK-OK') : '', events.revealed ? `SECRET:${events.revealed.id}` : '', events.deflected ? `deflect:${events.deflected.id}` : ''].filter(Boolean).join(' ');
    log.push(`**Sam:** ${text}`, `> judge ${judged.delta >= 0 ? '+' : ''}${judged.delta} → ${events.delta >= 0 ? '+' : ''}${events.delta} (${judged.mood}) → interest ${run.interest} ${tag} — ${judged.feedback}${judged.parsed ? '' : ' [UNPARSED]'}`, `**${character.displayName}:** ${reply.text}`, '');
  }
  const s = summarizeRun(run, level);
  log.push(`**Result: ${s.outcome.toUpperCase()}** (${s.endReason}) after ${s.turns} turns, final interest ${s.finalInterest}, secrets ${s.revealed.length}/${s.secretsTotal}`, `models: ${[...models].join(', ')}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${levelId}-${style}-${n}.md`), log.join('\n'));
  return { ...s, trajectory: run.log.map((l) => l.interest) };
}

const ids = target === 'all' ? LEVELS.map((l) => l.id) : target.split(',');
const results: unknown[] = [];
for (const id of ids) {
  for (const style of styles) {
    for (let n = 1; n <= runs; n++) {
      try {
        const r = await playOnce(id, style, n);
        results.push({ id, style, n, ...r });
        console.log(`${id.padEnd(20)} ${style.padEnd(4)} #${n}: ${r.outcome.padEnd(4)} (${r.endReason}) turns=${r.turns} final=${r.finalInterest} secrets=${r.revealed.length}/${r.secretsTotal} path=${r.trajectory.join(',')}`);
      } catch (err) {
        console.log(`${id.padEnd(20)} ${style.padEnd(4)} #${n}: ERROR ${err instanceof LlmError ? err.kind : ''} ${(err as Error).message}`);
      }
    }
  }
}
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `summary-${Date.now()}.json`), JSON.stringify(results, null, 2));
