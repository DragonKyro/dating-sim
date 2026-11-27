// Device-only preferences: the Gemini key and model choice, text speed,
// motion and creativity. Never synced to the cloud.

import { create } from 'zustand';
import type { Byok } from '@/ai/ai';
import { readJson, writeJson } from './storage';

export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';
/** full: everything moves · lite: only small details (for machines without fast graphics) · off: still. */
export type Motion = 'full' | 'lite' | 'off';

export interface Prefs extends Byok {
  textSpeed: TextSpeed;
  motion: Motion;
  /** The one-time frame-rate check on a first scene already ran. */
  motionChecked: boolean;
  /** Character voice temperature. */
  temperature: number;
}

const KEY = 'prefs';
const DEFAULTS: Prefs = { apiKey: '', voiceModel: 'auto', judgeModel: 'auto', textSpeed: 'normal', motion: 'full', motionChecked: false, temperature: 0.9 };

function load(): Prefs {
  const stored = readJson<Partial<Prefs> & { reduceMotion?: boolean }>(KEY, {});
  const { reduceMotion, ...rest } = stored;
  // Older builds stored a reduce-motion checkbox.
  return { ...DEFAULTS, ...(reduceMotion ? { motion: 'off' as const } : {}), ...rest };
}

export const usePrefs = create<Prefs>(() => load());

export function setPrefs(patch: Partial<Prefs>): void {
  usePrefs.setState(patch);
  writeJson(KEY, usePrefs.getState());
}

export const hasApiKey = (): boolean => !!usePrefs.getState().apiKey;

/** The Gemini part of the prefs, as the AI layer wants it. */
export function byok(): Byok {
  const { apiKey, voiceModel, judgeModel } = usePrefs.getState();
  return { apiKey, voiceModel, judgeModel };
}
