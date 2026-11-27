// The scene in progress, saved after every turn so a refresh can resume it.
// Device-only: a half-finished conversation never goes to the cloud.

import { create } from 'zustand';
import type { Run } from '@/game/types';
import { readJson, removeKey, writeJson } from './storage';

const KEY = 'run';

export const useRun = create<{ run: Run | null }>(() => ({ run: readJson<Run | null>(KEY, null) }));

export function setRun(run: Run | null): void {
  useRun.setState({ run });
  if (run) writeJson(KEY, run);
  else removeKey(KEY);
}

export const getRun = (): Run | null => useRun.getState().run;
