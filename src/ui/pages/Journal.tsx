import { CHARACTER_LIST, CHARACTERS, LEVELS } from '@/content';
import { knownFacts } from '@/game/progress';
import { useSave } from '@/store/saveStore';
import { HeartMeter, Portrait, SceneArt } from '../shared/controls';
import { go, paths } from '../router';

export function Journal() {
  const p = useSave();
  const endingIds = [...new Set(LEVELS.flatMap((l) => [l.onComplete?.ending, l.onFail?.ending]).filter((e): e is string => !!e))];
  return (
    <div className="journal screen-enter">
      <SceneArt spec={{ id: 'records', time: 'dusk', weather: 'clear' }} className="backdrop dim" still />
      <header className="map-top">
        <button className="icon-btn" title="Back" onClick={() => go(Object.keys(p.levels).length ? paths.island : paths.title)}>⟵</button>
        <h1>Journal</h1>
        <span className="spacer" />
      </header>
      <div className="journal-body">
        <div className="journal-grid">
          {CHARACTER_LIST.map((c) => {
            const cs = p.characters[c.id];
            const met = !!cs?.met;
            const facts = knownFacts(LEVELS, c.id, p);
            return (
              <article key={c.id} className={`person${met ? '' : ' unmet'}`}>
                <div className="person-head">
                  <Portrait character={c} crop="face" expression={met && (cs?.affection ?? 0) >= 50 ? 'happy' : 'neutral'} />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: met ? c.color : undefined }}>{met ? c.fullName : "Someone you haven't met"}</h3>
                    {met && <div className="muted small">{c.age} · {c.role}</div>}
                    {met && <div className="small" title="Bond"><HeartMeter value={cs?.affection ?? 0} color={c.color} /></div>}
                  </div>
                </div>
                {met && cs && (
                  <div className="person-body">
                    <p className="serif muted">{c.tagline}</p>
                    {cs.memories.length > 0 && (<><h4>Moments</h4><ul>{cs.memories.map((m, i) => <li key={i}>{m}</li>)}</ul></>)}
                    {facts.length > 0 && (<><h4>What she's told you</h4><ul>{facts.map((f, i) => <li key={i}>{f}</li>)}</ul></>)}
                    {cs.notes.length > 0 && (<><h4>What she remembers about you</h4><ul>{cs.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></>)}
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <section className="endings">
          <div className="chapter-head">
            <h2>Endings</h2>
            <span className="when">{p.endings.length} / {endingIds.length}</span>
          </div>
          <div className="btn-row">
            {endingIds.map((id) => {
              const reached = p.endings.includes(id);
              const [who, kind] = id.split('-');
              return (
                <span key={id} className={`badge${reached ? ' ending' : ' lock'}`}>
                  {reached ? `${kind === 'together' ? '♥ Together' : 'Bittersweet'} — ${CHARACTERS[who!]?.displayName ?? who}` : '???'}
                </span>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
