import { migrateLegacy, normalize, freshProgress, hasProgress } from './saveStore';

describe('legacy saves', () => {
  it('v1 (the Emma game) keeps the name and flags a one-time notice', () => {
    const p = migrateLegacy({ version: 1, byok: { apiKey: 'AIzaX' }, settings: { playerName: 'Kai' }, levelsCompleted: ['01-classroom'], characters: { emma: { affection: 40 } } });
    expect(p.player.name).toBe('Kai');
    expect(p.characters).toEqual({});
    expect(p.notices).toEqual(['v2-new-story']);
  });

  it('v1 with no progress shows no notice', () => {
    expect(migrateLegacy({ version: 1, settings: { playerName: '' } }).notices).toEqual([]);
  });

  it('v2 (first Last Ferry build) keeps all progress', () => {
    const p = migrateLegacy({
      version: 2,
      settings: { playerName: 'Sam', pronouns: 'he' },
      characters: { rosie: { affection: 22, met: true, flags: [], memories: ['m'], notes: [] } },
      levels: { '01-ferry': { completed: true, attempts: 1, wins: 1, bestInterest: 58, lastOutcome: 'win' } },
      storyFlags: ['met_rosie'],
    });
    expect(p.player).toEqual({ name: 'Sam', pronouns: 'he' });
    expect(p.characters.rosie!.affection).toBe(22);
    expect(p.levels['01-ferry']!.completed).toBe(true);
    expect(p.storyFlags).toEqual(['met_rosie']);
    expect(hasProgress(p)).toBe(true);
  });
});

describe('normalize', () => {
  it('fills a partial or junk save with safe defaults', () => {
    expect(normalize(null)).toEqual(freshProgress());
    const p = normalize({ characters: { noor: { affection: 5 } }, player: { pronouns: 'xe' } });
    expect(p.characters.noor).toEqual({ affection: 5, met: false, flags: [], memories: [], notes: [] });
    expect(p.player.pronouns).toBe('they');
  });

  it('never carries device-only fields into the save', () => {
    const p = normalize({ byok: { apiKey: 'SECRET' }, run: { levelId: 'x' } });
    expect(JSON.stringify(p)).not.toMatch(/SECRET|levelId/);
  });
});
