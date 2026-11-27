import { CHAPTERS, CHARACTERS, LEVELS, speakerOf } from '@/content';
import { checkUnlock } from '@/game/progress';
import type { Level, Progress } from '@/game/types';
import { useRun } from '@/store/runStore';
import { useSave } from '@/store/saveStore';
import { CloudChip, Portrait, SceneArt, SceneThumb } from '../shared/controls';
import { go, paths } from '../router';
import { openModal } from '../uiStore';

function LevelCard({ level, p, resumable }: { level: Level; p: Progress; resumable: boolean }) {
  const character = CHARACTERS[speakerOf(level)]!;
  const ls = p.levels[level.id];
  const unlock = checkUnlock(level, p, LEVELS);
  const ending = ls?.completed ? level.onComplete?.ending : ls?.attempts ? level.onFail?.ending : undefined;
  const cls = ['level-card', unlock.ok ? '' : 'locked', ls?.completed ? 'done' : ''].filter(Boolean).join(' ');
  return (
    <button className={cls} type="button" disabled={!unlock.ok} onClick={() => go(paths.brief(level.id))}>
      <div className="thumb">
        <SceneThumb spec={level.scene} alt={level.location} />
        <Portrait character={character} asImage />
      </div>
      <div className="body">
        <div className="with" style={{ color: character.color }}>{character.displayName}</div>
        <div className="title">{level.title}</div>
        <div className="teaser">{level.card}</div>
        <div className="status">
          {!unlock.ok ? <span className="badge lock">🔒 {unlock.reasons[0]}</span>
            : resumable ? <span className="badge resume">In progress — resume</span>
            : ls?.completed ? <span className="badge ok">✓ Complete</span>
            : ls?.attempts ? <span className="badge">Tried {ls.attempts}×</span>
            : <span className="badge">New</span>}
          {ending && p.endings.includes(ending) && <span className="badge ending">{ending.endsWith('together') ? '♥ Ending' : 'Ending'}</span>}
        </div>
      </div>
    </button>
  );
}

export function IslandMap() {
  const p = useSave();
  const runLevel = useRun((s) => s.run?.levelId);
  return (
    <div className="map-screen screen-enter">
      <SceneArt spec={{ id: 'harbor', time: 'night', weather: 'clear' }} className="backdrop dim" />
      <header className="map-top">
        <button className="icon-btn" title="Title screen" onClick={() => go(paths.title)}>⟵</button>
        <h1>Saltwick</h1>
        <span className="spacer" />
        <CloudChip />
        <button className="btn ghost small" onClick={() => go(paths.journal)}>Journal</button>
        <button className="icon-btn" title="Settings" onClick={() => openModal('settings')}>⚙</button>
      </header>
      <div className="map-scroll">
        {CHAPTERS.map((ch) => {
          const levels = LEVELS.filter((l) => l.chapter === ch.id);
          if (!levels.length) return null;
          return (
            <section className="chapter" key={ch.id}>
              <div className="chapter-head">
                <h2>Chapter {ch.id} · {ch.title}</h2>
                <span className="when">{ch.when}</span>
                {ch.note && <span className="note">{ch.note}</span>}
              </div>
              <div className="level-row">
                {levels.map((l) => <LevelCard key={l.id} level={l} p={p} resumable={runLevel === l.id} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
