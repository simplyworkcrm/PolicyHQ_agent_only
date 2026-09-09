import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSwcrmFilter, swcrmApi } from './swcrmApi';

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
      items: [{ id: 'row-1', location_id: 'location-1', name: '"Roy Stephens"', isPaused: true }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const filter = buildSwcrmFilter({ accountType: 'agency', saasMode: 'activated', subscriptionStatus: 'active', paused: 'true' });
    const result = await swcrmApi.list({ is_staff: true, page: 2, per_page: 25, sort: { name: 'asc' }, filter, search: 'Roy' });

    const [url, options] = fetchMock.mock.calls[0];
    const requestUrl = new URL(url);
    expect(requestUrl.origin + requestUrl.pathname).toBe('https://api1.simplyworkcrm.com/api:SZgR1JsR/swcrm/locations');
    expect(Object.fromEntries(['is_staff', 'page', 'per_page', 'search'].map(key => [key, requestUrl.searchParams.get(key)]))).toEqual({ is_staff: 'true', page: '2', per_page: '25', search: 'Roy' });
    expect(JSON.parse(requestUrl.searchParams.get('sort') || '{}')).toEqual({ name: 'asc' });
    expect(JSON.parse(requestUrl.searchParams.get('filter') || '{}')).toEqual(filter);
    expect(options.headers.Authorization).toBe('Bearer policyhq-token');
    expect(result.items[0]).toMatchObject({ name: 'Roy Stephens', location_id: 'location-1', isPaused: true });
  });

  it('keeps false as a boolean in the paused filter', () => {
    const filter = buildSwcrmFilter({ accountType: '', saasMode: '', subscriptionStatus: '', paused: 'false' }) as any;
    expect(filter.expression[0].group.expression[0].statement.right.operand).toBe(false);
  });
});
