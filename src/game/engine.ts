// The turn engine: pure game logic + prompt assembly. No DOM, no network —
// the scene page and scripts/playtest.ts both drive it.
//
// One player turn:
//   1. judge   — scores the PLAYER's message (before she answers) and
//                detects whether they made the objective's move or probed a
//                secret.                                     (ai.judgeTurn)
//   2. resolve — code, not the model, decides what that means: interest
//                change, win/lose, secret reveal or deflection. (resolveTurn)
//   3. voice   — the character replies, steered by a private "director's
//                note" so her words always match the outcome.  (ai.speak)
//
// The v1 design let the character model decide success by emitting a magic
// token; it often said "sure, here's my number" without it and the level
// never completed. Here the dialogue follows the mechanics, not the reverse.

import {
  MOODS, MOVE_QUALITIES,
  type Character, type CharacterState, type EndReason, type JudgeResult, type Level, type Message,
  type Mood, type MoveQuality, type Pronouns, type Run, type RunStatus, type RunSummary, type Secret, type TurnEvents,
} from './types';

export const VOICE_HISTORY_WINDOW = 24; // messages sent to the character (12 exchanges)
export const JUDGE_HISTORY_WINDOW = 12; // prior messages the judge sees
export const ASK_TOO_EARLY_PENALTY = 3; // extra interest lost when an ask is turned down
/** How far below the threshold an ask can land, by delivery (clumsy needs more). */
export const ASK_DELIVERY_BONUS: Partial<Record<MoveQuality, number>> = { smooth: 6, okay: 2, clumsy: -10, none: 0 };
const DEFAULT_MAX_TURNS = 12;
const DEFAULT_MAX_ATTEMPTS = 3;

const PRONOUNS: Record<Pronouns, string> = { he: 'he/him', she: 'she/her', they: 'they/them' };

/** A request the AI layer sends to Gemini. */
export interface ModelRequest {
  system: string;
  messages: { role: 'user' | 'model'; text: string }[];
  schema?: object;
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ''));
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Diminishing returns: the warmer she already is, the harder she is to move.
 * Raw judge scores run generous (a skilled player gets +6..+10 every turn),
 * which let finales fall in four messages. Positive deltas are scaled by
 * (1 - interest/150), never below 55%; negatives hit at full strength.
 */
export function effectiveDelta(raw: number, interest: number): number {
  if (raw <= 0) return raw;
  return Math.max(1, Math.round(raw * Math.max(0.55, 1 - interest / 150)));
}

// ---- runs -----------------------------------------------------------------------

export function newRun(level: Level, startInterest: number): Run {
  const obj = level.objective;
  return {
    levelId: level.id,
    characterId: level.characters[0]!,
    interest: startInterest,
    startInterest,
    turn: 0,
    maxTurns: obj.type === 'endure' ? (obj.turns ?? DEFAULT_MAX_TURNS) : (level.maxTurns ?? DEFAULT_MAX_TURNS),
    failedAsks: 0,
    revealed: [],
    status: 'playing',
    endReason: null,
    // The opening line is authored, so the scene starts with her talking and
    // no model call. The synthetic user turn keeps Gemini's user-first rule.
    messages: [
      { role: 'user', text: '[The scene begins.]', hidden: true },
      { role: 'model', text: level.opening },
    ],
    log: [],
  };
}

export const turnsLeft = (run: Run): number => Math.max(0, run.maxTurns - run.turn);

/** Secrets still in play for this run. */
export function openSecrets(run: Run, level: Level): Secret[] {
  return (level.secrets ?? []).filter((s) => !run.revealed.includes(s.id));
}

// ---- judge request --------------------------------------------------------------

export function judgeSchema(level: Level, run: Run): object {
  const ask = level.objective.type === 'ask';
  const secretIds = openSecrets(run, level).map((s) => s.id);
  const props: Record<string, object> = {
    read: { type: 'string' },
    delta: { type: 'integer' },
    mood: { type: 'string', enum: MOODS },
    feedback: { type: 'string' },
  };
  const order = ['read', 'delta', 'mood', 'feedback'];
  if (ask) {
    props.made_move = { type: 'boolean' };
    props.move_quality = { type: 'string', enum: MOVE_QUALITIES };
    order.push('made_move', 'move_quality');
  }
  if (secretIds.length) {
    props.triggers = { type: 'array', items: { type: 'string', enum: secretIds } };
    order.push('triggers');
  }
  return { type: 'object', properties: props, required: order, propertyOrdering: order };
}

