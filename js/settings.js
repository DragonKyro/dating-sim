// BYOK setup + in-game settings panel.

import { getState, updateState, resetState } from "./state.js";
import { validateKey } from "./llm.js";
import { h, showModal } from "./ui.js";

const MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (recommended)" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (slower, smarter)" },
];

export function openByokSetup({ onSaved } = {}) {
  const state = getState();
  const keyInput = h("input", { type: "password", placeholder: "AIza...", value: state.byok.apiKey || "" });
  const modelSelect = h("select", {},
    ...MODELS.map((m) => h("option", { value: m.id, selected: m.id === state.byok.model || null }, m.label)),
  );
  const status = h("div", { class: "small muted" }, " ");
  const testBtn = h("button", { class: "btn btn-secondary" }, "Test key");
  const saveBtn = h("button", { class: "btn" }, "Save");
  const cancelBtn = h("button", { class: "btn btn-secondary" }, "Close");

  testBtn.addEventListener("click", async () => {
    status.textContent = "Testing…";
    status.className = "small muted";
    const res = await validateKey({ apiKey: keyInput.value.trim(), model: modelSelect.value });
    if (res.ok) { status.textContent = "✓ Key works."; status.className = "small ok"; }
    else { status.textContent = `✗ ${res.error}`; status.className = "small error"; }
  });

  let modalRef = null;
  saveBtn.addEventListener("click", () => {
    const trimmed = keyInput.value.trim();
    if (!trimmed) { status.textContent = "Please paste a key first."; status.className = "small error"; return; }
    updateState((s) => { s.byok.apiKey = trimmed; s.byok.model = modelSelect.value; });
    modalRef?.close();
    onSaved?.();
  });
  cancelBtn.addEventListener("click", () => modalRef?.close());

  const body = h("div", {},
    h("h2", {}, "Set up your Gemini API key"),
    h("p", {}, "This game uses Google Gemini for the AI characters. The key is free and stays in your browser only."),
    h("ol", {},
      h("li", {}, h("a", { href: "https://aistudio.google.com/apikey", target: "_blank", rel: "noopener" }, "Open Google AI Studio"), " and sign in with any Google account."),
      h("li", {}, "Click ", h("strong", {}, "Get API key"), " → ", h("strong", {}, "Create API key"), "."),
      h("li", {}, "Copy the key (starts with ", h("code", {}, "AIza"), ")."),
      h("li", {}, "Paste it below and click Test → Save."),
    ),
    h("div", { class: "field" },
      h("label", {}, "API key"),
      keyInput,
      h("div", { class: "hint" }, "Stored only in your browser's localStorage. Never sent to anyone but Google."),
    ),
    h("div", { class: "field" },
      h("label", {}, "Model"),
      modelSelect,
    ),
    status,
    h("div", { class: "btn-row" }, testBtn, saveBtn, cancelBtn),
  );

  modalRef = showModal(body);
  return modalRef;
}

export function openSettings({ onClose, onReset } = {}) {
  const state = getState();

  const tempInput = h("input", { type: "range", min: "0", max: "1", step: "0.05", value: state.settings.temperature });
  const tempLabel = h("span", { class: "small muted" }, ` ${Number(state.settings.temperature).toFixed(2)}`);
  tempInput.addEventListener("input", () => { tempLabel.textContent = ` ${Number(tempInput.value).toFixed(2)}`; });

  const nameInput = h("input", { type: "text", placeholder: "Your name", value: state.settings.playerName || "" });

  const editKeyBtn = h("button", { class: "btn btn-secondary" }, "Change API key");
  const resetBtn = h("button", { class: "btn btn-danger" }, "Reset all progress");
  const saveBtn = h("button", { class: "btn" }, "Save");

  let modalRef = null;
  saveBtn.addEventListener("click", () => {
    updateState((s) => {
      s.settings.temperature = Number(tempInput.value);
      s.settings.playerName = nameInput.value.trim();
    });
    modalRef?.close();
    onClose?.();
  });
  editKeyBtn.addEventListener("click", () => {
    modalRef?.close();
    openByokSetup({ onSaved: onClose });
  });
  resetBtn.addEventListener("click", () => {
    if (!confirm("Wipe ALL progress (affection, completed levels, story flags)? This cannot be undone.")) return;
    const oldKey = state.byok.apiKey;
    const oldModel = state.byok.model;
    resetState();
    // Keep the API key so the user isn't forced to re-enter it.
    updateState((s) => { s.byok.apiKey = oldKey; s.byok.model = oldModel; });
    modalRef?.close();
    onReset?.();
  });

  const body = h("div", {},
    h("h2", {}, "Settings"),
    h("div", { class: "field" },
      h("label", {}, "Player name"),
      nameInput,
      h("div", { class: "hint" }, "What the characters call you. Optional."),
    ),
    h("div", { class: "field" },
      h("label", {}, "Character temperature ", tempLabel),
      tempInput,
      h("div", { class: "hint" }, "Higher = more chaotic/creative replies. Lower = more consistent."),
    ),
    h("div", { class: "btn-row" }, editKeyBtn, resetBtn, saveBtn),
  );

  modalRef = showModal(body);
  return modalRef;
}
