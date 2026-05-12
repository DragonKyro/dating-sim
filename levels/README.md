# Levels

One JSON file per level, plus a registry file.

## Adding a level

1. Create `levels/<id>.json` (see schema below).
2. Make sure every character listed in `characters` is registered (see
   `characters/README.md`).
3. Drop the background image into `assets/backgrounds/`.
4. Add `"<id>"` to `levels/index.json` so the level select screen picks it up.

## Schema

```json
{
  "id": "01-coffee-shop",
  "title": "Latte at Dawn",
  "location": "A quiet downtown coffee shop on a rainy morning",
  "background": "assets/backgrounds/coffee-shop.jpg",
  "characters": ["aria"],
  "intro": "You spot her by the window, working through a thick paperback. The barista just called your name.",
  "objective": {
    "type": "get_number",
    "label": "Get her phone number",
    "threshold": 70
  },
  "prerequisites": {
    "levelsCompleted": [],
    "characterAffection": {},
    "storyFlags": []
  },
  "onComplete": {
    "addFlags": ["got_aria_number"],
    "addCharacterFlags": { "aria": ["shared_contact"] }
  }
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | ✓ | URL-safe; must match filename. Convention: `NN-slug`. |
| `title` | ✓ | Shown on the level card. |
| `location` |   | Short setting description — substituted into prompts as `{{location}}`. |
| `background` |   | Image path (relative to project root). Omit for solid color. |
| `characters` | ✓ | Array of character ids. v1 uses the first one as the speaking partner. |
| `intro` |   | One-line scene description shown before the conversation starts. |
| `objective` | ✓ | `{ type, label, threshold }`. Threshold is the affection needed to win. |
| `prerequisites` |   | What state is required to unlock the level (see below). |
| `onComplete` |   | State changes to apply when the level is won (see below). |

### `prerequisites`
- `levelsCompleted: string[]` — these levels must already be completed.
- `characterAffection: { [charId]: number }` — each listed character must be
  at or above this affection.
- `storyFlags: string[]` — every listed global flag must be set.

### `onComplete`
- `addFlags: string[]` — add to global `storyFlags`.
- `addCharacterFlags: { [charId]: string[] }` — add to a character's `flags`.

## `levels/index.json`

A flat ordered array of level ids. Order determines display order on the
level select screen:

```json
["01-coffee-shop", "02-library", "03-bookstore-followup"]
```

## Tips

- Use the threshold to control difficulty: 60 is gentle, 75 is standard, 85+
  is a deliberate challenge.
- For multi-step storylines, encode the dependency in `prerequisites` rather
  than baking it into prompts — keeps prompts reusable.
- The objective `label` is shown to the player AND embedded in the judge +
  objective-attempt prompts, so phrase it clearly: *"Get her phone number"*
  beats *"obtain contact info"*.
