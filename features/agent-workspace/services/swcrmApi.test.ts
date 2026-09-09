import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSwcrmFilter, SWCRM_NULL_FILTER_VALUE, swcrmApi } from './swcrmApi';

describe('swcrmApi', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('authToken', 'policyhq-token');
    vi.restoreAllMocks();
  });

  it('serializes every list input into the GET request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      itemsReceived: 1,
      curPage: 2,
      nextPage: 3,
      prevPage: 1,
      offset: 25,
      itemsTotal: 50,
      pageTotal: 2,
      items: [{ id: 'row-1', location_id: 'location-1', name: '"Roy Stephens"', isPaused: true, PIT: 'pit-123', pit_status: true, pit_message: 'PIT is connected' }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const filter = buildSwcrmFilter({ locationId: 'location-1', accountType: ['agency'], saasMode: ['activated'], subscriptionPlan: ['Simplywork CRM - Eliteone'], paused: 'true', pitStatus: 'true' });
    const result = await swcrmApi.list({ is_staff: true, page: 2, per_page: 25, sort: { name: 'asc' }, filter, search: 'Roy' });

    const [url, options] = fetchMock.mock.calls[0];
    const requestUrl = new URL(url);
    expect(requestUrl.origin + requestUrl.pathname).toBe('https://api1.simplyworkcrm.com/api:SZgR1JsR/swcrm/locations');
    expect(Object.fromEntries(['is_staff', 'page', 'per_page', 'search'].map(key => [key, requestUrl.searchParams.get(key)]))).toEqual({ is_staff: 'true', page: '2', per_page: '25', search: 'Roy' });
    expect(JSON.parse(requestUrl.searchParams.get('sort') || '{}')).toEqual({ name: 'asc' });
    expect(JSON.parse(requestUrl.searchParams.get('filter') || '{}')).toEqual(filter);
    expect(options.headers.Authorization).toBe('Bearer policyhq-token');
    expect(result.items[0]).toMatchObject({ name: 'Roy Stephens', location_id: 'location-1', isPaused: true, PIT: 'pit-123', pit_status: true, pit_message: 'PIT is connected' });
  });

  it('builds exact filters and OR-groups multi-select values', () => {
    const filter = buildSwcrmFilter({
      locationId: ' location-1 ',
      accountType: ['agency', 'individual'],
      saasMode: ['activated', 'setup_pending'],
      subscriptionPlan: ['Activation Set Up', 'SimplyWork CRM - Legacy'],
      paused: 'false',
      pitStatus: 'true',
    }) as any;
    const expression = filter.expression[0].group.expression;

    expect(expression).toHaveLength(6);
    expect(expression[0].statement).toMatchObject({ left: { operand: 'location_id' }, op: '==', right: { operand: 'location-1' } });
    expect(expression[1].group.expression.map((item: any) => [item.or, item.statement.left.operand, item.statement.right.operand])).toEqual([
      [false, 'account_type', 'agency'],
      [true, 'account_type', 'individual'],
    ]);
    expect(expression[2].group.expression.map((item: any) => [item.or, item.statement.left.operand, item.statement.right.operand])).toEqual([
      [false, 'saas_mode', 'activated'],
      [true, 'saas_mode', 'setup_pending'],
    ]);
    expect(expression[3].group.expression.map((item: any) => [item.or, item.statement.left.operand, item.statement.right.operand])).toEqual([
      [false, 'subscription_plan', 'Activation Set Up'],
      [true, 'subscription_plan', 'SimplyWork CRM - Legacy'],
    ]);
    expect(expression[4].statement.right.operand).toBe(false);
    expect(expression[5].statement).toMatchObject({ left: { operand: 'pit_status' }, right: { operand: true } });
  });

  it('serializes selected null schema options as JSON null operands', () => {
    const filter = buildSwcrmFilter({ locationId: '', accountType: [], saasMode: [SWCRM_NULL_FILTER_VALUE], subscriptionPlan: [], paused: '', pitStatus: '' }) as any;
    expect(filter.expression[0].group.expression[0].statement).toMatchObject({
      left: { operand: 'saas_mode' },
      op: '==',
      right: { operand: null },
    });
  });

  it('loads schema-backed account type, SaaS mode, and subscription plan options', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(['agency', 'agent secondary', 'individual', 'lead hub']), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([null, 'activated', 'not_activated', 'setup_pending']), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(['Activation Set Up', 'Simplywork CRM - Eliteone']), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(swcrmApi.getAccountTypeOptions(true)).resolves.toEqual([SWCRM_NULL_FILTER_VALUE, 'agency', 'agent secondary', 'individual', 'lead hub']);
    await expect(swcrmApi.getSaasModeOptions(true)).resolves.toEqual([SWCRM_NULL_FILTER_VALUE, 'activated', 'not_activated', 'setup_pending']);
    await expect(swcrmApi.getSubscriptionPlanOptions(true)).resolves.toEqual([SWCRM_NULL_FILTER_VALUE, 'Activation Set Up', 'Simplywork CRM - Eliteone']);

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      'https://api1.simplyworkcrm.com/api:SZgR1JsR/swcrm/locations/schema/account_type?is_staff=true',
      'https://api1.simplyworkcrm.com/api:SZgR1JsR/swcrm/locations/schema/saas_mode?is_staff=true',
      'https://api1.simplyworkcrm.com/api:SZgR1JsR/swcrm/locations/schema/subscription_plan?is_staff=true',
    ]);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer policyhq-token');
  });

  it('posts the newly entered PIT and preserves a false verification result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'row-1',
      location_id: 'location-1',
      PIT: 'pit-new',
      pit_status: false,
      pit_message: 'PIT could not be verified',
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await swcrmApi.verifyPit({ is_staff: true, location_id: 'location-1', pit: 'pit-new' });

    expect(fetchMock).toHaveBeenCalledWith('https://api1.simplyworkcrm.com/api:SZgR1JsR/swcrm/locations/pit/verify', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ is_staff: true, location_id: 'location-1', pit: 'pit-new' }),
    }));
    expect(result).toMatchObject({ PIT: 'pit-new', pit_status: false, pit_message: 'PIT could not be verified' });
  });

  it('patches only the record id and changed location fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'row-1', account_type: null }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await swcrmApi.updateLocation({ id: 'row-1', account_type: null });

    expect(fetchMock).toHaveBeenCalledWith('https://api1.simplyworkcrm.com/api:SZgR1JsR/swcrm/locations', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ id: 'row-1', account_type: null }),
    }));
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer policyhq-token');
  });
});
