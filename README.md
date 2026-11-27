# Last Ferry

*A summer on Saltwick Island.* A dating game where you type whatever you want and the people of a small island answer — played by Google's Gemini. It runs in the browser on a phone or a computer, and can sync your progress between devices when you sign in with Google.

**Play it:** https://dragonkyro.github.io/dating-sim/

You're house-sitting your great-aunt Bea's cottage for the last five weeks of summer. Everyone on the island is deciding whether to stay or go: a baker with an acceptance letter she hasn't told anyone about, the anonymous voice of the 2 a.m. pirate radio show, a seal scientist who always leaves first, and the last summer daughter of a house that's being sold. The last ferry of the season leaves on Lantern Night. Who will you be standing next to?

## How it plays

- **Bring your own key.** The characters are played by Gemini using your own free API key from [Google AI Studio](https://aistudio.google.com/apikey). The key stays in your browser.
- **No dialogue options.** Pick a scene on the island map, read the briefing, and say what you'd say.
- **Every message counts.** A heart meter shows how into the conversation she is; each message moves it, with a note on why.
- **Three kinds of goal.** Win her over; make your move at the right moment (too early and she'll put it off); or keep her steady through a bad night.
- **Secrets and memory.** Characters hide things — ask at the right time and they'll tell you. They remember what you told them in later scenes.
- **One storm, one night.** In chapter 3 you can only be in one place. The finale follows from it. 16 scenes, 8 endings.

## Tech

TypeScript, React 19, Vite 6, Zustand, and Vitest. All the art — the characters with their ten expressions and the twelve animated scenes — is drawn in code as SVG. It's an offline-capable PWA (vite-plugin-pwa). Firebase Auth and Firestore load lazily, only when you sign in. The project is laid out like [BlackJack](https://github.com/DragonKyro/BlackJack) and shares its Firebase project.

## Develop

```bash
npm install        # then: npm run fix-lock (see CLAUDE.md)
npm run dev        # http://localhost:5173/dating-sim/
npm run test:run   # unit tests
npm run validate   # lint the story content
npm run build      # typecheck + production build + service worker
```

A gitignored `secrets.local.json` (`{ "apiKey": "AIza…" }`) pre-fills your Gemini key in dev and powers `npm run playtest` (AI players against the real game) and `npm run smoke` (a headless browser run-through). Story and characters live in `src/content/` — see [STORY.md](STORY.md) and the READMEs there.

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`, which runs the tests and builds first.

## Firebase

Save sync uses the shared Firebase project `github-games-e7c7d`. Each player gets one Firestore document, `datingSim/{uid}`, and only that player can read or write it. The rules are in `firestore.rules`. They are the whole project's rule set, so they also carry the other games' blocks. Deploy them with `npm run deploy:rules`.

## Privacy

Your Gemini key and your conversations go only to Google's Gemini API. If you sign in, your progress (scenes, story flags, short memories the characters keep about you) is stored in Firestore, readable only by your account. No analytics.
