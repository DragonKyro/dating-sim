// Modals: API key onboarding, the player's name, and the settings panel
// (models, text speed, motion, cloud saves, reset).

import { getState, updateState, resetProgress } from "./state.js";
import { validateKey, PINNABLE_MODELS } from "./llm.js";
import { getCloudStatus, onCloudStatus, signIn, signOut, flushCloud } from "./cloud.js";
import { h, showModal, confirmDialog, toast, formatDate } from "./ui.js";

export function applyMotionSetting() {
  document.documentElement.classList.toggle("reduce-motion", !!getState().settings.reduceMotion);
}

// ---- API key -------------------------------------------------------------------------

export function openKeySetup({ onSaved, required = false } = {}) {
  const state = getState();
  const keyInput = h("input", { type: "password", placeholder: "AIza…", value: state.byok.apiKey || "", autocomplete: "off", spellcheck: "false" });
  const status = h("div", { class: "status-line" });
  const saveBtn = h("button", { class: "btn" }, "Save & continue");
  let modal;

  async function save() {
    const key = keyInput.value.trim();
    if (!key) { status.className = "status-line err"; status.textContent = "Paste your key first."; return; }
    saveBtn.disabled = true;
    status.className = "status-line"; status.textContent = "Checking with Google…";
    const res = await validateKey(key);
    saveBtn.disabled = false;
    if (!res.ok) { status.className = "status-line err"; status.textContent = res.error; return; }
    updateState((s) => { s.byok.apiKey = key; }, { touch: false });
    modal.close();
    toast("Key saved. It stays in this browser.", { icon: "🔑" });
    onSaved?.();
  }
  saveBtn.addEventListener("click", save);
  keyInput.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });

  modal = showModal(h("div", {},
    h("h2", {}, "One thing before the ferry"),
    h("p", {}, "The people of Saltwick are played by Google's Gemini. You'll need your own free API key — it takes about a minute, and it never leaves your browser except to talk to Google."),
    h("ol", {},
      h("li", {}, h("a", { href: "https://aistudio.google.com/apikey", target: "_blank", rel: "noopener" }, "Open Google AI Studio"), " and sign in with any Google account."),
      h("li", {}, "Click ", h("strong", {}, "Create API key"), " and copy it (it starts with ", h("code", {}, "AIza"), ")."),
      h("li", {}, "Paste it here."),
    ),
    h("div", { class: "field" }, h("label", {}, "Gemini API key"), keyInput,
      h("div", { class: "hint" }, "Stored only in this browser's localStorage. Never synced to the cloud. The free tier is plenty for casual play.")),
    status,
    h("div", { class: "btn-row end" },
      required ? null : h("button", { class: "btn ghost", onclick: () => modal.close() }, "Cancel"),
      saveBtn),
  ), { dismissable: !required });
  return modal;
}

// ---- name ------------------------------------------------------------------------------

export function openNamePrompt({ onDone } = {}) {
  const s = getState().settings;
  const name = h("input", { type: "text", maxlength: "24", placeholder: "Your name", value: s.playerName || "" });
  let pronouns = s.pronouns || "they";
  const seg = pronounPicker(pronouns, (v) => { pronouns = v; });
  let modal;
  const done = () => {
    updateState((st) => { st.settings.playerName = name.value.trim(); st.settings.pronouns = pronouns; });
    modal.close();
    onDone?.();
  };
  name.addEventListener("keydown", (e) => { if (e.key === "Enter") done(); });
  modal = showModal(h("div", {},
    h("div", { class: "flavor note" }, h("span", { class: "from" }, "Taped to the ferry ticket"),
      "Darling — the island will want to know what to call you. Everyone knows everyone here, so pick something you like. — Bea"),
    h("div", { class: "field" }, h("label", {}, "What should people call you?"), name),
    h("div", { class: "field" }, h("label", {}, "How should they refer to you?"), seg),
    h("div", { class: "btn-row end" }, h("button", { class: "btn", onclick: done }, "Board the ferry")),
  ), { dismissable: false });
}

