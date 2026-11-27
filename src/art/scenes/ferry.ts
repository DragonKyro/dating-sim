// The ferry Persistence's top deck, halfway across, Saltwick on the horizon.
import type { Palette, Part, SceneInput } from "../kit";
import { W, H, sky, sunDisc, cloudBand, ridge, sea, gulls, rng, shade, tint, mix } from "../kit";

export function ferry({ pal, time }: SceneInput): Part[] {
  const parts: Part[] = [];
  const horizon = 560;
  parts.push(sky(pal));
  const sunX = 1230, sunY = time === "day" ? 160 : 440;
  parts.push(sunDisc(pal, sunX, sunY, time === "day" ? 46 : 58));
  parts.push(cloudBand(pal, { seed: 4, y0: 70, y1: 300, count: 6, speed: 180 }));

  // The island: far hills, the North Light on its point, the village.
  parts.push(ridge({ y: horizon - 20, amp: 30, color: mix(pal.far, pal.sky[0], 0.35), seed: 2, x0: 80, x1: 760, bottom: horizon + 2, steps: 10 }));
  parts.push(ridge({ y: horizon - 6, amp: 26, color: pal.far, seed: 6, x0: 160, x1: 1080, bottom: horizon + 2, steps: 14 }));
  parts.push(village(pal, horizon));
  parts.push(lighthouse(pal, 1040, horizon - 18));

  // Sea + a column of sun glints.
  parts.push(sea(pal, { top: horizon, seed: 8, glint: pal.sun, glints: 40, glintOpacity: 0.45 }));
  parts.push(sunPath(pal, sunX, horizon));
  parts.push(wake(pal));
  parts.push(gulls(4, { seed: 12, y0: 140, y1: 380, color: shade(pal.ink, 0.1) }));

  // Foreground: cabin wall, deck, railing, life ring, a flag.
  parts.push(cabin(pal));
  parts.push(deck(pal));
  parts.push(railing(pal));
  parts.push(lifeRing(1390, 640));
  parts.push(flag(300, 250));
  return parts;
}

function village(pal: Palette, horizon: number): string {
  const r = rng(31);
  let out = "";
  const roof = shade(pal.far, 0.25), wall = tint(pal.far, 0.25);
  for (let i = 0; i < 16; i++) {
    const x = 470 + i * 34 + r() * 10, w = 20 + r() * 12, h = 12 + r() * 10, y = horizon - 4 - h;
    out += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${wall}"/>`;
    out += `<path d="M${(x - 2).toFixed(0)} ${y.toFixed(0)} L${(x + w / 2).toFixed(0)} ${(y - 8 - r() * 4).toFixed(0)} L${(x + w + 2).toFixed(0)} ${y.toFixed(0)} Z" fill="${roof}"/>`;
    if (r() > 0.4) out += `<rect x="${(x + w / 2 - 2).toFixed(0)}" y="${(y + h / 2 - 2).toFixed(0)}" width="4" height="4" fill="${pal.light}" opacity=".85"/>`;
  }
  // Church steeple
  out += `<path d="M820 ${horizon - 30} l10 -40 l10 40 Z" fill="${roof}"/><rect x="818" y="${horizon - 30}" width="24" height="26" fill="${wall}"/>`;
  return out;
}

function lighthouse(pal: Palette, x: number, base: number): string {
  const white = tint(pal.far, 0.7);
  return `<g>
    <path d="M${x - 9} ${base} L${x - 6} ${base - 58} L${x + 6} ${base - 58} L${x + 9} ${base} Z" fill="${white}"/>
    <rect x="${x - 6}" y="${base - 40}" width="12" height="8" fill="${shade("#c6534a", 0.15)}"/>
    <rect x="${x - 8}" y="${base - 66}" width="16" height="9" fill="${shade(pal.far, 0.4)}"/>
    <path d="M${x - 8} ${base - 66} L${x} ${base - 74} L${x + 8} ${base - 66} Z" fill="${shade("#c6534a", 0.2)}"/>
  </g>`;
}

function sunPath(pal: Palette, x: number, horizon: number): string {
  const r = rng(41);
  let out = "";
  for (let i = 0; i < 26; i++) {
    const t = i / 26, y = horizon + 8 + t * t * 300, w = 30 + t * 140 + r() * 40;
    out += `<path d="M${(x - w / 2 + (r() - 0.5) * 40).toFixed(0)} ${y.toFixed(0)} h${w.toFixed(0)}" stroke="${pal.sun}" stroke-width="${(2 + t * 4).toFixed(1)}" stroke-linecap="round" opacity="${(0.55 - t * 0.3).toFixed(2)}" class="a-wave" style="animation-delay:-${(r() * 5).toFixed(1)}s"/>`;
  }
  return out;
}

