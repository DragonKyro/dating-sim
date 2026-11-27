import { useEffect, useRef } from 'react';
import { turnsLeft } from '@/game/engine';
import { usePrefs } from '@/store/prefsStore';
import { useSave } from '@/store/saveStore';
import { HeartMeter, RichLine, SceneArt } from '../shared/controls';
import { Sprite } from '../scene/Sprite';
import { Typewriter } from '../scene/Typewriter';
import { MAX_INPUT, useScene, type SceneController } from '../scene/useScene';
import { go, paths } from '../router';
import { capitalize } from '../text';
import { confirmDialog, openModal, retryScene } from '../uiStore';

export function ScenePage({ levelId }: { levelId: string }) {
  const s = useScene(levelId);
  useEffect(() => {
    if (!s) go(paths.island, true);
  }, [s]);
  if (!s) return null;
  return <Scene s={s} />;
}

function Scene({ s }: { s: SceneController }) {
  const { level, character, run } = s;
  const o = level.objective;
  const speed = usePrefs((p) => p.textSpeed);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  // Braces matter: Chrome's scrollTo() now returns a Promise, and an effect
  // must not return anything but a cleanup function.
  const scrollDown = () => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  };
  useEffect(() => {
    scrollDown();
  }, [s.items.length]);
  useEffect(() => {
    if (!s.busy) input.current?.focus();
  }, [s.busy]);

  const left = turnsLeft(run);
  const goalText = o.type === 'reach' ? `Get her to ♥ ${o.threshold}` : o.type === 'ask' ? `Near ♥ ${o.threshold}, make your move` : `Keep her above ♥ ${o.floor}`;
  const lastHer = [...s.items].reverse().find((x) => x.kind === 'her')?.id;
  const playerName = useSave((p) => p.player.name);

  const menu = async () => {
    const leave = await confirmDialog({ title: 'Step away?', body: 'Your conversation is saved; you can resume it from the island map.', ok: 'Back to the map', cancel: 'Stay' });
    if (leave) go(paths.island);
  };

  return (
    <div className={`scene-screen t-${level.scene.time ?? 'day'}`}>
      <SceneArt spec={level.scene} />
      <Sprite look={character.look} outfit={level.outfit} handle={s.sprite} leaving={s.leaving} />
      <div className="emotes">
        {s.emotes.map((e) => (
          <span key={e.id} className="emote" style={{ color: e.color, left: `${e.dx * 0.56}px`, animationDelay: `${e.delay}s`, '--dx': `${e.dx}px` } as React.CSSProperties}>
            {e.glyph}
          </span>
        ))}
      </div>

      <div className="hud">
        <div className="hud-left">
          <div className="hud-card">
            <div className="hud-name" style={{ color: character.color }}>
              {character.displayName}
              <span className="role">{character.role}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <HeartMeter value={run.interest} threshold={o.type === 'endure' ? null : o.threshold} floor={o.type === 'endure' ? o.floor : null} color={character.color} />
              {s.floats.map((f) => (
                <div key={f.id} className={`float-delta ${f.delta > 0 ? 'pos' : 'neg'}`} style={{ right: 0, top: -6 }}>
                  {f.delta > 0 ? '+' : ''}
                  {f.delta}
                </div>
              ))}
            </div>
          </div>
          <div className="hud-card hud-goal">
            <span className="label">Goal</span>
            {o.label}
            <div className="muted small">{goalText}</div>
          </div>
        </div>
        <div className="hud-right">
          <div className={`hud-card clock${left <= 2 && run.status === 'playing' ? ' urgent' : ''}`}>
            <strong>{o.type === 'endure' ? `${Math.min(run.turn, o.turns ?? 0)} / ${o.turns}` : `${left} left`}</strong>
            <br />
            <span className="muted">{o.type === 'endure' ? 'until' : 'before'} {level.exit}</span>
          </div>
          <button className="icon-btn" title="Menu" onClick={() => void menu()}>☰</button>
        </div>
      </div>

      <div className="dialog">
        <div className="nameplate" style={{ background: character.color }}>{character.displayName}</div>
        <div className="log" ref={log} aria-live="polite">
          {s.items.map((it) => {
            switch (it.kind) {
              case 'her':
                return (
                  <div key={it.id} className={`line her${it.id === lastHer ? ' current' : ' past'}`}>
                    <span className="who" style={{ color: character.color }}>{character.displayName}</span>
                    <span className="text">
                      {it.animate ? (
                        <Typewriter
                          text={it.text}
                          speed={speed}
                          onStart={() => s.sprite.current?.talk(true)}
                          onTick={scrollDown}
                          onDone={() => {
                            s.sprite.current?.talk(false);
                            s.onTyped(it.id);
                          }}
                        />
                      ) : (
                        <RichLine text={it.text} />
                      )}
                    </span>
                  </div>
                );
              case 'you':
                return (
                  <div key={it.id} className="line you">
                    <span className="who">{playerName || 'You'}</span>
                    <span className="text"><RichLine text={it.text} /></span>
                  </div>
                );
              case 'fb':
                return (
                  <div key={it.id} className={`fb ${it.delta > 0 ? 'pos' : it.delta < 0 ? 'neg' : 'zero'}`}>
                    <span>{it.text}</span>
                    {it.extra && <span>{it.extra}</span>}
                    <span className="d">{it.delta > 0 ? '+' : ''}{it.delta} ♥</span>
                  </div>
                );
              case 'sys':
                return <div key={it.id} className="sys">{it.text}</div>;
              case 'err':
                return (
                  <div key={it.id} className="sys err">
                    {it.text}{' '}
                    {it.fixKey
                      ? <button className="btn small" onClick={() => openModal('key', { onDone: it.retry })}>Fix key</button>
                      : <button className="btn small ghost" onClick={it.retry}>Try again</button>}
                  </div>
                );
              case 'typing':
                return (
                  <div key={it.id} className="line her">
                    <span className="typing"><i /><i /><i /></span>
                  </div>
                );
            }
          })}
        </div>
        <div className="composer">
          <textarea
            ref={input}
            placeholder={`Say something to ${character.displayName}…`}
            maxLength={MAX_INPUT}
            rows={1}
            value={s.draft}
            disabled={s.busy || run.status !== 'playing'}
            onChange={(e) => {
              s.setDraft(e.target.value);
              e.target.style.height = '46px';
              e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                s.send();
              }
            }}
          />
          <button className="btn" disabled={s.busy || run.status !== 'playing'} onClick={s.send}>Send</button>
        </div>
      </div>

      {s.result && <ResultCard s={s} />}
    </div>
  );
}

