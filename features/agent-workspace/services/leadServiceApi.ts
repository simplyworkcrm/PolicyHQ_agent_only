import { ApiError } from '../../../services/api';

const LEAD_SERVICE_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/lead_service';
const LEAD_SERVICE_DASHBOARD_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/lead_service/dashboard';
const LEAD_SERVICES_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/lead_services';

export type LeadServiceDeliveryOption = 'mailer_only' | 'mailer_csv' | 'csv_only';
export type LeadServiceStatus = 'waiting' | 'in progress' | 'needs attention' | 'complete' | 'completed-incomplete';

export interface CreateLeadServiceInput {
  start_date: string;
  quantity: number;
  lead_type: string;
  delivery_option: LeadServiceDeliveryOption;
  additional_comments: string | null;
  agent_id: string;
  csv_files: File[];
  pdf_files: File[];
}

export interface LeadServiceRecord {
  id: string;
  reference: string;
  start_date: string;
  quantity: number;
  lead_type: string;
  delivery_option: LeadServiceDeliveryOption;
  additional_comments: string | null;
  agent_id: string | null;
  agent_name: string;
  requester_name: string;
  requester_email: string;
  handler_name: string;
  handler_id: string;
  status: LeadServiceStatus;
  csv_files: unknown[];
  pdf_files: unknown[];
  created_at: string;
  updated_at: string;
}

export interface LeadServiceDashboardResponse {
  counts: Record<LeadServiceStatus, number>;
  latest_requests: LeadServiceRecord[];
}

export interface LeadServiceListInput {
  is_staff: boolean;
  agent_id: string;
  filter: Record<string, unknown>;
  page: number;
  per_page: string;
  sort: Record<string, 'asc' | 'desc'>;
}

export interface LeadServiceListResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: LeadServiceRecord[];
}

