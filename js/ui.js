// Small DOM toolkit: element builder, screen mounting, modals, toasts and a
// typewriter. Pure presentation — no game state, no network.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") {
      for (const [sk, sv] of Object.entries(v)) {
        if (sv === null || sv === undefined) continue;
        if (sk.startsWith("--")) el.style.setProperty(sk, sv); else el.style[sk] = sv;
      }
    }
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  return el;
}

let cleanup = [];
/** Replace the current screen. `onLeave` callbacks registered via onUnmount run first. */
export function mount(node) {
  for (const fn of cleanup) { try { fn(); } catch (e) { console.error(e); } }
  cleanup = [];
  const app = document.getElementById("app");
  app.replaceChildren(node);
  node.classList.add("screen-enter");
  return node;
}
export function onUnmount(fn) { cleanup.push(fn); }

export function showModal(content, { dismissable = true, wide = false, onClose } = {}) {
  const modal = h("div", { class: `modal${wide ? " wide" : ""}`, role: "dialog", "aria-modal": "true" }, content);
  const backdrop = h("div", { class: "modal-backdrop" }, modal);
  const close = () => { backdrop.remove(); document.removeEventListener("keydown", onKey); onClose?.(); };
  const onKey = (e) => { if (e.key === "Escape" && dismissable) close(); };
  if (dismissable) backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => modal.querySelector("input, button")?.focus());
  return { close, el: modal };
}

/** Promise-based confirm in the game's style. */
export function confirmDialog({ title, body, ok = "OK", cancel = "Cancel", danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; m.close(); resolve(v); };
    const m = showModal(h("div", {},
      h("h2", {}, title),
      body ? h("p", {}, body) : null,
      h("div", { class: "btn-row end" },
        h("button", { class: "btn ghost", onclick: () => finish(false) }, cancel),
        h("button", { class: `btn${danger ? " danger" : ""}`, onclick: () => finish(true) }, ok),
      ),
    ), { onClose: () => finish(false) });
  });
}

/** Choice between two saves etc. Resolves to the chosen value. */
export function choiceDialog({ title, body, choices }) {
  return new Promise((resolve) => {
    const m = showModal(h("div", {},
      h("h2", {}, title),
      body ? h("p", {}, body) : null,
      h("div", { class: "choice-list" }, choices.map((c) =>
        h("button", { class: "choice", onclick: () => { m.close(); resolve(c.value); } },
          h("strong", {}, c.label), c.detail ? h("span", { class: "muted small" }, c.detail) : null),
      )),
    ), { dismissable: false });
  });
}

let toastHost = null;
export function toast(text, { kind = "info", icon = "", ms = 3600 } = {}) {
  if (!toastHost) { toastHost = h("div", { class: "toast-host", "aria-live": "polite" }); document.body.appendChild(toastHost); }
  const t = h("div", { class: `toast ${kind}` }, icon ? h("span", { class: "toast-icon" }, icon) : null, h("span", {}, text));
  toastHost.appendChild(t);
  setTimeout(() => t.classList.add("out"), ms);
  setTimeout(() => t.remove(), ms + 400);
}

const SPEEDS = { slow: 38, normal: 22, fast: 10, instant: 0 };

/**
 * Type text into `el`. *Actions* render as italic narration.
 * Returns { done: Promise, skip() }.
 */
export function typewrite(el, text, speed = "normal", { onTick } = {}) {
  const segments = splitActions(text);
  el.replaceChildren();
  const nodes = segments.map((s) => {
    const span = h("span", { class: s.action ? "act" : "say" });
    el.appendChild(span);
    return { span, text: s.text };
  });
  const delay = SPEEDS[speed] ?? SPEEDS.normal;
  let skip = () => {};
  const done = new Promise((resolve) => {
    if (!delay) { nodes.forEach((n) => (n.span.textContent = n.text)); resolve(); return; }
    let ni = 0, ci = 0, timer = null;
    const finish = () => { clearTimeout(timer); nodes.forEach((n) => (n.span.textContent = n.text)); resolve(); };
    skip = finish;
    const step = () => {
      if (ni >= nodes.length) return finish();
      const n = nodes[ni];
      ci++;
      n.span.textContent = n.text.slice(0, ci);
      onTick?.();
      if (ci >= n.text.length) { ni++; ci = 0; }
      const ch = n.text[ci - 1] ?? "";
      timer = setTimeout(step, /[.!?…]/.test(ch) ? delay * 7 : /[,;:—]/.test(ch) ? delay * 3 : delay);
    };
    step();
  });
  return { done, skip: () => skip() };
}

/** Split "*waves* Hi there *grins*" into action / speech segments. */
export function splitActions(text) {
  const out = [];
  const re = /\*([^*]+)\*/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ action: false, text: text.slice(last, m.index) });
    out.push({ action: true, text: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ action: false, text: text.slice(last) });
  return out.map((s) => ({ ...s, text: s.action ? s.text : s.text.replace(/\s+/g, " ") })).filter((s) => s.text.trim());
}

/** Render a line with *actions* as static (non-typed) markup. */
export function richLine(text) {
  return h("span", {}, splitActions(text).map((s) => h("span", { class: s.action ? "act" : "say" }, s.text)));
}

export function heartMeter({ value, threshold = null, floor = null, color }) {
  const fill = h("div", { class: "meter-fill", style: { width: `${value}%`, background: color ? `linear-gradient(90deg, ${color}, #ffd3c2)` : null } });
  const bar = h("div", { class: "meter-bar" }, fill,
    threshold != null ? h("div", { class: "meter-mark goal", style: { left: `${threshold}%` }, title: `Goal: ${threshold}` }) : null,
    floor != null ? h("div", { class: "meter-mark floor", style: { left: `${floor}%` }, title: `Don't drop below ${floor}` }) : null,
  );
  const num = h("span", { class: "meter-num" }, String(value));
  const el = h("div", { class: "meter" }, h("span", { class: "meter-heart", "aria-hidden": "true" }, "♥"), bar, num);
  return {
    el,
    set(v) {
      const prev = Number(num.textContent);
      fill.style.width = `${v}%`;
      num.textContent = String(v);
      el.classList.remove("up", "down");
      void el.offsetWidth;
      if (v > prev) el.classList.add("up"); else if (v < prev) el.classList.add("down");
    },
  };
}

export function formatDate(ms) {
  if (!ms) return "never";
  return new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
