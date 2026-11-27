// The scene controller: one conversation, one objective. Runs each turn as
// judge → rules → her reply, and turns the results into things to render
// (log lines, meter, mood, emotes, toasts, the result card).
//
// The run is saved after every step (runStore) so a refresh resumes: if it
// happened between the rules step and her reply, `run.pending` holds the
// director's note and the reply is requested again.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CharacterHandle } from '@/art/character';
import { CHARACTERS, getLevel, speakerOf } from '@/content';
import { judgeTurn, learnAboutPlayer, speak } from '@/ai/ai';
import { LlmError } from '@/ai/llm';
import { newRun, resolveTurn, summarizeRun } from '@/game/engine';
import { applyOutcome, resolveLevel, startingInterest } from '@/game/progress';
import { emptyCharacterState, type Character, type Level, type ResolvedLevel, type Run, type RunSummary, type TurnEvents } from '@/game/types';
import { flushCloud } from '@/net/cloud';
import { byok, usePrefs } from '@/store/prefsStore';
import { getRun, setRun } from '@/store/runStore';
import { getProgress, updateSave } from '@/store/saveStore';
import { openModal, toast } from '../uiStore';

export const MAX_INPUT = 400;
const NOTES_CAP = 8;

export type LogItem =
  | { id: number; kind: 'her'; text: string; animate: boolean }
  | { id: number; kind: 'you'; text: string }
  | { id: number; kind: 'fb'; delta: number; text: string; extra?: string }
  | { id: number; kind: 'sys'; text: string }
  | { id: number; kind: 'err'; text: string; fixKey: boolean; retry: () => void }
  | { id: number; kind: 'typing' };

export interface Emote {
  id: number;
  glyph: string;
  color: string;
  dx: number;
  delay: number;
}

export interface SceneResult {
  summary: RunSummary;
  gain: number;
}

let nextId = 0;
const id = () => ++nextId;