function pronounPicker(current, onChange) {
  const opts = [["he", "he/him"], ["she", "she/her"], ["they", "they/them"]];
  const seg = h("div", { class: "seg" });
  for (const [v, label] of opts) {
    const b = h("button", { class: v === current ? "on" : "", type: "button" }, label);
    b.addEventListener("click", () => { seg.querySelectorAll("button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); onChange(v); });
    seg.appendChild(b);
  }
  return seg;
}

// ---- cloud -----------------------------------------------------------------------------

export function cloudChip({ onClick } = {}) {
  const chip = h("button", { class: "chip", type: "button", title: "Cloud saves" });
  const render = (st) => {
    const dot = st.status === "synced" ? "ok" : st.status === "syncing" || st.status === "connecting" ? "busy" : st.status === "error" ? "err" : "";
    const label = st.status === "off" ? "Local save · sign in to sync"
      : st.status === "connecting" ? "Connecting…"
      : st.status === "syncing" ? "Syncing…"
      : st.status === "error" ? "Sync problem"
      : `Synced${st.user?.name ? ` · ${st.user.name.split(" ")[0]}` : ""}`;
    chip.replaceChildren(h("span", { class: `dot ${dot}` }), label);
  };
  render(getCloudStatus());
  const stop = onCloudStatus(render);
  chip.addEventListener("click", () => onClick ? onClick() : openSettings({ section: "cloud" }));
  chip._stop = stop;
  return chip;
}

function cloudSection() {
  const box = h("div");
  const render = () => {
    const st = getCloudStatus();
    const lastSynced = getState().cloud.lastSyncedAt;
    if (st.user) {
      box.replaceChildren(
        h("div", { class: "account" },
          st.user.photo ? h("img", { src: st.user.photo, alt: "", referrerpolicy: "no-referrer" }) : null,
          h("div", {}, h("strong", {}, st.user.name ?? "Signed in"), h("div", { class: "muted small" }, st.user.email ?? "")),
        ),
        h("p", { class: "small muted" }, `Progress syncs automatically. Last synced ${formatDate(lastSynced)}.`, st.error ? ` (${st.error})` : ""),
        h("div", { class: "btn-row" },
          h("button", { class: "btn ghost small", onclick: async () => { await flushCloud(); toast("Synced."); render(); } }, "Sync now"),
          h("button", { class: "btn ghost small", onclick: async () => { await signOut(); toast("Signed out. Your progress stays on this device."); render(); } }, "Sign out"),
        ),
      );
    } else {
      const btn = h("button", { class: "btn small" }, "Sign in with Google");
      const err = h("div", { class: "status-line err" });
      btn.addEventListener("click", async () => {
        btn.disabled = true; err.textContent = "";
        try { await signIn(); toast("Cloud saves on.", { icon: "☁️" }); }
        catch (e) { err.textContent = e.message; }
        btn.disabled = false;
        render();
      });
      box.replaceChildren(
        h("p", { class: "small muted" }, "Optional. Sign in to back up your progress and pick it up on another device. Your API key is never uploaded."),
        btn, err,
      );
    }
  };
  render();
  return box;
}

// ---- settings --------------------------------------------------------------------------

export function openSettings({ onClose, onReset, section } = {}) {
  const s = getState();
  const name = h("input", { type: "text", maxlength: "24", value: s.settings.playerName || "", placeholder: "Your name" });
  let pronouns = s.settings.pronouns || "they";
  const speed = h("select", {}, ...["slow", "normal", "fast", "instant"].map((v) => h("option", { value: v, selected: s.settings.textSpeed === v }, v[0].toUpperCase() + v.slice(1))));
  const motion = h("input", { type: "checkbox", checked: !!s.settings.reduceMotion });
  const temp = h("input", { type: "range", min: "0.4", max: "1.2", step: "0.05", value: String(s.settings.temperature ?? 0.9) });
  const modelSel = (current) => h("select", {},
    h("option", { value: "auto", selected: current === "auto" }, "Auto (best free model available)"),
    ...PINNABLE_MODELS.map((m) => h("option", { value: m, selected: current === m }, m)));
  const voice = modelSel(s.byok.voiceModel ?? "auto");
  const judge = modelSel(s.byok.judgeModel ?? "auto");
  const keyMask = s.byok.apiKey ? `${s.byok.apiKey.slice(0, 6)}…${s.byok.apiKey.slice(-4)}` : "not set";

  let modal;
  const save = () => {
    updateState((st) => {
      st.settings.playerName = name.value.trim();
      st.settings.pronouns = pronouns;
      st.settings.textSpeed = speed.value;
      st.settings.reduceMotion = motion.checked;
      st.settings.temperature = Number(temp.value);
    });
    updateState((st) => { st.byok.voiceModel = voice.value; st.byok.judgeModel = judge.value; }, { touch: false });
    applyMotionSetting();
    modal.close();
    onClose?.();
  };

  const cloud = cloudSection();
  modal = showModal(h("div", {},
    h("h2", {}, "Settings"),
    h("div", { class: "row2" },
      h("div", { class: "field" }, h("label", {}, "Your name"), name),
      h("div", { class: "field" }, h("label", {}, "Text speed"), speed),
    ),
    h("div", { class: "field" }, h("label", {}, "Pronouns"), pronounPicker(pronouns, (v) => { pronouns = v; })),
    h("label", { class: "toggle" }, motion, "Reduce motion (stops ambient animation)"),

    h("h3", {}, "Cloud saves"),
    cloud,

    h("h3", {}, "Gemini"),
    h("div", { class: "account" }, h("span", {}, "🔑"), h("div", { style: { flex: 1 } }, h("strong", {}, "API key"), h("div", { class: "muted small" }, keyMask)),
      h("button", { class: "btn ghost small", onclick: () => { modal.close(); openKeySetup({ onSaved: () => openSettings({ onClose, onReset }) }); } }, "Change")),
    h("div", { class: "row2" },
      h("div", { class: "field" }, h("label", {}, "Character voice model"), voice),
      h("div", { class: "field" }, h("label", {}, "Scoring model"), judge),
    ),
    h("div", { class: "field" }, h("label", {}, "Character creativity"), temp, h("div", { class: "hint" }, "Lower is steadier, higher is more surprising.")),

    h("h3", {}, "Progress"),
    h("div", { class: "btn-row" },
      h("button", { class: "btn danger small", onclick: async () => {
        const ok = await confirmDialog({ title: "Start the summer over?", body: "This erases every scene, memory and ending on this device (and in the cloud, if you're signed in). Your key and settings stay.", ok: "Erase progress", danger: true });
        if (!ok) return;
        resetProgress();
        modal.close();
        toast("A fresh summer.");
        onReset?.();
      } }, "Reset progress"),
      h("a", { href: "CREDITS.md", target: "_blank", class: "small" }, "Credits"),
    ),
    h("div", { class: "btn-row end" }, h("button", { class: "btn ghost", onclick: () => modal.close() }, "Cancel"), h("button", { class: "btn", onclick: save }, "Save")),
  ), { wide: true });
  if (section === "cloud") requestAnimationFrame(() => cloud.scrollIntoView({ block: "center" }));
  return modal;
}
