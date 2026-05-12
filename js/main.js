// App entry. Routes between screens and runs the per-level conversation loop.

import { getState, updateState, hasApiKey, getCharacterState, adjustAffection } from "./state.js";
import { chat } from "./llm.js";
import { judgeExchange } from "./judge.js";
import {
  listLevels, listCharacters, loadLevel, loadCharacter, loadSystemPrompt,
  fillSystemPrompt, checkPrerequisites, completeLevel, markMet,
} from "./levels.js";
import { openByokSetup, openSettings } from "./settings.js";
import {
  h, mount, affectionBar, objectiveCard,
  spriteFor, dialogMessage, systemMessage,
} from "./ui.js";

const OBJECTIVE_FAIL_PENALTY = 10;

// ============================================================
// Screen: title
// ============================================================
function renderTitle() {
  const playBtn = h("button", { class: "btn" }, "Play");
  const setupBtn = h("button", { class: "btn btn-secondary" }, hasApiKey() ? "Change API key" : "Set up API key");
  const settingsBtn = h("button", { class: "btn btn-secondary" }, "Settings");

  playBtn.addEventListener("click", () => {
    if (!hasApiKey()) {
      openByokSetup({ onSaved: () => renderLevelSelect() });
    } else {
      renderLevelSelect();
    }
  });
  setupBtn.addEventListener("click", () => openByokSetup({ onSaved: renderTitle }));
  settingsBtn.addEventListener("click", () => openSettings({ onClose: renderTitle, onReset: renderTitle }));

  mount(h("div", { class: "screen title-screen" },
    h("h1", { class: "screen-title" }, "AI Dating Sim"),
    h("p", { class: "screen-subtitle" },
      "Chat your way through scenarios with AI-driven characters. Each level has a different setting, personality, and objective.",
    ),
    h("div", { class: "btn-row" }, playBtn, setupBtn, settingsBtn),
    h("p", { class: "screen-subtitle small muted", style: { marginTop: "2rem" } },
      "Powered by your own Google Gemini API key. Free to use, stays in your browser.",
    ),
  ));
}

// ============================================================
// Screen: level select
// ============================================================
async function renderLevelSelect() {
  mount(h("div", { class: "screen level-select" },
    h("h2", { class: "screen-title", style: { fontSize: "1.75rem", marginBottom: "0.25rem" } }, "Choose a level"),
    h("p", { class: "muted small", style: { marginBottom: "1rem" } }, "Loading…"),
  ));

  const state = getState();
  const ids = await listLevels();

  if (ids.length === 0) {
    mount(h("div", { class: "screen level-select" },
      h("h2", { class: "screen-title", style: { fontSize: "1.75rem" } }, "No levels yet"),
      h("p", { class: "empty-state" },
        "Add level JSON files under ", h("code", {}, "/levels"),
        " and register their ids in ", h("code", {}, "levels/index.json"),
        ". See ", h("code", {}, "levels/README.md"), " for the schema.",
      ),
      h("div", { class: "btn-row" },
        h("button", { class: "btn btn-secondary", onclick: renderTitle }, "Back"),
      ),
    ));
    return;
  }

  const levels = await Promise.all(ids.map(loadLevel));
  const cards = levels.map((lvl) => {
    const done = state.levelsCompleted.includes(lvl.id);
    const { ok, reasons } = checkPrerequisites(lvl, state);
    const classes = ["level-card"];
    if (!ok) classes.push("locked");
    if (done) classes.push("completed");
    const card = h("div", { class: classes.join(" ") },
      h("h3", {}, lvl.title ?? lvl.id),
      h("div", { class: "meta" }, `${(lvl.characters ?? []).join(", ")} • ${lvl.objective?.label ?? ""}`),
      done ? h("div", { class: "meta", style: { color: "#6cc275" } }, "✓ Completed") : null,
      !ok ? h("div", { class: "lock-reason" }, "Locked: " + reasons.join("; ")) : null,
    );
    if (ok) card.addEventListener("click", () => startLevel(lvl.id));
    return card;
  });

  mount(h("div", { class: "screen level-select" },
    h("div", { class: "row", style: { width: "100%", maxWidth: "960px", marginBottom: "1rem" } },
      h("h2", { style: { fontSize: "1.75rem" } }, "Choose a level"),
      h("div", { class: "spacer" }),
      h("button", { class: "btn btn-secondary", onclick: () => openSettings({ onClose: renderLevelSelect, onReset: renderTitle }) }, "Settings"),
      h("button", { class: "btn btn-secondary", onclick: renderTitle }, "Back"),
    ),
    h("div", { class: "level-grid" }, ...cards),
  ));
}

// ============================================================
// Screen: in-level conversation
// ============================================================
async function startLevel(levelId) {
  const state = getState();
  updateState((s) => { s.currentLevel = levelId; });

  const level = await loadLevel(levelId);
  // For v1: single-character levels. Multi-character is a future extension.
  const characterId = (level.characters ?? [])[0];
  if (!characterId) {
    alert("Level has no characters. Check the level JSON.");
    renderLevelSelect();
    return;
  }
  const character = await loadCharacter(characterId);
  markMet(characterId);

  // Fresh conversation for this level run.
  updateState((s) => { s.currentConversation = { levelId, messages: [] }; });

  await renderScene({ level, character });
}

