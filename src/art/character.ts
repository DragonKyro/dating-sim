// Character rig: a waist-up SVG figure assembled from shared parts (face,
// parametric eyes/brows/mouth) plus a per-character hairstyle and outfit from
// wardrobe.ts. Expressions are parameter sets, so every character gets the
// full range in the same style. Life comes from idle breathing, blinking,
// mouth flaps while talking, and a small reaction move on each mood change.
//
//   const c = createCharacter(look, { expression: "happy" });
//   stage.append(c.el); c.setExpression("laugh"); c.talk(true);

import type { Look } from "@/game/types";
import { shade, tint, mix, uid } from "./kit";
import { HAIR, OUTFITS, EXTRAS, bodyBase, type WardrobeCtx } from "./wardrobe";

export const VIEW = { w: 500, h: 800 };
export const EYE = { y: 236, lx: 208, rx: 292, w: 50 };
const MOUTH = { x: 250, y: 301 };

export const EXPRESSIONS = ["neutral", "happy", "laugh", "flirty", "interested", "surprised", "flustered", "annoyed", "sad", "thinking"] as const;

export type Crop = "full" | "face" | "bust";
type Side = "l" | "r";
export type MouthKind = "rest" | "smile" | "laugh" | "smirk" | "parted" | "o" | "wavy" | "flat" | "frown" | "pursed" | "talkA" | "talkB" | "none";
type React = "hop" | "jolt" | "recoil" | "droop" | "jitter" | null;
interface EyeSpec { open?: number; lid?: "normal" | "flat" | "soft"; look?: [number, number]; closed?: "happy"; pupil?: number }
interface BrowSpec { raise?: number; tilt?: number; arch?: number; asym?: number }
interface ExprSpec { eye: EyeSpec; brow: BrowSpec; mouth: MouthKind; blush: number; tilt: number; react: React; sweat?: boolean }

/** Gradient/clip ids baked into one rendered figure. */
export interface RigIds { iris: string; blush: string; shine: string; clip: string; face: string }

/** Colors derived from a look so every part shares one lighting model. */
export interface CharPalette {
  skin: string; skinShade: string; skinLine: string; eye: string; lash: string; lips: string; blush: string;
  hair: string; hairShade: string; hairLine: string; hairShine: string;
}

// eye: open (0..1.3), lid (normal|flat|soft), look [x,y], closed (false|"happy"), pupil scale
// brow: raise (− = up), tilt (+ = angry / inner down, − = worried / inner up), arch, asym (extra raise on viewer-left brow)
const EXPR: Record<string, ExprSpec> = {
  neutral:    { eye: { open: 1 },                                   brow: { raise: 0, tilt: 0, arch: 2 },     mouth: "rest",     blush: 0.12, tilt: 0,  react: null },
  happy:      { eye: { open: 0.82, lid: "soft" },                   brow: { raise: -3, tilt: -1, arch: 4 },   mouth: "smile",    blush: 0.35, tilt: 2,  react: "hop" },
  laugh:      { eye: { closed: "happy" },                           brow: { raise: -6, tilt: -2, arch: 5 },   mouth: "laugh",    blush: 0.5,  tilt: -2, react: "jolt" },
  flirty:     { eye: { open: 0.62, lid: "soft", look: [5, 1] },      brow: { raise: -1, tilt: 1, asym: -7 },   mouth: "smirk",    blush: 0.55, tilt: 4,  react: null },
  interested: { eye: { open: 1.12, pupil: 1.1 },                    brow: { raise: -7, tilt: -1, arch: 4 },   mouth: "parted",   blush: 0.2,  tilt: -3, react: null },
  surprised:  { eye: { open: 1.28, pupil: 0.8 },                    brow: { raise: -13, tilt: 0, arch: 6 },   mouth: "o",        blush: 0.1,  tilt: 0,  react: "jolt" },
  flustered:  { eye: { open: 0.9, look: [-7, 4] },                  brow: { raise: -5, tilt: -5, arch: 2 },   mouth: "wavy",     blush: 1,    tilt: 3,  react: "jitter", sweat: true },
  annoyed:    { eye: { open: 0.62, lid: "flat", look: [3, 0] },     brow: { raise: 4, tilt: 6, arch: 0 },     mouth: "flat",     blush: 0,    tilt: -1, react: "recoil" },
  sad:        { eye: { open: 0.72, lid: "soft", look: [-2, 5] },    brow: { raise: -3, tilt: -6, arch: 1 },   mouth: "frown",    blush: 0.05, tilt: 2,  react: "droop" },
  thinking:   { eye: { open: 0.88, look: [7, -5] },                 brow: { raise: -2, tilt: 1, asym: -8 },   mouth: "pursed",   blush: 0.05, tilt: -4, react: null },
};

