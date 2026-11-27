// Text helpers shared by the dialog log and the typewriter.

export interface Segment {
  action: boolean;
  text: string;
}

/** Split "*waves* Hi there *grins*" into action / speech segments. */
export function splitActions(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ action: false, text: text.slice(last, m.index) });
    out.push({ action: true, text: m[1]!.trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ action: false, text: text.slice(last) });
  return out.map((s) => ({ ...s, text: s.action ? s.text : s.text.replace(/\s+/g, ' ') })).filter((s) => s.text.trim());
}

export function formatDate(ms: number): string {
  if (!ms) return 'never';
  return new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** A data: URL for static SVG markup, with animation styles stripped. */
export function svgDataUrl(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup.replace(/<style[\s\S]*?<\/style>/g, ''))}`;
}
