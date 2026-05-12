# Credits / Asset attribution

Third-party assets used in this project and their licenses.

## Character sprites

All five girls now share a single consistent anime art style from one
artist (Cabbit / KusSv). Male rivals are sourced separately and are
single-expression placeholders.

### All 5 girls — Cabbit / KusSv VN Characters pack
- **Source:** [VN Characters by Cabbit](https://opengameart.org/content/vn-characters) on OpenGameArt
- **Artist:** Cabbit / KusSv
- **License:** CC0 (public domain, no attribution required — included for good practice)
- **Assignment:**
  | Game character | Pack sprite | Expressions |
  |---|---|---|
  | Emma | Visiter_A | neutral, happy |
  | Mira | Student   | neutral, happy, sad, annoyed, flirty |
  | June | Dasha     | neutral, happy, sad |
  | Yuki | Anna      | neutral, happy, sad, flirty |
  | Naia | Visiter_B | neutral, happy |

Each character's source files are preserved in `assets/characters/<id>/_source/`.
Game falls back to `neutral.png` when an expression file doesn't exist
(see `spriteFor` in [js/ui.js](js/ui.js)).

### Marcus (`assets/characters/marcus/*.png`) — placeholder
- **Source:** [Male Sprite for Visual Novels](https://opengameart.org/content/male-sprite-for-visual-novels) on OpenGameArt — Mustafa
- **Artist:** LisadiKaprio
- **License:** CC-BY 4.0
- **Notes:** Single neutral expression. Different art style than the girls — Marcus is a side character so the mismatch is acceptable. Replace with a Cabbit male equivalent if one becomes available.

### Owen (`assets/characters/owen/*.png`) — placeholder
- **Source:** [Visual Novel Sprite Pack](https://opengameart.org/content/visual-novel-sprite-pack) on OpenGameArt — Shinji character
- **Artist:** Exuin / Emily
- **License:** CC0
- **Notes:** Single neutral expression placeholder.

## Backgrounds

### Classroom (`assets/backgrounds/classroom.jpg`)
- **Source:** [Empty Classroom by Barry Zhou](https://unsplash.com/photos/empty-classroom-khjwIW9HH5s) on Unsplash
- **License:** [Unsplash License](https://unsplash.com/license)

### Library (`assets/backgrounds/library.jpg`)
- **Source:** [Empty Library/Study Room by Allen Y](https://unsplash.com/photos/an-empty-library-or-study-room-ErkHo-rGq2E) — Wilfrid Laurier University, Waterloo, Canada
- **License:** [Unsplash License](https://unsplash.com/license)

### Coffee Shop (`assets/backgrounds/coffee-shop.jpg`)
- **Source:** [Cozy Coffee Shop Interior by Haberdoedas](https://unsplash.com/photos/a-cozy-coffee-shop-interior-with-a-menu-_yJXuiFdsPo) — BOON Specialty Coffee, Almere, Netherlands
- **License:** [Unsplash License](https://unsplash.com/license)

### Art Gallery (`assets/backgrounds/gallery.jpg`)
- **Source:** [Modern Art Gallery Hallway by Declan Sun](https://unsplash.com/photos/modern-art-gallery-hallway-with-minimalist-white-walls-_42kwMUmZw0) — Shanghai
- **License:** [Unsplash License](https://unsplash.com/license)
