# Last Ferry

*A summer on Saltwick Island.* A dating game where you type whatever you want
and the people of a small island answer — played by Google's Gemini.

You're house-sitting your great-aunt Bea's cottage for the last five weeks of
summer. Everyone on the island is deciding whether to stay or go: a baker with
an acceptance letter she hasn't opened in public, the anonymous voice of the
2 a.m. pirate radio show, a seal scientist who always leaves first, and the
last summer daughter of a house that's being sold. The last ferry of the
season leaves on Lantern Night. Who will you be standing next to?

## How to play

1. Open the game (GitHub Pages) and click **Begin**.
2. Paste a free Gemini API key from
   [Google AI Studio](https://aistudio.google.com/apikey) when asked. It stays
   in your browser.
3. Pick a scene on the island map, read the briefing, and talk. There are no
   dialogue options — just say what you'd say.

Each scene has a goal and a time limit. The heart meter shows how into the
conversation she is; every message moves it, with a note on why. Some goals
you win by getting her there, some by **making your move** at the right
moment (too early and she'll deflect), and some by keeping her steady
through a bad night. Characters hide things — ask at the right time and
they'll tell you, and they'll remember what you told them in later scenes.

Progress saves automatically in your browser. Sign in with Google (Settings)
to back it up and play on another device.

## Run it locally

Static files, no build:

```bash
node tools/serve.mjs           # then open http://127.0.0.1:8000
# (python -m http.server 8000 also works)
```

Optional: a gitignored `secrets.local.json` containing
`{ "apiKey": "AIza…" }` pre-fills your key on localhost.

## For developers

- **Conventions, architecture, gotchas:** [CLAUDE.md](CLAUDE.md)
- **Story bible:** [STORY.md](STORY.md)
- **Content schemas:** [characters/](characters/README.md),
  [levels/](levels/README.md), [prompts/system/](prompts/system/README.md)

```bash
node --test tests/engine.test.mjs   # unit tests
node tools/validate.mjs             # lint all content
node tools/playtest.mjs 01-ferry    # AI player vs. the real game (uses secrets.local.json)
node tools/smoke.mjs                # headless browser run-through (needs tools/serve.mjs running)
```

The art is all code: characters and scenes are SVG drawn by `js/art/`.
Preview them at `tools/preview.html?scene=harbor&time=night&weather=lanterns`
or `tools/preview.html?sheet=rosie`.

## Deploying

- **Site:** push to `main`; `.github/workflows/deploy.yml` publishes the repo
  root to GitHub Pages.
- **Cloud saves:** Firebase project `github-games-e7c7d`. The Firestore rules
  file is shared with other games — read the warning in CLAUDE.md before
  deploying it. Google sign-in only works on domains listed under Firebase
  Console → Authentication → Settings → Authorized domains.

## Privacy

Your Gemini key and your conversations go only to Google's Gemini API. If you
sign in, your progress (scenes, story flags, short memories the characters
keep about you) is stored in Firestore, readable only by your account. No
analytics.
