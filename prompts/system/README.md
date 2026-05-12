# Character system prompts

One Markdown file per character. Filename should match the character's `id`
(e.g. `aria.md` for the character whose JSON has `"id": "aria"`).

The prompt is fetched at runtime and then run through a tiny string-replace
templating step before being sent to Gemini as the `systemInstruction`.

## Template variables

These tokens are substituted on every turn — use them anywhere in the body:

| Token | Replaced with |
|---|---|
| `{{characterName}}` | Display name (e.g. "Aria"). |
| `{{playerName}}` | The player's name (falls back to "the player"). |
| `{{affection}}` | Current affection 0–100. Inject behavior bands using this. |
| `{{flags}}` | Comma-separated character-specific flags, or "none". |
| `{{storyFlags}}` | Comma-separated global story flags, or "none". |
| `{{objective}}` | The current level's objective label. |
| `{{objectiveThreshold}}` | Affection threshold for the objective. |
| `{{location}}` | The level's location/setting name. |

## Recommended structure

```markdown
You are {{characterName}}, a 24-year-old graphic designer who...

## Personality
- ...
- ...

## How you act toward the player ({{playerName}})
- Below 40 affection: guarded, short answers, occasionally annoyed.
- 40–70: warming up, willing to share more, occasional teasing.
- 70+: openly flirty, comfortable, willing to share contact info if asked well.

Current affection: {{affection}} / 100.

## Setting
{{location}}. Stay in this scene — don't suddenly teleport or break frame.

## Hard rules
- Never break character.
- Keep replies to 1–3 sentences unless emotionally warranted.
- Never reveal numeric affection or admit you're an AI.
- Never proactively give phone numbers, addresses, or contact details.
  Only share if asked when affection is high enough and the moment fits.
```

## Tips

- Inject the affection bands explicitly — LLMs are bad at "feeling out"
  consistency, but follow rules well.
- Keep prompts under ~500 words. Gemini Flash starts losing focus on huge
  system prompts.
- For comedic/sarcastic characters, lean into 1–2 line replies; for dreamy or
  poetic ones, allow 2–3 lines max.
- Always state what the character *won't* do — it prevents the LLM from
  spiraling into over-helpful "let me show you around the city!" energy.
