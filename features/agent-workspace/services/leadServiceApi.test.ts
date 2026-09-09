import { beforeEach, describe, expect, it, vi } from 'vitest';
import { leadServiceApi } from './leadServiceApi';

describe('leadServiceApi', () => {
  it.each([
    { id: 'request-id', log: 'Test change.', status: 'completed - incomplete' },
    { id: 'request-id', log: 'Test change.', assigned_ghl_user_id: 'handler-id' },
    { id: 'request-id', log: 'Test change.', quantity: 350 },
    { id: 'request-id', log: 'Test change.', delivery_option: 'mailer_csv' },
  ])('patches only the changed field: %o', async input => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    await leadServiceApi.update(input);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api1.simplyworkcrm.com/api:SZgR1JsR/lead_service');
    expect(options.method).toBe('PATCH');
    expect(options.headers).toEqual({ Authorization: 'Bearer policyhq-token', 'Content-Type': 'application/json' });
    expect(JSON.parse(options.body)).toEqual(input);
  });

  it('rejects fractional quantities before sending a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(leadServiceApi.update({ id: 'request-id', log: 'Test change.', quantity: 1.5 })).rejects.toThrow('whole number');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a rejected patch rather than treating it as saved', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Staff access required' }), { status: 403 })));
    await expect(leadServiceApi.update({ id: 'request-id', log: 'Test change.', status: 'waiting' })).rejects.toThrow('Staff access required');
  });
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('authToken', 'policyhq-token');
    vi.restoreAllMocks();
  });

  it('submits scalar fields and repeated CSV/PDF files as authenticated multipart data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 42 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const csvFiles = [new File(['name,phone'], 'aged-mp.csv', { type: 'text/csv' })];
    const pdfFiles = [new File(['mailer'], 'mailer.pdf', { type: 'application/pdf' })];

    await leadServiceApi.create({
      start_date: '2026-09-05',
      quantity: 500,
      lead_type: 'Aged MP',
      delivery_option: 'mailer_csv',
      additional_comments: null,
      agent_id: 'agent-123',
      csv_files: csvFiles,
      pdf_files: pdfFiles,
    });

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = options.body as FormData;
    expect(url).toBe('https://api1.simplyworkcrm.com/api:SZgR1JsR/lead_service');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ Authorization: 'Bearer policyhq-token' });
    expect(body.get('start_date')).toBe('2026-09-05');
    expect(body.get('quantity')).toBe('500');
    expect(body.get('lead_type')).toBe('Aged MP');
    expect(body.get('delivery_option')).toBe('mailer_csv');
    expect(body.get('additional_comments')).toBeNull();
    expect(body.get('agent_id')).toBe('agent-123');
    expect((body.getAll('csv_files')[0] as File).name).toBe('aged-mp.csv');
    expect((body.getAll('pdf_files')[0] as File).name).toBe('mailer.pdf');
  });

  it('loads dashboard counts and normalizes the five supported statuses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      lead_services: [
        { lead_service_status: 'waiting', count: 2 },
        { lead_service_status: 'in progress', count: 3 },
        { lead_service_status: 'needs attention', count: 1 },
        { lead_service_status: 'complete', count: 4 },
        { lead_service_status: 'completed-incomplete', count: 1 },
      ],
      latest_lead_services: [{
        id: 'f33bef1e-fd61-4b3a-b633-eb03a2e1cad2',
        reference_number: 2,
        created_at: 1788744166624,
        updated_at: null,
        createdFor_agent_id: 'agent-123',
        createdFor_agent_name: 'Suzanne Gimeno',
        status: 'in progress',
        lead_type: 'GOAT FEX',
        quantity: 250,
      }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await leadServiceApi.getDashboard('agent-123', true);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api1.simplyworkcrm.com/api:SZgR1JsR/lead_service/dashboard?is_staff=true&agent_id=agent-123',
      { method: 'GET', headers: { Authorization: 'Bearer policyhq-token' } },
    );
    expect(result.counts).toEqual({ waiting: 2, 'in progress': 3, 'needs attention': 1, complete: 4, 'completed-incomplete': 1 });
    expect(result.latest_requests[0]).toMatchObject({
      id: 'f33bef1e-fd61-4b3a-b633-eb03a2e1cad2',
      reference: '2',
      status: 'in progress',
      lead_type: 'GOAT FEX',
      quantity: 250,
      agent_id: 'agent-123',
      agent_name: 'Suzanne Gimeno',
      created_at: new Date(1788744166624).toISOString(),
    });
  });

  it('loads a filtered, paginated lead service list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{ id: '17', reference_number: 17, created_at: 1788744166624, createdby_ghl_user_name: 'Requester Name', createdfor_agent_name: 'Agent Name', assignedto_ghl_user_name: 'Handler Name', status: 'needs attention', delivery_option: 'csv_only' }],
      curPage: 2,
      perPage: 20,
      itemsTotal: 31,
      pageTotal: 2,
      itemsReceived: 1,
      offset: 20,
      nextPage: null,
      prevPage: 1,
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const filter = { expression: [{ or: false, type: 'group', group: { expression: [{ or: false, type: 'statement', statement: { left: { tag: 'col', operand: 'status' }, op: '==', right: { operand: 'needs attention' } } }] } }] };
    const result = await leadServiceApi.list({ is_staff: true, agent_id: 'agent-123', filter, page: 2, per_page: '20', sort: { created_at: 'desc' } });

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://api1.simplyworkcrm.com/api:SZgR1JsR/lead_services?');
    expect(url).toContain('agent_id=agent-123');
    const params = new URL(url).searchParams;
    expect(params.get('is_staff')).toBe('true');
    expect(JSON.parse(params.get('filter')!)).toEqual(filter);
    expect(JSON.parse(params.get('sort')!)).toEqual({ created_at: 'desc' });
    expect(params.get('per_page')).toBe('20');
    expect(params.has('search')).toBe(false);
    expect(url).toContain('page=2');
    expect(options).toEqual({ method: 'GET', headers: { Authorization: 'Bearer policyhq-token' } });
    expect(result).toMatchObject({ curPage: 2, perPage: 20, itemsTotal: 31, pageTotal: 2, itemsReceived: 1, offset: 20, nextPage: null, prevPage: 1 });
    expect(result.items[0]).toMatchObject({ id: '17', reference: '17', requester_name: 'Requester Name', agent_name: 'Agent Name', handler_name: 'Handler Name', created_at: new Date(1788744166624).toISOString(), status: 'needs attention', delivery_option: 'csv_only' });
  });
});
