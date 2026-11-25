# Vendored Firebase SDK

Firebase JS SDK **13.4.0** browser ES modules (Apache-2.0, © Google LLC):
`firebase-app.js`, `firebase-auth.js`, `firebase-firestore-lite.js`.

Copied from the npm package's root (`node_modules/firebase/*.js`, identical
to `https://www.gstatic.com/firebasejs/13.4.0/*`) with one change: imports of
`https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js` were rewritten to
`./firebase-app.js` so nothing loads from a CDN.

Only `js/cloud.js` imports these, lazily, when a player opts into cloud saves.

To upgrade: copy the three files from a newer `firebase` package, rewrite the
import URL the same way (`sed 's#https://www.gstatic.com/firebasejs/X.Y.Z/firebase-app.js#./firebase-app.js#g'`),
update the version here and in CREDITS.md, then test sign-in.
