// Makes a scene cheap to animate. CSS animations on elements *inside* an SVG
// can't run on the GPU: every frame, the browser repaints the whole
// full-screen SVG (hundreds of shapes and gradients) — up to a second of
// paint per second on a retina screen.
//
// So each scene is split once, in the browser:
//   - a still image of everything that doesn't move (painted once), and
//   - every animated piece (a gull, a cloud, a lantern, a rain sheet…) lifted
//     into its own small SVG inside an HTML div. The animation moves to that
//     div, where transform/opacity animations run on the compositor: the
//     piece is rasterized once and the GPU just moves it.
// The art and its motion are unchanged; only where the work happens moves.

import { renderScene } from './scenes';
import type { SceneSpec } from '@/game/types';

export const VIEW_W = 1600;
export const VIEW_H = 900;
/** Most animated pieces lifted per scene; past that they stay still. */
const MAX_LAYERS = 80;
/**
 * Lite: only small pieces (gulls, glints, stars, flames, lanterns) move.
 * Big moving sheets — rain, fog, clouds, glows — are what's expensive when
 * the browser composites without a fast GPU, so they stay painted.
 */
const LITE_MAX_AREA = 25000;
const LITE_MAX_LAYERS = 40;
/** Per-animation caps for the numerous, tiny pieces (stars, glints, motes). */
const CAP_PER_ANIMATION = 18;

export interface FxLayer {
  x: number;
  y: number;
  w: number;
  h: number;
  /** A standalone SVG with just this piece (and the defs it needs). */
  svg: string;
  style: Record<string, string>;
  /** Which still image it sits on (0 = the base still; n = above overlays[n - 1]). */
  band: number;
}

export interface Overlay {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayeredScene {
  /** Object URL of the still image (cached for the session). */
  still: string;
  /** Still images that go above some moving layers, to keep the paint order (see step 4), cropped to what they hold. */
  overlays: Overlay[];
  layers: FxLayer[];
}

const cache = new Map<string, LayeredScene>();
const injectedStyles = new Set<string>();
const keyOf = (s: SceneSpec) => `${s.id}|${s.time ?? ''}|${s.weather ?? ''}`;

/** Animations stopped and the resting state of a few classes, for still images. */
const STILL_CSS = '*{animation:none!important;transition:none!important}.a-lightning{opacity:0}';

function svgUrl(markup: string): string {
  return URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
}

/** A still image of the whole scene (for thumbnails and backdrops that don't move). */
export function stillSceneUrl(spec: SceneSpec): string {
  return layeredScene(spec, { motion: 'off' }).still;
}

/** Scene keyframes live in <style> blocks inside some scenes; keep them document-wide. */
function hoistStyles(svg: SVGSVGElement): void {
  for (const st of svg.querySelectorAll('style')) {
    const css = st.textContent ?? '';
    if (!css || injectedStyles.has(css)) continue;
    injectedStyles.add(css);
    const el = document.createElement('style');
    el.dataset.scene = 'hoisted';
    el.textContent = css;
    document.head.appendChild(el);
  }
}

/** Collect the <defs> children an element tree references (url(#id) / href="#id"), recursively. */
function neededDefs(markup: string, root: SVGSVGElement): string {
  const out = new Map<string, string>();
  const queue = [...markup.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map((m) => m[1] ?? m[2]!);
  while (queue.length) {
    const id = queue.pop()!;
    if (out.has(id)) continue;
    const el = root.querySelector(`[id="${CSS.escape(id)}"]`);
    if (!el) continue;
    const html = el.outerHTML;
    out.set(id, html);
    for (const m of html.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)) queue.push(m[1] ?? m[2]!);
  }
  return out.size ? `<defs>${[...out.values()].join('')}</defs>` : '';
}

/** Ancestor groups' attributes (transforms, fills, opacity, clips) wrapped around a lifted piece. */
function ancestorChain(el: Element, root: SVGSVGElement): [string, string] {
  let open = '', close = '';
  for (let a = el.parentElement; a && a !== (root as Element); a = a.parentElement) {
    const attrs = [...a.attributes].filter((x) => x.name !== 'class' && x.name !== 'id').map((x) => `${x.name}="${x.value.replace(/"/g, '&quot;')}"`).join(' ');
    open = `<g ${attrs}>` + open;
    close += '</g>';
  }
  return [open, close];
}

const movesCache = new Map<string, boolean>();
/** Does the named @keyframes animate transform (vs. only opacity)? */
function animatesTransform(name: string): boolean {
  if (movesCache.has(name)) return movesCache.get(name)!;
  let moves = false;
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (rule instanceof CSSKeyframesRule && rule.name === name && /transform|translate|scale|rotate/.test(rule.cssText)) moves = true;
    }
  }
  movesCache.set(name, moves);
  return moves;
}

