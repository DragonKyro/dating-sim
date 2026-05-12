// Thin DOM helpers. Everything in here is pure presentation —
// no game state mutation, no API calls.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") el.innerHTML = v;
    else if (v !== null && v !== undefined && v !== false) el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

export function mount(node) {
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(node);
}

export function showModal(node) {
  const backdrop = h("div", { class: "modal-backdrop" }, h("div", { class: "modal" }, node));
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  return { close };
}

export function affectionBar(value, label = "Affection") {
  return h("div", { class: "affection-meter" },
    h("div", { class: "label" }, label),
    h("div", { class: "bar" }, h("div", { class: "fill", style: { width: `${value}%` } })),
    h("div", { class: "value" }, `${value} / 100`),
  );
}

export function objectiveCard(label) {
  return h("div", { class: "objective-card" },
    h("div", { class: "label" }, "Objective"),
    h("div", { class: "text" }, label),
  );
}

/**
 * Try to load a character sprite for the given expression.
 * Falls back to a placeholder box if the image doesn't exist.
 */
export function spriteFor(character, expression) {
  const src = `${character.spriteFolder}/${expression}.png`;
  const img = h("img", { src, alt: `${character.displayName} (${expression})` });
  const wrap = h("div", { class: "scene-sprite" }, img);
  img.addEventListener("error", () => {
    wrap.classList.add("missing");
    wrap.innerHTML = "";
    wrap.appendChild(document.createTextNode(`${character.displayName} sprite missing`));
  });
  return wrap;
}

export function dialogMessage(who, text, klass = "character") {
  return h("div", { class: `msg ${klass}` },
    h("span", { class: "who" }, `${who}:`),
    h("span", { class: "what" }, text),
  );
}

export function systemMessage(text) {
  return h("div", { class: "msg system" }, text);
}