const parseResponse = async (response: Response) => {
  const body = await response.text();
  if (!body) return null;
  try { return JSON.parse(body); } catch { return body; }
};

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` });
const statuses: LeadServiceStatus[] = ['waiting', 'in progress', 'needs attention', 'complete', 'completed-incomplete'];

const normalizeStatus = (value: unknown): LeadServiceStatus => {
  const normalized = String(value || '').trim().toLowerCase().replace(/_/g, ' ');
  if (normalized === 'completed') return 'complete';
  if (normalized === 'completed incomplete' || normalized === 'completed-incomplete' || normalized === 'completed - incomplete') return 'completed-incomplete';
  return statuses.includes(normalized as LeadServiceStatus) ? normalized as LeadServiceStatus : 'waiting';
};

const normalizeRecord = (value: unknown): LeadServiceRecord => {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const id = String(row.id ?? row.lead_service_id ?? '');
  const referenceNumber = row.reference_number ?? row.reference ?? row.request_number ?? row.ticket_number;
  const referenceValue = String(referenceNumber ?? '');
  const createdAt = row.created_at ?? row.createdAt ?? '';
  const updatedAt = row.updated_at ?? row.updatedAt ?? createdAt;
  const normalizeTimestamp = (timestamp: unknown) => {
    if (typeof timestamp === 'number' && Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
    if (typeof timestamp === 'string' && /^\d{12,}$/.test(timestamp)) return new Date(Number(timestamp)).toISOString();
    return String(timestamp ?? '');
  };
  return {
    id,
    reference: referenceValue ? referenceValue.replace(/^LS-/i, '') : '—',
    start_date: String(row.start_date ?? ''),
    quantity: Number(row.quantity) || 0,
    lead_type: String(row.lead_type ?? ''),
    delivery_option: String(row.delivery_option ?? 'csv_only') as LeadServiceDeliveryOption,
    additional_comments: row.additional_comments == null ? null : String(row.additional_comments),
    agent_id: row.createdFor_agent_id == null && row.agent_id == null ? null : String(row.createdFor_agent_id ?? row.agent_id),
    agent_name: String(row.createdfor_agent_name ?? row.createdFor_agent_name ?? row.agent_name ?? row.agent ?? '').trim(),
    requester_name: String(row.createdby_ghl_user_name ?? row.createdBy_ghl_user_name ?? '').trim(),
    requester_email: String(row.createdBy_ghl_user_email ?? '').trim(),
    handler_name: String(row.assignedto_ghl_user_name ?? row.assignedTo_ghl_user_name ?? row.assigned_ghl_user_name ?? '').trim(),
    handler_id: String(row.assigned_ghl_user_id ?? row.assignedto_ghl_user_id ?? '').trim(),
    status: normalizeStatus(row.status),
    csv_files: Array.isArray(row.csv_files) ? row.csv_files : [],
    pdf_files: Array.isArray(row.pdf_files) ? row.pdf_files : [],
    created_at: normalizeTimestamp(createdAt),
    updated_at: normalizeTimestamp(updatedAt),
  };
};

const emptyCounts = (): Record<LeadServiceStatus, number> => ({
  waiting: 0,
  'in progress': 0,
  'needs attention': 0,
  complete: 0,
  'completed-incomplete': 0,
});

export const leadServiceApi = {
  getActivity: async (id: string, signal?: AbortSignal) => {
    const response = await fetch(`${LEAD_SERVICES_URL}/activity/${encodeURIComponent(id)}`, { method: 'GET', headers: authHeader(), signal });
    if (!response.ok) throw new ApiError('Failed to load lead service activity', response.status);
    const payload = await response.json();
    const rows: unknown[] | undefined = Array.isArray(payload) ? payload : [payload?.activity, payload?.items, payload?.data].find(Array.isArray);
    if (!rows) throw new Error('Unrecognized activity response');
    return rows.flatMap((raw, index) => {
      if (!raw || typeof raw !== 'object') return [];
      const row = raw as Record<string, unknown>;
      const log = String(row.log || '').trim();
      if (!log) return [];
      const rawDate = row.created_at;
      const date = new Date(typeof rawDate === 'number' ? rawDate : String(rawDate || ''));
      return [{ id: String(row.id || index), log, createdAt: Number.isNaN(date.getTime()) ? '' : date.toISOString(), name: String(row.updatedBy_ghl_user_name || '').trim() }];
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  getStatusOptions: async (): Promise<Array<{ value: string; label: string }>> => {
    const response = await fetch(`${LEAD_SERVICES_URL}/schema/status`, { method: 'GET', headers: authHeader() });
    if (!response.ok) throw new ApiError('Failed to load status options', response.status);
    const values = await response.json();
    if (!Array.isArray(values)) throw new Error('Invalid status options response');
    return values.map(value => ({ value: String(value), label: String(value) }));
  },
  getDetails: async (id: string, signal?: AbortSignal): Promise<LeadServiceRecord> => {
    const response = await fetch(`${LEAD_SERVICE_URL}/details/${encodeURIComponent(id)}`, {
      method: 'GET', headers: authHeader(), signal,
    });
    if (!response.ok) throw new ApiError('Failed to load lead service details', response.status);
    return normalizeRecord(await response.json());
  },
  getHandlerOptions: async (): Promise<Array<{ id: string; label: string }>> => {
    const response = await fetch(`${LEAD_SERVICE_URL}/schema/handler`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to load lead service handlers', response.status);
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.data) ? payload.data : [];
    return rows.flatMap((row: { id?: string; first_name?: string; last_name?: string }) => {
      const id = String(row.id || '');
      if (!id) return [];
      return [{ id, label: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Unnamed handler' }];
    });
  },
  update: async (input: { id: string; log: string } & ({ status: string } | { assigned_ghl_user_id: string } | { quantity: number } | { delivery_option: string })) => {
    if ('quantity' in input && (!Number.isSafeInteger(input.quantity) || input.quantity < 0)) throw new Error('Quantity must be a non-negative whole number.');
    const response = await fetch(LEAD_SERVICE_URL, {
      method: 'PATCH',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new ApiError(typeof error?.message === 'string' ? error.message : 'Could not save the lead service change.', response.status);
    }
    return parseResponse(response);
  },
  getFilterOptions: async (isStaff: boolean) => {
    const fetchSchema = async (name: string): Promise<any[]> => {
      const response = await fetch(`${LEAD_SERVICES_URL}/schema/${name}`, { method: 'GET', headers: authHeader() });
      if (!response.ok) throw new ApiError('Failed to load lead service filter options', response.status);
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error('Invalid lead service filter options response');
      return payload;
    };
    const [requesters, requestedFor, delivery, statuses] = await Promise.all([
      isStaff ? fetchSchema('requester') : Promise.resolve([]), isStaff ? fetchSchema('requested_for') : Promise.resolve([]), fetchSchema('delivery_option'), fetchSchema('status'),
    ]);
    return {
      requester: requesters.map(row => ({ value: String(row.lead_service_createdBy_ghl_user_id), label: String(row.createdBy_ghl_user_name) })),
      requestedFor: requestedFor.map(row => ({ value: String(row.lead_service_createdFor_agent_id), label: String(row.lead_service_createdFor_agent_name) })),
      delivery: delivery.map(value => ({ value: String(value), label: value === 'mailer_only' ? 'Mailer only' : value === 'mailer_csv' ? 'Mailer + CSV' : value === 'csv_only' ? 'CSV only' : String(value) })),
      status: statuses.map(value => ({ value: String(value), label: String(value) })),
    };
  },
  create: async (input: CreateLeadServiceInput) => {
    const formData = new FormData();
    formData.append('start_date', input.start_date);
    formData.append('quantity', String(input.quantity));
    formData.append('lead_type', input.lead_type);
    formData.append('delivery_option', input.delivery_option);
    if (input.additional_comments !== null) formData.append('additional_comments', input.additional_comments);
    formData.append('agent_id', input.agent_id);
    input.csv_files.forEach(file => formData.append('csv_files', file, file.name));
    input.pdf_files.forEach(file => formData.append('pdf_files', file, file.name));

    const response = await fetch(LEAD_SERVICE_URL, {
      method: 'POST',
      headers: authHeader(),
      body: formData,
    });
    if (!response.ok) throw new ApiError('Failed to submit lead servicing request', response.status);
    return parseResponse(response);
  },

  getDashboard: async (agentId: string, isStaff: boolean): Promise<LeadServiceDashboardResponse> => {
    const params = new URLSearchParams({ is_staff: String(isStaff), agent_id: agentId });
    const response = await fetch(`${LEAD_SERVICE_DASHBOARD_URL}?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to load the lead servicing dashboard', response.status);
    const payload = await response.json();
    const counts = emptyCounts();
    const rawCounts = payload?.lead_services ?? payload?.counts ?? payload?.statuses ?? payload?.requests;
    if (Array.isArray(rawCounts)) {
      rawCounts.forEach((item: unknown) => {
        const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        counts[normalizeStatus(row.status ?? row.lead_service_status)] += Number(row.count) || 0;
      });
    } else if (rawCounts && typeof rawCounts === 'object') {
      Object.entries(rawCounts as Record<string, unknown>).forEach(([status, count]) => {
        counts[normalizeStatus(status)] += Number(count) || 0;
      });
    }
    const latest = payload?.latest_lead_services ?? payload?.latest_requests ?? payload?.latest ?? payload?.items ?? [];
    return { counts, latest_requests: Array.isArray(latest) ? latest.map(normalizeRecord) : [] };
  },

  list: async (input: LeadServiceListInput): Promise<LeadServiceListResponse> => {
    const params = new URLSearchParams({
      is_staff: String(input.is_staff),
      filter: JSON.stringify(input.filter),
      agent_id: input.agent_id,
      page: String(input.page),
      per_page: input.per_page,
      sort: JSON.stringify(input.sort),
    });
    const response = await fetch(`${LEAD_SERVICES_URL}?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new ApiError(typeof error?.message === 'string' ? error.message : 'Failed to load lead servicing requests', response.status);
    }
    const payload = await response.json();
    const rawItems = Array.isArray(payload?.items) ? payload.items : [];
    return {
      itemsReceived: Number(payload?.itemsReceived || 0),
      curPage: Number(payload?.curPage || input.page),
      nextPage: payload?.nextPage == null ? null : Number(payload.nextPage),
      prevPage: payload?.prevPage == null ? null : Number(payload.prevPage),
      offset: Number(payload?.offset || 0),
      perPage: Number(payload?.perPage || input.per_page),
      itemsTotal: Number(payload?.itemsTotal || 0),
      pageTotal: Number(payload?.pageTotal || 1),
      items: Array.isArray(rawItems) ? rawItems.map(normalizeRecord) : [],
    };
  },
};
