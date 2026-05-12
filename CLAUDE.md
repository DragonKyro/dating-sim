# CLAUDE.md — project conventions

For Claude Code (and any other AI assistant) working on this repo.

## What this project is

A static, no-build, browser-based AI dating sim. The player chats with AI
characters (Gemini Flash via BYOK) and pursues per-level objectives. State
lives in `localStorage`; content lives in JSON + Markdown files fetched at
runtime.

**Deployment target: GitHub Pages.** Anything that requires a build step,
node_modules, a backend, or bundling is off-limits.

## Hard rules

- **No build step.** Vanilla ES modules in `js/`, loaded directly from
  `index.html`. No bundlers, no transpilers, no node_modules at runtime.
- **No backend.** All inference goes to
  `generativelanguage.googleapis.com` with the user's own key.
- **No npm install.** The repo has no `package.json` and shouldn't grow one.
- **No external CSS/JS CDNs in production.** Keep everything in-tree so the
  site works offline-ish and never depends on a stranger's URL.
- **No example content in the framework.** Characters, levels, prompts, and
  sprites are author-provided; do not auto-generate them unless explicitly
  asked. The folders ship with READMEs only.

## File map

```
index.html
css/style.css
js/
  main.js          - Screen routing + per-level chat loop
  state.js         - localStorage I/O, single getState()/updateState() interface
  llm.js           - Gemini REST wrapper (transport only, no game logic)
  judge.js         - Wraps llm.js with the scoring prompt
  levels.js        - JSON loaders + prereq/onComplete logic
  ui.js            - DOM helpers (h, mount, modals, sprite, meter, dialog)
  settings.js      - BYOK setup + settings panel modals
prompts/
  judge.md         - Scoring prompt template
  objective.md     - "Attempt objective" guidance (currently inlined in main.js)
  system/<id>.md   - Per-character system prompts
characters/
  index.json       - Array of registered character ids
  <id>.json        - Character config
levels/
  index.json       - Ordered array of level ids
  <id>.json        - Level config
assets/
  backgrounds/<name>.jpg
  characters/<id>/<expression>.png
  ui/
```

## Save state schema

LocalStorage key: `dating-sim-save-v1`. Shape lives in `js/state.js`
(`DEFAULT_STATE`). If you change the shape, **bump `SAVE_VERSION` and add a
migration branch in `migrate()`** — never silently break players' saves.

## Adding content (the supported flow)

1. **Character:** `characters/<id>.json` + `prompts/system/<id>.md` +
   `assets/characters/<id>/*.png` + add id to `characters/index.json`.
2. **Level:** `levels/<id>.json` + `assets/backgrounds/<bg>.jpg` + add id to
   `levels/index.json`. Make sure every character it references is
   registered.

Schemas are documented in the per-folder READMEs. Don't change the schemas
without updating the matching loader in `js/levels.js` *and* the README.

## Schemas, briefly

**Character JSON:** `id`, `displayName`, `systemPrompt` (path),
`spriteFolder`, `expressions`, optional `baseTemperature`, optional
`personalitySummary` (used by judge).

**Level JSON:** `id`, `title`, `location?`, `background?`, `characters[]`,
`intro?`, `objective {type, label, threshold}`, `judgeAddendum?`,
`prerequisites?`, `onComplete?`.

`judgeAddendum` is a free-text string appended to the universal judge prompt
via the `{{judgeAddendum}}` template var. Use it for scenario-specific
scoring nuance (what counts as a natural ask here, tonal calibration, etc.)
without forking the whole judge prompt.

**Prerequisites:** `levelsCompleted[]`, `characterAffection {id: minVal}`,
`storyFlags[]`. All must be satisfied to unlock.

**onComplete:** `addFlags[]`, `addCharacterFlags {id: [flags]}`.

## How a turn works (reference)

1. Player types a message → appended to `state.currentConversation.messages`.
2. `main.js` builds the system prompt by templating the character's
   `prompts/system/<id>.md` (via `fillSystemPrompt` in `levels.js`).
3. `llm.js` calls Gemini with `[systemInstruction, ...history]`.
4. Reply is rendered.
5. `judge.js` scores the exchange (`{ affection_delta, mood, objective_signal }`).
6. Affection adjusted in state, sprite swapped to the new `mood`.
7. If the player clicked **Attempt objective**, the system prompt for that
   turn is appended with the objective instructions (currently inlined in
   `main.js` — `prompts/objective.md` is a reference copy). Success is
   signaled by the model emitting the literal token `<<OBJECTIVE_MET>>`.

## Token management

We make 2 LLM calls per player turn (character reply + judge score). To keep
input/output token usage bounded:

- **Character chat history is windowed.** `CHAT_HISTORY_WINDOW` in main.js
  caps how many messages are sent per turn (default 30 = 15 turns).
  Conversations are typically <20 turns, so this preserves continuity in
  realistic plays while bounding worst-case linear growth.
- **Judge history is windowed.** `HISTORY_WINDOW` in judge.js caps the
  judge's context to the last 8 prior exchanges. Enough to spot repetition
  and topic continuity; short enough to keep the scoring call cheap.
- **Output is capped via `maxOutputTokens`.** Character: 256 (system prompt
  says "1-3 sentences"; this is a defensive ceiling, not a target). Judge:
  128 (small JSON only).
- **Implicit Gemini caching kicks in naturally** once total prefix exceeds
  ~1024 tokens (the 2.5 Flash minimum). System prompts are ~700-800 tokens
  alone — below the threshold — but the history accumulation pushes total
  prefix over the line by turn ~5. No special restructuring required.

If extending: prefer trimming history before extending it. The cost
multiplier of an extra 5 messages per turn dwarfs prompt-text optimization.

## Things to watch for

- **CORS:** Gemini's REST API accepts browser requests with the key as a URL
  param. No proxy needed.
- **Rate limits:** Gemini Flash free tier is ~15 RPM. The game makes 1 model
  call + 1 judge call per turn = 2 RPM per turn. Plenty of headroom for
  single-player. `llm.js` retries 429s automatically with exponential backoff.
- **Cost:** Free tier covers casual play. Real concern is the per-day token
  quota — see token management section above. If a level chews through a
  lot of turns, the judge call could be skipped on low-effort turns or
  batched. Not implemented yet.
- **Sprite asset misses** are non-fatal — `ui.js#spriteFor` falls back to a
  dashed placeholder.
- **Levels with multiple characters** are not yet supported. `characters[]`
  is an array but only `characters[0]` speaks. Multi-character is a planned
  extension; keep the array shape for forward-compat.

## Future work, not yet wired

- Cross-level story events (love triangles, shared-friend reactions).
- A "story map" view for branching outcomes.
- Save export/import.
- Sound/music.

The state shape already supports per-character affection + per-character
flags + global story flags, so the substrate is there — what's missing is
the UX layer and any level designs that actually use these mechanics.
