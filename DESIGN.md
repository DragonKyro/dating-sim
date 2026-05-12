# DESIGN.md — content brainstorm

A holding pen for level ideas, personalities, settings, and future mechanics.
Not load-bearing for the game — just a reference when authoring real content.

## Settings (locations)

A grab-bag of plausible "where could the player meet someone" scenes. Each
implies a vibe, a level of background noise, and a natural exit ramp.

| Setting | Vibe | Natural objective(s) |
|---|---|---|
| Cozy coffee shop on a rainy morning | Intimate, slow | Number, second-meeting plan |
| University library, finals week | Quiet tension | Number, study-date |
| Independent bookstore café | Literary, contemplative | Recommendation exchange → coffee plan |
| Beach boardwalk, late afternoon | Loose, playful | Walk together, IG handle |
| Art gallery opening | Curious, performative | Get her opinion on a piece → drink after |
| Dimly lit cocktail bar | Flirty, direct | Get her to stay one more drink → number |
| Public park / dog park | Casual | Walk together, exchange contacts |
| Climbing gym | High-energy | Become climbing partners |
| Concert / music festival | Loud, energetic | Dance together, group hang invite |
| Train ride (5+ hour) | Captive | Meaningful conversation → number at the stop |
| House party | Chaotic | Pull her away to talk → number |
| Hiking trail | Earnest, exposed | Vulnerable conversation → second hike |
| Cooking class | Collaborative | Get her to come over and cook → date plan |
| Wedding reception | Charged | Dance, kiss, exit together |
| Museum (rainy Saturday) | Thoughtful | Linger past closing → cafe after |

## Personalities (girl archetypes)

Each archetype below should be one character JSON + one system prompt. The
goal is that *the player can feel* who they're talking to in 1–2 turns.

| Archetype | Core trait | Disarmed by | Annoyed by |
|---|---|---|---|
| Shy bookworm | Soft-spoken, observant | Specific genuine interest in her book | Loud confidence |
| Confident extrovert | Direct, sharp wit | Holding your own, not flinching | Playing it safe |
| Sarcastic gamer | Deadpan, terminally online | Self-aware jokes, niche references | Try-hard sincerity |
| Athletic outdoorsy | Restless, no-nonsense | Action over talk | Excessive flirting |
| Artsy dreamer | Tangential, poetic | Listening, building on her metaphors | Logical "actually…" |
| Type-A pre-med | Focused, efficient | Respecting her time, asking smart Qs | Time-wasters |
| Chaotic creative | Manic, unpredictable | Going along with the bit | Stability lectures |
| Cold professional | Reserved, evaluative | Earned slow warmth, no fawning | Compliments on looks |
| Bubbly optimist | Warm, encouraging | Matching energy, being kind | Cynicism, edginess |
| Goth/alt | Dry, observant | Not commenting on her aesthetic | Compliments meant to "rescue" her |
| Foodie | Sensory, opinionated | Specific food vocabulary | "I'll eat anything" |
| Tech nerd | Logical, curious | Engaging her interests substantively | Hand-wavy answers |
| Yoga/spiritual | Calm, reflective | Stillness, slow pacing | Performative urgency |
| Tsundere | Hot/cold | Reading the actual subtext | Taking insults at face value |
| Tomboy musician | Casual, sharp | Riffing on music, no posturing | Mansplaining her own genre |

## Objectives

The "win condition" for a level. Pair to threshold (suggested in parens —
0–100 affection scale).

- Get her phone number (70)
- Get her Instagram / social handle (55)
- Schedule a specific second meeting / date (65)
- Get her to leave the venue with you (75)
- Get a goodbye kiss (85)
- Make her dance with you (60)
- Get her to confide something personal (65)
- Survive her testing you (40, but conversation-quality gated)
- Win a debate playfully without affection dropping below start (—)
- Be the one she chooses (love triangle — 75 with her, lower with rival)
- Comfort her successfully through a bad-day moment (50)
- Get an invitation to her thing (concert / hike / show — 65)

## Future story mechanics (notes for later)

Currently dormant. The state shape supports them; nothing is wired in v1.

### Cross-character reactions
Characters who know each other can read flags on each other:
> "I saw you with Mira last week. How'd that go?" (`storyFlags`-driven)

If true: opening affection penalty/bonus depending on relationship.

### Love-triangle conflict event
If two interrelated characters cross some affection threshold (say both ≥ 60)
and the player has progressed objectives with both, trigger a special
"confrontation" level where one walks in on the other and the player must
pick a side. Outcome locks one of them out and boosts the other.

### Reputation flag
Some archetypes care about "what people say about you" (`reputation`). A
flag set in one level can change another character's opening attitude.
Others (chaotic creative, goth/alt) are reputation-immune.

### Branching unlocks
A level can require an affection *range*: `{ min: 40, max: 70 }`. Lets
designers gate "she's mad at you" levels behind low-but-not-zero affection.
Not implemented in `checkPrerequisites` yet.

### Time of day / day of week
A simple "in-game day" counter could gate when certain levels appear (e.g.
"Friday night party" only unlocks after 3 levels). Easy add when needed.

## Authoring discipline

When writing a real character/level:
- **Be specific about the scene.** "Coffee shop" is bad. "Tuesday morning,
  rain, half the tables empty, jazz on the speakers, she's reading
  *Stoner* by John Williams" is good.
- **Write the bad endings first.** What does she do when the player lands
  a -3? When they try to ask for her number at affection 20? If you can't
  describe those, the LLM will improvise something embarrassing.
- **One sharp personality beats three blurry ones.** Better to ship 4
  vivid characters than 12 thin ones.
- **Keep system prompts tight.** Under 500 words. Affection bands stated
  numerically. List of things she *won't* do. Done.
