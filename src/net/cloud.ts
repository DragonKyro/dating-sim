// Cloud saves: Google sign-in and one Firestore document per player
// (`datingSim/{uid}`), so a summer follows you between phone and computer.
// Firebase loads lazily (on sign-in, or at start-up if you were signed in).
//
// localStorage stays the source of truth while playing; every change to the
// save is pushed, debounced. On sign-in and start-up we reconcile with the
// cloud copy, asking the player only when both sides changed. The Gemini key
// and any half-finished scene never leave the device.

import { create } from 'zustand';
import type { User } from 'firebase/auth';
import type { Progress } from '@/game/types';
import { getProgress, hasProgress, importProgress, onSaveChange, SAVE_VERSION, summarizeProgress } from '@/store/saveStore';
import { readJson, writeJson } from '@/store/storage';
import { FIREBASE_CONFIG, SAVE_COLLECTION } from './firebaseConfig';

export type CloudStatus = 'off' | 'connecting' | 'syncing' | 'synced' | 'error';

interface CloudState {
  status: CloudStatus;
  user: { name: string; email: string; photo: string | null } | null;
  error: string | null;
  lastSyncedAt: number;
}

/** Device-only bookkeeping. */
interface CloudMeta {
  enabled: boolean;
  uid: string | null;
  lastSyncedAt: number;
}

const META_KEY = 'cloud';
const PUSH_DEBOUNCE_MS = 2500;

const readMeta = () => readJson<CloudMeta>(META_KEY, { enabled: false, uid: null, lastSyncedAt: 0 });

export const useCloud = create<CloudState>(() => ({ status: 'off', user: null, error: null, lastSyncedAt: readMeta().lastSyncedAt }));

type Summary = ReturnType<typeof summarizeProgress>;
/** Asked when this device and the cloud both have different progress. */
export type ConflictResolver = (local: Summary, remote: Summary) => Promise<'local' | 'remote'>;
let resolveConflict: ConflictResolver = async () => 'local';

type Fb = {
  auth: import('firebase/auth').Auth;
  db: import('firebase/firestore/lite').Firestore;
  authMod: typeof import('firebase/auth');
  fsMod: typeof import('firebase/firestore/lite');
};

let fb: Promise<Fb> | null = null;
let user: User | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function loadFirebase(): Promise<Fb> {
  if (!fb) {
    fb = (async () => {
      const [{ initializeApp, getApps }, authMod, fsMod] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore/lite')]);
      const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
      return { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod };
    })();
    fb.catch(() => {
      fb = null;
    });
  }
  return fb;
}

function setMeta(meta: CloudMeta): void {
  writeJson(META_KEY, meta);
  useCloud.setState({ lastSyncedAt: meta.lastSyncedAt });
}

