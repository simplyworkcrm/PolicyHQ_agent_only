import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { incomeCoachApi } from './incomeCoachApi';

describe('incomeCoachApi', () => {
  beforeEach(() => {
    localStorage.setItem('authToken', 'policyhq-session-token');
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('sends the authenticated PolicyHQ session with the plan result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('Your plan is ready.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(incomeCoachApi.getFeedback('authoritative plan result')).resolves.toBe(
      'Your plan is ready.',
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ai/income_coach'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer policyhq-session-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ result: 'authoritative plan result' }),
      }),
    );
  });

  it('reads the one-item JSON array returned by the Income Coach endpoint', async () => {
    const feedback = '## Your plan\n\n- Submit 2 applications each working day.';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify([feedback]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    await expect(incomeCoachApi.getFeedback('authoritative plan result')).resolves.toBe(feedback);
  });

  it('reads nested AI content arrays without treating successful responses as empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        output: [{ content: [{ type: 'output_text', text: 'Keep the daily pace consistent.' }] }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    await expect(incomeCoachApi.getFeedback('authoritative plan result')).resolves.toBe(
      'Keep the daily pace consistent.',
    );
  });
});