export function paletteFor(look: Look): CharPalette {
  const skin = look.skin;
  return {
    skin,
    skinShade: mix(skin, "#8a3f45", 0.22),
    skinLine: shade(mix(skin, "#6a2a2a", 0.3), 0.45),
    eye: look.eyes,
    lash: look.lash ?? shade(look.hair.color, 0.5),
    lips: look.lips ?? mix(skin, "#c2525a", 0.45),
    blush: look.blush ?? "#f07c7c",
    hair: look.hair.color,
    hairShade: shade(look.hair.color, 0.28),
    hairLine: shade(look.hair.color, 0.55),
    hairShine: tint(look.hair.color, 0.35),
  };
}

// ---- face parts --------------------------------------------------------------------

function eyeMarkup(side: Side, p: CharPalette, e: EyeSpec, ids: RigIds): string {
  const dir = side === "l" ? -1 : 1;              // outer corner direction
  const cx = side === "l" ? EYE.lx : EYE.rx, cy = EYE.y, w = EYE.w;
  const lineColor = p.lash;
  const outer = [cx + (dir * w) / 2, cy + 1];
  const inner = [cx - (dir * w) / 2, cy + 4];

  if (e.closed === "happy") {
    return `<path d="M${outer[0]} ${cy + 4} Q${cx} ${cy - 16} ${inner[0]} ${cy + 5}" fill="none" stroke="${lineColor}" stroke-width="4.6" stroke-linecap="round"/>
            <path d="M${outer[0] + dir * 1} ${cy + 4} l${dir * 7} 3" stroke="${lineColor}" stroke-width="3" stroke-linecap="round"/>`;
  }

  const h = 30 * (e.open ?? 1);
  let up1, up2;
  if (e.lid === "flat") {
    up1 = [cx + dir * w * 0.3, cy - h * 0.55];
    up2 = [cx - dir * w * 0.25, cy - h * 0.6];
  } else if (e.lid === "soft") {
    up1 = [cx + dir * w * 0.32, cy - h * 0.75];
    up2 = [cx - dir * w * 0.22, cy - h * 0.95];
  } else {
    up1 = [cx + dir * w * 0.3, cy - h * 0.95];
    up2 = [cx - dir * w * 0.25, cy - h * 0.88];
  }
  const lo1 = [cx - dir * w * 0.2, cy + h * 0.5 + 4];
  const lo2 = [cx + dir * w * 0.25, cy + h * 0.48 + 3];
  const upper = `M${outer} C${up1} ${up2} ${inner}`;
  const shape = `${upper} C${lo1} ${lo2} ${outer}Z`;
  const [lx, ly] = e.look ?? [0, 0];
  const ps = e.pupil ?? 1;
  const ix = cx + lx, iy = cy + 3 + ly;
  const clip = `${ids.clip}${side}`;
  return `
    <clipPath id="${clip}"><path d="${shape}"/></clipPath>
    <path d="${shape}" fill="#fbf7f2"/>
    <g clip-path="url(#${clip})">
      <ellipse cx="${ix}" cy="${iy}" rx="14" ry="17" fill="url(#${ids.iris})"/>
      <ellipse cx="${ix}" cy="${iy + 1}" rx="${6.5 * ps}" ry="${8.5 * ps}" fill="${shade(p.eye, 0.6)}"/>
      <ellipse cx="${ix}" cy="${iy}" rx="14" ry="17" fill="none" stroke="${shade(p.eye, 0.5)}" stroke-width="1.6"/>
      <circle cx="${ix + 5}" cy="${iy - 6}" r="4.6" fill="#fff"/>
      <circle cx="${ix - 5}" cy="${iy + 7}" r="2.1" fill="#fff" opacity=".85"/>
      <path d="${upper}" fill="none" stroke="${shade(p.skin, 0.25)}" stroke-width="7" opacity=".25"/>
    </g>
    <path d="${upper}" fill="none" stroke="${lineColor}" stroke-width="4.6" stroke-linecap="round"/>
    <path d="M${outer[0]} ${outer[1]} l${dir * 8} ${-6}" stroke="${lineColor}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M${lo1[0] - dir * 4} ${cy + h * 0.52 + 4} Q${cx} ${cy + h * 0.6 + 5} ${lo2[0] + dir * 6} ${cy + h * 0.44 + 3}" fill="none" stroke="${lineColor}" stroke-width="1.5" opacity=".45" stroke-linecap="round"/>
    <path d="M${outer[0] - dir * 4} ${cy - h * 0.7 - 6} Q${cx} ${cy - h * 1.05 - 8} ${inner[0] + dir * 6} ${cy - h * 0.72 - 4}" fill="none" stroke="${p.skinLine}" stroke-width="1.4" opacity=".35" stroke-linecap="round"/>`;
}