async function renderScene({ level, character }) {
  const state = getState();
  const characterState = getCharacterState(character.id);
  const systemTemplate = await loadSystemPrompt(character);

  // DOM scaffolding ------------------------------------------------------
  let sprite = spriteFor(character, "neutral");
  const meter = affectionBar(characterState.affection, `${character.displayName}'s affection`);
  const objective = objectiveCard(level.objective?.label ?? "Hang out");
  const log = h("div", { class: "dialog-log" });
  const input = h("input", { type: "text", placeholder: `Say something to ${character.displayName}…` });
  const sendBtn = h("button", { class: "btn" }, "Send");
  const attemptBtn = h("button", { class: "btn" }, "Attempt objective");
  const leaveBtn = h("button", { class: "btn btn-secondary" }, "Leave");

  const scene = h("div", { class: "scene", style: level.background ? { backgroundImage: `url('${level.background}')` } : {} },
    sprite,
    h("div", { class: "scene-hud" }, meter, objective),
    h("div", { class: "scene-actions" }, attemptBtn, leaveBtn),
    h("div", { class: "dialog-box" },
      log,
      h("div", { class: "dialog-input" }, input, sendBtn),
    ),
  );
  mount(scene);

  if (level.intro) log.appendChild(systemMessage(level.intro));

  // Conversation state (re-read fresh on each turn so settings changes pick up)
  function buildSystemPrompt() {
    return fillSystemPrompt(systemTemplate, {
      character,
      level,
      characterState: getCharacterState(character.id),
      state: getState(),
    });
  }

  function appendMessage(role, text) {
    updateState((s) => { s.currentConversation.messages.push({ role, text }); });
    const who = role === "user" ? (getState().settings.playerName || "You") : character.displayName;
    log.appendChild(dialogMessage(who, text, role === "user" ? "player" : "character"));
    log.scrollTop = log.scrollHeight;
  }

  function refreshMeter() {
    const a = getCharacterState(character.id).affection;
    const fill = meter.querySelector(".fill");
    const value = meter.querySelector(".value");
    if (fill) fill.style.width = `${a}%`;
    if (value) value.textContent = `${a} / 100`;
  }

  function setMood(mood) {
    const fresh = spriteFor(character, mood ?? "neutral");
    sprite.replaceWith(fresh);
    sprite = fresh;
  }

  async function turn(playerText, { isObjectiveAttempt = false } = {}) {
    sendBtn.disabled = true;
    attemptBtn.disabled = true;
    input.disabled = true;
    appendMessage("user", playerText);

    const thinkingNode = systemMessage(`${character.displayName} is thinking…`);
    log.appendChild(thinkingNode);

    try {
      const live = getState();
      const history = live.currentConversation.messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        text: m.text,
      }));
      // history already includes the just-appended user message.

      const systemPrompt = buildSystemPrompt() + (isObjectiveAttempt
        ? `\n\n[The player is now making their move toward the objective: ${level.objective?.label}. ` +
          `Threshold: ${level.objective?.threshold}. ` +
          `If current affection (${getCharacterState(character.id).affection}) meets or exceeds the threshold and ` +
          `they ask in character, agree warmly. Otherwise gracefully deflect or refuse — do not break character. ` +
          `If you agree, include the literal token <<OBJECTIVE_MET>> at the very end of your reply.]`
        : "");

      const reply = await chat({
        apiKey: live.byok.apiKey,
        model: live.byok.model,
        system: systemPrompt,
        messages: history,
        temperature: live.settings.temperature,
      });
      thinkingNode.remove();

      const cleanReply = reply.replace("<<OBJECTIVE_MET>>", "").trim();
      const success = isObjectiveAttempt && reply.includes("<<OBJECTIVE_MET>>");
      appendMessage("model", cleanReply);

      // Score the exchange.
      let score;
      try {
        score = await judgeExchange({
          character, level,
          playerText, replyText: cleanReply,
          currentAffection: getCharacterState(character.id).affection,
        });
      } catch (err) {
        console.warn("judge failed", err);
        score = { affection_delta: 0, mood: "neutral" };
      }

      if (score.affection_delta) adjustAffection(character.id, score.affection_delta);
      if (isObjectiveAttempt && !success) adjustAffection(character.id, -OBJECTIVE_FAIL_PENALTY);
      refreshMeter();
      setMood(score.mood);

      if (success) {
        log.appendChild(systemMessage(`✨ Objective achieved! Returning to level select…`));
        completeLevel(level);
        setTimeout(() => renderLevelSelect(), 2200);
        return;
      }
    } catch (err) {
      thinkingNode.remove();
      log.appendChild(systemMessage(`Error: ${err.message}`));
      log.scrollTop = log.scrollHeight;
    } finally {
      sendBtn.disabled = false;
      attemptBtn.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener("click", () => {
    const v = input.value.trim();
    if (!v) return;
    input.value = "";
    turn(v);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });
  attemptBtn.addEventListener("click", () => {
    const v = input.value.trim() || `[Makes their move toward: ${level.objective?.label}]`;
    input.value = "";
    turn(v, { isObjectiveAttempt: true });
  });
  leaveBtn.addEventListener("click", () => {
    if (!confirm("Leave this level? Progress in this conversation will be lost (affection so far is kept).")) return;
    updateState((s) => { s.currentConversation = { levelId: null, messages: [] }; s.currentLevel = null; });
    renderLevelSelect();
  });

  input.focus();
}

// ============================================================
// Boot
// ============================================================
renderTitle();
