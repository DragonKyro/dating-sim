# AI Dating Sim

A browser-based dating sim where every girl is played by an LLM. Each level
drops you into a different setting with a different personality, and your job
is to chat your way to a mission objective — get her number, ask her out, win
the dance, whatever the level says.

Runs entirely as static files (HTML + JS + CSS, no build step), deployable to
GitHub Pages. The AI is **Google Gemini**, called directly from the browser
using **your own free API key** (BYOK — bring your own key). No backend, no
server, no auth dance, no monthly bills.

## How to play

1. Open the deployed site (or run locally — see below).
2. Click **Set up API key**. Follow the in-app instructions to grab a free
   Gemini key from [Google AI Studio](https://aistudio.google.com/apikey).
   It takes about 30 seconds; the key is stored only in your browser's
   localStorage.
3. Pick a level. Chat with the character. Watch the affection meter.
4. When you think you're close, click **Attempt objective** — if her affection
   is high enough, she'll agree (and the level completes). If not, you'll
   take a small hit and can keep trying.

Progress (which levels you've completed, affection toward each girl, story
flags) is saved automatically to your browser. Clearing site data wipes the
save.

## Running locally

It's all static files, but `file://` won't let JS modules fetch from the
prompts/ folders. Use any static server:

```bash
# Python (built-in)
python -m http.server 8000

# Node
npx serve

# Or just deploy to GitHub Pages and use that.
```

Then open <http://localhost:8000>.

## Project structure

```
index.html             # Entry point
css/style.css          # All styling
js/                    # Game engine (vanilla ES modules)
  main.js              #   Screen router + conversation loop
  state.js             #   localStorage save/load
  llm.js               #   Gemini API wrapper
  judge.js             #   Affection scoring engine
  levels.js            #   Level + character loading
  ui.js                #   DOM helpers
  settings.js          #   BYOK + settings modals
prompts/               # System + judge prompts (markdown, templated at runtime)
  system/              #   One file per character — see prompts/system/README.md
  judge.md             #   Universal scoring prompt
  objective.md         #   "Attempting the move" prompt fragment
characters/            # Character JSONs — see characters/README.md
levels/                # Level JSONs — see levels/README.md
assets/                # Backgrounds, character sprites, UI icons
  backgrounds/, characters/, ui/
DESIGN.md              # Brainstormed settings / personalities / objectives
CLAUDE.md              # Project conventions (for Claude Code / AI assistants)
```

## Adding content

- **A new character:** see [`characters/README.md`](characters/README.md).
- **A new level:** see [`levels/README.md`](levels/README.md).
- **A new background or sprite:** see READMEs in [`assets/`](assets/).
- **Writing a system prompt:** see [`prompts/system/README.md`](prompts/system/README.md).

In short: add a JSON file, add its id to the matching `index.json`, drop the
art into `assets/`. No build step, no rebuild. Refresh and it appears.

## Deploying to GitHub Pages

1. Push the repo to GitHub.
2. Repo Settings → Pages → Build from `main` branch, root folder.
3. Wait ~1 minute for the first build. Visit `https://<user>.github.io/<repo>/`.

That's it — there's no compile step.

## Privacy

- Your Gemini API key lives in `localStorage` and is sent only to
  `generativelanguage.googleapis.com` when the game makes a request.
- Save state lives in `localStorage`. Nothing leaves your browser otherwise.
- The game does not phone home or include analytics.

## Roadmap (deferred)

- More levels and characters.
- Cross-level story events (love triangles, shared friend groups).
- Branching story outcomes based on completion flags.
- Save export/import for cross-device play.
- Optional voice/audio.