function blinkMarkup(side: Side, p: CharPalette): string {
  const dir = side === "l" ? -1 : 1;
  const cx = side === "l" ? EYE.lx : EYE.rx, cy = EYE.y + 2, w = EYE.w;
  return `<path d="M${cx + (dir * w) / 2} ${cy} Q${cx} ${cy + 7} ${cx - (dir * w) / 2} ${cy + 2}" fill="none" stroke="${p.lash}" stroke-width="4.4" stroke-linecap="round"/>
          <path d="M${cx + (dir * w) / 2} ${cy} l${dir * 7} -3" stroke="${p.lash}" stroke-width="3" stroke-linecap="round"/>`;
}

function browMarkup(side: Side, p: CharPalette, b: BrowSpec, color: string): string {
  const dir = side === "l" ? -1 : 1;
  const cx = side === "l" ? EYE.lx : EYE.rx;
  const extra = side === "l" ? (b.asym ?? 0) : 0;
  const base = EYE.y - 38 + (b.raise ?? 0) + extra;
  const inner = [cx - dir * 22, base + (b.tilt ?? 0)];
  const outer = [cx + dir * 25, base + 1 - (b.tilt ?? 0) * 0.35];
  const mid = [cx + dir * 3, Math.min(inner[1], outer[1]) - 5 - (b.arch ?? 2)];
  // Skin-colored halo: invisible on skin, a clean anime-style cutout where
  // brows sit over bangs (otherwise dark brows vanish on dark hair).
  return `<path d="M${inner} Q${mid} ${outer}" fill="none" stroke="${p.skin}" stroke-width="8.5" stroke-linecap="round"/>
          <path d="M${inner} Q${mid} ${outer}" fill="none" stroke="${color}" stroke-width="5.6" stroke-linecap="round"/>`;
}

