# Levels

One JSON file per scene, `index.json` (ordered ids) and `chapters.json`
(chapter titles/dates shown on the map). One level = one conversation with
one character, one objective, a turn budget and an in-world deadline.

## Adding a level

1. `levels/<id>.json` (schema below); id convention `NN-slug`.
2. Add the id to `index.json`.
3. `node tools/validate.mjs` (schema, cross-references, and a fairness check
   on threshold vs. turns).
4. `node tools/playtest.mjs <id>` and read `playtests/<id>-*.md`. A good
   player should usually win; a careless one should lose.

## Schema

```json
{
  "id": "05-four-am",
  "chapter": 2,
  "title": "Four A.M.",
  "characters": ["rosie"],
  "scene": { "id": "bakery", "time": "night", "weather": "clear" },
  "outfit": "work",
  "when": "Wednesday, August 6 · 4:05 a.m.",
  "location": "Amaral's Bakery, Front Street, before opening",
  "card": "One-line teaser for the map card.",
  "flavor": [ { "from": "Low Tide FM, 88.1", "text": "…", "if": ["knows_lyon"] }, { "from": "…", "text": "…" } ],
  "intro": ["Narration paragraph.", "Another."],
  "situation": "PRIVATE scene brief for the character and judge: what's happening, what she's doing and feeling, what's in the room to talk about.",
  "situationIf": [ { "if": ["met_celeste"], "text": "Extra context when the flag is set." } ],
  "opening": "*Action.* Her authored first line.",
  "startInterest": 30,
  "maxTurns": 12,
  "exit": "the first fishermen start banging on the door at six",
  "walkout": "what she does if interest hits 0",
  "objective": { "type": "ask", "label": "Ask Rosie on a real date", "move": "…", "threshold": 62, "maxAttempts": 3, "success": "…", "refuse": "…" },
  "secrets": [ { "id": "lyon", "label": "…", "trigger": "…", "minInterest": 48, "reveal": "…", "journal": "…", "flag": "knows_lyon", "memory": "…" } ],
  "tips": ["Shown in the briefing."],
  "judgeNotes": "Scene-specific scoring nuance.",
  "prerequisites": { "levels": ["01-ferry"], "flags": [], "affection": { "rosie": 20 } },
  "exclusiveGroup": "storm",
  "onComplete": { "flags": ["rosie_date"], "affection": { "rosie": 14 }, "memory": "…", "ending": "rosie-together" },
  "onFail": { "flags": [], "memory": "…", "ending": "rosie-bittersweet" },
  "outro": { "win": "Narration after a win.", "lose": "Narration after a loss." }
}
```

### Scene
`scene.id` must be registered in `js/art/scenes.js` with that `time` (and
`weather`, if it has variants). `outfit` picks a named alternate from the
character's `look.outfits`.

### Objectives
| type | wins when | needs |
|---|---|---|
| `reach` | interest ≥ `threshold` | `threshold`, `success` |
| `ask` | the player makes the `move` while interest is high enough: a smooth ask works from `threshold − 6`, an okay one from `threshold − 2`, a clumsy one needs `threshold + 10`, an inappropriate one never works | `move`, `threshold`, `success`, `refuse`, `maxAttempts` (pushy asks before she's done; default 3) |
| `endure` | interest stays ≥ `floor` for `turns` exchanges (`maxTurns` is ignored) | `turns`, `floor`, `success`, `collapse` |

`success`, `refuse` and `collapse` are **director's notes**: instructions to
the character for that moment, in her voice ("Say yes — loudly, then try to
play it cool and fail…"). The rules decide the outcome; the note makes her
words match it. A refused ask costs 3 interest. It only counts toward
`maxAttempts` if it was pushy (the judge scored it ≤ 0, or it was clumsy or
inappropriate); a sincere but early ask just gets a touched "not yet".

Every level also loses if interest hits 0 (`walkout`) or the turns run out
(`exit` is the deadline, used in prompts and the HUD: "before {exit}").

### Secrets
Guarded topics. The judge tags a message with the secret's id when it
genuinely probes the `trigger`; if interest ≥ `minInterest` she tells them
(`reveal` is the director's note), otherwise she deflects. A revealed secret
sets `flag`, adds `memory` to her memories and `journal` to the player's
journal — even if the scene is lost.

### Conditions
`flavor` and `situationIf` entries can have `if` (all flags set) and `ifNot`
(none set). The first matching flavor card is shown; keep an unconditional
one last. Flags come from `onComplete.flags`, `onFail.flags` and secrets.

### Progression
- `prerequisites.levels` / `.flags` / `.affection` must all be met.
- `exclusiveGroup`: completing one level of the group locks the others.
- `startInterest` gets a bond bonus of up to +10 (`affection / 8`).
- `onComplete.affection[char]` is added on a win, plus 1 per 5 points of
  interest above the threshold. `onFail` defaults to −2.
- `ending` ids look like `<character>-together` / `<character>-bittersweet`.

### Writing tips
- Give the `situation` two or three concrete things she can be asked about.
- Write the deflection (`refuse`) as carefully as the yes.
- Put secrets' `minInterest` below the objective threshold so players can
  find them before winning.
- Read `STORY.md` for tone. Wants, not wounds.
