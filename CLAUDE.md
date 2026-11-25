# CLAUDE.md — project conventions

For Claude Code (and any other AI assistant) working on this repo.

## What this project is

**Last Ferry** — a conversational dating game in the browser. The player
chats (free text) with AI-played characters on Saltwick Island during the
last weeks of summer, one scene at a time, each with an objective. Gemini
plays the characters with the player's own API key (BYOK). Progress lives in
`localStorage`, optionally synced to Firestore with Google sign-in.

- **Hosting:** GitHub Pages, deployed by `.github/workflows/deploy.yml` on
  push to `main` (the whole repo root is published).
- **Backend:** Firebase project `github-games-e7c7d` ("Github Games", shared
  with other games). Web app "Dating Sim". Used for **Auth (Google) +
  Firestore cloud saves only**. No Cloud Functions, no server code.
- **AI:** Gemini REST API called directly from the browser with the
  player's key. The key never leaves the device except to Google, and is never
  written to Firestore.

## Hard rules

- **No build step.** Vanilla ES modules loaded straight from `index.html`.
  No bundlers, transpilers, `package.json` or `node_modules`.
- **No CDNs.** Third-party code is vendored (only the Firebase SDK, in
  `js/vendor/firebase/`, imports rewritten to relative paths). Runtime network
  calls are limited to `generativelanguage.googleapis.com` and Firebase
  (Auth, incl. Google's sign-in popup, and Firestore).
- **The API key is device-only.** `state.byok`, `state.cloud` and `state.run`
  are excluded from cloud saves (`DEVICE_ONLY_KEYS` in `js/state.js`). Keep it
  that way.
- **Shared Firestore rules.** `firestore.rules` is the *whole* rule set of the
  shared project and is kept identical in `Bridge-Master/`, `BlackJack/`,
  `Poker/` and here. Deploying from any repo replaces every game's rules.
  Change all four copies, validate, then deploy
  (`firebase deploy --only firestore:rules` here). This game only touches
  `match /datingSim/{uid}`.
- **Code decides outcomes, the model performs them.** Never go back to
  letting the character model decide success (e.g. emitting a magic token).
  See "How a turn works".
- **Art is code.** Characters and scenes are SVG generated in `js/art/`. Don't
  add raster sprites or photos; extend the kit/wardrobe instead so the style
  stays consistent.

## File map

```
index.html              entry; loads css/art.css, css/style.css, js/main.js
css/art.css             animation vocabulary for the SVG art (+ reduce-motion)
css/style.css           UI
js/
  main.js               boot: router wiring, cloud restore, notices
  nav.js                screen router object (avoids circular imports)
  screens.js            title, chapter map, briefing, journal
  play.js               the scene screen: turn loop, HUD, results
  engine.js             PURE turn logic + prompt assembly (no DOM / network)
  ai.js                 judge / voice / memory calls (engine → llm)
  llm.js                Gemini transport: thinking config, model fallback, errors
  content.js            loads JSON/MD; unlocks, resolveLevel, applyOutcome
  state.js              save schema v2, migrations, persistence, listeners
  cloud.js              Google sign-in + Firestore sync (lazy-loads the SDK)
  firebase-config.js    public web config + collection name
  settings.js           key onboarding, name prompt, settings panel
  ui.js                 DOM helpers, modals, toasts, typewriter, meter
  art/kit.js            palettes per time of day, color math, sky/sea/weather
  art/scenes.js         scene registry: renderScene({id,time,weather})
  art/scenes/<id>.js    one file per location
  art/character.js      character rig: face, expressions, blink/talk/react
  art/wardrobe.js       body shapes, hairstyles, outfits, accessories
  vendor/firebase/      Firebase JS SDK 13.4.0 (app, auth, firestore-lite)
prompts/
  character.md          shared framework for every character's system prompt
  judge.md              scoring prompt
  system/<id>.md        persona per character
characters/             <id>.json + index.json
levels/                 <id>.json + index.json + chapters.json
tests/engine.test.mjs   unit tests (node --test)
tools/
  validate.mjs          content linter (schema, cross-refs, fairness)
  playtest.mjs          AI-vs-AI playtests against real Gemini
  serve.mjs             local static server (python's chokes on ~30 parallel modules)
  smoke.mjs             headless-browser run-through, fails on console errors
  preview.html          render one scene/character/expression sheet
  shoot.mjs             headless Edge/Chrome screenshot of a page
STORY.md                story bible (why the content is the way it is)
```

## How a turn works

1. Player sends a message.
2. **Judge first** (`ai.judgeTurn`): scores the *player's* message in context
   → `{ read, delta, mood, feedback, made_move?, move_quality?, triggers? }`
   via JSON schema. Player text is fenced in `<player_message>` and the
   prompt treats instructions inside it as in-world nonsense.
3. **Rules** (`engine.resolveTurn`, pure): interest += delta; decide win/lose
   (objective type, failed asks, walkout at 0, turn budget), secret
   reveal/deflect; produce a private **director's note**.
4. **Voice** (`ai.speak`): the character replies with the director's note in
   her system prompt, so her words match what the rules decided ("say yes",
   "deflect", "tell them about Lyon", "this is your last line").
5. UI animates the meter, mood/expression, emotes, toasts; on the last turn,
   `content.applyOutcome` updates the save and `ai.learnAboutPlayer` stores up
   to 3 facts she learned about the player.

Objective types: `reach` (interest ≥ threshold wins), `ask` (player must
make the move; a smooth ask works a few points under the threshold, early
asks are refused with a small penalty, and only *pushy* refusals count toward
`maxAttempts`), `endure` (stay ≥ floor for N turns). Gains have diminishing
returns (`engine.effectiveDelta`); `tools/validate.mjs --fairness` simulates
a steady good player against each level's turn budget.

## Models and the free tier (measured Nov 2026)

- Gemini 2.5+/3.x are thinking models; **thinking tokens count against
  `maxOutputTokens`**. Unset, a 256-token judge call thought for ~245 tokens
  and returned truncated JSON every time (the v1 "rewards never work" bug).
  `llm.js#thinkingConfigFor` always sets the minimum (`thinkingBudget: 0` for
  2.5 Flash, `thinkingLevel: "minimal"`→`"low"` ladder for 3.x).
- Free-tier daily caps (from Google's 429 quota details, Nov 2026):
  `gemini-3.5-flash-lite` 500, `gemini-flash-lite-latest` 500 (separate
  bucket), `gemini-2.5-flash` 20, `gemini-3-flash-preview` 20. Flash-lite is
  also fast and scores sensibly, so it leads `FREE_TIER_CHAIN`. "Auto" walks
  the chain, parks models that 404/429/503/time out, and waits out short
  per-minute limits once before giving up.
- Playtesting burns quota fast (~3 calls/turn incl. the simulated player):
  a full batch can exhaust a dev key's day.
- A scene costs ~2 calls per turn + 1 at the end (~20–25 calls).
- `validateKey` lists models instead of generating, so it costs no quota.

## Save schema

Key `dating-sim-save-v1` (historical name), `SAVE_VERSION = 2`, shape in
`js/state.js#freshState`. Changing the shape: bump `SAVE_VERSION` and add a
branch to `migrate()` (v1→v2 keeps the key + name and drops the old story's
progress with a one-time notice). Cloud doc: `datingSim/{uid}` =
`{ save, version, updated }`; the rules enforce exactly those keys.

## Content

Story, cast and tone live in `STORY.md`; schemas in `characters/README.md`,
`levels/README.md`, `prompts/system/README.md`. Adding content:

1. Write the JSON (+ persona `.md` for a character) and register the id in the
   matching `index.json`.
2. `node tools/validate.mjs` — must report 0 errors.
3. `node tools/playtest.mjs <level-id>` — a good player should usually win and
   a careless one should lose. Read the transcripts in `playtests/`.

Change a schema → update the loader/engine, `tools/validate.mjs` and the
README together.

## Working on it

- Local server: `node tools/serve.mjs [port]` → http://127.0.0.1:8000. A
  gitignored `secrets.local.json` (`{ "apiKey": "AIza…" }`) pre-fills the key
  on localhost only.
- Tests: `node --test tests/engine.test.mjs` (pure logic; no network).
- Smoke: `node tools/smoke.mjs` (server on :8000, or `BASE=http://…/`) clicks
  through title → map → briefing → one real turn → journal → settings and
  fails on any console error. It launches its own browser on a random debug
  port; never attach tooling to a fixed port (other sessions may own it).
- Art: `tools/preview.html?scene=bakery&weather=blackout&char=rosie&expr=happy`,
  `?sheet=noor` for all expressions; screenshot with
  `HOST=127.0.0.1:8000 node tools/shoot.mjs out.png "tools/preview.html?..."`.
- Animation: attach classes from `css/art.css` to wrapper `<g>`s only — a CSS
  animation's transform replaces the element's `transform` attribute.

## Future work (not built)

- Multi-speaker scenes (`characters[]` is an array, only `[0]` speaks).
- More endings (friends, walking away), cross-character jealousy events.
- Sound and music.
