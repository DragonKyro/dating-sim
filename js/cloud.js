// Optional cloud saves: Google sign-in + one Firestore document per player
// (datingSim/{uid}). Local play never needs this. The Firebase SDK (vendored
// under js/vendor/firebase) is only downloaded once a player opts in.
//
// Sync model: localStorage stays the source of truth while playing; every
// change to synced data is pushed (debounced). On sign-in / boot we reconcile
// with whatever is in the cloud, asking the player only when both sides have
// diverged.

import { firebaseConfig, CLOUD_COLLECTION } from "./firebase-config.js";
import {
  getState, updateState, subscribe, exportProgress, importProgress,
  summarizeProgress, hasProgress, SAVE_VERSION,
} from "./state.js";

const PUSH_DEBOUNCE_MS = 2500;

let fb = null;                 // { auth, db, authMod, fsMod }
let user = null;
let status = "off";            // off | connecting | synced | syncing | error
let lastError = null;
let pushTimer = null;
let resolveConflict = async () => "local";
const statusListeners = new Set();

function setStatus(next, err = null) {
  status = next;
  lastError = err;
  for (const fn of statusListeners) fn(getCloudStatus());
}

export function getCloudStatus() {
  return {
    status,
    error: lastError?.message ?? null,
    user: user ? { name: user.displayName, email: user.email, photo: user.photoURL } : null,
  };
}

export function onCloudStatus(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

async function loadFirebase() {
  if (fb) return fb;
  const [appMod, authMod, fsMod] = await Promise.all([
    import("./vendor/firebase/firebase-app.js"),
    import("./vendor/firebase/firebase-auth.js"),
    import("./vendor/firebase/firebase-firestore-lite.js"),
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  fb = { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod };
  return fb;
}

function docRef(uid) {
  return fb.fsMod.doc(fb.db, CLOUD_COLLECTION, uid);
}

/**
 * Call once at boot. If this device was signed in before, quietly restore the
 * session and sync. `onConflict(local, remote)` must resolve to "local" or
 * "remote"; it receives summarizeProgress() objects.
 */
export async function initCloud({ onConflict } = {}) {
  if (onConflict) resolveConflict = onConflict;
  subscribe((_state, { touch }) => { if (touch) schedulePush(); });
  if (!getState().cloud.enabled) return;
  setStatus("connecting");
  try {
    await loadFirebase();
    user = await new Promise((resolve) => {
      const stop = fb.authMod.onAuthStateChanged(fb.auth, (u) => { stop(); resolve(u); });
    });
    if (!user) {
      // Session expired or was revoked elsewhere: fall back to local play.
      updateState((s) => { s.cloud.enabled = false; }, { touch: false });
      setStatus("off");
      return;
    }
    await reconcile();
  } catch (err) {
    console.warn("[cloud] restore failed", err);
    setStatus("error", err);
  }
}

export async function signIn() {
  setStatus("connecting");
  try {
    await loadFirebase();
    const provider = new fb.authMod.GoogleAuthProvider();
    const cred = await fb.authMod.signInWithPopup(fb.auth, provider);
    user = cred.user;
    await reconcile();
  } catch (err) {
    const closed = err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request";
    setStatus(user ? "synced" : "off", closed ? null : err);
    if (!closed) throw friendlyAuthError(err);
  }
}

export async function signOut() {
  if (fb) await fb.authMod.signOut(fb.auth);
  user = null;
  clearTimeout(pushTimer);
  updateState((s) => { s.cloud = { enabled: false, uid: null, lastSyncedAt: 0 }; }, { touch: false });
  setStatus("off");
}

function friendlyAuthError(err) {
  const code = err?.code ?? "";
  if (code === "auth/unauthorized-domain") {
    return new Error(`Sign-in isn't enabled for ${location.hostname} yet. Add it under Firebase Console → Authentication → Settings → Authorized domains.`);
  }
  if (code === "auth/popup-blocked") return new Error("Your browser blocked the sign-in popup. Allow popups for this site and try again.");
  if (code === "auth/operation-not-allowed") return new Error("Google sign-in is disabled in the Firebase project.");
  return err instanceof Error ? err : new Error(String(err));
}

async function reconcile() {
  setStatus("syncing");
  const uid = user.uid;
  const snap = await fb.fsMod.getDoc(docRef(uid));
  const remote = snap.exists() ? snap.data() : null;
  const local = exportProgress();
  const state = getState();
  const sameAccount = state.cloud.uid === uid;
  const lastSynced = sameAccount ? state.cloud.lastSyncedAt : 0;

  let action;
  if (!remote) action = "push";
  else if (!sameAccount) {
    // First sync of this device with this account.
    if (!hasProgress(local)) action = "pull";
    else if (!hasProgress(remote.save)) action = "push";
    else action = await resolveConflict(summarizeProgress(local), summarizeProgress(remote.save)) === "remote" ? "pull" : "push";
  } else {
    const localDirty = state.updatedAt > lastSynced;
    const remoteNewer = (remote.updated ?? 0) > lastSynced;
    if (localDirty && remoteNewer) {
      action = await resolveConflict(summarizeProgress(local), summarizeProgress(remote.save)) === "remote" ? "pull" : "push";
    } else if (remoteNewer) action = "pull";
    else if (localDirty) action = "push";
    else action = "none";
  }

  if (action === "pull") {
    importProgress(remote.save);
    markSynced(uid, remote.updated);
  } else if (action === "push") {
    await push(uid);
  } else {
    markSynced(uid, lastSynced);
  }
}

function markSynced(uid, at) {
  updateState((s) => { s.cloud = { enabled: true, uid, lastSyncedAt: at }; }, { touch: false });
  setStatus("synced");
}

async function push(uid = user?.uid) {
  if (!uid || !fb) return;
  setStatus("syncing");
  const updated = Date.now();
  // JSON round-trip strips undefined values, which Firestore rejects.
  const save = JSON.parse(JSON.stringify(exportProgress()));
  await fb.fsMod.setDoc(docRef(uid), { save, version: SAVE_VERSION, updated });
  // Changes made while this write was in flight have updatedAt > updated, so
  // they still count as dirty and their own scheduled push will carry them.
  markSynced(uid, updated);
}

function schedulePush() {
  if (!user || !getState().cloud.enabled) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    push().catch((err) => {
      console.warn("[cloud] push failed", err);
      setStatus("error", err);
    });
  }, PUSH_DEBOUNCE_MS);
}

/** Push immediately (e.g. right after a level ends). Safe to call when signed out. */
export function flushCloud() {
  if (!user) return Promise.resolve();
  clearTimeout(pushTimer);
  return push().catch((err) => setStatus("error", err));
}
