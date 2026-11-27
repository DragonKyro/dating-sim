// App-wide UI state that isn't game data: toasts, confirm/choice dialogs and
// which modal is open. Promise-based helpers let non-React code (cloud sync)
// ask the player a question.

import { create } from 'zustand';

// ---- toasts -------------------------------------------------------------------

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'secret' | 'warn';
  icon: string;
}

export const useToasts = create<{ toasts: Toast[] }>(() => ({ toasts: [] }));
let toastId = 0;

export function toast(text: string, { kind = 'info', icon = '', ms = 3600 }: { kind?: Toast['kind']; icon?: string; ms?: number } = {}): void {
  const id = ++toastId;
  useToasts.setState((s) => ({ toasts: [...s.toasts, { id, text, kind, icon }] }));
  setTimeout(() => useToasts.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), ms);
}

// ---- dialogs ------------------------------------------------------------------

export interface Choice<T> {
  value: T;
  label: string;
  detail?: string;
}

export type Dialog =
  | { kind: 'confirm'; title: string; body?: string; ok: string; cancel: string; danger: boolean; resolve: (v: boolean) => void }
  | { kind: 'choice'; title: string; body?: string; choices: Choice<unknown>[]; resolve: (v: unknown) => void };

export const useDialog = create<{ dialog: Dialog | null }>(() => ({ dialog: null }));

export function confirmDialog({ title, body, ok = 'OK', cancel = 'Cancel', danger = false }: { title: string; body?: string; ok?: string; cancel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    useDialog.setState({ dialog: { kind: 'confirm', title, body, ok, cancel, danger, resolve: (v) => { useDialog.setState({ dialog: null }); resolve(v); } } });
  });
}

export function choiceDialog<T>({ title, body, choices }: { title: string; body?: string; choices: Choice<T>[] }): Promise<T> {
  return new Promise((resolve) => {
    useDialog.setState({ dialog: { kind: 'choice', title, body, choices, resolve: (v) => { useDialog.setState({ dialog: null }); resolve(v as T); } } });
  });
}

// ---- modals -------------------------------------------------------------------

export type ModalName = 'settings' | 'key' | 'name' | 'notice';

export const useModal = create<{ modal: ModalName | null; onDone: (() => void) | null; section: string | null }>(() => ({ modal: null, onDone: null, section: null }));

export function openModal(modal: ModalName, { onDone, section }: { onDone?: () => void; section?: string } = {}): void {
  useModal.setState({ modal, onDone: onDone ?? null, section: section ?? null });
}

/** Close the open modal; `done` runs its onDone callback. */
export function closeModal(done = false): void {
  const { onDone } = useModal.getState();
  useModal.setState({ modal: null, onDone: null, section: null });
  if (done) onDone?.();
}

// ---- scene retry --------------------------------------------------------------

/** Bumped by "Try again": the scene page is keyed on it, so it remounts fresh. */
export const useRetry = create<{ nonce: number }>(() => ({ nonce: 0 }));
export const retryScene = (): void => useRetry.setState((s) => ({ nonce: s.nonce + 1 }));