function mouthMarkup(kind: MouthKind, p: CharPalette): string {
  const { x, y } = MOUTH;
  const line = shade(p.lips, 0.35);
  const inside = "#6e2a33", tongue = "#d9727a";
  switch (kind) {
    case "none":
      return "";
    case "smile":
      return `<path d="M${x - 17} ${y - 3} Q${x} ${y + 4} ${x + 17} ${y - 3} Q${x + 11} ${y + 14} ${x} ${y + 15} Q${x - 11} ${y + 14} ${x - 17} ${y - 3}Z" fill="${inside}"/>
              <path d="M${x - 9} ${y + 10} Q${x} ${y + 6} ${x + 9} ${y + 10} Q${x} ${y + 15} ${x - 9} ${y + 10}Z" fill="${tongue}"/>
              <path d="M${x - 15} ${y - 1} Q${x} ${y + 3} ${x + 15} ${y - 1} L${x + 13} ${y + 2} Q${x} ${y + 5} ${x - 13} ${y + 2}Z" fill="#fff"/>
              <path d="M${x - 18} ${y - 3} Q${x} ${y + 4} ${x + 18} ${y - 3}" fill="none" stroke="${line}" stroke-width="2.4" stroke-linecap="round"/>`;
    case "laugh":
      return `<path d="M${x - 23} ${y - 5} Q${x} ${y + 1} ${x + 23} ${y - 5} Q${x + 17} ${y + 24} ${x} ${y + 25} Q${x - 17} ${y + 24} ${x - 23} ${y - 5}Z" fill="${inside}"/>
              <path d="M${x - 12} ${y + 18} Q${x} ${y + 10} ${x + 12} ${y + 18} Q${x} ${y + 25} ${x - 12} ${y + 18}Z" fill="${tongue}"/>
              <path d="M${x - 20} ${y - 3} Q${x} ${y + 3} ${x + 20} ${y - 3} L${x + 17} ${y + 2} Q${x} ${y + 7} ${x - 17} ${y + 2}Z" fill="#fff"/>
              <path d="M${x - 24} ${y - 5} Q${x} ${y + 1} ${x + 24} ${y - 5}" fill="none" stroke="${line}" stroke-width="2.4" stroke-linecap="round"/>`;
    case "smirk":
      return `<path d="M${x - 13} ${y + 1} Q${x} ${y + 6} ${x + 15} ${y - 5}" fill="none" stroke="${line}" stroke-width="3" stroke-linecap="round"/>
              <path d="M${x + 13} ${y - 6} q4 1 5 -2" fill="none" stroke="${line}" stroke-width="2" stroke-linecap="round"/>`;
    case "parted":
      return `<path d="M${x - 9} ${y} Q${x} ${y - 3} ${x + 9} ${y} Q${x} ${y + 8} ${x - 9} ${y}Z" fill="${inside}"/>
              <path d="M${x - 10} ${y} Q${x} ${y - 3} ${x + 10} ${y}" fill="none" stroke="${line}" stroke-width="2.2" stroke-linecap="round"/>`;
    case "o":
      return `<ellipse cx="${x}" cy="${y + 4}" rx="8" ry="10" fill="${inside}"/><ellipse cx="${x}" cy="${y + 9}" rx="5" ry="3.5" fill="${tongue}"/>
              <ellipse cx="${x}" cy="${y + 4}" rx="8" ry="10" fill="none" stroke="${line}" stroke-width="2.2"/>`;
    case "wavy":
      return `<path d="M${x - 15} ${y + 2} Q${x - 8} ${y - 4} ${x - 1} ${y + 2} Q${x + 6} ${y + 8} ${x + 14} ${y + 1}" fill="none" stroke="${line}" stroke-width="2.8" stroke-linecap="round"/>`;
    case "flat":
      return `<path d="M${x - 13} ${y + 2} Q${x} ${y} ${x + 13} ${y + 3}" fill="none" stroke="${line}" stroke-width="3" stroke-linecap="round"/>`;
    case "frown":
      return `<path d="M${x - 13} ${y + 5} Q${x} ${y - 3} ${x + 13} ${y + 5}" fill="none" stroke="${line}" stroke-width="2.8" stroke-linecap="round"/>`;
    case "pursed":
      return `<path d="M${x + 1} ${y + 1} Q${x + 7} ${y - 3} ${x + 13} ${y + 1} Q${x + 7} ${y + 4} ${x + 1} ${y + 1}Z" fill="${p.lips}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>`;
    case "talkA":
      return `<path d="M${x - 11} ${y} Q${x} ${y - 2} ${x + 11} ${y} Q${x + 7} ${y + 12} ${x} ${y + 12} Q${x - 7} ${y + 12} ${x - 11} ${y}Z" fill="${inside}"/>
              <path d="M${x - 6} ${y + 8} Q${x} ${y + 5} ${x + 6} ${y + 8} Q${x} ${y + 12} ${x - 6} ${y + 8}Z" fill="${tongue}"/>
              <path d="M${x - 12} ${y} Q${x} ${y - 2} ${x + 12} ${y}" fill="none" stroke="${line}" stroke-width="2.2" stroke-linecap="round"/>`;
    case "talkB":
      return `<path d="M${x - 8} ${y + 1} Q${x} ${y - 1} ${x + 8} ${y + 1} Q${x + 5} ${y + 8} ${x} ${y + 8} Q${x - 5} ${y + 8} ${x - 8} ${y + 1}Z" fill="${inside}"/>
              <path d="M${x - 9} ${y + 1} Q${x} ${y - 1} ${x + 9} ${y + 1}" fill="none" stroke="${line}" stroke-width="2.2" stroke-linecap="round"/>`;
    case "rest":
    default:
      return `<path d="M${x - 12} ${y} Q${x} ${y + 6} ${x + 12} ${y}" fill="none" stroke="${line}" stroke-width="2.8" stroke-linecap="round"/>
              <path d="M${x - 5} ${y + 9} Q${x} ${y + 11} ${x + 5} ${y + 9}" fill="none" stroke="${p.skinShade}" stroke-width="2" opacity=".5" stroke-linecap="round"/>`;
  }
}

