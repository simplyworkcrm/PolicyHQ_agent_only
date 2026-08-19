import { BASE_URL, ApiError } from '../../../services/api';

const CREATE_TICKET_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/ticket';
const IS_STAFF_URL = `${CREATE_TICKET_URL}/is_staff`; // Authenticated user only; independent of agent context.
const TICKET_SCHEMA_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/tickets/schema';
const IMAGE_METADATA_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/image/metadata';
const TICKETS_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/tickets';
const STALE_TICKETS_URL = `${TICKETS_URL}/stale`;
const QUICK_EDIT_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/ticket/quick_edit';
const COMPLETE_TICKET_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/ticket/complete';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

const authOnlyHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
});

export interface CreateTicketInput {
  subject: string;
  category: string;
  priority: string;
  description: string;
  screenshots: ImageMetadata[];
  urls: string[];
}

export type ImageMetadata = Record<string, unknown>;

export interface TicketListInput {
  is_staff: boolean;
  filter: Record<string, unknown>;
  search: string | null;
  page: number;
  per_page: string;
  sort: Record<string, unknown>;
}

export interface TicketListResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: unknown[];
}

export interface TicketSchemaOption {
  value: string;
  label: string;
  description?: string;
}

export interface TicketHandlerOption {
  id: string;
  firstName: string;
  lastName: string;
  label: string;
}

export interface TicketRequesterOption {
  id: string;
  label: string;
}

export interface QuickEditTicketInput {
  ticket_id: string;
  category: string | null;
  priority: string | null;
  status: string | null;
  handler: string | null;
  cohandler: string | null;
  log: string;
}

export interface CompleteTicketInput {
  ticket_id: string;
  status: string;
  log: string;
  resolution: string;
}

const normalizeSchemaOptions = (payload: unknown): TicketSchemaOption[] => {
  const record = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null;
  const values = Array.isArray(payload)
    ? payload
    : (['options', 'items', 'data'].map(key => record?.[key]).find(Array.isArray) as unknown[] | undefined) || [];

  return values.flatMap(option => {
    if (typeof option === 'string' || typeof option === 'number') {
      const value = String(option);
      return value ? [{ value, label: value }] : [];
    }
    if (!option || typeof option !== 'object') return [];
    const item = option as Record<string, unknown>;
    const rawValue = item.value ?? item.id ?? item.name ?? item.label;
    if (rawValue === undefined || rawValue === null || rawValue === '') return [];
    const value = String(rawValue);
    return [{
      value,
      label: String(item.label ?? item.name ?? value),
      description: item.description || item.note ? String(item.description ?? item.note) : undefined,
    }];
  });
};

