import { getLevel, LEVELS } from '@/content';
import { freshProgress } from '@/store/saveStore';
import { applyOutcome, checkUnlock, knownFacts, resolveLevel, startingInterest } from './progress';
import type { Level } from './types';

const lvl = (id: string): Level => getLevel(id)!;

it('the exclusive storm group locks the other storms once one is completed', () => {
  const storms = ['09-storm-rosie', '10-storm-noor', '11-storm-tamsin', '12-storm-celeste'].map(lvl);
  const p = freshProgress();
  p.levels['05-four-am'] = { completed: true, attempts: 1, wins: 1, bestInterest: 60, lastOutcome: 'win' };
  p.levels['06-antenna-weather'] = { completed: true, attempts: 1, wins: 1, bestInterest: 60, lastOutcome: 'win' };
  expect(checkUnlock(storms[0]!, p, LEVELS).ok).toBe(true);
  p.levels['10-storm-noor'] = { completed: true, attempts: 1, wins: 1, bestInterest: 60, lastOutcome: 'win' };
  const r = checkUnlock(storms[0]!, p, LEVELS);
  expect(r.ok).toBe(false);
  expect(r.lockedBy).toBe('10-storm-noor');
});

it('prerequisites name the level to finish', () => {
  const r = checkUnlock(lvl('02-second-spin'), freshProgress(), LEVELS);
  expect(r.ok).toBe(false);
  expect(r.reasons[0]).toMatch(/The 4:10 Ferry/);
});

it('applyOutcome: a win sets flags, memories and a bond bonus; secrets stick on a loss', () => {
  const level = lvl('05-four-am');
  const T = level.objective.threshold!;
  const p = freshProgress();
  applyOutcome(p, level, { outcome: 'win', finalInterest: T + 14, revealed: [] });
  expect(p.levels['05-four-am']!.completed).toBe(true);
  expect(p.storyFlags).toContain('rosie_date');
  expect(p.characters.rosie!.affection).toBe(14 + Math.round(14 / 5));

  const q = freshProgress();
  applyOutcome(q, level, { outcome: 'lose', finalInterest: 40, revealed: level.secrets! });
  expect(q.levels['05-four-am']!.completed).toBe(false);
  expect(q.storyFlags).toContain('knows_lyon');
  expect(q.characters.rosie!.memories.some((m) => /Lyon/.test(m))).toBe(true);
  expect(knownFacts(LEVELS, 'rosie', q)[0]).toMatch(/Lyon/);
});

it('resolveLevel adds conditional situation lines and picks the right flavor card', () => {
  const level = lvl('05-four-am');
  const p = freshProgress();
  expect(resolveLevel(level, p).situation).not.toMatch(/Celeste/);
  p.storyFlags.push('met_celeste', 'knows_lyon');
  const r = resolveLevel(level, p);
  expect(r.situation).toMatch(/Celeste/);
  expect(r.flavorCard?.if).toEqual(['knows_lyon']);
});

it('startingInterest adds a capped bond bonus', () => {
  const level = lvl('13-lantern-rosie');
  expect(startingInterest(level, { affection: 0 })).toBe(level.startInterest);
  expect(startingInterest(level, { affection: 100 })).toBe(level.startInterest + 10);
});