function blushMarkup(amount: number, p: CharPalette, ids: RigIds): string {
  if (amount <= 0.01) return "";
  let out = `<g opacity="${Math.min(1, amount).toFixed(2)}">
    <ellipse cx="${EYE.lx - 6}" cy="${EYE.y + 36}" rx="24" ry="11" fill="url(#${ids.blush})"/>
    <ellipse cx="${EYE.rx + 6}" cy="${EYE.y + 36}" rx="24" ry="11" fill="url(#${ids.blush})"/>`;
  if (amount > 0.7) {
    for (const cx of [EYE.lx - 6, EYE.rx + 6]) {
      for (let i = -1; i <= 1; i++) {
        out += `<path d="M${cx + i * 8 - 3} ${EYE.y + 40} l6 -8" stroke="${shade(p.blush, 0.15)}" stroke-width="2" stroke-linecap="round" opacity=".7"/>`;
      }
    }
  }
  return out + "</g>";
}

function sweatMarkup(): string {
  return `<path d="M342 176 q-9 14 -5 20 a7 7 0 0 0 11 -6 q0 -6 -6 -14Z" fill="#cfeaf7" stroke="#7fb2cc" stroke-width="2"/>`;
}

// ---- assembly -----------------------------------------------------------------------

function faceMarkup(p: CharPalette, exprName: string, ids: RigIds, { blink = false, mouth = null }: { blink?: boolean; mouth?: MouthKind | null } = {}): string {
  const x = EXPR[exprName] ?? EXPR.neutral!;
  const eyes = blink && !x.eye.closed
    ? blinkMarkup("l", p) + blinkMarkup("r", p)
    : eyeMarkup("l", p, x.eye, ids) + eyeMarkup("r", p, x.eye, ids);
  return `${blushMarkup(x.blush, p, ids)}${eyes}
    <path d="M253 262 Q258 276 248 280" fill="none" stroke="${p.skinLine}" stroke-width="2.2" stroke-linecap="round" opacity=".5"/>
    <g data-part="mouth">${mouthMarkup(mouth ?? x.mouth, p)}</g>
    ${x.sweat ? sweatMarkup() : ""}`;
}

function browsMarkup(p: CharPalette, exprName: string): string {
  const x = EXPR[exprName] ?? EXPR.neutral!;
  const color = shade(p.hair, 0.25);
  return browMarkup("l", p, x.brow, color) + browMarkup("r", p, x.brow, color);
}

const FACE_PATH = "M166 205 C166 140 205 112 250 112 C295 112 334 140 334 205 C334 250 323 281 301 305 C285 322 267 333 250 334 C233 333 215 322 199 305 C177 281 166 250 166 205Z";

function headBase(p: CharPalette): string {
  return `
    <path d="M171 218 C150 212 148 262 176 266" fill="${p.skin}" stroke="${p.skinLine}" stroke-width="2.4"/>
    <path d="M329 218 C350 212 352 262 324 266" fill="${p.skin}" stroke="${p.skinLine}" stroke-width="2.4"/>
    <path d="M168 232 q-6 10 4 20 M332 232 q6 10 -4 20" fill="none" stroke="${p.skinShade}" stroke-width="2.4" opacity=".7"/>
    <path d="${FACE_PATH}" fill="${p.skin}"/>
    <path d="M199 305 C215 322 233 333 250 334 C267 333 285 322 301 305 C292 322 272 338 250 339 C228 338 208 322 199 305Z" fill="${p.skinShade}" opacity=".35"/>
    <path d="${FACE_PATH}" fill="none" stroke="${p.skinLine}" stroke-width="2.6"/>`;
}

