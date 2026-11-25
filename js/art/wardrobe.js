// Body shapes, hairstyles, outfits and accessories for the character rig
// (character.js). Everything shares the rig's 500x800 space: face x 166–334,
// skull top y≈112, chin y≈334, shoulders y≈390, frame bottom y=800.
//
// Each part is a function of ctx = { p (palette), look, ids, colors }.

import { shade, tint, rng } from "./kit.js";

const LINE_W = 2.4;

/** Mirror an absolute-coordinate path (M/L/C/Q only) across x=250. */
export function mirrorPath(d) {
  let i = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, (n) => (i++ % 2 === 0 ? String(500 - parseFloat(n)) : n));
}

// ---- body ------------------------------------------------------------------------
// Torso runs from the left side of the neck, around, to the right side, so
// different necklines can close it.
const TORSO_OPEN = "M224 362 C198 370 162 378 140 390 C124 398 116 410 114 426 L150 470 C156 540 166 600 170 650 C172 700 162 760 158 800 L342 800 C338 760 328 700 330 650 C334 600 344 540 350 470 L386 426 C384 410 376 398 360 390 C338 378 302 370 276 362";
export const TORSO = `${TORSO_OPEN} Z`;
export const TEE = `${TORSO_OPEN} Q250 394 224 362Z`;
export const ARM_L = "M140 390 C116 400 104 424 102 462 C98 560 92 680 94 800 L138 800 C138 700 142 600 150 520 C153 494 152 474 148 458 C146 430 150 404 140 390Z";
export const ARM_R = mirrorPath(ARM_L);
export const NECK = "M226 296 L224 372 Q250 386 276 372 L274 296Z";

/** Front opening of a cardigan / coat (where the inner layer shows). */
const OPENING = "M222 366 Q214 420 206 470 L200 800 L300 800 L294 470 Q286 420 278 366Z";

/** Main hair mass + the soft shadow it casts on the forehead (clipped to the face). */
function hairMass(ctx, d) {
  const { p, ids } = ctx;
  const id = `${ids.clip}hm`;
  return `<defs><path id="${id}" d="${d}"/></defs>
    <g clip-path="url(#${ids.face})"><use href="#${id}" transform="translate(0 10)" fill="${p.skinShade}" opacity=".55"/></g>
    <use href="#${id}" fill="${p.hair}" stroke="${p.hairLine}" stroke-width="${LINE_W}" stroke-linejoin="round"/>`;
}

function filled(d, fill, line, extra = "") {
  return `<path d="${d}" fill="${fill}" stroke="${line}" stroke-width="${LINE_W}" stroke-linejoin="round" ${extra}/>`;
}

function stripes(clipId, color, { y0 = 392, gap = 30, h = 11 } = {}) {
  let s = "";
  for (let y = y0; y < 800; y += gap) s += `<rect x="60" y="${y}" width="380" height="${h}" fill="${color}"/>`;
  return `<g clip-path="url(#${clipId})">${s}</g>`;
}

/** Both sleeves. len: "long" | y-coordinate where a short sleeve ends. */
function sleeves(ids, fill, line, { len = "long", cuff = null, pattern = null } = {}) {
  const clipId = `${ids.clip}sl${Math.round(Math.random() * 1e6)}`;
  const shortClip = len === "long" ? "" : `<clipPath id="${clipId}"><rect x="0" y="0" width="500" height="${len}"/></clipPath>`;
  const attr = len === "long" ? "" : `clip-path="url(#${clipId})"`;
  let out = shortClip;
  for (const arm of [ARM_L, ARM_R]) {
    out += `<g ${attr}>${filled(arm, fill, line)}${pattern ? pattern(arm) : ""}</g>`;
  }
  if (cuff && len !== "long") {
    out += `<path d="M100 ${len - 12} Q124 ${len - 2} 151 ${len - 10} L151 ${len + 6} Q124 ${len + 14} 98 ${len + 4}Z" fill="${cuff}" stroke="${line}" stroke-width="${LINE_W}"/>`;
    out += `<path d="${mirrorPath(`M100 ${len - 12} Q124 ${len - 2} 151 ${len - 10} L151 ${len + 6} Q124 ${len + 14} 98 ${len + 4}Z`)}" fill="${cuff}" stroke="${line}" stroke-width="${LINE_W}"/>`;
  }
  return out;
}

