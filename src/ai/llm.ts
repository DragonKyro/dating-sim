// Gemini REST transport + model selection. No game logic lives here.
//
// Two lessons baked in:
// 1. Gemini 2.5+/3.x are "thinking" models, and hidden thinking tokens are
//    charged against maxOutputTokens. Left on, a 256-token judge call spent
//    ~245 tokens thinking and got truncated mid-JSON every time. So every call
//    sets the smallest thinking allowance the model accepts.
// 2. The free-tier lineup changes constantly (models retire, get overloaded,
//    or have no free quota). "auto" walks a ranked chain and skips models that
//    404 / 429 / 503 / time out, remembering the bad ones for a while.

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

// Ranked by "best usable on the free tier", measured Nov 2026:
// - gemini-3.5-flash-lite: answers in ~1-5 s, writes well, scores sensibly;
//   free tier 500 requests/day. gemini-flash-lite-latest: another 500/day.
// - gemini-2.5-flash and gemini-3-flash-preview: good, but the free tier is
//   capped at 20 requests/day/model, i.e. about one scene. Last resort.
// - gemini-3.5/3.6-flash: 15-40 s per reply (too slow for chat).
// - gemini-3.7/3.8-flash and *-latest aliases: often overloaded (503).
// - gemini-4-*: no free quota.
// Both roles share one chain; a model that runs out (daily 429) is skipped
// for six hours and the next one takes over automatically.
export const FREE_TIER_CHAIN = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-2.5-flash'];

/** Models offered when a player pins one in Settings. */
export const PINNABLE_MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.8-flash'];