function defsMarkup(p: CharPalette, ids: RigIds): string {
  return `<defs>
    <linearGradient id="${ids.iris}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(p.eye, 0.5)}"/><stop offset=".55" stop-color="${p.eye}"/><stop offset="1" stop-color="${tint(p.eye, 0.35)}"/>
    </linearGradient>
    <radialGradient id="${ids.blush}"><stop offset="0" stop-color="${p.blush}" stop-opacity=".75"/><stop offset="1" stop-color="${p.blush}" stop-opacity="0"/></radialGradient>
    <clipPath id="${ids.face}"><path d="${FACE_PATH}"/></clipPath>
    <linearGradient id="${ids.shine}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${p.hairShine}" stop-opacity="0"/><stop offset=".5" stop-color="${p.hairShine}" stop-opacity=".75"/><stop offset="1" stop-color="${p.hairShine}" stop-opacity="0"/>
    </linearGradient>
  </defs>`;
}

/** Render a static SVG string (used for thumbnails / portraits). */
export function characterSVG(look: Look, { expression = "neutral", outfit, crop = "full", blink = false, mouth = null }: { expression?: string; outfit?: string; crop?: Crop; blink?: boolean; mouth?: MouthKind | null } = {}): string {
  const p = paletteFor(look);
  const ids: RigIds = { iris: uid("iris"), blush: uid("blush"), shine: uid("shine"), clip: uid("eye"), face: uid("face") };
  const hair = HAIR[look.hair.style]!;
  const outfitSpec = outfit && look.outfits?.[outfit] ? look.outfits[outfit] : look.outfit;
  const dress = OUTFITS[outfitSpec.style]!;
  const extras = (outfitSpec.extras ?? look.extras ?? []).map((e) => EXTRAS[e]).filter((e) => !!e);
  const ctx: WardrobeCtx = { p, look, ids, colors: outfitSpec.colors ?? {} };
  const x = EXPR[expression] ?? EXPR.neutral!;

  const viewBox = crop === "face" ? "120 40 260 330" : crop === "bust" ? "70 20 360 520" : `0 0 ${VIEW.w} ${VIEW.h}`;
  return `<svg class="char-art" viewBox="${viewBox}" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${defsMarkup(p, ids)}
    <g class="c-react"><g class="c-body">
      <g class="c-sway">${hair.back(ctx)}</g>
      ${bodyBase(p)}
      ${dress(ctx)}
      ${extras.map((e) => e.body?.(ctx) ?? "").join("")}
      <g class="c-head-idle"><g class="c-head" style="transform: rotate(${x.tilt}deg)">
        ${headBase(p)}
        ${extras.map((e) => e.face?.(ctx) ?? "").join("")}
        <g data-part="face">${faceMarkup(p, expression, ids, { blink, mouth })}</g>
        ${hair.front(ctx)}
        <g data-part="brows">${browsMarkup(p, expression)}</g>
        ${extras.map((e) => e.head?.(ctx) ?? "").join("")}
      </g></g>
    </g></g>
  </svg>`;
}

/**
 * A live, animated character mounted in the DOM. `el` wraps the figure's SVG
 * and a tiny mouth overlay: while she talks only the overlay redraws, so the
 * figure itself is painted once instead of ~8 times a second.
 */
export interface CharacterHandle {
  el: HTMLDivElement;
  readonly expression: string;
  setExpression(name: string): void;
  talk(on: boolean): void;
  destroy(): void;
}

