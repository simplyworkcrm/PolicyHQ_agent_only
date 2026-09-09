import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildHcmsFilter, hcmsApi } from './hcmsApi';

describe('hcmsApi filters', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('authToken', 'policyhq-token');
    vi.restoreAllMocks();
  });

  it('builds the grouped Xano expression used by ticket filters', () => {
    expect(buildHcmsFilter({ name: '', status: 'active', team: '', npn: '', primaryUpline: '', productionUpline: '' })).toEqual({
      expression: [{
        or: false,
        type: 'group',
        group: {
          expression: [{
            or: false,
            type: 'statement',
            statement: {
              left: { tag: 'col', operand: 'status' },
              op: '==',
              right: { operand: 'active' },
            },
          }],
        },
      }],
    });
  });

  it('serializes the expression into the GET filter parameter', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      itemsReceived: 0,
      curPage: 1,
      nextPage: null,
      prevPage: null,
      offset: 0,
      perPage: 25,
      itemsTotal: 0,
      pageTotal: 1,
      items: [],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const filter = buildHcmsFilter({ name: '', status: 'active', team: '', npn: '', primaryUpline: '', productionUpline: '' });
    await hcmsApi.list({ is_staff: true, page: 1, per_page: 25, search: null, filter, sort: { name: 'asc' } });

    const [url, options] = fetchMock.mock.calls[0];
    const requestUrl = new URL(url);
    expect(JSON.parse(requestUrl.searchParams.get('filter') || '{}')).toEqual(filter);
    expect(options.headers).toEqual({ Authorization: 'Bearer policyhq-token', 'Content-Type': 'application/json' });
  });

  it('uses partial matching for agent name and NPN', () => {
    const filter = buildHcmsFilter({ name: 'Aaron', status: '', team: '', npn: '212', primaryUpline: '', productionUpline: '' }) as any;
    expect(filter.expression[0].group.expression.map((item: any) => item.statement)).toEqual([
      { left: { tag: 'col', operand: 'name' }, op: 'ilike', right: { operand: '%Aaron%' } },
      { left: { tag: 'col', operand: 'npn' }, op: 'ilike', right: { operand: '%212%' } },
    ]);
  });

  it('uses partial matching for both upline names', () => {
    const filter = buildHcmsFilter({ name: '', status: '', team: '', npn: '', primaryUpline: 'Brian', productionUpline: 'Rachel' }) as any;
    expect(filter.expression[0].group.expression.map((item: any) => item.statement)).toEqual([
      { left: { tag: 'col', operand: 'primaryUpline_name' }, op: 'ilike', right: { operand: '%Brian%' } },
      { left: { tag: 'col', operand: 'productionUpline_name' }, op: 'ilike', right: { operand: '%Rachel%' } },
    ]);
  });

  it('loads authenticated team dropdown options from the schema endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(['Elite One Financial', 'FFL Illuminate']), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(hcmsApi.getTeamOptions(true)).resolves.toEqual(['Elite One Financial', 'FFL Illuminate']);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api1.simplyworkcrm.com/api:SZgR1JsR/hcms/schema/team?is_staff=true');
    expect(options.headers).toEqual({ Authorization: 'Bearer policyhq-token', 'Content-Type': 'application/json' });
  });
});