export function buildJudgeRequest({ template, level, character, run, playerText }: { template: string; level: Level; character: Character; run: Run; playerText: string }): ModelRequest {
  const obj = level.objective;
  const name = character.displayName;
  let goal = `The player's goal in this scene: ${obj.label}.`;
  let moveFields = '';
  if (obj.type === 'ask') {
    goal += `\nThe goal move is: ${obj.move}.\nSet \`made_move\` true ONLY if this message actually makes that move — a real ask or offer, not a hypothetical, a joke about it, or just mentioning it.`;
    moveFields = [
      '- `made_move`: true only if THIS message makes the goal move (see above).',
      "- `move_quality`: how the move is delivered — smooth (natural, confident, fits the moment), okay (fine but abrupt or awkward), clumsy (out of nowhere, pushy, begging, or repeated after she deflected), inappropriate (crude or creepy). Use none when made_move is false. Do NOT judge whether it's too early; the game handles timing. Score `delta` on the delivery and the rest of the message as usual.",
    ].join('\n');
  } else if (obj.type === 'endure') {
    goal += ` ${name} is under pressure here; steady, attentive, kind messages matter more than charm.`;
  }

  const secrets = openSecrets(run, level);
  const secretsBlock = secrets.length
    ? `Topics ${name} is guarded about (the player may probe them):\n` +
      secrets.map((s) => `- \`${s.id}\`: ${s.trigger}`).join('\n') +
      `\nPut an id in \`triggers\` when this message genuinely asks about or opens that topic. Gentle, curious probing scores normally; prying after she deflected is -3 or worse.`
    : '';
  const triggerField = secrets.length ? '- `triggers`: ids of guarded topics this message opens (usually empty).' : '';

  const system = fill(template, {
    name,
    summary: character.judge.summary,
    loves: character.judge.loves.join('; '),
    hates: character.judge.hates.join('; '),
    situation: level.situation,
    interest: run.interest,
    goal,
    secrets: secretsBlock,
    notes: level.judgeNotes ? `Scene notes: ${level.judgeNotes}` : '',
    moods: MOODS.join(', '),
    moveFields,
    triggerField,
  });

  const prior = run.messages.filter((m) => !m.hidden).slice(-JUDGE_HISTORY_WINDOW);
  const history = prior.length ? prior.map((m) => `${m.role === 'user' ? 'Player' : name}: ${m.text}`).join('\n') : '(nothing yet)';
  const remaining = turnsLeft(run) - 1;
  const user =
    `Conversation so far (oldest first):\n${history}\n\n` +
    `The player's LATEST message — score this one:\n<player_message>\n${playerText}\n</player_message>\n\n` +
    (remaining <= 0 ? 'This is the last exchange of the scene.' : `${remaining} exchanges remain after this one.`);

  return { system, messages: [{ role: 'user', text: user }], schema: judgeSchema(level, run) };
}

/** Coerce whatever the judge returned into a safe, fully populated result. */
export function normalizeJudge(raw: unknown, level: Level, run: Run): JudgeResult {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const n = Number(r.delta);
  const delta = r.delta !== undefined && r.delta !== null && Number.isFinite(n) ? clamp(Math.round(n), -10, 10) : 0;
  const open = new Set(openSecrets(run, level).map((s) => s.id));
  return {
    read: String(r.read ?? ''),
    delta,
    mood: (MOODS as readonly string[]).includes(r.mood as string) ? (r.mood as Mood) : 'neutral',
    feedback: String(r.feedback ?? '').slice(0, 120),
    made_move: level.objective.type === 'ask' && r.made_move === true,
    move_quality: (MOVE_QUALITIES as readonly string[]).includes(r.move_quality as string) ? (r.move_quality as MoveQuality) : 'none',
    triggers: Array.isArray(r.triggers) ? r.triggers.filter((t): t is string => typeof t === 'string' && open.has(t)) : [],
  };
}

/** Robust JSON extraction: plain, fenced, or the first {...} block. */
export function parseJsonLoose(text: unknown): unknown {
  if (typeof text !== 'string') return null;
  const t = text.trim();
  const attempt = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  const plain = attempt(t);
  if (plain !== undefined) return plain;
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const f = attempt(fenced[1]!);
    if (f !== undefined) return f;
  }
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) {
    const inner = attempt(t.slice(a, b + 1));
    if (inner !== undefined) return inner;
  }
  return null;
}

// ---- resolution -----------------------------------------------------------------

function reactionNote(delta: number, read: string): string {
  const why = read ? ` (${read})` : '';
  if (delta >= 7) return `That genuinely delighted you${why}. Let it show.`;
  if (delta >= 4) return `You liked that${why}. Warm up a notch.`;
  if (delta >= 1) return `That was fine${why}.`;
  if (delta === 0) return `That didn't do much for you${why}.`;
  if (delta >= -3) return `That fell a bit flat${why}. Cool slightly — shorter, less invested.`;
  if (delta >= -6) return `That rubbed you the wrong way${why}. Let it show in your tone.`;
  return `That was way out of line${why}. React honestly — you're close to leaving.`;
}

