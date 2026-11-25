// Title, chapter map, briefing and journal screens.

import { getState, updateState, hasApiKey, getCharacterState } from "./state.js";
import { loadAllLevels, loadAllCharacters, loadLevel, loadCharacter, loadJson, checkUnlock, resolveLevel, speakerOf, startingInterest } from "./content.js";
import { renderScene } from "./art/scenes.js";
import { characterSVG } from "./art/character.js";
import { h, mount, onUnmount, heartMeter, confirmDialog } from "./ui.js";
import { openKeySetup, openNamePrompt, openSettings, cloudChip } from "./settings.js";
import { nav } from "./nav.js";

function backdrop(spec, { dim = false, still = false } = {}) {
  const el = h("div", { class: `backdrop${dim ? " dim" : ""}${still ? " still" : ""}`, html: renderScene(spec) });
  return el;
}

function portrait(character, { expression = "neutral", crop = "bust", cls = "portrait" } = {}) {
  return h("div", { class: cls, html: characterSVG(character.look, { expression, crop }) });
}

// Map thumbnails are static snapshots: an <img> of the SVG (with animation
// styles stripped) keeps ~10k scene elements out of the live DOM.
function svgImage(markup, alt = "") {
  const still = markup.replace(/<style[\s\S]*?<\/style>/g, "");
  return h("img", { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(still)}`, alt, draggable: "false", decoding: "async" });
}

function withChip(node) {
  const chip = cloudChip();
  onUnmount(() => chip._stop?.());
  return chip;
}

// ============================================================ title

export async function showTitle() {
  const state = getState();
  const started = Object.keys(state.levels).length > 0 || !!state.run;
  const begin = h("button", { class: "btn big" }, started ? "Continue" : "Begin");
  begin.addEventListener("click", () => startOrContinue());
  const screen = h("div", { class: "title-screen" },
    backdrop({ id: "harbor", time: "dusk", weather: "clear" }),
    h("div", { class: "title-card" },
      h("div", { class: "title-kicker" }, "a summer on saltwick island"),
      h("h1", { class: "title-logo" }, "Last Ferry"),
      h("p", { class: "title-sub" }, "Everyone on the island is deciding whether to stay or go. So are you."),
      h("div", { class: "title-actions" },
        begin,
        h("div", { class: "btn-row center" },
          started ? h("button", { class: "btn ghost", onclick: () => nav.journal() }, "Journal") : null,
          h("button", { class: "btn ghost", onclick: () => openSettings({ onClose: showTitle, onReset: showTitle }) }, "Settings"),
        ),
      ),
    ),
    h("div", { class: "title-foot" },
      withChip(),
      h("span", { class: "chip" }, "Powered by your own Gemini key · stays in your browser"),
    ),
  );
  mount(screen);
}

function startOrContinue() {
  if (!hasApiKey()) return openKeySetup({ onSaved: startOrContinue });
  if (!getState().settings.playerName) return openNamePrompt({ onDone: startOrContinue });
  nav.map();
}

// ============================================================ map

let chaptersCache = null;
async function chapters() {
  if (!chaptersCache) chaptersCache = await loadJson("levels/chapters.json");
  return chaptersCache;
}

export async function showMap() {
  const [levels, chars, chaps] = await Promise.all([loadAllLevels(), loadAllCharacters(), chapters()]);
  const state = getState();
  const scroll = h("div", { class: "map-scroll" });

  for (const ch of chaps) {
    const inChapter = levels.filter((l) => l.chapter === ch.id);
    if (!inChapter.length) continue;
    const row = h("div", { class: "level-row" });
    for (const level of inChapter) row.appendChild(levelCard(level, levels, chars[speakerOf(level)], state));
    scroll.appendChild(h("section", { class: "chapter" },
      h("div", { class: "chapter-head" },
        h("h2", {}, `Chapter ${ch.id} · ${ch.title}`),
        h("span", { class: "when" }, ch.when),
        ch.note ? h("span", { class: "note" }, ch.note) : null),
      row));
  }

  mount(h("div", { class: "map-screen" },
    backdrop({ id: "harbor", time: "night", weather: "clear" }, { dim: true }),
    h("header", { class: "map-top" },
      h("button", { class: "icon-btn", title: "Title screen", onclick: () => nav.title() }, "⟵"),
      h("h1", {}, "Saltwick"),
      h("span", { class: "spacer" }),
      withChip(),
      h("button", { class: "btn ghost small", onclick: () => nav.journal() }, "Journal"),
      h("button", { class: "icon-btn", title: "Settings", onclick: () => openSettings({ onClose: showMap, onReset: showMap }) }, "⚙"),
    ),
    scroll,
  ));
}

function levelCard(level, levels, character, state) {
  const ls = state.levels[level.id];
  const unlock = checkUnlock(level, state, levels);
  const resumable = state.run?.levelId === level.id;
  const cls = ["level-card", !unlock.ok ? "locked" : "", ls?.completed ? "done" : ""].join(" ");
  const status = h("div", { class: "status" });
  if (!unlock.ok) status.append(h("span", { class: "badge lock" }, "🔒 " + unlock.reasons[0]));
  else if (resumable) status.append(h("span", { class: "badge resume" }, "In progress — resume"));
  else if (ls?.completed) status.append(h("span", { class: "badge ok" }, "✓ Complete"));
  else if (ls?.attempts) status.append(h("span", { class: "badge" }, `Tried ${ls.attempts}×`));
  else status.append(h("span", { class: "badge" }, "New"));
  const ending = ls?.completed ? level.onComplete?.ending : ls?.attempts ? level.onFail?.ending : null;
  if (ending && state.endings.includes(ending)) status.append(h("span", { class: "badge ending" }, ending.endsWith("together") ? "♥ Ending" : "Ending"));

  const card = h("button", { class: cls, type: "button", disabled: !unlock.ok || null },
    h("div", { class: "thumb" },
      svgImage(renderScene(level.scene), level.location),
      h("div", { class: "portrait" }, svgImage(characterSVG(character.look, { crop: "bust" }), character.displayName))),
    h("div", { class: "body" },
      h("div", { class: "with", style: { color: character.color } }, character.displayName),
      h("div", { class: "title" }, level.title),
      h("div", { class: "teaser" }, level.card),
      status),
  );
  if (unlock.ok) card.addEventListener("click", () => nav.briefing(level.id));
  return card;
}

// ============================================================ briefing

function flavorKind(from = "") {
  if (/low tide|fm\b|88\.1/i.test(from)) return "radio";
  if (/^text/i.test(from)) return "text";
  if (/council|minutes/i.test(from)) return "doc";
  return "note";
}

function goalExplainer(o) {
  if (o.type === "reach") return `Win her over: get her interest to ♥ ${o.threshold}. She'll take it from there.`;
  if (o.type === "ask") return `Build her interest to ♥ ${o.threshold}, then make your move — just say it in your own words. Too early and she'll deflect.`;
  return `Keep her interest above ♥ ${o.floor} for ${o.turns} exchanges. Dropping below ends the scene.`;
}

/** Secret journal lines the player has unlocked for one character, across all levels. */
export function knownFacts(levels, characterId, state) {
  return levels.filter((l) => speakerOf(l) === characterId)
    .flatMap((l) => l.secrets ?? [])
    .filter((s) => state.storyFlags.includes(s.flag))
    .map((s) => s.journal);
}

export async function showBriefing(levelId) {
  const [raw, levels] = await Promise.all([loadLevel(levelId), loadAllLevels()]);
  const state = getState();
  const level = resolveLevel(raw, state);
  const character = await loadCharacter(speakerOf(level));
  const cs = getCharacterState(character.id);
  const o = level.objective;
  const resumable = state.run?.levelId === levelId;
  const facts = knownFacts(levels, character.id, state);
  const turns = o.type === "endure" ? o.turns : level.maxTurns ?? 12;
  const startAt = startingInterest(level, cs);

  const start = h("button", { class: "btn big" }, resumable ? "Resume" : "Begin");
  start.addEventListener("click", async () => {
    if (!resumable && level.exclusiveGroup) {
      const others = levels.filter((l) => l.exclusiveGroup === level.exclusiveGroup && l.id !== level.id);
      if (others.length && !state.levels[level.id]?.attempts) {
        const ok = await confirmDialog({ title: "Spend the storm here?", body: `If this night goes well, you'll have spent the storm with ${character.displayName} — the other storm scenes will close. (If it goes badly, you can still go elsewhere.)`, ok: "Go to " + character.displayName });
        if (!ok) return;
      }
    }
    nav.play(levelId, { resume: resumable });
  });

  const card = h("div", { class: "brief-card" },
    h("div", { class: "brief-when" }, level.when),
    h("h1", { class: "brief-title" }, level.title),
    h("div", { class: "brief-where" }, level.location, " · with ", h("strong", { style: { color: character.color } }, character.fullName ?? character.displayName)),
    level.flavorCard ? h("div", { class: `flavor ${flavorKind(level.flavorCard.from)}` }, h("span", { class: "from" }, level.flavorCard.from), level.flavorCard.text) : null,
    h("div", { class: "brief-intro" }, level.intro.map((p) => h("p", {}, p))),
    h("div", { class: "brief-grid" },
      h("div", { class: "brief-box" },
        h("h3", {}, "Your goal"),
        h("div", { class: "goal" }, o.label),
        h("p", { class: "small muted", style: { marginTop: "0.35rem" } }, goalExplainer(o)),
        h("p", { class: "small muted" }, `${turns} exchanges before ${level.exit}. She starts at ♥ ${startAt}.`),
      ),
      h("div", { class: "brief-box" },
        h("h3", {}, "Tips"),
        h("ul", {}, (level.tips ?? []).map((t) => h("li", {}, t))),
        (level.secrets ?? []).length ? h("p", { class: "small muted" }, `🔑 ${level.secrets.length === 1 ? "There's something" : "There are things"} she isn't saying. Earn her trust and ask.`) : null,
      ),
    ),
    facts.length || cs.memories.length ? h("div", { class: "brief-box brief-know" },
      h("h3", {}, `What you know about ${character.displayName}`),
      h("ul", {}, [...facts, ...cs.memories.slice(-2).map((m) => `Last time: ${m}`)].map((f) => h("li", {}, f))),
    ) : null,
    h("div", { class: "btn-row end" },
      h("button", { class: "btn ghost", onclick: () => nav.map() }, "Back"),
      resumable ? h("button", { class: "btn ghost", onclick: () => nav.play(levelId, { resume: false }) }, "Start over") : null,
      start),
  );

  mount(h("div", { class: "brief-screen" }, backdrop(level.scene, { dim: true }), card));
}

// ============================================================ journal

export async function showJournal() {
  const [levels, chars] = await Promise.all([loadAllLevels(), loadAllCharacters()]);
  const state = getState();
  const grid = h("div", { class: "journal-grid" });
  for (const c of Object.values(chars)) {
    const cs = getCharacterState(c.id);
    const facts = knownFacts(levels, c.id, state);
    const meter = heartMeter({ value: cs.affection, color: c.color });
    grid.appendChild(h("article", { class: `person${cs.met ? "" : " unmet"}` },
      h("div", { class: "person-head" },
        portrait(c, { crop: "face", expression: cs.met ? (cs.affection >= 50 ? "happy" : "neutral") : "neutral" }),
        h("div", { style: { flex: 1 } },
          h("h3", { style: { color: cs.met ? c.color : null } }, cs.met ? c.fullName : "Someone you haven't met"),
          cs.met ? h("div", { class: "muted small" }, `${c.age} · ${c.role}`) : null,
          cs.met ? h("div", { class: "small", title: "Bond" }, meter.el) : null,
        ),
      ),
      cs.met ? h("div", { class: "person-body" },
        h("p", { class: "serif muted" }, c.tagline),
        cs.memories.length ? [h("h4", {}, "Moments"), h("ul", {}, cs.memories.map((m) => h("li", {}, m)))] : null,
        facts.length ? [h("h4", {}, "What she's told you"), h("ul", {}, facts.map((f) => h("li", {}, f)))] : null,
        cs.notes.length ? [h("h4", {}, "What she remembers about you"), h("ul", {}, cs.notes.map((n) => h("li", {}, n)))] : null,
      ) : null,
    ));
  }

  const endingIds = [...new Set(levels.flatMap((l) => [l.onComplete?.ending, l.onFail?.ending]).filter(Boolean))];
  const endings = h("section", { class: "endings" },
    h("div", { class: "chapter-head" }, h("h2", {}, "Endings"), h("span", { class: "when" }, `${state.endings.length} / ${endingIds.length}`)),
    h("div", { class: "btn-row" }, endingIds.map((id) => {
      const reached = state.endings.includes(id);
      const [who, kind] = id.split("-");
      return h("span", { class: `badge${reached ? " ending" : " lock"}` }, reached ? `${kind === "together" ? "♥ Together" : "Bittersweet"} — ${chars[who]?.displayName ?? who}` : "???");
    })),
  );

  mount(h("div", { class: "journal" },
    backdrop({ id: "records", time: "dusk", weather: "clear" }, { dim: true, still: true }),
    h("header", { class: "map-top" },
      h("button", { class: "icon-btn", title: "Back", onclick: () => (Object.keys(state.levels).length ? nav.map() : nav.title()) }, "⟵"),
      h("h1", {}, "Journal"),
      h("span", { class: "spacer" }),
    ),
    h("div", { class: "journal-body" }, grid, endings),
  ));
}
