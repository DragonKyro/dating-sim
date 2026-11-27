import { useEffect } from 'react';
import { CHARACTERS, getLevel, LEVELS, speakerOf } from '@/content';
import { checkUnlock, knownFacts, resolveLevel, startingInterest } from '@/game/progress';
import type { Objective } from '@/game/types';
import { setRun, useRun } from '@/store/runStore';
import { useSave } from '@/store/saveStore';
import { SceneArt } from '../shared/controls';
import { go, paths } from '../router';
import { confirmDialog } from '../uiStore';

function flavorKind(from = ''): string {
  if (/low tide|fm\b|88\.1/i.test(from)) return 'radio';
  if (/^text/i.test(from)) return 'text';
  if (/council|minutes/i.test(from)) return 'doc';
  return 'note';
}

function goalExplainer(o: Objective): string {
  if (o.type === 'reach') return `Win her over: get her interest to ♥ ${o.threshold}. She'll take it from there.`;
  if (o.type === 'ask') return `Build her interest toward ♥ ${o.threshold}, then make your move — just say it in your own words. Too early and she'll put it off.`;
  return `Keep her interest above ♥ ${o.floor} for ${o.turns} exchanges. Dropping below ends the scene.`;
}

export function Briefing({ levelId }: { levelId: string }) {
  const p = useSave();
  const run = useRun((s) => s.run);
  const raw = getLevel(levelId);
  useEffect(() => {
    if (!raw) go(paths.island, true);
  }, [raw]);
  if (!raw) return null;
  const level = resolveLevel(raw, p);
  const character = CHARACTERS[speakerOf(level)]!;
  const cs = p.characters[character.id];
  const o = level.objective;
  const resumable = run?.levelId === levelId;
  const facts = knownFacts(LEVELS, character.id, p);
  const turns = o.type === 'endure' ? o.turns : (level.maxTurns ?? 12);
  const unlock = checkUnlock(raw, p, LEVELS);

  const begin = async (fresh: boolean) => {
    if (fresh && level.exclusiveGroup && !p.levels[level.id]?.attempts) {
      const ok = await confirmDialog({
        title: 'Spend the storm here?',
        body: `If this night goes well, you'll have spent the storm with ${character.displayName} — the other storm scenes will close. (If it goes badly, you can still go elsewhere.)`,
        ok: `Go to ${character.displayName}`,
      });
      if (!ok) return;
    }
    if (fresh && run) setRun(null);
    go(paths.scene(levelId));
  };

  return (
    <div className="brief-screen screen-enter">
      <SceneArt spec={level.scene} className="backdrop dim" />
      <div className="brief-card">
        <div className="brief-when">{level.when}</div>
        <h1 className="brief-title">{level.title}</h1>
        <div className="brief-where">
          {level.location} · with <strong style={{ color: character.color }}>{character.fullName}</strong>
        </div>
        {level.flavorCard && (
          <div className={`flavor ${flavorKind(level.flavorCard.from)}`}>
            <span className="from">{level.flavorCard.from}</span>
            {level.flavorCard.text}
          </div>
        )}
        <div className="brief-intro">{level.intro.map((t, i) => <p key={i}>{t}</p>)}</div>
        <div className="brief-grid">
          <div className="brief-box">
            <h3>Your goal</h3>
            <div className="goal">{o.label}</div>
            <p className="small muted" style={{ marginTop: '0.35rem' }}>{goalExplainer(o)}</p>
            <p className="small muted">{turns} exchanges before {level.exit}. She starts at ♥ {startingInterest(level, cs)}.</p>
          </div>
          <div className="brief-box">
            <h3>Tips</h3>
            <ul>{(level.tips ?? []).map((t, i) => <li key={i}>{t}</li>)}</ul>
            {!!level.secrets?.length && <p className="small muted">🔑 {level.secrets.length === 1 ? "There's something" : 'There are things'} she isn't saying. Earn her trust and ask.</p>}
          </div>
        </div>
        {(facts.length > 0 || (cs?.memories.length ?? 0) > 0) && (
          <div className="brief-box brief-know">
            <h3>What you know about {character.displayName}</h3>
            <ul>{[...facts, ...(cs?.memories.slice(-2) ?? []).map((m) => `Last time: ${m}`)].map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
        )}
        <div className="btn-row end">
          <button className="btn ghost" onClick={() => go(paths.island)}>Back</button>
          {resumable && <button className="btn ghost" onClick={() => void begin(true)}>Start over</button>}
          <button className="btn big" disabled={!unlock.ok} onClick={() => void begin(!resumable)}>{resumable ? 'Resume' : 'Begin'}</button>
        </div>
      </div>
    </div>
  );
}
