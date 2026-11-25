// Boot: wire the router, restore cloud saves, show one-time notices, title.

import { getState, updateState } from "./state.js";
import { initCloud } from "./cloud.js";
import { nav } from "./nav.js";
import { showTitle, showMap, showBriefing, showJournal } from "./screens.js";
import { playLevel } from "./play.js";
import { applyMotionSetting } from "./settings.js";
import { h, showModal, choiceDialog, formatDate } from "./ui.js";

Object.assign(nav, {
  title: showTitle,
  map: showMap,
  briefing: showBriefing,
  play: playLevel,
  journal: showJournal,
});

// Dev convenience: on localhost only, a gitignored secrets.local.json
// ({ "apiKey": "AIza..." }) pre-fills the key so you can skip onboarding.
async function loadDevSecrets() {
  if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  if (getState().byok.apiKey) return;
  try {
    const res = await fetch("secrets.local.json", { cache: "no-cache" });
    if (!res.ok) return;
    const { apiKey } = await res.json();
    if (typeof apiKey === "string" && apiKey) {
      updateState((s) => { s.byok.apiKey = apiKey; }, { touch: false });
      console.warn("[dev] API key loaded from secrets.local.json (keep it gitignored)");
    }
  } catch { /* not present: normal */ }
}

function describe(save) {
  return `${save.levels} scene${save.levels === 1 ? "" : "s"} complete · ${save.met} met · ${save.endings} ending${save.endings === 1 ? "" : "s"} · saved ${formatDate(save.updatedAt)}`;
}

function showNotices() {
  const notices = getState().notices ?? [];
  if (!notices.includes("v2-new-story")) return;
  updateState((s) => { s.notices = s.notices.filter((n) => n !== "v2-new-story"); }, { touch: false });
  const m = showModal(h("div", {},
    h("h2", {}, "Welcome back"),
    h("p", {}, "The game has been rebuilt from the ground up as Last Ferry — new story, new cast, new art. Your old progress belonged to a story that no longer exists, so it's been cleared. Your API key and name are still here."),
    h("div", { class: "btn-row end" }, h("button", { class: "btn", onclick: () => m.close() }, "Take me to the island")),
  ));
}

applyMotionSetting();
await loadDevSecrets();
initCloud({
  onConflict: (local, remote) => choiceDialog({
    title: "Two saves found",
    body: "This Google account already has a Last Ferry save, and this device has a different one. Which summer do you want to keep?",
    choices: [
      { value: "remote", label: "Keep the cloud save", detail: describe(remote) },
      { value: "local", label: "Keep this device's save", detail: describe(local) },
    ],
  }),
}).catch((err) => console.warn("[cloud]", err));
showTitle();
showNotices();
