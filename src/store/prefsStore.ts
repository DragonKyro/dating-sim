// Device-only preferences: the Gemini key and model choice, text speed,
// motion and creativity. Never synced to the cloud.

import { create } from 'zustand';
import type { Byok } from '@/ai/ai';
import { readJson, writeJson } from './storage';

export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';

export interface Prefs extends Byok {
  textSpeed: TextSpeed;
  reduceMotion: boolean;
  /** Character voice temperature. */
  temperature: number;
}

const KEY = 'prefs';
const DEFAULTS: Prefs = { apiKey: '', voiceModel: 'auto', judgeModel: 'auto', textSpeed: 'normal', reduceMotion: false, temperature: 0.9 };

export const usePrefs = create<Prefs>(() => ({ ...DEFAULTS, ...readJson<Partial<Prefs>>(KEY, {}) }));

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
