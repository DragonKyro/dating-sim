# OBJECTIVES.md — Level success-condition spec

A spec for how levels measure success against an LLM conversation. This
is *forward-looking design* — the v1 codebase implements only the
simplest pattern (ask-and-receive, gated by affection). The patterns
below get built incrementally as new levels need them.

For implementation reference see [judge.js](js/judge.js) and the level
schema in [levels/README.md](levels/README.md).

---

## The core insight

LLM conversations are messy. Hard "Did the player complete the
objective?" questions usually reduce to one of a small number of
patterns:

1. **Did they ASK for the thing, and were they entitled to receive it?**
2. **Did a specific MOMENT happen during the conversation?**
3. **Did they MAINTAIN something across the conversation?**
4. **Did they GET something through inference, not asking?**
5. **Did they COMPARE favorably to someone else?**

These map to five `successCondition` types. Most levels use just one;
complex levels (Halloween Party, Final Event) compose them with `all` /
`any` operators.

---

## The five patterns

### 1. `ask_and_receive` — current default

The player explicitly tries for the objective by clicking **Attempt
objective**. Success is gated by the character's affection passing a
threshold AND her judging the ask as in-context.

```json
"objective": { "type": "get_number", "label": "Get her phone number" },
"successCondition": {
  "type": "ask_and_receive",
  "threshold": 35
}
```

**Implementation:** already exists. Character LLM emits the literal
token `<<OBJECTIVE_MET>>` when she agrees; the level resolves on that
token. Failed attempt drops affection by `OBJECTIVE_FAIL_PENALTY`.

**Best for:** number / Instagram / scheduled date / a kiss / "come to
my thing." The "did you ask out loud" pattern.

---

### 2. `event` — detect a specific moment

The judge prompt is extended with an enum of named events. Each turn,
it can emit `events_detected: string[]`. The level's success condition
fires when a target event appears.

```json
"objective": {
  "type": "make_laugh",
  "label": "Make Emma laugh genuinely (not polite)"
},
"successCondition": {
  "type": "event",
  "event": "she_laughed_genuinely"
}
```

**Implementation sketch:**
- Add `events_detected` to `JUDGE_SCHEMA` in `judge.js`. Type: array of
  enum strings.
