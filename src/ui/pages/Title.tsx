import { useSave } from '@/store/saveStore';
import { hasApiKey } from '@/store/prefsStore';
import { useRun } from '@/store/runStore';
import { CloudChip, SceneArt } from '../shared/controls';
import { go, paths } from '../router';
import { openModal, useModal } from '../uiStore';

/** Key first, then name, then the island. */
export function startOrContinue(): void {
  if (!hasApiKey()) return openModal('key', { onDone: startOrContinue });
  if (!useSave.getState().player.name) return openModal('name', { onDone: startOrContinue });
  go(paths.island);
}

export function Title() {
  const started = useSave((s) => Object.keys(s.levels).length > 0);
  const inProgress = useRun((s) => !!s.run);
  return (
    <div className="title-screen screen-enter">
      <SceneArt spec={{ id: 'harbor', time: 'dusk', weather: 'clear' }} />
      <div className="title-card">
        <div className="title-kicker">a summer on saltwick island</div>
        <h1 className="title-logo">Last Ferry</h1>
        <p className="title-sub">Everyone on the island is deciding whether to stay or go. So are you.</p>
        <div className="title-actions">
          <button className="btn big" onClick={startOrContinue}>{started || inProgress ? 'Continue' : 'Begin'}</button>
          <div className="btn-row center">
            {started && <button className="btn ghost" onClick={() => go(paths.journal)}>Journal</button>}
            <button className="btn ghost" onClick={() => useModal.setState({ modal: 'settings' })}>Settings</button>
          </div>
        </div>
      </div>
      <div className="title-foot">
        <CloudChip />
        <span className="chip">Powered by your own Gemini key · stays in your browser</span>
      </div>
    </div>
  );
}
