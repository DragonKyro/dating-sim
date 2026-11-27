// The live character rig, mounted imperatively (it runs its own blink and
// talk timers). The scene drives it through `handle`.

import { useEffect, useRef, type RefObject } from 'react';
import { createCharacter, type CharacterHandle } from '@/art/character';
import type { Look } from '@/game/types';

export function Sprite({ look, outfit, handle, leaving = false }: { look: Look; outfit?: string; handle: RefObject<CharacterHandle | null>; leaving?: boolean }) {
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = createCharacter(look, { outfit, expression: 'neutral' });
    holder.current?.appendChild(c.el);
    handle.current = c;
    return () => {
      c.destroy();
      if (handle.current === c) handle.current = null;
    };
  }, [look, outfit, handle]);
  return <div ref={holder} className={`stage-char${leaving ? ' leaving' : ''}`} />;
}
