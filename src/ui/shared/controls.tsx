// Small shared building blocks: modal shell, heart meter, art wrappers,
// dialog lines with *actions*, the cloud chip, toasts and the dialog host.

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Character, SceneSpec } from '@/game/types';
import { layeredScene, stepAnimations, stillSceneUrl, VIEW_H, VIEW_W } from '@/art/layers';
import { characterSVG, type Crop } from '@/art/character';
import { useCloud } from '@/net/cloud';
import { usePrefs } from '@/store/prefsStore';
import { splitActions, svgDataUrl } from '../text';
import { openModal, useDialog, useToasts } from '../uiStore';

export function Modal({ children, onClose, wide = false, dismissable = true }: { children: ReactNode; onClose?: () => void; wide?: boolean; dismissable?: boolean }) {
  useEffect(() => {
    if (!dismissable) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dismissable, onClose]);
  return (
    <div className="modal-backdrop" onClick={(e) => dismissable && e.target === e.currentTarget && onClose?.()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

/** Heart meter; flashes up/down when the value changes. */
export function HeartMeter({ value, threshold, floor, color }: { value: number; threshold?: number | null; floor?: number | null; color?: string }) {
  const prev = useRef(value);
  const [dir, setDir] = useState<'' | 'up' | 'down'>('');
  useEffect(() => {
    if (value === prev.current) return;
    setDir(value > prev.current ? 'up' : 'down');
    prev.current = value;
    const t = setTimeout(() => setDir(''), 650);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className={`meter ${dir}`}>
      <span className="meter-heart" aria-hidden="true">♥</span>
      <div className="meter-bar">
        <div className="meter-fill" style={{ width: `${value}%`, background: color ? `linear-gradient(90deg, ${color}, #ffd3c2)` : undefined }} />
        {threshold != null && <div className="meter-mark goal" style={{ left: `${threshold}%` }} title={`Goal: ${threshold}`} />}
        {floor != null && <div className="meter-mark floor" style={{ left: `${floor}%` }} title={`Don't drop below ${floor}`} />}
      </div>
      <span className="meter-num">{value}</span>
    </div>
  );
}

/** A line with *actions* rendered as italic narration. */
export function RichLine({ text }: { text: string }) {
  return (
    <span>
      {splitActions(text).map((s, i) => (
        <span key={i} className={s.action ? 'act' : 'say'}>
          {s.text}
        </span>
      ))}
    </span>
  );
}

/**
 * A scene filling its parent like `object-fit: cover`: a still image plus the
 * lifted animated pieces (see art/layers.ts), so motion runs on the GPU
 * instead of repainting the whole SVG every frame.
 */
export function SceneArt({ spec, className = 'backdrop', still = false }: { spec: SceneSpec; className?: string; still?: boolean }) {
  const { id, time, weather } = spec;
  const motion = usePrefs((p) => (still ? 'off' : p.motion));
  const scene = useMemo(() => layeredScene({ id, time, weather }, { motion }), [id, time, weather, motion]);
  // The layers are laid out at 1600×900 and fitted with `zoom`, not a scale
  // transform: under a scaled ancestor the browser rasterizes each moving layer
  // at full size and resamples it every frame (costly without a GPU), while
  // zoom lays them out, and draws them, at their real size. Measured before
  // the first paint so they're never drawn at the wrong size.
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const s = el.clientWidth / VIEW_W;
      if (s) setScale(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Lite: the moving details tick together at a low frame rate.
  const fx = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (motion !== 'lite' || !fx.current) return;
    return stepAnimations(fx.current);
  }, [scene, motion]);
  return (
    <div className={className}>
      <div className="scene-box" ref={box}>
        <img className="scene-still" src={scene.still} alt="" draggable={false} />
        {scene.layers.length > 0 && (
          <div className="fx-layer" ref={fx} style={{ width: VIEW_W, height: VIEW_H, zoom: scale }}>
            {scene.layers.map((l, i) => (
              <Fragment key={i}>
                {/* Paint order: an overlay still goes between the bands of moving pieces. */}
                {scene.overlays.slice(scene.layers[i - 1]?.band ?? 0, l.band).map((o) => (
                  <img key={o.src} className="fx-band" src={o.src} style={{ left: o.x, top: o.y, width: o.w, height: o.h }} alt="" draggable={false} />
                ))}
                <div className="fx-el" style={{ left: l.x, top: l.y, width: l.w, height: l.h, ...l.style }} dangerouslySetInnerHTML={{ __html: l.svg }} />
              </Fragment>
            ))}
            {scene.overlays.slice(scene.layers.at(-1)?.band ?? 0).map((o) => (
              <img key={o.src} className="fx-band" src={o.src} style={{ left: o.x, top: o.y, width: o.w, height: o.h }} alt="" draggable={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Static art as an <img>, so dozens of thumbnails stay out of the live DOM. */
export function SvgImage({ markup, alt }: { markup: string; alt: string }) {
  const src = useMemo(() => svgDataUrl(markup), [markup]);
  return <img src={src} alt={alt} draggable={false} decoding="async" />;
}

export function SceneThumb({ spec, alt }: { spec: SceneSpec; alt: string }) {
  const { id, time, weather } = spec;
  const src = useMemo(() => stillSceneUrl({ id, time, weather }), [id, time, weather]);
  return <img src={src} alt={alt} draggable={false} decoding="async" />;
}

export function Portrait({ character, expression = 'neutral', crop = 'bust', className = 'portrait', asImage = false }: { character: Character; expression?: string; crop?: Crop; className?: string; asImage?: boolean }) {
  const markup = useMemo(() => characterSVG(character.look, { expression, crop }), [character, expression, crop]);
  if (asImage) return <div className={className}><SvgImage markup={markup} alt={character.displayName} /></div>;
  return <div className={className} dangerouslySetInnerHTML={{ __html: markup }} />;
}

export function CloudChip() {
  const { status, user } = useCloud();
  const dot = status === 'synced' ? 'ok' : status === 'syncing' || status === 'connecting' ? 'busy' : status === 'error' ? 'err' : '';
  const label =
    status === 'off' ? 'Local save · sign in to sync'
    : status === 'connecting' ? 'Connecting…'
    : status === 'syncing' ? 'Syncing…'
    : status === 'error' ? 'Sync problem'
    : `Synced${user?.name ? ` · ${user.name.split(' ')[0]}` : ''}`;
  return (
    <button className="chip" type="button" title="Cloud saves" onClick={() => openModal('settings', { section: 'cloud' })}>
      <span className={`dot ${dot}`} />
      {label}
    </button>
  );
}

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.icon && <span className="toast-icon">{t.icon}</span>}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export function DialogHost() {
  const dialog = useDialog((s) => s.dialog);
  if (!dialog) return null;
  if (dialog.kind === 'confirm') {
    return (
      <Modal onClose={() => dialog.resolve(false)}>
        <h2>{dialog.title}</h2>
        {dialog.body && <p>{dialog.body}</p>}
        <div className="btn-row end">
          <button className="btn ghost" onClick={() => dialog.resolve(false)}>{dialog.cancel}</button>
          <button className={`btn${dialog.danger ? ' danger' : ''}`} autoFocus onClick={() => dialog.resolve(true)}>{dialog.ok}</button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal dismissable={false}>
      <h2>{dialog.title}</h2>
      {dialog.body && <p>{dialog.body}</p>}
      <div className="choice-list">
        {dialog.choices.map((c, i) => (
          <button key={i} className="choice" onClick={() => dialog.resolve(c.value)}>
            <strong>{c.label}</strong>
            {c.detail && <span className="muted small">{c.detail}</span>}
          </button>
        ))}
      </div>
    </Modal>
  );
}