function setUser(u: User | null): void {
  user = u;
  useCloud.setState({ user: u ? { name: u.displayName ?? 'Signed in', email: u.email ?? '', photo: u.photoURL } : null });
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Call once at start-up. Restores a previous session quietly. */
export function initCloud({ onConflict }: { onConflict?: ConflictResolver } = {}): void {
  if (onConflict) resolveConflict = onConflict;
  onSaveChange((_p, touched) => {
    if (touched) schedulePush();
  });
  if (!readMeta().enabled) return;
  useCloud.setState({ status: 'connecting' });
  void (async () => {
    try {
      const { auth, authMod } = await loadFirebase();
      const u = await new Promise<User | null>((resolve) => {
        const stop = authMod.onAuthStateChanged(auth, (x) => {
          stop();
          resolve(x);
        });
      });
      if (!u) {
        // Session expired or was revoked elsewhere: back to local play.
        setMeta({ ...readMeta(), enabled: false });
        useCloud.setState({ status: 'off' });
        return;
      }
      setUser(u);
      await reconcile();
    } catch (err) {
      console.warn('[cloud] restore failed', err);
      useCloud.setState({ status: 'error', error: message(err) });
    }
  })();
}

export async function signIn(): Promise<void> {
  useCloud.setState({ status: 'connecting', error: null });
  try {
    const { auth, authMod } = await loadFirebase();
    const cred = await authMod.signInWithPopup(auth, new authMod.GoogleAuthProvider());
    setUser(cred.user);
    await reconcile();
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    const closed = code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
    useCloud.setState({ status: user ? 'synced' : 'off', error: closed ? null : friendlyAuthError(code, err) });
    if (!closed) throw new Error(friendlyAuthError(code, err));
  }
}

export async function signOut(): Promise<void> {
  if (fb) {
    const { auth, authMod } = await fb;
    await authMod.signOut(auth);
  }
  setUser(null);
  if (pushTimer) clearTimeout(pushTimer);
  setMeta({ enabled: false, uid: null, lastSyncedAt: 0 });
  useCloud.setState({ status: 'off', error: null });
}

function friendlyAuthError(code: string, err: unknown): string {
  if (code === 'auth/unauthorized-domain') return `Sign-in isn't enabled for ${location.hostname} yet. Add it under Firebase Console → Authentication → Settings → Authorized domains.`;
  if (code === 'auth/popup-blocked') return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.';
  if (code === 'auth/operation-not-allowed') return 'Google sign-in is disabled in the Firebase project.';
  return message(err);
}

async function reconcile(): Promise<void> {
  if (!user) return;
  useCloud.setState({ status: 'syncing' });
  const { db, fsMod } = await loadFirebase();
  const uid = user.uid;
  const snap = await fsMod.getDoc(fsMod.doc(db, SAVE_COLLECTION, uid));
  const remote = snap.exists() ? (snap.data() as { save: Progress; updated: number }) : null;
  const local = getProgress();
  const meta = readMeta();
  const sameAccount = meta.uid === uid;
  const lastSynced = sameAccount ? meta.lastSyncedAt : 0;

  let action: 'push' | 'pull' | 'none';
  if (!remote) action = 'push';
  else if (!sameAccount) {
    // First sync of this device with this account.
    if (!hasProgress(local)) action = 'pull';
    else if (!hasProgress(remote.save)) action = 'push';
    else action = (await resolveConflict(summarizeProgress(local), summarizeProgress(remote.save))) === 'remote' ? 'pull' : 'push';
  } else {
    const localDirty = local.updatedAt > lastSynced;
    const remoteNewer = (remote.updated ?? 0) > lastSynced;
    if (localDirty && remoteNewer) action = (await resolveConflict(summarizeProgress(local), summarizeProgress(remote.save))) === 'remote' ? 'pull' : 'push';
    else if (remoteNewer) action = 'pull';
    else if (localDirty) action = 'push';
    else action = 'none';
  }

  if (action === 'pull' && remote) {
    importProgress(remote.save);
    markSynced(uid, remote.updated);
  } else if (action === 'push') {
    await push();
  } else {
    markSynced(uid, lastSynced);
  }
}

function markSynced(uid: string, at: number): void {
  setMeta({ enabled: true, uid, lastSyncedAt: at });
  useCloud.setState({ status: 'synced', error: null });
}

async function push(): Promise<void> {
  if (!user) return;
  const { db, fsMod } = await loadFirebase();
  useCloud.setState({ status: 'syncing' });
  const updated = Date.now();
  // JSON round-trip strips undefined values, which Firestore rejects.
  const save = JSON.parse(JSON.stringify(getProgress())) as Progress;
  await fsMod.setDoc(fsMod.doc(db, SAVE_COLLECTION, user.uid), { save, version: SAVE_VERSION, updated });
  // Changes made while this write was in flight have updatedAt > updated, so
  // they still count as dirty and their own scheduled push carries them.
  markSynced(user.uid, updated);
}

function schedulePush(): void {
  if (!user || !readMeta().enabled) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    push().catch((err) => {
      console.warn('[cloud] push failed', err);
      useCloud.setState({ status: 'error', error: message(err) });
    });
  }, PUSH_DEBOUNCE_MS);
}

/** Push now (e.g. right after a scene ends). Safe to call when signed out. */
export async function flushCloud(): Promise<void> {
  if (!user) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  try {
    await push();
  } catch (err) {
    useCloud.setState({ status: 'error', error: message(err) });
  }
}
