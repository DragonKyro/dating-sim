// The "Dating Sim" web app in the shared Firebase project github-games-e7c7d.
// Public by design: a web app's config only identifies the project; access is
// decided by the Firestore rules (firestore.rules).

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAmAirzwcz926PyKh-bfUUIn7OSkcve6tI',
  authDomain: 'github-games-e7c7d.firebaseapp.com',
  projectId: 'github-games-e7c7d',
  storageBucket: 'github-games-e7c7d.firebasestorage.app',
  messagingSenderId: '879254296864',
  appId: '1:879254296864:web:120843671b0e361f8f1f45',
};

/**
 * Firestore collection, prefixed for the shared project: one document per
 * signed-in player, `datingSim/{uid}` = { save, version, updated }.
 */
export const SAVE_COLLECTION = 'datingSim';
