# CLAUDE.md

Context for Claude working in this repo.

## What this is

Last Ferry: a conversational dating game for GitHub Pages (`https://dragonkyro.github.io/dating-sim/`), built to work on a phone and on desktop. The player types freely to AI-played characters on Saltwick Island during the last five weeks of summer: 16 scenes in 4 chapters, 4 love interests, 8 endings. Each scene is one conversation with one character, one objective, a turn budget and an in-world deadline. Story and tone: `STORY.md`.

Gemini plays the characters with the **player's own API key** (BYOK, never synced). Progress is saved locally and synced through Firestore when signed in with Google. The app is a PWA (the art and story work offline; the characters need Gemini).

## Tech stack

- TypeScript, Vite 6, React 19, Zustand, Vitest.
- Gemini REST API, called from the browser with the player's key (`src/ai/llm.ts`).
- Firebase (Auth with Google + Firestore Lite), lazy-loaded.
- `vite-plugin-pwa` (Workbox) for offline.
- **All art is drawn in code** as SVG: characters (`src/art/character.ts` + `wardrobe.ts`) and 12 animated scenes (`src/art/scenes/`), built from one kit (`src/art/kit.ts`). No image assets besides the app icons.
- Fonts are self-hosted via @fontsource (Inter for UI, Lora for story text).

## Commands

- `npm run dev` · `npm run build` (tsc + vite build + service worker) · `npm run preview`
- `npm run test:run` runs all tests. `npm run typecheck` typechecks.
- `npm run validate` lints all content (schema, cross-references, and a fairness simulation; `-- --fairness` prints it per level).
- `npm run playtest -- <level-id[,…]|all> [--style good|bad] [--runs N]` plays levels against real Gemini with an AI player (key from the gitignored `secrets.local.json`: `{ "apiKey": "AIza…" }`). ~3 calls per turn; a full batch can use up a free-tier key's day. Transcripts land in `playtests/` (gitignored).
- `npm run smoke` drives headless Chrome/Edge through title → map → briefing → one real turn → journal → settings and fails on any console error. Needs `npm run dev` running (or `BASE=http://127.0.0.1:4173/dating-sim/` with `npm run preview`). Add `-- --no-turn` / `-- --mobile`. It launches its own browser on a random debug port; never attach tooling to a fixed port (other sessions may own it).
- `npm run fix-lock`: **run after any `npm install` that changes package-lock.json.** This machine installs through a corporate Artifactory mirror (`NPM_CONFIG_REGISTRY`), which writes mirror URLs into the lockfile, and GitHub Actions can't reach them. The lockfile must contain no `drwholdings` URLs.
- `npm run deploy:rules` deploys `firestore.rules`. **Confirm with the user first (shared project).**
- `node scripts/make-icons.mjs` redraws every icon (a paper lantern over night water; the favicon is the lantern alone).
- Art tools: `npm run dev`, then `/dating-sim/preview.html?scene=bakery&weather=blackout&char=rosie&expr=happy` or `?sheet=noor` (all expressions). Screenshot with `node scripts/shoot.mjs out.png "preview.html?…"` (`HOST`, default `127.0.0.1:5173`). `npx vite-node scripts/scene-hashes.ts` prints a hash per scene variant: diff it before/after any art refactor.
- In dev, `secrets.local.json` also pre-fills the Gemini key (stripped from builds).

## Architecture

Import directions: `ui → store → game / ai / art / content`. `net` is used by `main.tsx`, the save store wiring and the UI only. Path alias `@/` → `src/`.

- **`src/game/`: pure game logic** (no DOM, no network).
  - `types.ts`: content shapes (`Character`, `Level`, `Objective`, `Secret`), `Run`, `JudgeResult`, `Progress`.
  - `engine.ts`: the turn engine and prompt assembly (see "How a turn works").
  - `progress.ts`: unlocks and the exclusive storm group, starting interest (bond bonus), `resolveLevel` (flag-conditioned lines and flavor cards), `applyOutcome`, journal facts.
- **`src/ai/`.**
  - `llm.ts`: Gemini transport — minimal thinking per model family, the free-tier model chain with fallback, retries, error kinds, `validateKey` (lists models, costs no quota).
  - `ai.ts`: the three calls a scene makes: `judgeTurn`, `speak`, `learnAboutPlayer`.
- **`src/content/`: the story as data**, bundled at build time with `import.meta.glob` (no registry files).
  - `characters/<id>.json` (listed in story order by first appearance), `levels/NN-slug.json` (ordered by filename), `levels/chapters.json`.
  - `prompts/character.md` (shared character framework), `prompts/judge.md`, `prompts/personas/<id>.md`.
  - Each folder has a README with the schema.
- **`src/art/`.** `kit.ts` (palettes per time of day, color math, seeded RNG, sky/sea/weather/light pieces), `scenes.ts` (registry + `renderScene`), `scenes/<id>.ts`, `character.ts` (rig: parametric face, 10 expressions, blink/talk/reaction), `wardrobe.ts` (body, hairstyles, outfits, accessories). Everything returns SVG strings; motion is CSS classes in `src/ui/styles/art.css`.
- **`src/store/`.**
  - `storage.ts`: localStorage, every key prefixed `datingSim.` (all of dragonkyro.github.io shares one origin).
  - `saveStore`: the synced save (`Progress`), migration from the pre-prefix `dating-sim-save-v1` key, `onSaveChange` for cloud sync.
  - `prefsStore`: device-only — Gemini key, model choice, text speed, motion, creativity.
  - `runStore`: the scene in progress, saved after every step (device-only).
