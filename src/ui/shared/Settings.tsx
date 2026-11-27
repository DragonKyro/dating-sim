// Modals: API key onboarding, the player's name, settings (incl. cloud
// saves) and the one-time "new story" notice. ModalHost renders whichever
// is open in uiStore.

import { useEffect, useRef, useState } from 'react';
import type { Pronouns } from '@/game/types';
import { PINNABLE_MODELS, validateKey } from '@/ai/llm';
import { flushCloud, signIn, signOut, useCloud } from '@/net/cloud';
import { setPrefs, usePrefs, type TextSpeed } from '@/store/prefsStore';
import { resetProgress, updateSave, useSave } from '@/store/saveStore';
import { formatDate } from '../text';
import { closeModal, confirmDialog, toast, useModal } from '../uiStore';
import { Modal } from './controls';

export function ModalHost() {
  const modal = useModal((s) => s.modal);
  if (modal === 'key') return <KeySetup />;
  if (modal === 'name') return <NamePrompt />;
  if (modal === 'settings') return <SettingsPanel />;
  if (modal === 'notice') return <NewStoryNotice />;
  return null;
}

function PronounPicker({ value, onChange }: { value: Pronouns; onChange: (p: Pronouns) => void }) {
  const opts: [Pronouns, string][] = [['he', 'he/him'], ['she', 'she/her'], ['they', 'they/them']];
  return (
    <div className="seg">
      {opts.map(([v, label]) => (
        <button key={v} type="button" className={v === value ? 'on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function KeySetup() {
  const [key, setKey] = useState(usePrefs.getState().apiKey);
  const [status, setStatus] = useState<{ kind: '' | 'ok' | 'err'; text: string }>({ kind: '', text: '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const k = key.trim();
    if (!k) return setStatus({ kind: 'err', text: 'Paste your key first.' });
    setBusy(true);
    setStatus({ kind: '', text: 'Checking with Google…' });
    const res = await validateKey(k);
    setBusy(false);
    if (!res.ok) return setStatus({ kind: 'err', text: res.error });
    setPrefs({ apiKey: k });
    toast('Key saved. It stays in this browser.', { icon: '🔑' });
    closeModal(true);
  };
  return (
    <Modal onClose={() => closeModal()}>
      <h2>One thing before the ferry</h2>
      <p>The people of Saltwick are played by Google's Gemini. You'll need your own free API key — it takes about a minute, and it never leaves your browser except to talk to Google.</p>
      <ol>
        <li><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Open Google AI Studio</a> and sign in with any Google account.</li>
        <li>Click <strong>Create API key</strong> and copy it (it starts with <code>AIza</code>).</li>
        <li>Paste it here.</li>
      </ol>
      <div className="field">
        <label htmlFor="key">Gemini API key</label>
        <input id="key" type="password" placeholder="AIza…" autoComplete="off" spellCheck={false} value={key} autoFocus onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void save()} />
        <div className="hint">Stored only in this browser. Never synced to the cloud. The free tier is plenty for casual play.</div>
      </div>
      <div className={`status-line ${status.kind}`}>{status.text}</div>
      <div className="btn-row end">
        <button className="btn ghost" onClick={() => closeModal()}>Cancel</button>
        <button className="btn" disabled={busy} onClick={() => void save()}>Save &amp; continue</button>
      </div>
    </Modal>
  );
}

function NamePrompt() {
  const player = useSave((s) => s.player);
  const [name, setName] = useState(player.name);
  const [pronouns, setPronouns] = useState<Pronouns>(player.pronouns);
  const done = () => {
    updateSave((p) => { p.player = { name: name.trim(), pronouns }; });
    closeModal(true);
  };
  return (
    <Modal dismissable={false}>
      <div className="flavor note">
        <span className="from">Taped to the ferry ticket</span>
        Darling — the island will want to know what to call you. Everyone knows everyone here, so pick something you like. — Bea
      </div>
      <div className="field">
        <label htmlFor="pname">What should people call you?</label>
        <input id="pname" type="text" maxLength={24} placeholder="Your name" value={name} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && done()} />
      </div>
      <div className="field">
        <label>How should they refer to you?</label>
        <PronounPicker value={pronouns} onChange={setPronouns} />
      </div>
      <div className="btn-row end">
        <button className="btn" onClick={done}>Board the ferry</button>
      </div>
    </Modal>
  );
}

function CloudSection() {
  const { user, error, lastSyncedAt, status } = useCloud();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) {
    return (
      <div>
        <div className="account">
          {user.photo && <img src={user.photo} alt="" referrerPolicy="no-referrer" />}
          <div>
            <strong>{user.name}</strong>
            <div className="muted small">{user.email}</div>
          </div>
        </div>
        <p className="small muted">Progress syncs automatically. Last synced {formatDate(lastSyncedAt)}.{error ? ` (${error})` : ''}</p>
        <div className="btn-row">
          <button className="btn ghost small" disabled={status === 'syncing'} onClick={() => void flushCloud().then(() => toast('Synced.'))}>Sync now</button>
          <button className="btn ghost small" onClick={() => void signOut().then(() => toast('Signed out. Your progress stays on this device.'))}>Sign out</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className="small muted">Optional. Sign in to back up your progress and pick it up on another device. Your API key is never uploaded.</p>
      <button
        className="btn small"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr('');
          try {
            await signIn();
            toast('Cloud saves on.', { icon: '☁️' });
          } catch (e) {
            setErr((e as Error).message);
          }
          setBusy(false);
        }}
      >
        Sign in with Google
      </button>
      <div className="status-line err">{err}</div>
    </div>
  );
}

function SettingsPanel() {
  const prefs = usePrefs();
  const player = useSave((s) => s.player);
  const [name, setName] = useState(player.name);
  const [pronouns, setPronouns] = useState<Pronouns>(player.pronouns);
  const [textSpeed, setTextSpeed] = useState<TextSpeed>(prefs.textSpeed);
  const [reduceMotion, setReduceMotion] = useState(prefs.reduceMotion);
  const [temperature, setTemperature] = useState(prefs.temperature);
  const [voiceModel, setVoiceModel] = useState(prefs.voiceModel);
  const [judgeModel, setJudgeModel] = useState(prefs.judgeModel);
  const keyMask = prefs.apiKey ? `${prefs.apiKey.slice(0, 6)}…${prefs.apiKey.slice(-4)}` : 'not set';
  // Opened from the cloud chip: jump to the cloud section.
  const cloudRef = useRef<HTMLHeadingElement>(null);
  const section = useModal((s) => s.section);
  useEffect(() => {
    if (section === 'cloud') cloudRef.current?.scrollIntoView({ block: 'center' });
  }, [section]);

  const save = () => {
    if (name.trim() !== player.name || pronouns !== player.pronouns) updateSave((p) => { p.player = { name: name.trim(), pronouns }; });
    setPrefs({ textSpeed, reduceMotion, temperature, voiceModel, judgeModel });
    closeModal(true);
  };
  const reset = async () => {
    const ok = await confirmDialog({ title: 'Start the summer over?', body: 'This erases every scene, memory and ending on this device (and in the cloud, if you\'re signed in). Your key and settings stay.', ok: 'Erase progress', danger: true });
    if (!ok) return;
    resetProgress();
    toast('A fresh summer.');
    closeModal(true);
  };
  const ModelSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="auto">Auto (best free model available)</option>
      {PINNABLE_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
    </select>
  );

  return (
    <Modal wide onClose={() => closeModal()}>
      <h2>Settings</h2>
      <div className="row2">
        <div className="field">
          <label htmlFor="sname">Your name</label>
          <input id="sname" type="text" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="speed">Text speed</label>
          <select id="speed" value={textSpeed} onChange={(e) => setTextSpeed(e.target.value as TextSpeed)}>
            {(['slow', 'normal', 'fast', 'instant'] as const).map((v) => <option key={v} value={v}>{v[0]!.toUpperCase() + v.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Pronouns</label>
        <PronounPicker value={pronouns} onChange={setPronouns} />
      </div>
      <label className="toggle">
        <input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />
        Reduce motion (stops ambient animation)
      </label>

      <h3 ref={cloudRef}>Cloud saves</h3>
      <CloudSection />

      <h3>Gemini</h3>
      <div className="account">
        <span>🔑</span>
        <div style={{ flex: 1 }}>
          <strong>API key</strong>
          <div className="muted small">{keyMask}</div>
        </div>
        <button className="btn ghost small" onClick={() => useModal.setState({ modal: 'key', onDone: () => useModal.setState({ modal: 'settings' }) })}>Change</button>
      </div>
      <div className="row2">
        <div className="field">
          <label>Character voice model</label>
          <ModelSelect value={voiceModel} onChange={setVoiceModel} />
        </div>
        <div className="field">
          <label>Scoring model</label>
          <ModelSelect value={judgeModel} onChange={setJudgeModel} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="temp">Character creativity</label>
        <input id="temp" type="range" min="0.4" max="1.2" step="0.05" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
        <div className="hint">Lower is steadier, higher is more surprising.</div>
      </div>

      <h3>Progress</h3>
      <div className="btn-row">
        <button className="btn danger small" onClick={() => void reset()}>Reset progress</button>
      </div>
      <div className="btn-row end">
        <button className="btn ghost" onClick={() => closeModal()}>Cancel</button>
        <button className="btn" onClick={save}>Save</button>
      </div>
    </Modal>
  );
}

function NewStoryNotice() {
  return (
    <Modal onClose={() => closeModal()}>
      <h2>Welcome back</h2>
      <p>The game has been rebuilt from the ground up as Last Ferry — new story, new cast, new art. Your old progress belonged to a story that no longer exists, so it's been cleared. Your API key and name are still here.</p>
      <div className="btn-row end">
        <button className="btn" onClick={() => closeModal()}>Take me to the island</button>
      </div>
    </Modal>
  );
}