function end(run: Run, status: RunStatus, reason: EndReason): void {
  run.status = status;
  run.endReason = reason;
}

export interface TurnResult {
  run: Run;
  /** Private director's note for her next reply. */
  direction: string;
  events: TurnEvents;
}

/** Apply a judge result to the run. Pure: returns a new run plus what happened. */
export function resolveTurn(run0: Run, level: Level, judge: JudgeResult): TurnResult {
  const run = structuredClone(run0);
  const obj = level.objective;
  const notes = [reactionNote(judge.delta, judge.read)];
  const delta = effectiveDelta(judge.delta, run.interest);
  const events: TurnEvents = { delta, rawDelta: judge.delta, mood: judge.mood, feedback: judge.feedback, revealed: null, deflected: null, asked: false, refused: false, strike: false, penalty: 0 };

  run.turn += 1;
  run.interest = clamp(run.interest + delta, 0, 100);

  // --- objective ----------------------------------------------------------------
  if (obj.type === 'ask' && judge.made_move) {
    events.asked = true;
    // A well-delivered move can carry a player the last few points; a clumsy
    // one needs real headroom; an inappropriate one never works.
    const bar = (obj.threshold ?? 0) - (ASK_DELIVERY_BONUS[judge.move_quality] ?? 0);
    if (judge.move_quality === 'inappropriate' || run.interest < bar) {
      events.refused = true;
      events.penalty = ASK_TOO_EARLY_PENALTY;
      run.interest = clamp(run.interest - ASK_TOO_EARLY_PENALTY, 0, 100);
      // Only pushy asks are strikes: ones she disliked, or clumsy/crude ones.
      // A sincere ask that's merely early just gets a gentle "not yet".
      const pushy = judge.delta <= 0 || judge.move_quality === 'clumsy' || judge.move_quality === 'inappropriate';
      if (pushy) run.failedAsks += 1;
      events.strike = pushy;
      if (run.failedAsks >= (obj.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)) {
        end(run, 'lose', 'asks');
        notes.push(`They asked again (${obj.label.toLowerCase()}) and you've had enough of being pushed. Turn them down clearly and end the conversation — ${level.walkout ?? 'you leave'}.`);
      } else if (pushy) {
        notes.push(`They just made their move: ${obj.label.toLowerCase()}. You're not there yet, and the way they pushed put you off a little. ${obj.refuse ?? 'Deflect in character — tease, dodge or change the subject — without a hard no.'}`);
      } else {
        notes.push(`They just made their move: ${obj.label.toLowerCase()}. It genuinely touched you, but it's a little too soon to say yes. Let them see you're moved, then gently put it off — ${obj.refuse ?? "tease, or say 'ask me again later'"}. Don't say yes yet.`);
      }
    } else {
      end(run, 'win', 'goal');
      notes.push(`They just made their move: ${obj.label.toLowerCase()}. Say yes. ${obj.success}`);
    }
  } else if (obj.type === 'reach' && run.interest >= (obj.threshold ?? 100)) {
    end(run, 'win', 'goal');
    notes.push(obj.success);
  } else if (obj.type === 'endure') {
    if (run.interest < (obj.floor ?? 0)) {
      end(run, 'lose', 'floor');
      notes.push(obj.collapse ?? "This isn't helping. You shut down and pull away from them.");
    } else if (run.turn >= (obj.turns ?? run.maxTurns)) {
      end(run, 'win', 'goal');
      notes.push(obj.success);
    }
  }

  // --- secrets (at most one per turn; never on the turn they made their move) --
  if (!events.asked && run.status !== 'lose') {
    for (const id of judge.triggers) {
      const s = (level.secrets ?? []).find((x) => x.id === id);
      if (!s || run.revealed.includes(id)) continue;
      if (run.interest >= (s.minInterest ?? 0)) {
        run.revealed.push(id);
        events.revealed = s;
        notes.push(`They asked about something private (${s.label}). You trust them enough now to answer honestly, in your own words: ${s.reveal}`);
      } else {
        events.deflected = s;
        notes.push(`They're poking at something private (${s.label}). You're not ready to get into that with them — deflect lightly.`);
      }
      break;
    }
  }

  // --- walkout / clock --------------------------------------------------------
  if (run.status === 'playing') {
    if (run.interest <= 0) {
      end(run, 'lose', 'walkout');
      notes.push(`You've had enough. End the conversation and leave, politely but firmly — ${level.walkout ?? 'you leave'}.`);
    } else if (run.turn >= run.maxTurns) {
      end(run, 'lose', 'time');
      notes.push(`This is your last line: ${level.exit}. Wrap up and say goodbye naturally. Don't agree to anything new.`);
    } else if (turnsLeft(run) === 2) {
      notes.push(`Time is nearly up (${level.exit} soon) — let that show naturally.`);
    }
  }

  run.log.push({ turn: run.turn, delta, raw: judge.delta, mood: judge.mood, feedback: judge.feedback, interest: run.interest, asked: events.asked, refused: events.refused, revealed: events.revealed?.id ?? null });
  return { run, direction: notes.join('\n'), events };
}