function seededPick<T>(items: T[], n: number, seed: number): T[] {
  if (items.length <= n) return items;
  let s = seed || 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return [...items].map((x) => ({ x, k: rnd() })).sort((a, b) => a.k - b.k).slice(0, n).map((o) => o.x);
}

export function layeredScene(spec: SceneSpec, { motion = 'full' }: { motion?: 'full' | 'lite' | 'off' } = {}): LayeredScene {
  const animate = motion !== 'off';
  const lite = motion === 'lite';
  const key = `${keyOf(spec)}|${motion}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const markup = renderScene(spec);
  if (!animate || typeof document === 'undefined') {
    const still = svgUrl(markup.replace('</defs>', `</defs><style>${STILL_CSS}</style>`));
    const result: LayeredScene = { still, overlays: [], layers: [] };
    cache.set(key, result);
    return result;
  }

  // Measure off-screen at exactly 1600 × 900 CSS px, so 1 px = 1 viewBox unit.
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${VIEW_W}px;height:${VIEW_H}px;visibility:hidden;pointer-events:none;contain:strict`;
  host.innerHTML = markup;
  document.body.appendChild(host);
  const svg = host.querySelector('svg')!;
  svg.setAttribute('preserveAspectRatio', 'none');
  hoistStyles(svg);

  // 1) Every element that is animated, outermost only.
  const animated: { el: SVGGraphicsElement; cs: CSSStyleDeclaration }[] = [];
  for (const el of svg.querySelectorAll<SVGGraphicsElement>('*')) {
    if (el.closest('defs, clipPath, mask, pattern, style')) continue;
    const cs = getComputedStyle(el);
    if (!cs.animationName || cs.animationName === 'none') continue;
    if (animated.some((a) => a.el.contains(el))) continue;
    animated.push({ el, cs });
  }

  // 2) Cap the numerous ones (stars, glints, motes).
  const byName = new Map<string, typeof animated>();
  for (const a of animated) byName.set(a.cs.animationName, [...(byName.get(a.cs.animationName) ?? []), a]);
  const capped = [...byName.values()].flatMap((list, i) => seededPick(list, CAP_PER_ANIMATION, i + 7));

  // Snapshot animation settings before freezing everything for measurement.
  const pieces = capped.map(({ el, cs }) => ({
    el,
    moves: animatesTransform(cs.animationName),
    anim: {
      animationName: cs.animationName,
      animationDuration: cs.animationDuration,
      animationTimingFunction: cs.animationTimingFunction,
      animationDelay: cs.animationDelay,
      animationIterationCount: cs.animationIterationCount,
      animationDirection: cs.animationDirection,
      animationFillMode: cs.animationFillMode,
    },
    box: cs.transformBox,
    origin: cs.transformOrigin,
  }));
  // While animated, a transform animation overrides the element's own
  // transform attribute — so the attribute never showed. Drop it.
  for (const p of pieces) if (p.moves) p.el.removeAttribute('transform');
  const reach = sampleReach(svg, pieces.map((p) => p.el));

  const freeze = document.createElementNS(SVG_NS, 'style');
  freeze.textContent = STILL_CSS;
  svg.appendChild(freeze);

  // 3) Measure and keep the biggest pieces.
  const base = svg.getBoundingClientRect();
  const measured = pieces
    .map((p) => ({ ...p, r: p.el.getBoundingClientRect() }))
    .filter((p) => (p.r.width > 0 || p.r.height > 0) && (!lite || p.r.width * p.r.height <= LITE_MAX_AREA))
    .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)
    .slice(0, lite ? LITE_MAX_LAYERS : MAX_LAYERS);

  // 4) Keep the paint order. A lifted piece is drawn above the still image,
  // which is wrong wherever something painted after it covers it (the sea
  // rocking behind a boat's deck). So everything gets a band: the base still
  // is band 0, and band n's still is drawn above the moving pieces of bands
  // below n. Walking in paint order, each element takes the lowest band that
  // keeps it in order with what it overlaps: static content goes above any
  // earlier piece it covers, a piece no lower than anything earlier it covers.
  // Content that covers nothing moving stays in the base still. Past
  // MAX_BANDS, the pieces in the way stay still instead.
  type Piece = (typeof measured)[number];
  const lifted = new Map<Element, Piece>(measured.map((m) => [m.el, m]));
  const bandOf = new Map<Element, number>();
  const order: Piece[] = [];
  // What can push later content up: every piece, and static content above band 0.
  const placed: { box: Box; band: number; piece?: Piece }[] = [];
  let bandCount = 1;
  // What each band above 0 holds, to crop its image to.
  const extent: (Box | undefined)[] = [];
  const grow = (b: number, r: Box) => {
    const e = extent[b];
    extent[b] = e ? { left: Math.min(e.left, r.left), top: Math.min(e.top, r.top), right: Math.max(e.right, r.right), bottom: Math.max(e.bottom, r.bottom) } : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  };
  const walk = (parent: Element) => {
    for (const child of [...parent.children]) {
      if (NOT_DRAWN.has(child.localName)) continue;
      const piece = lifted.get(child);
      if (piece) {
        const box = reach.get(child) ?? piece.r;
        let band = 0;
        for (const x of placed) if (x.band > band && overlaps(x.box, box)) band = x.band;
        placed.push({ box, band, piece });
        bandOf.set(child, band);
        order.push(piece);
        bandCount = Math.max(bandCount, band + 1);
        continue;
      }
      if (CONTAINERS.has(child.localName)) {
        walk(child);
        continue;
      }
      const r = child.getBoundingClientRect();
      let band = 0;
      if (r.width > 0 || r.height > 0) {
        for (const x of placed) {
          // Static content keeps its order with other static content exactly;
          // above a moving piece only where the overlap would show.
          if (x.piece ? x.band + 1 > band && covers(x.box, r) : x.band > band && overlaps(x.box, r)) band = x.piece ? x.band + 1 : x.band;
        }
        if (band >= MAX_BANDS) {
          // No band left: the pieces it covers stay in the still, in their place.
          band = MAX_BANDS - 1;
          for (const x of placed) {
            if (!x.piece || x.band !== band || !covers(x.box, r)) continue;
            lifted.delete(x.piece.el);
            x.piece.el.setAttribute('data-band', String(band));
            grow(band, x.piece.r);
            x.piece = undefined;
          }
        }
        if (band > 0) {
          placed.push({ box: r, band });
          grow(band, r);
        }
      }
      child.setAttribute('data-band', String(band));
      bandCount = Math.max(bandCount, band + 1);
    }
  };
  walk(svg);

  // 5) Lift each piece into its own small SVG.
  const bands: Piece[][] = Array.from({ length: bandCount }, () => []);
  for (const p of order) {
    const b = bandOf.get(p.el);
    if (b !== undefined && lifted.has(p.el)) bands[b]!.push(p);
  }
  const layers: FxLayer[] = [];
  bands.forEach((band, b) => {
    for (const { el, r, anim, box, origin } of band) {
      const pad = 6;
      const x = r.left - base.left - pad, y = r.top - base.top - pad, w = r.width + pad * 2, h = r.height + pad * 2;
      const [open, close] = ancestorChain(el, svg);
      // The copy drops its class (its animation now lives on the div, and class
      // rules like a resting opacity of 0 would hide it) and its own animation.
      const copy = el.cloneNode(true) as SVGElement;
      copy.removeAttribute('class');
      copy.style.animation = 'none';
      const piece = copy.outerHTML;
      const defs = neededDefs(open + piece, svg);
      // Transform origin: fill-box origins are relative to the piece's box
      // (= the div, minus padding); view-box origins to the scene's corner.
      const [ox = 0, oy = 0] = origin.split(' ').map((v) => parseFloat(v));
      const transformOrigin = box === 'fill-box' ? `${ox + pad}px ${oy + pad}px` : `${ox - x}px ${oy - y}px`;
      layers.push({
        x, y, w, h, band: b,
        svg: `<svg xmlns="${SVG_NS}" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}" overflow="visible">${defs}${open}${piece}${close}</svg>`,
        style: { ...anim, transformOrigin },
      });
      el.setAttribute('display', 'none');
    }
  });

  // 6) Everything left, frozen, is the still image: one per band.
  freeze.remove();
  // Overlays are cropped to what they hold: most are a foreground strip, and
  // a full-scene image would be blended over the whole screen on every frame.
  const stills: Overlay[] = Array.from({ length: bandCount }, (_, b) => {
    const copy = svg.cloneNode(true) as SVGSVGElement;
    for (const el of copy.querySelectorAll('[data-band]')) if (el.getAttribute('data-band') !== String(b)) el.remove();
    const e = extent[b];
    const pad = 16; // glows and strokes reach past the box
    const x = b && e ? Math.max(0, Math.floor(e.left - base.left - pad)) : 0;
    const y = b && e ? Math.max(0, Math.floor(e.top - base.top - pad)) : 0;
    const w = b && e ? Math.min(VIEW_W, Math.ceil(e.right - base.left + pad)) - x : VIEW_W;
    const h = b && e ? Math.min(VIEW_H, Math.ceil(e.bottom - base.top + pad)) - y : VIEW_H;
    if (b) {
      copy.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
      copy.setAttribute('width', String(w));
      copy.setAttribute('height', String(h));
    }
    return { src: svgUrl(copy.outerHTML.replace('</defs>', `</defs><style>${STILL_CSS}</style>`)), x, y, w, h };
  });
  host.remove();
  const result: LayeredScene = { still: stills[0]!.src, overlays: stills.slice(1), layers };
  cache.set(key, result);
  return result;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Still images stacked between the moving layers, at most (see step 4). */