function errorText(err: unknown): string {
  if (err instanceof LlmError) {
    if (err.kind === 'quota') return err.daily ? "Today's free Gemini quota is used up. It resets at midnight Pacific." : "Gemini's free quota is busy. Wait a moment and try again.";
    if (err.kind === 'auth') return 'Your Gemini key was rejected.';
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

function emotesFor(e: Pick<TurnEvents, 'delta' | 'mood'>): Omit<Emote, 'id' | 'dx' | 'delay'>[] {
  if (e.delta >= 7) return Array(3).fill({ glyph: '♥', color: '#ff8a9a' });
  if (e.delta >= 4) return [{ glyph: '♥', color: '#ff9aa8' }];
  if (e.mood === 'laugh') return [{ glyph: '♪', color: '#ffd27a' }];
  if (e.delta <= -5) return [{ glyph: '#', color: '#ff7b6b' }];
  if (e.delta <= -2) return [{ glyph: '…', color: '#cfc6d8' }];
  if (e.mood === 'surprised') return [{ glyph: '!', color: '#fff' }];
  if (e.mood === 'thinking') return [{ glyph: '?', color: '#fff' }];
  return [];
}

export interface SceneController {
  raw: Level;
  level: ResolvedLevel;
  character: Character;
  run: Run;
  items: LogItem[];
  busy: boolean;
  draft: string;
  setDraft: (s: string) => void;
  send: () => void;
  onTyped: (itemId: number) => void;
  emotes: Emote[];
  floats: { id: number; delta: number }[];
  result: SceneResult | null;
  leaving: boolean;
  sprite: React.RefObject<CharacterHandle | null>;
}

/** Returns null while the level id is unknown. */
export function useScene(levelId: string): SceneController | null {
  const raw = getLevel(levelId);
  // Resolve once per mount: the save changes as the scene plays.
  const [setup] = useState(() => {
    if (!raw) return null;
    const p = getProgress();
    const level = resolveLevel(raw, p);
    const character = CHARACTERS[speakerOf(level)]!;
    const saved = getRun();
    const run = saved?.levelId === levelId ? saved : newRun(level, startingInterest(level, p.characters[character.id]));
    return { level, character, run };
  });

  const sprite = useRef<CharacterHandle | null>(null);
  const runRef = useRef<Run>(setup?.run as Run);
  const [run, setRunState] = useState<Run>(setup?.run as Run);
  const [items, setItems] = useState<LogItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [draft, setDraft] = useState('');
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [floats, setFloats] = useState<{ id: number; delta: number }[]>([]);
  const [result, setResult] = useState<SceneResult | null>(null);
  const [leaving, setLeaving] = useState(false);
  const pendingResult = useRef<SceneResult | null>(null);
  const typedCallbacks = useRef(new Map<number, () => void>());

  const commitRun = useCallback((r: Run) => {
    runRef.current = r;
    setRunState(r);
    setRun(r);
  }, []);

  const push = useCallback((...add: LogItem[]) => setItems((xs) => [...xs, ...add]), []);
  const remove = useCallback((...ids: number[]) => setItems((xs) => xs.filter((x) => !ids.includes(x.id))), []);

  /** Add her line, typed out; resolves when the typewriter finishes. */
  const sayHer = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        const itemId = id();
        typedCallbacks.current.set(itemId, resolve);
        push({ id: itemId, kind: 'her', text, animate: true });
      }),
    [push],
  );

  const onTyped = useCallback((itemId: number) => {
    const cb = typedCallbacks.current.get(itemId);
    typedCallbacks.current.delete(itemId);
    cb?.();
  }, []);

  const react = useCallback((e: Pick<TurnEvents, 'delta' | 'mood'>) => {
    const list = emotesFor(e).map((x, i, all) => ({ ...x, id: id(), dx: (i - (all.length - 1) / 2) * 46, delay: i * 0.12 }));
    if (!list.length) return;
    setEmotes((xs) => [...xs, ...list]);
    setTimeout(() => setEmotes((xs) => xs.filter((x) => !list.some((l) => l.id === x.id))), 2200);
  }, []);

  const floatDelta = useCallback((delta: number) => {
    if (!delta) return;
    const f = { id: id(), delta };
    setFloats((xs) => [...xs, f]);
    setTimeout(() => setFloats((xs) => xs.filter((x) => x.id !== f.id)), 1500);
  }, []);

  // ---- end of scene ---------------------------------------------------------
  const finish = useCallback(() => {
    if (!raw || !setup) return;
    const r = runRef.current;
    const summary = summarizeRun(r, setup.level);
    let gain = 0;
    updateSave((p) => {
      gain = applyOutcome(p, raw, summary).affectionGain;
    });
    setRun(null);
    if (summary.outcome === 'lose' && r.endReason === 'walkout') setLeaving(true);
    // Remember what she learned about the player (background, best effort).
    void learnAboutPlayer({ byok: byok(), character: setup.character, run: r })
      .then((facts) => {
        if (!facts.length) return;
        updateSave((p) => {
          const c = (p.characters[setup.character.id] ??= emptyCharacterState());
          for (const f of facts) if (!c.notes.includes(f)) c.notes.push(f);
          if (c.notes.length > NOTES_CAP) c.notes.splice(0, c.notes.length - NOTES_CAP);
        });
      })
      .finally(() => void flushCloud());
    pendingResult.current = { summary, gain };
    setTimeout(() => setResult(pendingResult.current), 900);
  }, [raw, setup]);

  // ---- her reply --------------------------------------------------------------
  const deliverReply = useCallback(
    async (pending: { direction: string; events: TurnEvents }) => {
      if (!setup) return;
      const typingId = id();
      push({ id: typingId, kind: 'typing' });
      const r = runRef.current;
      const { level, character } = setup;
      let reply: { text: string };
      try {
        reply = await speak({
          byok: byok(), temperature: usePrefs.getState().temperature, player: getProgress().player,
          level, character, charState: getProgress().characters[character.id], run: r, direction: pending.direction,
        });
      } catch (err) {
        remove(typingId);
        const errId = id();
        push({ id: errId, kind: 'err', text: `Her reply didn't come through. ${errorText(err)}`, fixKey: err instanceof LlmError && err.kind === 'auth', retry: () => { remove(errId); void deliverReply(pending); } });
        return;
      }
      remove(typingId);
      const next: Run = { ...runRef.current, messages: [...runRef.current.messages, { role: 'model', text: reply.text }] };
      delete next.pending;
      commitRun(next);
      const e = pending.events;
      sprite.current?.setExpression(e.mood);
      react(e);
      if (e.revealed) toast(`Discovered: ${e.revealed.label}`, { kind: 'secret', icon: '🔑', ms: 4500 });
      else if (e.deflected) toast("She's not ready to talk about that yet.", { kind: 'warn', icon: '🔒' });
      if (e.refused && next.status === 'playing') {
        if (e.strike) toast("That felt pushy. She won't take many more asks like that.", { kind: 'warn', icon: '⚠' });
        else toast(`She's touched — but it's a little soon. Build toward ♥ ${level.objective.threshold}.`, { kind: 'warn', icon: '⏳' });
      }
      await sayHer(reply.text);
      if (next.status !== 'playing') finish();
      else setBusy(false);
    },
    [setup, push, remove, commitRun, react, sayHer, finish],
  );

  // ---- a player turn --------------------------------------------------------
  const sendText = useCallback(
    async (text: string) => {
      if (!setup) return;
      const { level, character } = setup;
      if (!usePrefs.getState().apiKey) {
        setBusy(false);
        setDraft(text);
        openModal('key', { onDone: () => void sendText(text) });
        return;
      }
      setBusy(true);
      const youId = id(), typingId = id();
      push({ id: youId, kind: 'you', text }, { id: typingId, kind: 'typing' });

      // 1) judge — on failure nothing has changed; give the text back.
      let judged: Awaited<ReturnType<typeof judgeTurn>>;
      try {
        judged = await judgeTurn({ byok: byok(), level, character, run: runRef.current, playerText: text });
      } catch (err) {
        remove(youId, typingId);
        setDraft(text);
        const errId = id();
        push({ id: errId, kind: 'err', text: errorText(err), fixKey: err instanceof LlmError && err.kind === 'auth', retry: () => { remove(errId); setDraft(''); void sendText(text); } });
        setBusy(false);
        return;
      }
      remove(typingId);

      // 2) rules
      const before = { ...runRef.current, messages: [...runRef.current.messages, { role: 'user' as const, text }] };
      const res = resolveTurn(before, level, judged);
      commitRun({ ...res.run, pending: { direction: res.direction, events: res.events } });
      floatDelta(res.events.delta - res.events.penalty);
      const fb: LogItem[] = [{ id: id(), kind: 'fb', delta: res.events.delta, text: res.events.feedback || '…', extra: res.events.refused ? '· not yet' : undefined }];
      if (res.events.penalty) fb.push({ id: id(), kind: 'fb', delta: -res.events.penalty, text: 'asked before she was ready' });
      push(...fb);

      // 3) her reply — on failure the turn already counted; retry just the reply.
      await deliverReply({ direction: res.direction, events: res.events });
    },
    [setup, push, remove, commitRun, floatDelta, deliverReply],
  );

  const send = useCallback(() => {
    const text = draft.trim().slice(0, MAX_INPUT);
    if (!text || busy || runRef.current.status !== 'playing') return;
    setDraft('');
    void sendText(text);
  }, [draft, busy, sendText]);

  // ---- start / resume ---------------------------------------------------------
  const started = useRef(false);
  useEffect(() => {
    if (!setup || started.current) return;
    started.current = true;
    const { character, run: r } = setup;
    updateSave((p) => {
      (p.characters[character.id] ??= emptyCharacterState()).met = true;
    });
    commitRun(r);
    const visible = r.messages.filter((m) => !m.hidden);
    if (visible.length <= 1) {
      // A fresh scene: she opens.
      const t = setTimeout(() => void sayHer(r.messages[1]!.text).then(() => setBusy(false)), 650);
      // StrictMode runs effects twice in dev: let the second run start over.
      return () => {
        clearTimeout(t);
        started.current = false;
      };
    }
    // Resume: replay the conversation, then pick up where it stopped.
    const replay: LogItem[] = [];
    let li = 0;
    for (const m of visible) {
      if (m.role === 'user') {
        replay.push({ id: id(), kind: 'you', text: m.text });
        const entry = r.log[li++];
        if (entry) replay.push({ id: id(), kind: 'fb', delta: entry.delta, text: entry.feedback });
      } else replay.push({ id: id(), kind: 'her', text: m.text, animate: false });
    }
    replay.push({ id: id(), kind: 'sys', text: '— resumed —' });
    setItems(replay);
    setTimeout(() => sprite.current?.setExpression(r.log.at(-1)?.mood ?? 'neutral'), 50);
    if (r.pending) void deliverReply(r.pending);
    else if (r.status !== 'playing') finish();
    else setBusy(false);
  }, [setup, commitRun, sayHer, deliverReply, finish]);

  if (!raw || !setup) return null;
  return { raw, level: setup.level, character: setup.character, run, items, busy, draft, setDraft, send, onTyped, emotes, floats, result, leaving, sprite };
}
