import { beforeEach, describe, expect, it, vi } from 'vitest';
import { insuranceToolkitsApi } from './insuranceToolkitsApi';

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

describe('insuranceToolkitsApi', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('authToken', 'policyhq-token');
    vi.restoreAllMocks();
  });

  it('connects with InsuranceToolkits credentials behind PolicyHQ auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ connected: true, status: 'connected', account_email: 'agent@example.com' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(insuranceToolkitsApi.connect({ email: 'agent@example.com', password: 'secret' })).resolves.toMatchObject({ connected: true });
    expect(fetchMock).toHaveBeenCalledWith('/insurance-toolkits/connect', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer policyhq-token' }),
      body: JSON.stringify({ email: 'agent@example.com', password: 'secret' }),
    }));
  });

  it('loads connection status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ connected: false, status: 'disconnected' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(insuranceToolkitsApi.getStatus()).resolves.toEqual({ connected: false, status: 'disconnected' });
    expect(fetchMock).toHaveBeenCalledWith('/insurance-toolkits/status', expect.objectContaining({ method: 'GET' }));
  });

  it('submits a normalized FEX quote and preserves quote results', async () => {
    const payload = { quotes: [{ company: 'Example Life', monthly: 72.5 }], excluded: [{ name: 'Carrier B', why: 'Age' }] };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    const request = {
      toolkit: 'FEX' as const,
      coverageType: 'Level' as const,
      sex: 'Male' as const,
      state: 'TX',
      age: 65,
      tobacco: 'None' as const,
      paymentType: 'Bank Draft/EFT' as const,
      faceAmount: 15000,
      underwritingItems: [],
    };

    await expect(insuranceToolkitsApi.quoteFex(request)).resolves.toMatchObject(payload);
    expect(fetchMock).toHaveBeenCalledWith('/insurance-toolkits/fex/quote', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(request),
    }));
  });

  it('disconnects the saved integration', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ disconnected: true, status: 'disconnected' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(insuranceToolkitsApi.disconnect()).resolves.toEqual({ disconnected: true, status: 'disconnected' });
    expect(fetchMock).toHaveBeenCalledWith('/insurance-toolkits/disconnect', expect.objectContaining({ method: 'POST' }));
  });
});
