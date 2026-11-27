// One-time frame-rate check on the first scene played on Full animation. On a
// machine that composites without a fast GPU (many office PCs, remote
// desktops) the moving art drags the whole page; there, switch to Lite once
// and say so. The player can always change it back in Settings.

import { useEffect } from 'react';
import { setPrefs, usePrefs } from '@/store/prefsStore';
import { toast } from '../uiStore';

/** Let the scene finish loading (art, opening line) before measuring. */
const SETTLE_MS = 4000;
const SAMPLE_MS = 2000;
const MIN_FPS = 40;

export function useMotionCheck(): void {
  useEffect(() => {
    const { motion, motionChecked } = usePrefs.getState();
    if (motion !== 'full' || motionChecked) return;
    let raf = 0;
    let interrupted = false;
    // Background tabs barely animate; a hidden moment voids the sample.
    const onVisibility = () => {
      if (document.hidden) interrupted = true;
    };
    const settle = setTimeout(() => {
      if (document.hidden) return; // try again next scene
      document.addEventListener('visibilitychange', onVisibility);
      let start = 0;
      let frames = 0;
      const tick = (t: number) => {
        if (!start) start = t;
        else frames++;
        if (t - start < SAMPLE_MS) {
          raf = requestAnimationFrame(tick);
          return;
        }
        document.removeEventListener('visibilitychange', onVisibility);
        if (interrupted) return;
        const fps = (frames * 1000) / (t - start);
        if (fps < MIN_FPS) {
          setPrefs({ motion: 'lite', motionChecked: true });
          toast('Animation set to Lite for smoother play. You can change it in Settings.', { icon: '✨', ms: 6000 });
        } else {
          setPrefs({ motionChecked: true });
        }
      };
      raf = requestAnimationFrame(tick);
    }, SETTLE_MS);
    return () => {
      clearTimeout(settle);
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