function ResultCard({ s }: { s: SceneController }) {
  const { summary, gain } = s.result!;
  const { raw, level, character } = s;
  const o = level.objective;
  const won = summary.outcome === 'win';
  const title = won
    ? o.type === 'ask' ? 'She said yes.' : o.type === 'reach' ? 'You won her over.' : 'You got her through it.'
    : ({ walkout: 'She walked away.', time: `${capitalize(level.exit)}.`, asks: 'You pushed too hard.', floor: 'She shut down.', goal: 'Not this time.' } as const)[summary.endReason ?? 'goal'];
  const ending = (won ? raw.onComplete : raw.onFail)?.ending;
  return (
    <div className="result-overlay">
      <div className="result-card">
        <div className={`result-kicker ${won ? 'win' : 'lose'}`}>{won ? 'Scene complete' : 'Scene over'}</div>
        <h2 className="result-title">{title}</h2>
        <p className="result-outro">{won ? raw.outro?.win : raw.outro?.lose}</p>
        {ending && (
          <div className="ending-banner">
            {ending.endsWith('together') ? `♥ Ending reached: Together — ${character.displayName}` : `Ending reached: Bittersweet — ${character.displayName}. There's another way this night can go.`}
          </div>
        )}
        <div className="result-stats">
          <div className="stat"><b>♥ {summary.finalInterest}</b><span>Her interest</span></div>
          <div className="stat"><b>{summary.turns}</b><span>Exchanges</span></div>
          <div className="stat"><b style={{ color: gain >= 0 ? '#ffc2ae' : '#ffb36b' }}>{gain >= 0 ? '+' : ''}{gain}</b><span>Bond</span></div>
        </div>
        {summary.bestLine && (
          <div className="result-list">
            <h4>Your best line</h4>
            <q>{summary.bestLine.text}</q>
            <div className="muted small">+{summary.bestLine.delta} · {summary.bestLine.feedback}</div>
          </div>
        )}
        {summary.secretsTotal > 0 && (
          <div className="result-list">
            <h4>Secrets · {summary.revealed.length} / {summary.secretsTotal}</h4>
            {summary.revealed.length ? <ul>{summary.revealed.map((x) => <li key={x.id}>{x.journal}</li>)}</ul> : <div className="muted small">She kept something to herself this time.</div>}
          </div>
        )}
        <div className="btn-row center" style={{ marginTop: '0.6rem' }}>
          {!won && <button className="btn ghost" onClick={retryScene}>Try again</button>}
          <button className="btn" onClick={() => go(paths.island)}>{won ? 'Continue' : 'Back to the island'}</button>
        </div>
      </div>
    </div>
  );
}
