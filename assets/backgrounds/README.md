# Backgrounds

Full-scene background images shown behind the character sprite.

## Specs

- **Format:** `.jpg` or `.webp` (transparent not needed). `.png` works but is
  larger.
- **Dimensions:** ~1280 × 720 (16:9). The image is rendered with
  `background-size: cover`, so anything close to that ratio is fine. Avoid
  putting critical detail in the bottom 35% — the dialog box sits there.
- **File size:** keep under ~400 KB per image. GitHub Pages serves these
  uncached on first hit; a slow level open is a bad first impression.

## Naming

Match the level's `background` field exactly. Convention is to name by
location, not by level id, so the same image can be reused across levels:

```
coffee-shop.jpg
library-stacks.jpg
beach-boardwalk.jpg
bookstore-cafe.jpg
```

## Sources

Free options for placeholder art while building:
- [Unsplash](https://unsplash.com/) (no-attribution license).
- [Pexels](https://www.pexels.com/).
- Generate with an image model and save as `.jpg`.

When you swap in final art, just overwrite the file — the level JSON keeps
pointing to the same name.