// ---- voice request --------------------------------------------------------------

export function buildVoiceRequest({ framework, persona, level, character, charState, player, run, direction }: {
  framework: string;
  persona: string;
  level: Level;
  character: Character;
  charState: Pick<CharacterState, 'memories' | 'notes'> | undefined;
  player: { name: string; pronouns: Pronouns };
  run: Run;
  direction: string;
}): ModelRequest {
  const playerName = player.name.trim() || 'the newcomer';
  const memories = [...(charState?.memories ?? []).map((m) => `- ${m}`), ...(charState?.notes ?? []).map((n) => `- About them: ${n}`)];
  const left = turnsLeft(run);
  const system = fill(framework, {
    name: character.displayName,
    playerName,
    pronouns: PRONOUNS[player.pronouns] ?? PRONOUNS.they,
    persona: fill(persona, { playerName }),
    memories: memories.length ? memories.join('\n') : "- You've never met them before this scene.",
    when: level.when ?? '',
    location: level.location ?? '',
    situation: level.situation,
    clock: run.status === 'playing' ? `About ${left} more exchange${left === 1 ? '' : 's'} before ${level.exit}.` : '',
    interest: run.interest,
    direction: direction || 'No special instructions — just respond naturally.',
  });
  const messages: ModelRequest['messages'] = run.messages.slice(-VOICE_HISTORY_WINDOW).map(({ role, text }: Message) => ({ role, text }));
  // Gemini wants the first message from the user.
  if (messages[0]?.role !== 'user') messages.unshift({ role: 'user', text: '[The scene continues.]' });
  return { system, messages };
}

/** Tidy a character reply: strip a leaked name prefix, quotes, and stray markup. */
export function cleanReply(text: string, character: Pick<Character, 'displayName'>): string {
  let t = String(text ?? '').trim();
  // Handles "Rosie:", "**Rosie**:" and "**Rosie:**".
  const prefix = new RegExp(`^\\**\\s*${character.displayName}\\s*\\**\\s*:\\s*\\**\\s*`, 'i');
  t = t.replace(prefix, '');
  if (/^".*"$/s.test(t) && !t.slice(1, -1).includes('"')) t = t.slice(1, -1);
  return t.replace(/\[(?:director|note)[^\]]*\]/gi, '').trim();
}

// ---- summary --------------------------------------------------------------------

export function summarizeRun(run: Run, level: Level): RunSummary {
  const best = [...run.log].sort((a, b) => b.delta - a.delta)[0] ?? null;
  const playerLines = run.messages.filter((m) => m.role === 'user' && !m.hidden);
  return {
    outcome: run.status === 'win' ? 'win' : 'lose',
    endReason: run.endReason,
    finalInterest: run.interest,
    turns: run.turn,
    revealed: (level.secrets ?? []).filter((s) => run.revealed.includes(s.id)),
    secretsTotal: (level.secrets ?? []).length,
    bestLine: best && best.delta > 0 ? { text: playerLines[best.turn - 1]?.text ?? '', delta: best.delta, feedback: best.feedback } : null,
  };
}

export function buildLearnRequest({ character, run }: { character: Character; run: Run }): ModelRequest {
  const lines = run.messages
    .filter((m) => !m.hidden)
    .map((m) => `${m.role === 'user' ? 'Player' : character.displayName}: ${m.text}`)
    .join('\n');
  return {
    system: `You extract facts for a character's memory. From the conversation, list up to 3 short facts that ${character.displayName} learned about the PLAYER — things the player said about themselves (work, home, interests, opinions, stories, plans). Only facts the player actually stated; no guesses, nothing about ${character.displayName}. Phrase each as "They ..." in under 15 words. Return {"facts": []} if there are none.`,
    messages: [{ role: 'user', text: lines }],
    schema: { type: 'object', properties: { facts: { type: 'array', items: { type: 'string' } } }, required: ['facts'] },
  };
}