export function bodyBase(p) {
  return `
    ${filled(NECK, p.skin, p.skinLine)}
    <path d="M225 318 Q250 352 275 318 L275 342 Q250 366 225 342Z" fill="${p.skinShade}" opacity=".75"/>
    ${filled(TORSO, p.skin, p.skinLine)}
    ${filled(ARM_L, p.skin, p.skinLine)}
    ${filled(ARM_R, p.skin, p.skinLine)}`;
}

// ===================================================================== HAIR

export const HAIR = {
  /** Rosie: one big puffy curly bun on the crown, curly fringe, loose tendrils. */
  curlyBun: {
    back: ({ p }) => {
      const c = p.hair, s = p.hairShade, l = p.hairLine;
      let rim = "";
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        rim += `<circle cx="${(250 + Math.cos(a) * 44).toFixed(1)}" cy="${(80 + Math.sin(a) * 38).toFixed(1)}" r="${i % 2 ? 15 : 13}" fill="${c}" stroke="${l}" stroke-width="2"/>`;
      }
      return `
        <path d="M160 252 C150 180 190 120 250 118 C310 120 350 180 340 252 C330 292 300 304 250 304 C200 304 170 292 160 252Z" fill="${s}"/>
        ${rim}
        <ellipse cx="250" cy="80" rx="46" ry="40" fill="${c}"/>
        <path d="M222 74 q10 -14 24 -6 M256 64 q14 -8 24 4 M236 96 q12 -8 22 2 M270 92 q8 -10 18 -2" fill="none" stroke="${s}" stroke-width="3" stroke-linecap="round"/>
        <path d="M226 58 q16 -12 34 -8" fill="none" stroke="${p.hairShine}" stroke-width="4" stroke-linecap="round" opacity=".5"/>
        <path d="M206 54 q-12 -10 -6 -22 q6 -6 12 0 M296 52 q12 -12 4 -22" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
    },
    front: (ctx) => {
      const { p, ids } = ctx;
      const c = p.hair, s = p.hairShade, l = p.hairLine;
      const tendril = (d) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${l}" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>`;
      return `
        ${hairMass(ctx, "M160 252 C150 190 175 106 250 100 C325 106 350 190 340 252 Q336 222 326 206 q-6 -18 -22 -16 q-8 -16 -26 -10 q-10 -14 -28 -6 q-14 -10 -28 2 q-18 -6 -26 12 q-14 0 -20 20 Q166 224 160 252Z")}
        <path d="M206 184 q4 -14 16 -14 M300 182 q-2 -14 -14 -14 M176 196 q-4 -14 6 -22 M322 194 q6 -14 -4 -22 M250 170 q-2 -12 10 -16" fill="none" stroke="${s}" stroke-width="3" stroke-linecap="round"/>
        <path d="M194 128 Q250 108 306 128" fill="none" stroke="url(#${ids.shine})" stroke-width="10" stroke-linecap="round" opacity=".5"/>
        ${tendril("M172 208 C158 238 184 262 166 292 q-7 12 5 20")}
        ${tendril("M328 208 C344 238 316 262 334 292 q7 12 -5 20")}`;
    },
  },

  /** Noor: black chin-length blunt bob with straight-across bangs. */
  bob: {
    back: ({ p }) => `
      <path d="M144 330 C138 270 136 200 148 160 C166 106 210 90 250 90 C290 90 334 106 352 160 C364 200 362 270 356 330 Q354 344 340 342 L160 342 Q146 344 144 330Z" fill="${p.hair}" stroke="${p.hairLine}" stroke-width="${LINE_W}"/>
      <path d="M176 300 L176 340 L324 340 L324 300 Q250 330 176 300Z" fill="${p.hairShade}"/>`,
    front: (ctx) => {
      const { p, ids } = ctx;
      const c = p.hair, s = p.hairShade, l = p.hairLine;
      return `
        ${hairMass(ctx, "M148 300 C142 240 144 180 158 148 C176 106 212 94 250 94 C288 94 324 106 342 148 C356 180 358 240 352 300 L354 340 L326 338 C330 300 332 262 329 226 L334 196 L310 198 L304 192 L276 196 L270 191 L240 196 L232 191 L204 196 L198 192 L166 196 L171 226 C168 262 170 300 174 338 L146 340Z")}
        <path d="M200 120 L196 188 M232 108 L230 186 M268 108 L270 186 M300 118 L304 188 M160 220 L160 330 M340 220 L340 330" stroke="${s}" stroke-width="2.4" opacity=".8"/>
        <path d="M186 132 Q250 108 314 132" fill="none" stroke="url(#${ids.shine})" stroke-width="9" stroke-linecap="round" opacity=".5"/>`;
    },
  },

  /** Tamsin: short natural coils with a rounded silhouette. */
  coils: {
    back: ({ p }) => {
      const r = rng(5);
      let bumps = "";
      for (let i = 0; i <= 22; i++) {
        const a = Math.PI * (1.02 + (i / 22) * 0.96);
        const x = 250 + Math.cos(a) * 104, y = 178 + Math.sin(a) * 96;
        bumps += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(11 + r() * 5).toFixed(1)}" fill="${p.hair}" stroke="${p.hairLine}" stroke-width="2"/>`;
      }
      return `${bumps}<path d="M150 252 C132 170 170 84 250 80 C330 84 368 170 350 252 C346 272 334 280 328 270 L172 270 C166 280 154 272 150 252Z" fill="${p.hair}"/>`;
    },
    front: (ctx) => {
      const { p, ids } = ctx;
      const r = rng(8);
      let tex = "";
      for (let i = 0; i < 34; i++) {
        const a = Math.PI * (1.08 + r() * 0.84), rad = 34 + r() * 66;
        const x = 250 + Math.cos(a) * rad * 1.05, y = 182 + Math.sin(a) * rad;
        if (y > 172) continue;
        tex += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q4 -4 8 0" fill="none" stroke="${i % 4 ? p.hairShade : p.hairShine}" stroke-width="1.8" stroke-linecap="round" opacity="${i % 4 ? 0.8 : 0.35}"/>`;
      }
      let edge = "";
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, x = 172 + t * 156;
        const y = 196 - Math.sin(t * Math.PI) * 24;
        edge += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(7 + (i % 3)).toFixed(0)}" fill="${p.hair}"/>`;
      }
      return `
        ${hairMass(ctx, "M156 232 C146 160 186 94 250 92 C314 94 354 160 344 232 C340 212 334 198 326 188 C300 172 276 168 250 170 C224 168 200 172 174 188 C166 198 160 212 156 232Z")}
        ${edge}${tex}
        <path d="M196 118 Q250 98 304 118" fill="none" stroke="url(#${ids.shine})" stroke-width="12" stroke-linecap="round" opacity=".3"/>`;
    },
  },

  /** Celeste: long honey waves, side part, front locks over the shoulders. */
  longWaves: {
    back: ({ p }) => `
      <path d="M156 200 C138 262 140 330 128 400 C116 470 136 530 120 604 C150 626 176 612 196 590 L304 590 C324 612 350 626 380 604 C364 530 384 470 372 400 C360 330 362 262 344 200 C330 128 290 96 250 96 C210 96 170 128 156 200Z" fill="${p.hairShade}" stroke="${p.hairLine}" stroke-width="${LINE_W}"/>`,
    front: (ctx) => {
      const { p, ids } = ctx;
      const c = p.hair, s = p.hairShade, l = p.hairLine, hi = p.hairShine;
      const LOCK_L = "M166 232 C156 300 176 352 152 414 C136 456 156 500 140 552 C164 534 180 494 182 450 C186 410 176 380 184 340 C190 300 182 270 186 242Z";
      const LOCK_R = "M318 276 C336 330 324 382 350 434 C368 472 350 512 364 560 C340 542 326 502 322 462 C318 420 330 390 322 350 C316 320 320 296 318 276Z";
      return `
        ${hairMass(ctx, "M160 262 C150 190 172 108 250 100 C328 108 350 190 340 262 C334 222 318 188 290 178 C262 172 242 180 228 168 C214 186 190 198 176 216 C168 230 162 246 160 262Z")}
        <path d="M228 166 C254 192 304 200 342 256 C338 206 312 168 258 152Z" fill="${c}" stroke="${l}" stroke-width="${LINE_W}" stroke-linejoin="round"/>
        <path d="M246 172 C272 192 306 204 330 236 M262 164 C290 178 318 196 336 226" fill="none" stroke="${s}" stroke-width="2.4" stroke-linecap="round"/>
        ${filled(LOCK_L, c, l)}
        <path d="M174 262 C170 320 182 360 162 420 C152 450 160 490 150 524" fill="none" stroke="${s}" stroke-width="3" stroke-linecap="round"/>
        <path d="M178 290 C176 330 180 360 170 392" fill="none" stroke="${hi}" stroke-width="3" stroke-linecap="round" opacity=".6"/>
        ${filled(LOCK_R, c, l)}
        <path d="M324 300 C332 350 328 396 344 446 C352 476 346 506 352 532" fill="none" stroke="${s}" stroke-width="3" stroke-linecap="round"/>
        <path d="M322 330 C326 360 324 384 332 410" fill="none" stroke="${hi}" stroke-width="3" stroke-linecap="round" opacity=".6"/>
        <path d="M186 130 Q240 110 300 126" fill="none" stroke="url(#${ids.shine})" stroke-width="11" stroke-linecap="round" opacity=".6"/>`;
    },
  },
};

