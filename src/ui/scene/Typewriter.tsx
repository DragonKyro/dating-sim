// Types a line out, pausing on punctuation; *actions* render as italic
// narration. Click to finish instantly.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { TextSpeed } from '@/store/prefsStore';
import { splitActions } from '../text';

const DELAY: Record<TextSpeed, number> = { slow: 38, normal: 22, fast: 10, instant: 0 };

export function Typewriter({ text, speed, onStart, onTick, onDone }: { text: string; speed: TextSpeed; onStart?: () => void; onTick?: () => void; onDone?: () => void }) {
  const segments = useMemo(() => splitActions(text), [text]);
  const total = useMemo(() => segments.reduce((n, s) => n + s.text.length, 0), [segments]);
  const [shown, setShown] = useState(DELAY[speed] ? 0 : total);
  const done = useRef(false);
  const cb = useRef({ onStart, onTick, onDone });
  cb.current = { onStart, onTick, onDone };

  useEffect(() => {
    cb.current.onStart?.();
    if (!DELAY[speed]) return;
    let n = 0;
    let timer: ReturnType<typeof setTimeout>;
    const flat = segments.map((s) => s.text).join('');
    const step = () => {
      n++;
      setShown(n);
      cb.current.onTick?.();
      if (n >= total) return;
      const ch = flat[n - 1] ?? '';
      timer = setTimeout(step, /[.!?…]/.test(ch) ? DELAY[speed] * 7 : /[,;:—]/.test(ch) ? DELAY[speed] * 3 : DELAY[speed]);
    };
    timer = setTimeout(step, DELAY[speed]);
    return () => clearTimeout(timer);
  }, [segments, total, speed]);

  useEffect(() => {
    if (shown >= total && !done.current) {
      done.current = true;
      cb.current.onDone?.();
    }
  }, [shown, total]);

  let left = shown;
  return (
    <span onClick={() => setShown(total)}>
      {segments.map((s, i) => {
        const part = s.text.slice(0, Math.max(0, left));
        left -= s.text.length;
        return (
          <span key={i} className={s.action ? 'act' : 'say'}>
            {part}
          </span>
        );
      })}
    </span>
  );
}