const MAX_BANDS = 4;
const CONTAINERS = new Set(['g', 'a', 'switch', 'svg']);
const NOT_DRAWN = new Set(['defs', 'clipPath', 'mask', 'pattern', 'style', 'title', 'desc', 'linearGradient', 'radialGradient', 'filter', 'symbol', 'marker', 'metadata', 'script']);

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
/**
 * Does static content cover a moving piece enough to show? A few units of
 * overlap (a star a passing cloud drifts over, a window under a wisp of fog)
 * can't be seen, and counting them would stack up bands for nothing.
 */
const MIN_COVER = 900;
const covers = (a: Box, b: Box) =>
  (Math.min(a.right, b.right) - Math.max(a.left, b.left)) > 0 &&
  (Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) > 0 &&
  (Math.min(a.right, b.right) - Math.max(a.left, b.left)) * (Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) > MIN_COVER;

/** Where each element reaches while it moves: its box over one cycle of every animation, sampled. */
function sampleReach(svg: SVGSVGElement, els: Element[]): Map<Element, Box> {
  const SAMPLES = 8;
  const grow = 4; // strokes aren't in the box
  const anims = svg.getAnimations({ subtree: true });
  for (const a of anims) a.pause();
  const reach = new Map<Element, Box>();
  for (let k = 0; k < SAMPLES; k++) {
    for (const a of anims) {
      const d = a.effect?.getComputedTiming().duration;
      if (typeof d === 'number' && Number.isFinite(d)) a.currentTime = (k / SAMPLES) * d;
    }
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      const o = reach.get(el);
      reach.set(el, {
        left: Math.min(o?.left ?? Infinity, r.left - grow),
        top: Math.min(o?.top ?? Infinity, r.top - grow),
        right: Math.max(o?.right ?? -Infinity, r.right + grow),
        bottom: Math.max(o?.bottom ?? -Infinity, r.bottom + grow),
      });
    }
  }
  return reach;
}

/** Lite motion's frame rate: a gentle stop-motion. */
export const LITE_FPS = 12;

/**
 * Runs every animation under `root` on one shared clock at `fps`, instead of
 * each at the display's rate. Without a fast GPU the browser redraws the whole
 * screen whenever anything moves (scattered movers union to one big damaged
 * area), so what costs is how many frames change, not how many pieces move.
 * Between ticks nothing changes and nothing is redrawn. Returns a stop function.
 */
export function stepAnimations(root: Element, fps = LITE_FPS): () => void {
  const anims = root.getAnimations({ subtree: true });
  if (!anims.length) return () => {};
  for (const a of anims) a.pause();
  const start = performance.now();
  const id = setInterval(() => {
    const t = performance.now() - start;
    for (const a of anims) a.currentTime = t;
  }, 1000 / fps);
  return () => {
    clearInterval(id);
    for (const a of anims) a.play();
  };
}