export function createCharacter(look: Look, { expression = "neutral", outfit, idle = true, crop = "full" }: { expression?: string; outfit?: string; idle?: boolean; crop?: Crop } = {}): CharacterHandle {
  const el = document.createElement("div");
  el.className = "char-rig";
  el.innerHTML = characterSVG(look, { expression, outfit, crop });
  const svg = el.firstElementChild as SVGSVGElement;
  // The mouth overlay shares the figure's viewBox, so coordinates line up.
  // Her mouth is never covered by hair, glasses or accessories.
  const NS = "http://www.w3.org/2000/svg";
  const mouthSvg = document.createElementNS(NS, "svg");
  mouthSvg.setAttribute("class", "char-mouth");
  mouthSvg.setAttribute("viewBox", svg.getAttribute("viewBox") ?? `0 0 ${VIEW.w} ${VIEW.h}`);
  mouthSvg.setAttribute("preserveAspectRatio", svg.getAttribute("preserveAspectRatio") ?? "xMidYMax meet");
  mouthSvg.setAttribute("aria-hidden", "true");
  mouthSvg.style.display = "none";
  const mouthG = document.createElementNS(NS, "g");
  mouthSvg.appendChild(mouthG);
  el.appendChild(mouthSvg);
  const p = paletteFor(look);
  // Reuse the gradient ids baked into the markup for face redraws.
  const ids: RigIds = {
    iris: svg.querySelector("linearGradient")!.id,
    blush: svg.querySelector("radialGradient")!.id,
    shine: svg.querySelectorAll("linearGradient")[1]?.id ?? "",
    clip: uid("eye"),
    face: svg.querySelector("clipPath")?.id ?? "",
  };
  const faceG = svg.querySelector('[data-part="face"]')!;
  const browsG = svg.querySelector('[data-part="brows"]')!;
  const headG = svg.querySelector<SVGGElement>(".c-head")!;

  let current = EXPR[expression] ? expression : "neutral";
  let talking = false, blinking = false;
  let talkTimer: ReturnType<typeof setTimeout> | undefined, blinkTimer: ReturnType<typeof setTimeout> | undefined;
  const spec = (name: string): ExprSpec => EXPR[name] ?? EXPR.neutral!;

  function drawFace() {
    // While talking, the overlay draws the mouth.
    faceG.innerHTML = faceMarkup(p, current, ids, { blink: blinking, mouth: talking ? "none" : null });
  }

  /** The overlay tilts with the head: same angle, same pivot (50% 85% of the head's box). */
  let pivot = "";
  function tiltMouth() {
    if (!pivot && svg.isConnected) {
      const b = headG.getBBox();
      pivot = `${b.x + b.width / 2}px ${b.y + b.height * 0.85}px`;
      mouthG.style.transformOrigin = pivot;
    }
    mouthG.style.transform = `rotate(${spec(current).tilt}deg)`;
  }

  function setExpression(name: string) {
    if (!EXPR[name]) name = "neutral";
    const changed = name !== current;
    current = name;
    drawFace();
    browsG.innerHTML = browsMarkup(p, name);
    headG.style.transform = `rotate(${spec(name).tilt}deg)`;
    tiltMouth();
    if (changed && spec(name).react) {
      const cls = `react-${spec(name).react}`;
      el.classList.remove("react-hop", "react-jolt", "react-recoil", "react-droop", "react-jitter");
      void el.getBoundingClientRect(); // restart the animation
      el.classList.add(cls);
    } else if (changed) {
      el.classList.remove("react-droop");
    }
  }

  function talk(on: boolean) {
    if (on === talking) return;
    talking = on;
    clearTimeout(talkTimer);
    drawFace();
    if (!on) {
      mouthSvg.style.display = "none";
      return;
    }
    tiltMouth();
    mouthSvg.style.display = "";
    let i = 0;
    const base = spec(current).mouth;
    const loop = () => {
      // Alternate open / mood-shaped / half-open so speech doesn't look mechanical.
      const frames: MouthKind[] = base === "laugh" || base === "smile" ? ["talkA", base, "talkB", base] : ["talkA", base, "talkB", "rest"];
      mouthG.innerHTML = mouthMarkup(frames[i++ % frames.length]!, p);
      talkTimer = setTimeout(loop, 95 + Math.random() * 70);
    };
    loop();
  }

  function scheduleBlink(): void {
    blinkTimer = setTimeout(() => {
      if (spec(current).eye.closed) return scheduleBlink();
      blinking = true; drawFace();
      setTimeout(() => {
        blinking = false; drawFace();
        if (Math.random() < 0.2) { // occasional double blink
          setTimeout(() => { blinking = true; drawFace(); setTimeout(() => { blinking = false; drawFace(); }, 110); }, 160);
        }
        scheduleBlink();
      }, 120);
    }, 2200 + Math.random() * 3800);
  }
  if (idle) scheduleBlink();
  else el.classList.add("still");

  return {
    el,
    get expression() { return current; },
    setExpression,
    talk,
    destroy() { clearTimeout(talkTimer); clearTimeout(blinkTimer); el.remove(); },
  };
}
