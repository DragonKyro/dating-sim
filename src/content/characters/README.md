# Characters

One JSON file per character, picked up automatically (no registry). Persistent
state per character (bond, memories, flags) lives in the save, keyed by id.

## Adding a character

1. `characters/<id>.json` (schema below) and `../prompts/personas/<id>.md`
   (see `../prompts/README.md`). The persona is matched by id.
2. Check the look with `npm run dev`: `/dating-sim/preview.html?sheet=<id>`
   (all expressions) and `/dating-sim/preview.html?char=<id>&scene=ferry&time=golden`.
3. `npm run validate`.

## Schema

```json
{
  "id": "rosie",
  "displayName": "Rosie",
  "fullName": "Rosie Amaral",
  "age": 23,
  "role": "Runs Amaral's Bakery",
  "tagline": "All momentum. Usually covered in flour.",
  "color": "#e2553f",
  "judge": {
    "summary": "One paragraph the scorer reads: who she is and what's underneath.",
    "loves": ["things that win her over", "..."],
    "hates": ["things that put her off", "..."]
  },
  "look": {
    "skin": "#e2ab82",
    "eyes": "#5b3521",
    "hair": { "style": "curlyBun", "color": "#3a2218" },
    "lips": "#c66a5e",
    "blush": "#f0806e",
    "lash": "#2a1a14",
    "accent": "#d9483b",
    "outfit": { "style": "apronTee", "colors": { "shirt": "#d9483b", "stripe": "#f7efe2", "apron": "#f4ebd8" } },
    "outfits": { "work": { "style": "overalls", "colors": {}, "extras": ["pearls"] } },
    "extras": ["freckles", "flour", "bandana"]
  }
}
```

| Field | Notes |
|---|---|
| `displayName` / `fullName` | UI name / full name in briefings and the journal. |
| `role`, `age`, `tagline` | Shown on the HUD and in the journal. |
| `color` | Accent for her nameplate, meter and card. |
| `judge` | What the scorer uses to judge messages *her* way. `loves`/`hates` matter most. |
| `look` | Inputs to the SVG rig (`src/art/character.ts`). |

### `look`

- Colors are hex. `lips`, `blush`, `lash` are optional (derived otherwise).
- `hair.style`: a key of `HAIR` in `src/art/wardrobe.ts` — `curlyBun`, `bob`,
  `coils`, `longWaves`.
- `outfit.style`: a key of `OUTFITS` — `apronTee`, `cardiganTee`, `slicker`,
  `breton`, `overalls`. `colors` are style-specific (see the function).
- `outfits`: optional named alternates; a level picks one with `"outfit"`.
  An alternate may override `extras`.
- `extras`: keys of `EXTRAS` — `bandana`, `flour`, `freckles`, `glasses`,
  `headphones`, `hoops`, `binoculars`, `sunglasses`, `pearls`.

New hairstyles/outfits/extras go in `src/art/wardrobe.ts` (same 500×800 rig
space; see the comment at the top). Every character gets all ten expressions
automatically: neutral, happy, laugh, flirty, interested, surprised,
flustered, annoyed, sad, thinking.