- **`src/net/`.** `firebaseConfig.ts` (the "Dating Sim" web app), `cloud.ts` (lazy Firebase, Google sign-in by popup, whole-save reconcile on sign-in/start-up with a "which save?" prompt when both sides changed, debounced pushes).
- **`src/ui/`.**
  - `App.tsx` + `router.ts`: hash routes `#/`, `#/island`, `#/brief/<level>`, `#/scene/<level>`, `#/journal`.
  - `pages/`: Title, IslandMap, Briefing, ScenePage (+ result card), Journal.
  - `scene/`: `useScene` (the turn controller), `Sprite` (imperative rig wrapper), `Typewriter`.
  - `shared/`: controls (Modal, HeartMeter, SceneArt, SceneThumb, Portrait, CloudChip, Toasts, DialogHost), Settings (key setup, name prompt, settings, notice).
  - `uiStore.ts`: toasts, promise-based confirm/choice dialogs, the open modal, scene retry.
  - `styles/`: `theme.css`, `art.css`.
- **`src/pwa.ts`** registers the service worker (production only). A new build reloads only when you're not in a scene.

## How a turn works

1. **Judge first** (`ai.judgeTurn`): scores the *player's* message in context → `{ read, delta, mood, feedback, made_move?, move_quality?, triggers? }` via a JSON schema. Player text is fenced in `<player_message>`; instructions inside it are treated as in-world nonsense.
2. **Rules** (`engine.resolveTurn`, pure): interest += `effectiveDelta` (diminishing returns: gains × (1 − interest/150), min 55%); win/lose by objective, pushy asks, walkout at 0, turn budget; secret reveal or deflection; a private **director's note**.
3. **Voice** (`ai.speak`): she replies with the note in her system prompt, so her words match what the rules decided ("say yes", "deflect", "tell them about Lyon", "this is your last line").
4. The UI animates meter, mood, emotes and toasts; on the last turn `progress.applyOutcome` updates the save and `ai.learnAboutPlayer` stores up to 3 facts she learned about the player.

**Code decides outcomes; the model performs them.** Never let the character model decide success (v1 waited for a magic token she often forgot).

Objectives: `reach` (interest ≥ threshold), `ask` (the player makes the move: smooth asks work from threshold − 6, okay from − 2, clumsy need + 10, inappropriate never; refusals cost 3 interest and only *pushy* ones count toward `maxAttempts`), `endure` (stay ≥ floor for N turns).

## Gemini and the free tier (measured Nov 2026)

- Gemini 2.5+/3.x are thinking models; **thinking tokens count against `maxOutputTokens`**. Unset, a 256-token judge call thought for ~245 tokens and returned truncated JSON every time (the v1 "rewards never work" bug). `thinkingConfigFor` always sets the minimum.
- Free-tier daily caps (from Google's 429 quota details): `gemini-3.5-flash-lite` 500, `gemini-flash-lite-latest` 500 (separate bucket), `gemini-2.5-flash` 20, `gemini-3-flash-preview` 20. `FREE_TIER_CHAIN` leads with flash-lite; "Auto" parks models that 404/429/503/time out and waits out short per-minute limits once.
- A scene costs ~2 calls per turn + 1 at the end.

## Data and Firebase (shared project)

Project `github-games-e7c7d` is shared with Bridge Master, BlackJack, Poker and others.

- Data is **prefixed**: Firestore collection `datingSim`, localStorage keys `datingSim.*`.
- `firestore.rules` is the **whole project's** rule set (`bridgeMaster`, `blackjack`, `pokerTrainer`, `datingSim` blocks), kept identical in `Bridge-Master/`, `BlackJack/` and `Poker/`. Change all four, then deploy from any one, after asking the user.
- Document `datingSim/{uid}` = `{ save, version, updated }` (the rules enforce exactly those keys). `save` is the `Progress` object; the Gemini key, settings and any scene in progress never leave the device.
- Save schema: `SAVE_VERSION` in `src/store/saveStore.ts`. Changing the shape: bump it and handle the old shape in `normalize()` / `migrateLegacy()`. Never silently break a player's save.
- Google sign-in is enabled with `dragonkyro.github.io` under Authorized domains (set up for Bridge Master).

## Content

To add or change content: edit the JSON/Markdown under `src/content/` (new files are picked up automatically), then `npm run validate` (0 errors) and `npm run playtest -- <id>` (a good player should usually win, a careless one lose; read the transcripts). Change a schema → update `src/game/types.ts`, the engine/progress code, `scripts/validate.ts` and the folder README together.

## Conventions

- Game logic stays pure and JSON-serializable (runs and saves are plain objects).
- Art is code: extend the kit or wardrobe instead of adding images, so the style stays consistent. Attach animation classes to wrapper `<g>`s only (a CSS animation's transform replaces the element's `transform` attribute). Every animation has a reduced-motion fallback (`art.css`).
- Characters are referred to with she/her (all four love interests); the player's name and pronouns come from the save.
- Don't commit or push unless asked. Pushing `main` deploys (`.github/workflows/deploy.yml`: tests, build, Pages).