export const agentTicketsApi = {
  getStaleCount: async (): Promise<number> => {
    const response = await fetch(STALE_TICKETS_URL, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to load stale ticket count', response.status);

    const body = await response.text();
    let payload: unknown = body;
    try { payload = JSON.parse(body); } catch { /* Plain numeric responses are supported. */ }

    if (Array.isArray(payload)) return payload.length;
    if (typeof payload === 'number' || typeof payload === 'string') {
      const count = Number(payload);
      if (Number.isFinite(count)) return count;
    }
    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      const candidate = record.stale ?? record.stale_count ?? record.count ?? record.total ?? record.itemsTotal ?? record.data;
      const count = Number(candidate);
      if (Number.isFinite(count)) return count;
    }
    throw new Error('The stale ticket count response was invalid.');
  },

  listTickets: async (input: TicketListInput): Promise<TicketListResponse> => {
    const params = new URLSearchParams({
      is_staff: String(input.is_staff),
      filter: JSON.stringify(input.filter),
      page: String(input.page),
      per_page: input.per_page,
      sort: JSON.stringify(input.sort),
    });
    if (input.search !== null) params.set('search', input.search);
    const response = await fetch(`${TICKETS_URL}?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to load tickets', response.status);
    const payload = await response.json();
    return {
      itemsReceived: Number(payload?.itemsReceived || 0),
      curPage: Number(payload?.curPage || input.page),
      nextPage: payload?.nextPage == null ? null : Number(payload.nextPage),
      prevPage: payload?.prevPage == null ? null : Number(payload.prevPage),
      offset: Number(payload?.offset || 0),
      perPage: Number(payload?.perPage || input.per_page),
      itemsTotal: Number(payload?.itemsTotal || 0),
      pageTotal: Number(payload?.pageTotal || 1),
      items: Array.isArray(payload?.items) ? payload.items : [],
    };
  },

  createImageMetadata: async (file: File): Promise<ImageMetadata> => {
    if (!file.type.toLowerCase().startsWith('image/')) throw new Error(`${file.name} is not an image file.`);
    const formData = new FormData();
    formData.append('image', file, file.name);
    const response = await fetch(IMAGE_METADATA_URL, {
      method: 'POST',
      headers: authOnlyHeader(),
      body: formData,
    });
    if (!response.ok) throw new ApiError('Failed to prepare screenshot metadata', response.status);
    const payload = await response.json();
    const metadataPayload = payload?.metadata ?? payload?.data ?? payload;
    const metadata = Array.isArray(metadataPayload) && metadataPayload.length === 1 ? metadataPayload[0] : metadataPayload;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new Error('The image metadata response was invalid.');
    }
    return metadata as ImageMetadata;
  },

  getCategoryOptions: async (): Promise<TicketSchemaOption[]> => {
    const response = await fetch(`${TICKET_SCHEMA_URL}/category`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to load ticket categories', response.status);
    return normalizeSchemaOptions(await response.json());
  },

  getPriorityOptions: async (): Promise<TicketSchemaOption[]> => {
    const response = await fetch(`${TICKET_SCHEMA_URL}/priority`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to load ticket priorities', response.status);
    return normalizeSchemaOptions(await response.json());
  },

  getStatusOptions: async (): Promise<TicketSchemaOption[]> => {
    const response = await fetch(`${TICKET_SCHEMA_URL}/status`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to load ticket statuses', response.status);
    return normalizeSchemaOptions(await response.json());
  },

  getHandlerOptions: async (): Promise<TicketHandlerOption[]> => {
    const response = await fetch(`${TICKET_SCHEMA_URL}/handler`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to load ticket handlers', response.status);
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.data) ? payload.data : [];
    return rows.flatMap((row: any) => {
      const id = String(row?.id || '');
      if (!id) return [];
      const firstName = String(row?.first_name || '').trim();
      const lastName = String(row?.last_name || '').trim();
      return [{ id, firstName, lastName, label: [firstName, lastName].filter(Boolean).join(' ') || 'Unnamed handler' }];
    });
  },

  getRequesterOptions: async (): Promise<TicketRequesterOption[]> => {
    const response = await fetch(`${TICKET_SCHEMA_URL}/requester`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to load ticket requesters', response.status);
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.data) ? payload.data : [];
    return rows.flatMap((row: any) => {
      const id = String(row?.tickets_createdBy_ghl_user_id || '').trim();
      if (!id) return [];
      const name = String(row?.createdBy_ghl_user_name || '').trim();
      return [{ id, label: name || 'Unnamed requester' }];
    });
  },

  quickEditTicket: async (input: QuickEditTicketInput) => {
    const response = await fetch(QUICK_EDIT_URL, {
      method: 'PUT',
      headers: authHeader(),
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new ApiError('Failed to update ticket', response.status);
    const body = await response.text();
    if (!body) return null;
    try { return JSON.parse(body); } catch { return body; }
  },

  completeTicket: async (input: CompleteTicketInput) => {
    const response = await fetch(COMPLETE_TICKET_URL, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new ApiError('Failed to complete ticket', response.status);
    const body = await response.text();
    if (!body) return null;
    try { return JSON.parse(body); } catch { return body; }
  },

  /**
   * Checks whether the authenticated user can access staff ticket views.
   */
  isStaff: async (): Promise<boolean> => {
    const response = await fetch(IS_STAFF_URL, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to check ticket staff access', response.status);
    const body = await response.text();
    try {
      return JSON.parse(body) === true;
    } catch {
      return body.trim().toLowerCase() === 'true';
    }
  },

  /**
   * Fetches tickets based on filter status
   */
  getTickets: async (filter: 'Attention Required' | 'Open' | 'Closed') => {
    let endpoint = '';
    if (filter === 'Attention Required') endpoint = '/tickets/important';
    else if (filter === 'Open') endpoint = '/tickets/open';
    else if (filter === 'Closed') endpoint = '/tickets/closed';

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch tickets', response.status);
    return response.json();
  },

  /**
   * Fetches details for a specific ticket
   */
  getTicketDetails: async (ticketId: string) => {
    const response = await fetch(`${TICKETS_URL}/details/${encodeURIComponent(ticketId)}`, {
        method: 'GET',
        headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch ticket details', response.status);
    return response.json();
  },

  /**
   * Fetches the conversation for a specific ticket.
   */
  getTicketComments: async (ticketId: string) => {
    const response = await fetch(`${TICKETS_URL}/comments/${encodeURIComponent(ticketId)}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch ticket comments', response.status);
    return response.json();
  },

  /**
   * Fetches the audit trail for a specific ticket.
   */
  getTicketActivity: async (ticketId: string) => {
    const response = await fetch(`${TICKETS_URL}/activity/${encodeURIComponent(ticketId)}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch ticket activity', response.status);
    return response.json();
  },

  /**
   * Creates a new support ticket
   */
  createTicket: async (ticketData: CreateTicketInput) => {
    const screenshots = ticketData.screenshots || [];
    const urls = ticketData.urls || [];

    const response = await fetch(CREATE_TICKET_URL, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({
        subject: ticketData.subject,
        category: ticketData.category,
        priority: ticketData.priority,
        description: ticketData.description,
        screenshot: screenshots,
        urls,
      }),
    });

    if (!response.ok) throw new ApiError('Failed to create ticket', response.status);
    return response.json();
  },

  /**
   * Adds a comment to a ticket
   */
  addComment: async (ticketId: string, message: string, log: string, screenshots: ImageMetadata[] = []) => {
    const response = await fetch(`${CREATE_TICKET_URL}/comment/${encodeURIComponent(ticketId)}`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({
          screenshot: screenshots,
          message,
          ticket_id: ticketId,
          log,
        }),
    });

    if (!response.ok) throw new ApiError('Failed to send comment', response.status);
    const body = await response.text();
    if (!body) return null;
    try { return JSON.parse(body); } catch { return body; }
  }
};
