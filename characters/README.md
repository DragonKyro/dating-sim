# Characters

One JSON file per character, plus a registry file. Characters are reusable
across levels and have persistent affection across the whole game.

## Adding a character

1. Create `characters/<id>.json` (see schema below).
2. Create `prompts/system/<id>.md` (see `prompts/system/README.md`).
3. Create the sprite folder under `assets/characters/<id>/` with one PNG per
   expression listed in your character JSON.
4. Add `"<id>"` to the array in `characters/index.json` so the loader can find
   it.

## Schema

```json
{
  "id": "aria",
  "displayName": "Aria",
  "systemPrompt": "prompts/system/aria.md",
  "spriteFolder": "assets/characters/aria",
  "expressions": ["neutral", "happy", "sad", "annoyed", "flirty"],
  "baseTemperature": 0.85,
  "personalitySummary": "Sarcastic, well-read, secretly soft. Gets annoyed by tryhards."
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | ✓ | URL-safe, lowercase, hyphen/underscore separated. Must match filename. |
| `displayName` | ✓ | What the UI shows. |
| `systemPrompt` | ✓ | Path (from project root) to the `.md` prompt file. |
| `spriteFolder` | ✓ | Path to the folder containing per-expression PNGs. |
| `expressions` |   | List of expressions you have sprites for. Defaults to `["neutral"]`. |
| `baseTemperature` |   | Reserved for future per-character tuning. Currently the global setting wins. |
| `personalitySummary` |   | One-line summary used in the judge prompt. Helps scoring stay in-character. |

## `characters/index.json`

A flat array of registered character ids:

```json
["aria", "mira", "june"]
```

Order doesn't matter; the loader fetches each by id.
