// The scene screen: one conversation, one objective. Drives engine.js turns
// through ai.js and renders the result live (meter, mood, feedback, toasts).

import { getState, updateState, getCharacterState, ensureCharacter } from "./state.js";
import { loadLevel, loadCharacter, resolveLevel, speakerOf, startingInterest, applyOutcome } from "./content.js";
import { newRun, resolveTurn, summarizeRun, turnsLeft } from "./engine.js";
import { judgeTurn, speak, learnAboutPlayer } from "./ai.js";
import { flushCloud } from "./cloud.js";
import { renderScene } from "./art/scenes.js";
import { createCharacter } from "./art/character.js";
import { h, mount, onUnmount, heartMeter, typewrite, richLine, toast, confirmDialog } from "./ui.js";
import { openKeySetup } from "./settings.js";
import { nav } from "./nav.js";

const MAX_INPUT = 400;
const NOTES_CAP = 8;

function saveRun(run) {
  updateState((s) => { s.run = run; }, { touch: false });
}

export async function playLevel(levelId, { resume = false } = {}) {
  const raw = await loadLevel(levelId);
  const state = getState();
  const level = resolveLevel(raw, state);
  const character = await loadCharacter(speakerOf(level));
  updateState((s) => { ensureCharacter(character.id); s.characters[character.id].met = true; });
  const charState = getCharacterState(character.id);

  let run = resume && state.run?.levelId === levelId ? state.run : newRun(level, startingInterest(level, charState));
  saveRun(run);

  const o = level.objective;
  const speed = () => getState().settings.textSpeed;

  // ---------------------------------------------------------------- DOM
  const sprite = createCharacter(character.look, { outfit: level.outfit, expression: "neutral" });
  const stageChar = h("div", { class: "stage-char" }, sprite.el);
  const emotes = h("div", { class: "emotes" });
  const meter = heartMeter({
    value: run.interest,
    threshold: o.type === "endure" ? null : o.threshold,
    floor: o.type === "endure" ? o.floor : null,
    color: character.color,
  });
  const clockNum = h("strong", {});
  const clockText = h("span", { class: "muted" });
  const clock = h("div", { class: "hud-card clock" }, clockNum, h("br"), clockText);
  const log = h("div", { class: "log", "aria-live": "polite" });
  const input = h("textarea", { placeholder: `Say something to ${character.displayName}…`, maxlength: String(MAX_INPUT), rows: "1" });
  const send = h("button", { class: "btn" }, "Send");
  const goalText = o.type === "reach" ? `Get her to ♥ ${o.threshold}`
    : o.type === "ask" ? `At ♥ ${o.threshold}, make your move`
    : `Keep her above ♥ ${o.floor}`;

  const screen = h("div", { class: `scene-screen t-${level.scene.time ?? "day"}` },
    h("div", { class: "backdrop", html: renderScene(level.scene) }),
    stageChar, emotes,
    h("div", { class: "hud" },
      h("div", { class: "hud-left" },
        h("div", { class: "hud-card" },
          h("div", { class: "hud-name", style: { color: character.color } }, character.displayName, h("span", { class: "role" }, character.role)),
          meter.el),
        h("div", { class: "hud-card hud-goal" }, h("span", { class: "label" }, "Goal"), o.label, h("div", { class: "muted small" }, goalText)),
      ),
      h("div", { class: "hud-right" },
        clock,
        h("button", { class: "icon-btn", title: "Menu", onclick: () => menu() }, "☰"),
      ),
    ),
    h("div", { class: "dialog" },
      h("div", { class: "nameplate", style: { background: character.color } }, character.displayName),
      log,
      h("div", { class: "composer" }, input, send),
    ),
  );
  mount(screen);
  onUnmount(() => sprite.destroy());

  function updateClock() {
    const left = turnsLeft(run);
    if (o.type === "endure") {
      clockNum.textContent = `${Math.min(run.turn, o.turns)} / ${o.turns}`;
      clockText.textContent = `until ${level.exit}`;
    } else {
      clockNum.textContent = `${left} left`;
      clockText.textContent = `before ${level.exit}`;
    }
    clock.classList.toggle("urgent", left <= 2 && run.status === "playing");
  }
  updateClock();

  // ---------------------------------------------------------------- log rendering
  const scrollDown = () => { log.scrollTop = log.scrollHeight; };
  function addHer(text, { animate = false } = {}) {
    log.querySelectorAll(".line.her.current").forEach((n) => n.classList.remove("current"));
    log.querySelectorAll(".line").forEach((n) => n.classList.add("past"));
    const t = h("span", { class: "text" });
    const line = h("div", { class: "line her current" }, h("span", { class: "who", style: { color: character.color } }, character.displayName), t);
    log.appendChild(line);
    scrollDown();
    if (!animate) { t.appendChild(richLine(text)); return Promise.resolve(); }
    sprite.talk(true);
    const tw = typewrite(t, text, speed(), { onTick: scrollDown });
    const skip = () => tw.skip();
    line.addEventListener("click", skip);
    return tw.done.then(() => { sprite.talk(false); line.removeEventListener("click", skip); scrollDown(); });
  }
  function addYou(text) {
    const line = h("div", { class: "line you" }, h("span", { class: "who" }, getState().settings.playerName || "You"), h("span", { class: "text" }, richLine(text)));
    log.appendChild(line);
    scrollDown();
    return line;
  }
  function addFeedback(delta, text, extra = "") {
    const cls = delta > 0 ? "pos" : delta < 0 ? "neg" : "zero";
    log.appendChild(h("div", { class: `fb ${cls}` }, h("span", {}, text), extra ? h("span", {}, extra) : null, h("span", { class: "d" }, `${delta > 0 ? "+" : ""}${delta} ♥`)));
    scrollDown();
  }
  function addSys(text, cls = "") {
    const n = h("div", { class: `sys ${cls}` }, text);
    log.appendChild(n);
    scrollDown();
    return n;
  }
  function typing() {
    const n = h("div", { class: "line her" }, h("span", { class: "typing" }, h("i"), h("i"), h("i")));
    log.appendChild(n);
    scrollDown();
    return n;
  }

  // Replay an existing run (resume) or start with the authored opening line.
  const visible = run.messages.filter((m) => !m.hidden);
  if (visible.length > 1) {
    let li = 0;
    for (const m of visible) {
      if (m.role === "user") {
        addYou(m.text);
        const entry = run.log[li++];
        if (entry) addFeedback(entry.delta, entry.feedback);
      } else addHer(m.text);
    }
    addSys("— resumed —");
    sprite.setExpression(run.log.at(-1)?.mood ?? "neutral");
    if (run.pending) {
      // Refreshed while her reply was in flight: ask for it again.
      setTimeout(() => { lock(true); deliverReply(run.pending, typing()); }, 400);
    } else if (run.status !== "playing") {
      // Refreshed after the last turn but before the results were applied.
      setTimeout(() => finish(), 400);
    }
  } else {
    setTimeout(() => addHer(level.opening, { animate: true }), 650);
  }

  // ---------------------------------------------------------------- effects
  function floatDelta(delta) {
    if (!delta) return;
    const r = meter.el.getBoundingClientRect();
    const n = h("div", { class: `float-delta ${delta > 0 ? "pos" : "neg"}`, style: { left: `${r.right - 30}px`, top: `${r.top + 10}px` } }, `${delta > 0 ? "+" : ""}${delta}`);
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 1500);
  }
  function emote(glyphs, color) {
    glyphs.forEach((g, i) => {
      const n = h("span", { class: "emote", style: { color, "--dx": `${(i - (glyphs.length - 1) / 2) * 46}px`, animationDelay: `${i * 0.12}s`, left: `${(i - (glyphs.length - 1) / 2) * 26}px` } }, g);
      emotes.appendChild(n);
      setTimeout(() => n.remove(), 2200);
    });
  }
  function react(events) {
    const { delta, mood } = events;
    if (delta >= 7) emote(["♥", "♥", "♥"], "#ff8a9a");
    else if (delta >= 4) emote(["♥"], "#ff9aa8");
    else if (mood === "laugh") emote(["♪"], "#ffd27a");
    else if (delta <= -5) emote(["#"], "#ff7b6b");
    else if (delta <= -2) emote(["…"], "#cfc6d8");
    else if (mood === "surprised") emote(["!"], "#fff");
    else if (mood === "thinking") emote(["?"], "#fff");
  }

  // ---------------------------------------------------------------- turn
  let busy = false;
  function lock(on) {
    busy = on;
    input.disabled = on || run.status !== "playing";
    send.disabled = on || run.status !== "playing";
    if (!on && run.status === "playing") input.focus();
  }

  async function sendTurn() {
    if (busy || run.status !== "playing") return;
    const text = input.value.trim().slice(0, MAX_INPUT);
    if (!text) return;
    const st = getState();
    if (!st.byok.apiKey) return openKeySetup({ onSaved: () => sendTurn() });
    input.value = "";
    lock(true);
    const youLine = addYou(text);
    const dots = typing();

    // 1) judge — on failure nothing has changed; give the text back.
    let judged;
    try {
      judged = await judgeTurn({ byok: st.byok, level, character, run, playerText: text });
    } catch (err) {
      dots.remove(); youLine.remove();
      input.value = text;
      showError(err, () => sendTurn());
      lock(false);
      return;
    }
    if (!judged.parsed) console.warn("[judge] fell back to a neutral score");

    // 2) rules
    const before = { ...run, messages: [...run.messages, { role: "user", text }] };
    const res = resolveTurn(before, level, judged);
    run = res.run;
    // Saved with the run so a refresh mid-reply can re-request her line.
    run.pending = { direction: res.direction, events: res.events };
    saveRun(run);
    meter.set(run.interest);
    floatDelta(res.events.delta - res.events.penalty);
    addFeedback(res.events.delta, res.events.feedback || "…", res.events.refused ? "· too soon — she deflected" : "");
    if (res.events.penalty) addFeedback(-res.events.penalty, "asked before she was ready");
    updateClock();

    // 3) voice — on failure the turn has already counted, so retry just the reply.
    await deliverReply(res);
  }

  async function deliverReply(res, dotsNode) {
    const dots = dotsNode ?? log.querySelector(".typing")?.closest(".line") ?? typing();
    let reply;
    try {
      reply = await speak({ byok: getState().byok, settings: getState().settings, level, character, charState: getCharacterState(character.id), run, direction: res.direction });
    } catch (err) {
      dots.remove();
      showError(err, () => deliverReply(res, typing()), "Her reply didn't come through.");
      return;
    }
    dots.remove();
    run.messages.push({ role: "model", text: reply.text });
    delete run.pending;
    saveRun(run);
    sprite.setExpression(res.events.mood);
    react(res.events);
    if (res.events.revealed) toast(`Discovered: ${res.events.revealed.label}`, { kind: "secret", icon: "🔑", ms: 4500 });
    else if (res.events.deflected) toast("She's not ready to talk about that yet.", { kind: "warn", icon: "🔒" });
    if (res.events.refused && run.status === "playing") {
      if (res.events.strike) toast("That felt pushy. She won't take many more asks like that.", { kind: "warn", icon: "⚠" });
      else toast(`She's touched — but it's a little soon. Build toward ♥ ${o.threshold}.`, { kind: "warn", icon: "⏳" });
    }
    await addHer(reply.text, { animate: true });
    if (run.status !== "playing") return finish();
    lock(false);
  }

  function showError(err, retry, prefix = "") {
    const box = addSys("", "err");
    const msg = err?.kind === "quota" ? "Gemini's free quota is busy. Wait a moment and try again."
      : err?.kind === "auth" ? "Your Gemini key was rejected."
      : err?.message ?? String(err);
    box.append(`${prefix} ${msg} `.trim(), " ");
    if (err?.kind === "auth") box.append(h("button", { class: "btn small", onclick: () => openKeySetup({ onSaved: () => { box.remove(); retry(); } }) }, "Fix key"));
    else box.append(h("button", { class: "btn small ghost", onclick: () => { box.remove(); retry(); } }, "Try again"));
  }

  send.addEventListener("click", sendTurn);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTurn(); }
  });
  input.addEventListener("input", () => { input.style.height = "46px"; input.style.height = `${Math.min(120, input.scrollHeight)}px`; });
  lock(false);

  async function menu() {
    const leave = await confirmDialog({ title: "Step away?", body: "Your conversation is saved; you can resume it from the island map.", ok: "Back to the map", cancel: "Stay" });
    if (leave) nav.map();
  }

  // ---------------------------------------------------------------- end of scene
  async function finish() {
    lock(true);
    const summary = summarizeRun(run, level);
    let gain = 0;
    updateState((s) => { gain = applyOutcome(s, raw, summary).affectionGain; s.run = null; });
    if (summary.outcome === "lose") stageChar.classList.toggle("leaving", run.endReason === "walkout");

    // Remember what she learned about the player (background, best effort).
    learnAboutPlayer({ byok: getState().byok, character, run }).then((facts) => {
      if (!facts.length) return;
      updateState((s) => {
        const c = s.characters[character.id];
        for (const f of facts) if (!c.notes.includes(f)) c.notes.push(f);
        if (c.notes.length > NOTES_CAP) c.notes.splice(0, c.notes.length - NOTES_CAP);
      });
    }).finally(() => flushCloud());

    setTimeout(() => showResult(summary, gain), 900);
  }

  function showResult(summary, gain) {
    const won = summary.outcome === "win";
    const block = won ? raw.onComplete : raw.onFail;
    const title = won
      ? (o.type === "ask" ? "She said yes." : o.type === "reach" ? "You won her over." : "You got her through it.")
      : ({ walkout: "She walked away.", time: `${level.exit[0].toUpperCase()}${level.exit.slice(1)}.`, asks: "You pushed too hard.", floor: "She shut down." }[summary.endReason] ?? "Not this time.");
    const ending = block?.ending;
    const overlay = h("div", { class: "result-overlay" },
      h("div", { class: "result-card" },
        h("div", { class: `result-kicker ${won ? "win" : "lose"}` }, won ? "Scene complete" : "Scene over"),
        h("h2", { class: "result-title" }, title),
        h("p", { class: "result-outro" }, won ? raw.outro?.win : raw.outro?.lose),
        ending ? h("div", { class: "ending-banner" }, ending.endsWith("together") ? `♥ Ending reached: Together — ${character.displayName}` : `Ending reached: Bittersweet — ${character.displayName}. There's another way this night can go.`) : null,
        h("div", { class: "result-stats" },
          h("div", { class: "stat" }, h("b", {}, `♥ ${summary.finalInterest}`), h("span", {}, "Her interest")),
          h("div", { class: "stat" }, h("b", {}, String(summary.turns)), h("span", {}, "Exchanges")),
          h("div", { class: "stat" }, h("b", { style: { color: gain >= 0 ? "#ffc2ae" : "#ffb36b" } }, `${gain >= 0 ? "+" : ""}${gain}`), h("span", {}, "Bond")),
        ),
        summary.bestLine ? h("div", { class: "result-list" }, h("h4", {}, "Your best line"), h("q", {}, summary.bestLine.text), h("div", { class: "muted small" }, `+${summary.bestLine.delta} · ${summary.bestLine.feedback}`)) : null,
        summary.secretsTotal ? h("div", { class: "result-list" },
          h("h4", {}, `Secrets · ${summary.revealed.length} / ${summary.secretsTotal}`),
          summary.revealed.length ? h("ul", {}, summary.revealed.map((s) => h("li", {}, s.journal))) : h("div", { class: "muted small" }, "She kept something to herself this time."),
        ) : null,
        h("div", { class: "btn-row center", style: { marginTop: "0.6rem" } },
          won ? null : h("button", { class: "btn ghost", onclick: () => nav.play(levelId, { resume: false }) }, "Try again"),
          h("button", { class: "btn", onclick: () => nav.map() }, won ? "Continue" : "Back to the island"),
        ),
      ),
    );
    screen.appendChild(overlay);
  }
}