// ===================================================================== OUTFITS

export const OUTFITS = {
  /** Rosie: red-and-cream striped tee, sleeves rolled, cream bib apron. */
  apronTee: ({ colors, ids }) => {
    const shirt = colors.shirt ?? "#d9483b", stripe = colors.stripe ?? "#f6efe3", apron = colors.apron ?? "#f4ebd8";
    const line = shade(shirt, 0.45), aLine = shade(apron, 0.35);
    return `
      ${filled(TEE, shirt, line)}
      ${stripesOn(ids, [TEE], stripe, 800)}
      ${sleeves(ids, shirt, line, { len: 548 })}
      ${stripesOn(ids, [ARM_L, ARM_R], stripe, 536)}
      ${sleeves(ids, "none", line, { len: 548, cuff: shade(shirt, 0.08) })}
      <path d="M224 362 Q250 394 276 362" fill="none" stroke="${shade(shirt, 0.2)}" stroke-width="7"/>
      <path d="M186 436 Q196 394 228 372 M314 436 Q304 394 272 372" fill="none" stroke="${apron}" stroke-width="10" stroke-linecap="round"/>
      <path d="M184 432 L316 432 L326 606 L340 800 L160 800 L174 606Z" fill="${apron}" stroke="${aLine}" stroke-width="${LINE_W}" stroke-linejoin="round"/>
      <path d="M174 610 L326 610" stroke="${aLine}" stroke-width="2" opacity=".6"/>
      <path d="M172 612 L156 650 M328 612 L344 650" stroke="${apron}" stroke-width="8" stroke-linecap="round"/>
      <rect x="216" y="470" width="68" height="50" rx="10" fill="${shade(apron, 0.06)}" stroke="${aLine}" stroke-width="2"/>
      <text x="250" y="504" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-style="italic" fill="${shirt}">A</text>
      <path d="M204 664 q20 -8 30 4 M262 704 q14 -10 30 0" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".45"/>`;
  },

  /** Noor: mustard band tee under an oversized teal cardigan. */
  cardiganTee: ({ colors, ids }) => {
    const tee = colors.tee ?? "#d9a441", cardi = colors.cardigan ?? "#2f6f6c", band = tint(cardi, 0.2);
    const line = shade(cardi, 0.5);
    return `
      ${filled(TORSO, cardi, line)}
      ${filled(OPENING, tee, shade(tee, 0.45))}
      <path d="M224 362 Q250 392 276 362" fill="none" stroke="${shade(tee, 0.2)}" stroke-width="6"/>
      <circle cx="250" cy="560" r="36" fill="${shade(tee, 0.55)}"/><circle cx="250" cy="560" r="24" fill="none" stroke="${tee}" stroke-width="2" opacity=".5"/><circle cx="250" cy="560" r="8" fill="${tee}"/>
      <path d="M222 368 Q214 420 206 470 L200 800 M278 368 Q286 420 294 470 L300 800" fill="none" stroke="${band}" stroke-width="12"/>
      ${[520, 590, 660, 730].map((y) => `<circle cx="203" cy="${y}" r="5" fill="${tint(cardi, 0.5)}"/>`).join("")}
      ${sleeves(ids, cardi, line)}
      <path d="M106 520 L102 800 M394 520 L398 800" stroke="${shade(cardi, 0.18)}" stroke-width="2" opacity=".6"/>
      <path d="M95 760 Q116 770 138 762 M405 760 Q384 770 362 762" fill="none" stroke="${band}" stroke-width="8"/>
      <rect x="168" y="690" width="30" height="40" rx="5" fill="${shade(cardi, 0.12)}" stroke="${line}" stroke-width="2"/>`;
  },

  /** Tamsin: yellow rain slicker open over a navy cable-knit. */
  slicker: ({ colors, ids }) => {
    const coat = colors.coat ?? "#f2c230", knit = colors.knit ?? "#28365a";
    const line = shade(coat, 0.5), kLine = shade(knit, 0.45);
    let cable = "";
    for (let y = 404; y < 800; y += 22) cable += `<path d="M236 ${y} q8 11 0 22 M264 ${y} q-8 11 0 22" fill="none" stroke="${tint(knit, 0.25)}" stroke-width="3"/>`;
    return `
      ${filled(TORSO, coat, line)}
      <path d="M150 470 C156 540 166 600 170 650 C172 700 162 760 158 800 L186 800 C186 700 180 560 176 470Z" fill="${shade(coat, 0.12)}"/>
      <path d="${mirrorPath("M150 470 C156 540 166 600 170 650 C172 700 162 760 158 800 L186 800 C186 700 180 560 176 470Z")}" fill="${shade(coat, 0.12)}"/>
      ${filled(OPENING, knit, kLine)}
      ${cable}
      <path d="M218 350 Q250 372 282 350 L288 388 Q250 410 212 388Z" fill="${tint(knit, 0.1)}" stroke="${kLine}" stroke-width="${LINE_W}"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M${222 + i * 8} ${360 + Math.abs(i - 3.5) * 2} v26" stroke="${kLine}" stroke-width="1.6" opacity=".6"/>`).join("")}
      <path d="M222 368 Q214 420 206 470 L200 800 M278 368 Q286 420 294 470 L300 800" fill="none" stroke="${shade(coat, 0.2)}" stroke-width="6"/>
      <path d="M224 366 L166 392 L198 446 L224 404Z" fill="${shade(coat, 0.06)}" stroke="${line}" stroke-width="${LINE_W}" stroke-linejoin="round"/>
      <path d="M276 366 L334 392 L302 446 L276 404Z" fill="${shade(coat, 0.06)}" stroke="${line}" stroke-width="${LINE_W}" stroke-linejoin="round"/>
      ${[500, 570, 640, 710].map((y) => `<circle cx="194" cy="${y}" r="5" fill="${shade(coat, 0.35)}"/><circle cx="306" cy="${y}" r="5" fill="${shade(coat, 0.35)}"/>`).join("")}
      ${sleeves(ids, coat, line)}
      <path d="M96 740 Q116 752 138 744 M404 740 Q384 752 362 744" fill="none" stroke="${shade(coat, 0.25)}" stroke-width="3"/>`;
  },

  /** Celeste: Breton-striped boat-neck with a cream sweater tied on her shoulders. */
  breton: ({ p, colors, ids }) => {
    const base = colors.top ?? "#f7f4ee", stripe = colors.stripe ?? "#26355e", knit = colors.sweater ?? "#efe4cc";
    const line = shade(stripe, 0.3), kLine = shade(knit, 0.35);
    const BOAT = "M178 386 C162 386 150 388 140 392 C124 398 116 410 114 426 L150 470 C156 540 166 600 170 650 C172 700 162 760 158 800 L342 800 C338 760 328 700 330 650 C334 600 344 540 350 470 L386 426 C384 410 376 398 360 392 C350 388 338 386 322 386 Q250 410 178 386Z";
    return `
      <path d="M204 384 q16 -4 30 2 M296 384 q-16 -4 -30 2" fill="none" stroke="${p.skinShade}" stroke-width="2.2" stroke-linecap="round"/>
      ${filled(BOAT, base, line)}
      ${sleeves(ids, base, line)}
      ${stripesOn(ids, [BOAT, ARM_L, ARM_R], stripe, 800, { y0: 418 })}
      <path d="M216 390 Q250 428 284 390" fill="none" stroke="#d8b25a" stroke-width="1.6"/><circle cx="250" cy="410" r="4" fill="#e7c66d"/>
      <path d="M100 470 C104 414 150 388 214 384 L220 400 C168 406 134 426 128 472Z" fill="${knit}" stroke="${kLine}" stroke-width="${LINE_W}"/>
      <path d="${mirrorPath("M100 470 C104 414 150 388 214 384 L220 400 C168 406 134 426 128 472Z")}" fill="${knit}" stroke="${kLine}" stroke-width="${LINE_W}"/>
      <path d="M128 432 C170 444 210 452 240 460 L236 488 C200 478 160 468 122 458Z" fill="${knit}" stroke="${kLine}" stroke-width="${LINE_W}"/>
      <path d="${mirrorPath("M128 432 C170 444 210 452 240 460 L236 488 C200 478 160 468 122 458Z")}" fill="${knit}" stroke="${kLine}" stroke-width="${LINE_W}"/>
      <path d="M234 470 L222 556 L246 560 L252 480Z M266 470 L276 552 L254 560 L248 480Z" fill="${knit}" stroke="${kLine}" stroke-width="${LINE_W}" stroke-linejoin="round"/>
      <path d="M222 546 L246 550 M276 542 L254 550" stroke="${kLine}" stroke-width="4" opacity=".6"/>
      <ellipse cx="250" cy="472" rx="18" ry="15" fill="${tint(knit, 0.1)}" stroke="${kLine}" stroke-width="${LINE_W}"/>`;
  },

  /** Celeste (boathouse): paint-stained denim overalls over a white tee. */
  overalls: ({ colors, ids }) => {
    const tee = colors.tee ?? "#f4f1ea", denim = colors.denim ?? "#3f5f8e", dLine = shade(denim, 0.45), tLine = shade(tee, 0.4);
    const r = rng(14);
    let spots = "";
    for (let i = 0; i < 14; i++) spots += `<circle cx="${(180 + r() * 140).toFixed(0)}" cy="${(520 + r() * 260).toFixed(0)}" r="${(2 + r() * 5).toFixed(1)}" fill="${["#f2efe8", "#c9a25a", "#7a9cc6"][i % 3]}" opacity=".8"/>`;
    return `
      ${filled(TEE, tee, tLine)}
      ${sleeves(ids, tee, tLine, { len: 520, cuff: shade(tee, 0.06) })}
      <path d="M224 362 Q250 392 276 362" fill="none" stroke="${shade(tee, 0.12)}" stroke-width="6"/>
      <path d="M180 474 L320 474 L332 650 C334 700 340 760 342 800 L158 800 C160 760 166 700 168 650Z" fill="${denim}" stroke="${dLine}" stroke-width="${LINE_W}" stroke-linejoin="round"/>
      <path d="M184 478 L170 400 M316 478 L330 400" stroke="${denim}" stroke-width="16" stroke-linecap="round"/>
      <circle cx="186" cy="484" r="7" fill="#d6c08a" stroke="${dLine}" stroke-width="2"/><circle cx="314" cy="484" r="7" fill="#d6c08a" stroke="${dLine}" stroke-width="2"/>
      <rect x="216" y="512" width="68" height="56" rx="6" fill="${shade(denim, 0.1)}" stroke="${tint(denim, 0.3)}" stroke-width="2" stroke-dasharray="5 4"/>
      <path d="M170 640 L330 640" stroke="${tint(denim, 0.3)}" stroke-width="2" stroke-dasharray="5 4"/>
      ${spots}`;
  },
};

