// Public Firebase web config for the "Dating Sim" app in the shared
// github-games-e7c7d project. These values are not secrets: Firebase web
// configs are meant to ship to the browser. Access control lives in
// firestore.rules (each signed-in player can only touch their own save).

export const firebaseConfig = {
  apiKey: "AIzaSyAmAirzwcz926PyKh-bfUUIn7OSkcve6tI",
  authDomain: "github-games-e7c7d.firebaseapp.com",
  projectId: "github-games-e7c7d",
  storageBucket: "github-games-e7c7d.firebasestorage.app",
  messagingSenderId: "879254296864",
  appId: "1:879254296864:web:120843671b0e361f8f1f45",
};

// One document per signed-in player: datingSim/{uid}. Must match the
// `match /datingSim/{uid}` block in firestore.rules.
export const CLOUD_COLLECTION = "datingSim";