const DEFAULT_TIMEOUT_MS = 25000;
const SAFETY_SETTINGS = [
  // Characters get annoyed at rude players; don't let that trip the filter.
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

export type LlmErrorKind = 'auth' | 'quota' | 'overloaded' | 'not_found' | 'blocked' | 'bad_request' | 'network' | 'timeout' | 'empty';

export class LlmError extends Error {
  readonly kind: LlmErrorKind;
  readonly status: number;
  readonly model: string;
  readonly retryAfterMs: number;
  /** A daily (not per-minute) quota ran out. */
  readonly daily: boolean;
  /** Stopped at maxOutputTokens before any visible text. */
  truncated = false;

  constructor(kind: LlmErrorKind, message: string, { status = 0, model = '', retryAfterMs = 0, daily = false }: { status?: number; model?: string; retryAfterMs?: number; daily?: boolean } = {}) {
    super(message);
    this.kind = kind;
    this.status = status;
    this.model = model;
    this.retryAfterMs = retryAfterMs;
    this.daily = daily;
  }
}

export interface GenerateOptions {
  apiKey: string;
  /** A pinned model id, or "auto" for the free-tier chain. */
  model?: string;
  system?: string;
  messages: { role: 'user' | 'model'; text: string }[];
  temperature?: number;
  /** Visible-output ceiling (thinking is kept minimal separately). */
  maxOutputTokens?: number;
  /** JSON schema → JSON mode. */
  schema?: object;
  timeoutMs?: number;
}

// ---- model health + thinking config ------------------------------------------

type ThinkingConfig = { thinkingBudget: number } | { thinkingLevel: 'minimal' | 'low' } | null;

const downUntil = new Map<string, number>();
const thinkingFallback = new Map<string, number>(); // model → index into THINKING_LADDER that worked
const THINKING_LADDER: ThinkingConfig[] = [{ thinkingLevel: 'minimal' }, { thinkingLevel: 'low' }, null];

const isDown = (model: string) => (downUntil.get(model) ?? 0) > Date.now();
const markDown = (model: string, ms: number) => downUntil.set(model, Date.now() + ms);

/** Smallest thinking allowance per model family. null = omit the field. */
export function thinkingConfigFor(model: string): ThinkingConfig {
  if (/^gemini-2\.5-pro/.test(model)) return { thinkingBudget: 128 }; // can't be disabled
  if (/^gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 };
  if (/^gemini-(1\.|2\.0)/.test(model)) return null; // no thinking support
  return THINKING_LADDER[thinkingFallback.get(model) ?? 0] ?? null;
}

/** Test hook: forget model health and thinking fallbacks. */
export function resetModelHealth(): void {
  downUntil.clear();
  thinkingFallback.clear();
}

// ---- public API -------------------------------------------------------------

/** Generate text (or JSON) with automatic model fallback. */
export async function generate(o: GenerateOptions, waited = false): Promise<{ text: string; model: string }> {
  if (!o.apiKey) throw new LlmError('auth', 'No Gemini API key set.');
  const pinned = !!o.model && o.model !== 'auto';
  const chain = pinned ? [o.model!] : FREE_TIER_CHAIN;
  let candidates = chain.filter((m) => !isDown(m));
  if (candidates.length === 0) candidates = chain; // everything flagged: try anyway

  let lastErr: LlmError | null = null;
  for (const model of candidates) {
    try {
      const text = await callWithRetries(model, o, pinned || candidates.length === 1);
      return { text, model };
    } catch (err) {
      if (!(err instanceof LlmError)) throw err;
      if (err.kind === 'auth' || err.kind === 'bad_request' || err.kind === 'blocked') throw err;
      lastErr = err;
      // Remember why this model failed so the next call skips it for a while.
      const ms = err.daily ? 6 * 3600e3 : err.kind === 'not_found' ? 24 * 3600e3 : err.kind === 'quota' ? Math.max(err.retryAfterMs, 60e3) : 90e3;
      markDown(model, ms);
    }
  }
  // Everything was only briefly unavailable (per-minute limit, overload,
  // timeout): wait out the shortest cooldown once and retry the best model
  // rather than failing the turn.
  const transient = !!lastErr && (lastErr.kind === 'overloaded' || lastErr.kind === 'timeout' || (lastErr.kind === 'quota' && !lastErr.daily));
  if (transient && !waited) {
    await sleep(Math.min(30000, Math.max(3000, lastErr!.retryAfterMs || 5000)));
    for (const m of chain) if ((downUntil.get(m) ?? 0) - Date.now() < 3600e3) downUntil.delete(m);
    return generate(o, true);
  }
  throw lastErr ?? new LlmError('network', 'No model available.');
}

/** Check a key without spending generation quota (lists models). */
export async function validateKey(apiKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${ENDPOINT}?pageSize=5&key=${encodeURIComponent(apiKey)}`);
    if (res.ok) return { ok: true };
    const err = await toLlmError(res, '');
    return { ok: false, error: err.kind === 'auth' ? 'That key was rejected by Google. Double-check you copied all of it.' : err.message };
  } catch {
    return { ok: false, error: "Couldn't reach Google. Check your connection." };
  }
}

// ---- internals --------------------------------------------------------------

async function callWithRetries(model: string, o: GenerateOptions, patient: boolean): Promise<string> {
  let attempt = 0;
  let maxOut = o.maxOutputTokens ?? 512;
  for (;;) {
    try {
      return await callOnce(model, { ...o, maxOutputTokens: maxOut });
    } catch (err) {
      if (!(err instanceof LlmError)) throw err;
      attempt++;
      // Thinking config rejected → step down the ladder and retry at once.
      if (err.kind === 'bad_request' && /thinking/i.test(err.message)) {
        const next = (thinkingFallback.get(model) ?? 0) + 1;
        if (next < THINKING_LADDER.length && !/^gemini-2\./.test(model)) {
          thinkingFallback.set(model, next);
          continue;
        }
      }
      // Truncated before any visible text: give it more room once.
      if (err.kind === 'empty' && err.truncated && attempt <= 1) {
        maxOut *= 2;
        continue;
      }
      const short = err.retryAfterMs > 0 && err.retryAfterMs <= 8000;
      const retryable = (err.kind === 'quota' && !err.daily && (short || patient)) || err.kind === 'overloaded' || err.kind === 'network';
      if (!retryable || attempt > (patient ? 3 : 1)) throw err;
      await sleep(Math.min(err.retryAfterMs || 800 * 2 ** (attempt - 1), patient ? 30000 : 8000));
    }
  }
}

interface GeminiResponse {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
}

async function callOnce(model: string, o: GenerateOptions): Promise<string> {
  const generationConfig: Record<string, unknown> = { temperature: o.temperature ?? 0.9, maxOutputTokens: o.maxOutputTokens };
  const thinking = thinkingConfigFor(model);
  if (thinking) generationConfig.thinkingConfig = thinking;
  if (o.schema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = o.schema;
  }
  const body: Record<string, unknown> = {
    contents: o.messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig,
    safetySettings: SAFETY_SETTINGS,
  };
  if (o.system) body.systemInstruction = { parts: [{ text: o.system }] };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(o.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw new LlmError('timeout', `${model} took too long to answer.`, { model });
    throw new LlmError('network', "Couldn't reach Google. Check your connection.", { model });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw await toLlmError(res, model);
  const data = (await res.json()) as GeminiResponse;
  if (data.promptFeedback?.blockReason) throw new LlmError('blocked', `Gemini blocked the message (${data.promptFeedback.blockReason}).`, { model });
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  const finish = cand?.finishReason ?? '';
  if (['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII'].includes(finish)) throw new LlmError('blocked', "Gemini's safety filter stopped that reply.", { model });
  if (!text) {
    const e = new LlmError('empty', `${model} returned an empty reply (${finish || 'no reason'}).`, { model });
    e.truncated = finish === 'MAX_TOKENS';
    throw e;
  }
  return text;
}

interface ErrorPayload {
  error?: { message?: string; details?: { '@type'?: string; retryDelay?: string; reason?: string; violations?: { quotaId?: string }[] }[] };
}

/** Map an HTTP error response to an LlmError (exported for tests). */
export async function toLlmError(res: Pick<Response, 'status' | 'json'>, model: string): Promise<LlmError> {
  let payload: ErrorPayload = {};
  try {
    payload = (await res.json()) as ErrorPayload;
  } catch {
    /* not JSON */
  }
  const err = payload.error ?? {};
  const status = res.status;
  const msg = err.message ?? `HTTP ${status}`;
  const details = err.details ?? [];

  const retryInfo = details.find((d) => String(d['@type']).includes('RetryInfo'));
  const retryAfterMs = retryInfo?.retryDelay ? parseFloat(retryInfo.retryDelay) * 1000 : 0;
  const daily = details.flatMap((d) => d.violations ?? []).some((v) => /PerDay/i.test(v.quotaId ?? ''));

  const keyProblem = /API key|API_KEY/i.test(msg) || details.some((d) => /API_KEY/.test(d.reason ?? ''));
  if (keyProblem && (status === 400 || status === 401 || status === 403)) return new LlmError('auth', 'Your Gemini API key was rejected.', { status, model });
  if (status === 429) return new LlmError('quota', daily ? `${model}'s free daily quota is used up.` : `${model} is rate-limited right now.`, { status, model, retryAfterMs, daily });
  if (status === 404 || status === 403) return new LlmError('not_found', `${model} isn't available for this key.`, { status, model });
  if (status >= 500 && status <= 504) return new LlmError('overloaded', `${model} is overloaded right now.`, { status, model });
  return new LlmError('bad_request', msg, { status, model });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