/** Horizontal stripes clipped to the union of several shapes (and above maxY). */
function stripesOn(ids, shapes, color, maxY, { y0 = 404, gap = 32, h = 12 } = {}) {
  const id = `${ids.clip}st${Math.round(Math.random() * 1e6)}`;
  return `<clipPath id="${id}">${shapes.map((d) => `<path d="${d}"/>`).join("")}</clipPath>
    <g clip-path="url(#${id})">${(() => { let s = ""; for (let y = y0; y < maxY - 4; y += gap) s += `<rect x="60" y="${y}" width="380" height="${Math.min(h, maxY - y)}" fill="${color}"/>`; return s; })()}</g>`;
}

// ===================================================================== EXTRAS
// body: drawn over the outfit; face: under the facial features; head: on top.

export const EXTRAS = {
  bandana: {
    head: ({ look }) => {
      const red = look.accent ?? "#d9483b";
      let dots = "";
      for (const [x, y] of [[178, 150], [204, 124], [232, 112], [262, 110], [292, 118], [318, 134], [334, 158]]) dots += `<circle cx="${x}" cy="${y}" r="3.2" fill="#fff" opacity=".9"/>`;
      return `
        <path d="M158 178 C166 108 334 108 342 178 L334 190 C324 126 176 126 166 190Z" fill="${red}" stroke="${shade(red, 0.45)}" stroke-width="${LINE_W}" stroke-linejoin="round"/>
        ${dots}
        <path d="M318 122 l26 -22 l6 26Z M322 128 l32 -4 l-14 22Z" fill="${shade(red, 0.08)}" stroke="${shade(red, 0.45)}" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="322" cy="126" r="7" fill="${shade(red, 0.15)}" stroke="${shade(red, 0.45)}" stroke-width="2"/>`;
    },
  },
  flour: {
    face: () => `<ellipse cx="302" cy="282" rx="11" ry="5" transform="rotate(-18 302 282)" fill="#fffaf0" opacity=".75"/><ellipse cx="312" cy="276" rx="4" ry="2.5" fill="#fffaf0" opacity=".6"/>`,
  },
  freckles: {
    face: ({ p }) => {
      const r = rng(21);
      let f = "";
      for (let i = 0; i < 16; i++) {
        const side = i % 2 ? 1 : -1;
        f += `<circle cx="${(250 + side * (22 + r() * 34)).toFixed(0)}" cy="${(262 + r() * 18).toFixed(0)}" r="${(1.2 + r()).toFixed(1)}" fill="${shade(p.skin, 0.35)}" opacity=".55"/>`;
      }
      return f;
    },
  },
  glasses: {
    head: ({ look }) => {
      const f = look.glasses ?? "#2a2224";
      return `
        <circle cx="208" cy="238" r="31" fill="#ffffff" fill-opacity=".06" stroke="${f}" stroke-width="4.5"/>
        <circle cx="292" cy="238" r="31" fill="#ffffff" fill-opacity=".06" stroke="${f}" stroke-width="4.5"/>
        <path d="M239 234 Q250 226 261 234" fill="none" stroke="${f}" stroke-width="4"/>
        <path d="M177 232 L166 228 M323 232 L334 228" stroke="${f}" stroke-width="4" stroke-linecap="round"/>
        <path d="M190 218 l14 -8 M274 218 l14 -8" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>`;
    },
  },
  headphones: {
    body: ({ look }) => {
      const c = look.headphones ?? "#33363d", ring = look.accent ?? "#3aa39b";
      return `
        <path d="M196 384 Q250 420 304 384" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round"/>
        <g transform="rotate(-24 200 384)"><ellipse cx="200" cy="384" rx="24" ry="31" fill="${c}"/><ellipse cx="200" cy="384" rx="15" ry="21" fill="${shade(c, 0.35)}"/><ellipse cx="200" cy="384" rx="24" ry="31" fill="none" stroke="${ring}" stroke-width="3"/></g>
        <g transform="rotate(24 300 384)"><ellipse cx="300" cy="384" rx="24" ry="31" fill="${c}"/><ellipse cx="300" cy="384" rx="15" ry="21" fill="${shade(c, 0.35)}"/><ellipse cx="300" cy="384" rx="24" ry="31" fill="none" stroke="${ring}" stroke-width="3"/></g>`;
    },
  },
  hoops: {
    head: () => `<circle cx="162" cy="270" r="9" fill="none" stroke="#e3b64f" stroke-width="3"/><circle cx="338" cy="270" r="9" fill="none" stroke="#e3b64f" stroke-width="3"/>`,
  },
  binoculars: {
    body: () => `
      <path d="M232 380 L238 548 M268 380 L262 548" stroke="#5a3e2b" stroke-width="5" stroke-linecap="round"/>
      <rect x="218" y="540" width="30" height="74" rx="10" fill="#24272c" stroke="#111" stroke-width="2"/>
      <rect x="252" y="540" width="30" height="74" rx="10" fill="#24272c" stroke="#111" stroke-width="2"/>
      <rect x="244" y="556" width="12" height="26" rx="4" fill="#3a3e45"/>
      <ellipse cx="233" cy="610" rx="12" ry="5" fill="#5b8fb0" opacity=".8"/><ellipse cx="267" cy="610" rx="12" ry="5" fill="#5b8fb0" opacity=".8"/>
      <path d="M224 552 v40 M258 552 v40" stroke="#4a4f57" stroke-width="3" stroke-linecap="round"/>`,
  },
  sunglasses: {
    head: () => `
      <path d="M190 130 Q216 118 240 128 Q238 148 214 148 Q192 146 190 130Z" fill="#2b2b33" stroke="#c9a24f" stroke-width="2.6"/>
      <path d="M310 130 Q284 118 260 128 Q262 148 286 148 Q308 146 310 130Z" fill="#2b2b33" stroke="#c9a24f" stroke-width="2.6"/>
      <path d="M240 130 Q250 124 260 130" fill="none" stroke="#c9a24f" stroke-width="2.6"/>
      <path d="M198 132 l12 -6 M268 130 l12 -6" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`,
  },
  pearls: {
    head: () => `<circle cx="336" cy="266" r="5" fill="#f6f1e6" stroke="#cdbfa6" stroke-width="1.4"/><circle cx="334.5" cy="264.5" r="1.6" fill="#fff"/>`,
  },
};
