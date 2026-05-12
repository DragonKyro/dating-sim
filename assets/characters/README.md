# Character sprites

One subfolder per character (`assets/characters/<characterId>/`), containing
one PNG per expression listed in the character's JSON.

## Specs

- **Format:** `.png` with a **transparent background**.
- **Dimensions:** ~600 × 900 (vertical, half-body or full-body). Anything tall
  and on a transparent background works — the game renders sprites at 60% of
  scene height regardless of source size.
- **Composition:** subject centered horizontally. Leave a bit of headroom on
  top — the dialog box covers the bottom ~35% of the scene, so the face
  should sit roughly in the upper half of the canvas.
- **File size:** under ~250 KB per expression ideally.

## Expression names

The game swaps to the file named after the `mood` returned by the judge each
turn. Standard set:

| File | When shown |
|---|---|
| `neutral.png` | Default. Required. |
| `happy.png`   | Judge returns `happy`. |
| `sad.png`     | Judge returns `sad`. |
| `annoyed.png` | Judge returns `annoyed`. |
| `interested.png` | Judge returns `interested`. |
| `flirty.png`  | Judge returns `flirty`. |

Only `neutral.png` is strictly required — missing expressions fall back to a
placeholder box. To narrow the set, edit the character JSON's `expressions`
array and the judge prompt's `mood` enum.

## Example folder layout

```
assets/characters/aria/
  neutral.png
  happy.png
  annoyed.png
  flirty.png
  interested.png
  sad.png
```

## Sources

Free options for placeholder art:
- AI image generation (request transparent PNG, half-body, consistent character).
- [Picrew](https://picrew.me/) makers and screenshot/transparency tools.
- Pixel/anime-style sprite packs on itch.io.

Consistency tip: lock the camera framing across expressions so the only thing
that changes is the face — abrupt outfit/pose changes between turns look
glitchy.
