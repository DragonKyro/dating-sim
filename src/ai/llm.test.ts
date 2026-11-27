import { FREE_TIER_CHAIN, thinkingConfigFor, toLlmError } from './llm';

const res = (status: number, body: unknown) => ({ status, json: async () => body });

describe('thinking config', () => {
  it('turns thinking off or to its minimum for every model family', () => {
    expect(thinkingConfigFor('gemini-2.5-flash')).toEqual({ thinkingBudget: 0 });
    expect(thinkingConfigFor('gemini-2.5-pro')).toEqual({ thinkingBudget: 128 });
    expect(thinkingConfigFor('gemini-2.0-flash')).toBeNull();
    expect(thinkingConfigFor('gemini-3.5-flash-lite')).toEqual({ thinkingLevel: 'minimal' });
  });

  it('leads the free-tier chain with a high-allowance model', () => {
    expect(FREE_TIER_CHAIN[0]).toBe('gemini-3.5-flash-lite');
  });
});

describe('error mapping', () => {
  it('daily free-tier 429 is a daily quota error', async () => {
    const e = await toLlmError(res(429, { error: { message: 'quota', details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }] } }), 'm');
    expect(e.kind).toBe('quota');
    expect(e.daily).toBe(true);
  });

  it('per-minute 429 carries the retry delay', async () => {
    const e = await toLlmError(res(429, { error: { message: 'slow down', details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '7s' }] } }), 'm');
    expect(e.daily).toBe(false);
    expect(e.retryAfterMs).toBe(7000);
  });

  it('a rejected key is an auth error; 503 is overloaded; 404 is not_found', async () => {
    expect((await toLlmError(res(400, { error: { message: 'API key not valid. Please pass a valid API key.' } }), 'm')).kind).toBe('auth');
    expect((await toLlmError(res(503, {}), 'm')).kind).toBe('overloaded');
    expect((await toLlmError(res(404, { error: { message: 'no longer available' } }), 'm')).kind).toBe('not_found');
  });
});
