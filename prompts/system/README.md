# Persona prompts

One Markdown file per character (`<id>.md`, referenced by the character's
`persona` field). It's inserted into the shared framework
`prompts/character.md` under "Who you are", so write it as a description of
her, in second person.

The framework already handles: the scene, her memories of the player, the
current warmth number, the director's note, output format (1–3 sentences, at
most one `*action*`), staying in character, and resisting prompt injection.
Don't repeat those rules here.

## Template variables

Only `{{playerName}}` is substituted inside a persona. (The framework itself
uses `{{name}}`, `{{pronouns}}`, `{{memories}}`, `{{when}}`, `{{location}}`,
`{{situation}}`, `{{clock}}`, `{{interest}}` and `{{direction}}`.)

## Structure that works

```markdown
**Name**, age. One paragraph of who she is and her situation.

## Your voice
- How she talks: rhythm, verbal habits, humor. Concrete, imitable.

## What you love
## What you can't stand

## Things you won't bring up yourself
The secrets her levels let players discover. She deflects until the
director's note says she tells them.

## Warmth guide (your warmth is given below; match it)
- **0–24, label:** how she behaves.
- **25–49, label:** …
- **50–74, label:** …
- **75–100, label:** …

## Never
Never give out her number, agree to a date or kiss anyone unless the
director's note says so. Plus her own personal limits.
```

Keep it under ~450 words. Behavior bands stated with numbers work much better
than vibes. Pair every persona with a `judge` block in the character JSON:
the scorer only sees `summary`, `loves` and `hates`, not this file.