- Add an `availableEvents` list to the level config. The level lists
  which events are "in scope" for this scenario — keeps the judge
  focused (don't give it 30 possible events when only 3 matter).
- Append to `judge.md`: *"Did any of these specific things happen in
  the latest exchange? [enum]. Return them in `events_detected`."*

**Event vocabulary** (initial — extend as needed):
- `she_laughed_genuinely` — a real laugh, not a "haha" of politeness.
- `she_shared_vulnerability` — opened up about something she usually
  hides.
- `she_invited_player` — explicitly invited the player to something.
- `she_admitted_burnout` / `she_admitted_struggle` — character-specific
  cracks. (Yuki: burnout. June: ex-related. Mira: about her parents.
  Naia: about money.)
- `she_chose_player_over_rival` — in a triangle moment, she signaled
  preference for the MC.
- `she_dropped_armor` — moment of letting their guard down.
- `she_lost_patience` — flipped from "interested" to "annoyed" mid-
  conversation. (Failure event for some levels.)

**Best for:** backstory reveals, "make her laugh" challenges, "get her
to invite you," anything where the moment matters more than the count.

---

### 3. `maintain` — survive without dropping

Success requires the player to keep affection (or some other state)
above a floor for N turns. Failure on drop.

```json
"objective": {
  "type": "survive_owen",
  "label": "Survive Owen's interrogation without your standing dropping"
},
"successCondition": {
  "type": "maintain",
  "minAffection": 40,
  "turns": 6,
  "startFromCurrent": true
}
```

**Implementation:** track affection across turns. If it drops below
`minAffection` before `turns` elapse, fail. If it stays above for the
full count, succeed.

**Best for:** Owen confrontation. "Win a debate playfully." Any level
where the player is *defending* something rather than building toward
it.

---

### 4. `silent_threshold` — succeed without asking

Some moments don't have a discrete "attempt." The player just needs to
reach a state. No button click — success fires automatically.

```json
"objective": {
  "type": "earn_trust",
  "label": "Earn enough trust that she'll show you what she's writing"
},
"successCondition": {
  "type": "silent_threshold",
  "minAffection": 65,
  "minTurns": 8
}
```

`minTurns` prevents trivial "she likes you in 2 messages" wins —
trust needs time as well as affection.

**Best for:** Mira showing you the poetry. Yuki opening up. Moments
where asking outright would ruin it.

---

### 5. `comparison` — beat (or tie) a rival

Affection-tracking expands to per-character-pair scoring. Player wins
if their affection is higher than (or within ε of) the rival's at end
of level.

```json
"objective": {
  "type": "she_chose_you",
  "label": "Be the one she leaves the party with"
},
"successCondition": {
  "type": "comparison",
  "rival": "marcus",
  "marginToBeat": 10
}
```

**Implementation:** needs state tracking for the rival's "affection" —
which is invented for the level, not a real character relationship
(Marcus doesn't have his own affection meter with Emma in our state).
Easiest: rival affection starts at the same value as MC's affection
and judge emits events like `rival_outperformed` / `mc_outperformed`
that nudge the rival meter.

**Best for:** Halloween Party (multiple per-girl triangle subplots).
Final Event. Any pivotal moment with a triangle.

---

## Composite conditions

Levels can compose patterns with `all` / `any`:

```json
"successCondition": {
  "type": "all",
  "checks": [
    { "type": "silent_threshold", "minAffection": 60, "minTurns": 6 },
    { "type": "event", "event": "she_dropped_armor" }
  ]
}
```

```json
"successCondition": {
  "type": "any",
  "checks": [
    { "type": "ask_and_receive", "threshold": 40 },
    { "type": "event", "event": "she_invited_player" }
  ]
}
```

`any` is useful for "either way you can win this" levels. `all` is
useful for hinge levels (Halloween Party, Final Event) with multiple
required beats.

---

## Failure conditions

A successCondition that *fires* is "win." But we also want explicit
fail states beyond just "you ran out of turns." Patterns:

- **`fail_on_event`**: any turn that emits a fail-event ends the level
  in failure. E.g. `she_lost_patience`, `rival_outperformed_by_X`.
- **`fail_below_affection`**: drops below a floor → soft fail.
- **`turn_limit`**: more than N turns → hard fail (she leaves).

Example (Owen confrontation):

```json
"successCondition": { "type": "maintain", "minAffection": 40, "turns": 6 },
"failConditions": [
  { "type": "fail_on_event", "event": "she_was_humiliated" },
  { "type": "fail_below_affection", "min": 25 }
]
```

---

## Mapping objectives to story arc

Per [STORY.md](STORY.md):

| Level type | Pattern |
|---|---|
| First-meet "get number / IG" | `ask_and_receive` |
| Second-meet "get a date scheduled" | `ask_and_receive` |
| Backstory reveals (post-Halloween) | `silent_threshold` + `event` (all-of) |
| Make-her-laugh challenges | `event` only |
| Hannah evaluation | `maintain` (don't drop below X with Emma in the room) |
| Owen confrontation | `maintain` + `fail_on_event` |
| Halloween Party (multi-objective) | composite `all` of per-girl checks |
| Final Event endings | `comparison` (per-girl ending paths) |
| Yuki's panic-attack reveal | `silent_threshold` + `event: she_admitted_burnout` |
| Mira's poetry reading | `silent_threshold` + `event: she_dropped_armor` |
| Naia's "tell me about your family" | `event: she_shared_vulnerability` after `minAffection` |
| June at the Owen showcase | `maintain` + `comparison` against Owen |

---

## Tuning & tradeoffs

**Event detection is fuzzy.** "Did she laugh genuinely?" depends on
the judge's read of the exchange. Will mis-fire occasionally. We tune
by:
1. Including event criteria in the judge prompt (what counts as
   `she_laughed_genuinely` vs `she_laughed_politely`).
2. Requiring multiple turns to confirm (e.g., "two laughs in a row" for
   `she_laughed_genuinely`). Rarely needed.
3. Per-level event overrides (rare).

**Some events deserve their own judge call.** For high-stakes events
(Owen confrontation, final choice), running a *separate* scoring call
focused on one question lets us use a more careful prompt without
making the per-turn judge prompt bloated. Tradeoff: more API calls per
turn.

**Composite conditions are tempting but easy to over-design.** Default
to single-condition levels. Only compose when narratively earned.

---

## Implementation phases (suggested build order)

1. **Phase 1** — current. Only `ask_and_receive` is implemented.
2. **Phase 2** — add `event` and `events_detected` to judge schema.
   Wire one event-based level (probably a Naia "make her laugh"
   level or a Mira "she invited you to study together" level).
3. **Phase 3** — add `silent_threshold` and `maintain`. These are
   pure state checks against the existing affection number, no new
   LLM tooling needed.
4. **Phase 4** — add `comparison`. Needs the most new infrastructure
   (rival meters, multi-character scenes, possibly multi-character
   prompt support).
5. **Phase 5** — composites (`all` / `any`) once we have ≥2 base
   patterns wired.

Order can shift based on which levels we build first.