function wake(pal: Palette): string {
  // Foam trail curling away from the hull at the bottom left.
  const foam = tint(pal.sea[0], 0.6);
  return `<g opacity=".7" class="a-wave" style="animation-duration:7s">
    <path d="M0 760 Q260 700 620 690 Q330 720 0 800 Z" fill="${foam}" opacity=".35"/>
    <path d="M0 735 Q300 690 700 676" stroke="${foam}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".5"/>
  </g>`;
}

function cabin(pal: Palette): string {
  const wall = mix("#f2ede4", pal.light, 0.15), edge = shade(wall, 0.25);
  return `<g>
    <rect x="-10" y="120" width="200" height="${H}" fill="${wall}"/>
    <rect x="182" y="120" width="10" height="${H}" fill="${edge}"/>
    <rect x="-10" y="120" width="210" height="18" fill="${shade(wall, 0.35)}"/>
    <circle cx="88" cy="300" r="44" fill="${shade(pal.sky[1], 0.15)}" stroke="${shade("#b88a4a", 0.1)}" stroke-width="10"/>
    <path d="M64 282 q24 -16 46 4" stroke="${tint(pal.sky[2], 0.6)}" stroke-width="6" fill="none" opacity=".7" stroke-linecap="round"/>
    <text x="90" y="470" text-anchor="middle" font-family="Georgia, serif" font-size="19" font-weight="700" fill="${shade(wall, 0.45)}" letter-spacing="2">PERSISTENCE</text>
    <text x="90" y="494" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="${shade(wall, 0.45)}" letter-spacing="3">SALTWICK · 1979</text>
  </g>`;
}

function deck(pal: Palette): string {
  const wood = mix("#b98a5e", pal.light, 0.18), dark = shade(wood, 0.3);
  let planks = "";
  for (let i = 0; i < 9; i++) {
    const y = 790 + i * i * 2.6 + i * 10;
    planks += `<path d="M0 ${y.toFixed(0)} H${W}" stroke="${dark}" stroke-width="${(1 + i * 0.3).toFixed(1)}" opacity=".5"/>`;
  }
  return `<rect x="0" y="780" width="${W}" height="${H - 780}" fill="${wood}"/>${planks}
    <rect x="0" y="776" width="${W}" height="8" fill="${shade(wood, 0.4)}"/>`;
}

function railing(pal: Palette): string {
  const white = mix("#f4f1ea", pal.light, 0.2), sh = shade(white, 0.3);
  let posts = "";
  for (let x = 240; x < W; x += 150) {
    posts += `<rect x="${x}" y="640" width="12" height="140" rx="3" fill="${white}"/><rect x="${x + 8}" y="640" width="4" height="140" fill="${sh}" opacity=".6"/>`;
  }
  return `<g>
    ${posts}
    <rect x="190" y="628" width="${W - 190}" height="16" rx="8" fill="${white}"/>
    <rect x="190" y="638" width="${W - 190}" height="6" fill="${sh}" opacity=".5"/>
    <rect x="190" y="690" width="${W - 190}" height="7" rx="3" fill="${white}" opacity=".95"/>
    <rect x="190" y="735" width="${W - 190}" height="7" rx="3" fill="${white}" opacity=".95"/>
  </g>`;
}

function lifeRing(x: number, y: number): string {
  return `<g class="a-sway" style="animation-duration:6s">
    <path d="M${x} ${y - 6} v-6" stroke="#5b4b3a" stroke-width="3"/>
    <circle cx="${x}" cy="${y + 48}" r="52" fill="none" stroke="#f1ece2" stroke-width="30"/>
    <circle cx="${x}" cy="${y + 48}" r="52" fill="none" stroke="#e0603f" stroke-width="30" stroke-dasharray="40.8 40.8" stroke-dashoffset="20"/>
    <circle cx="${x}" cy="${y + 48}" r="37" fill="none" stroke="#00000022" stroke-width="2"/>
    <circle cx="${x}" cy="${y + 48}" r="67" fill="none" stroke="#00000022" stroke-width="2"/>
  </g>`;
}

function flag(x: number, y: number): string {
  return `<g>
    <rect x="${x - 3}" y="${y}" width="6" height="${628 - y}" fill="${shade("#f4f1ea", 0.25)}"/>
    <g class="a-sway" style="animation-duration:2.2s;transform-origin:left center">
      <path d="M${x + 3} ${y + 4} q60 -10 110 6 q-20 22 0 44 q-50 -14 -110 -4 Z" fill="#2f5d8a"/>
      <circle cx="${x + 52}" cy="${y + 27}" r="9" fill="#f4f1ea"/>
    </g>
  </g>`;
}
