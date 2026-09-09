import { ApiError } from '../../../services/api';

const SWCRM_LOCATIONS_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/swcrm/locations';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
  'Content-Type': 'application/json',
});

export interface SwcrmLocation {
  id: string;
  created_at: number | null;
  account_type: string | null;
  location_id: string;
  name: string;
  email: string;
  saas_mode: string | null;
  stripe_customerId: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  isPaused: boolean;
  pause_message: string | null;
  lastUpdated: number | null;
}

export interface SwcrmListInput {
  is_staff: boolean;
  page: number;
  per_page: number;
  sort: Record<string, 'asc' | 'desc'>;
  filter: Record<string, unknown>;
  search: string | null;
}

export interface SwcrmQuickFilter {
  accountType: string;
  saasMode: string;
  subscriptionStatus: string;
  paused: '' | 'true' | 'false';
}

export interface SwcrmListResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: SwcrmLocation[];
}

const optionalString = (value: unknown) => value == null || value === '' ? null : String(value);
const optionalNumber = (value: unknown) => {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const cleanName = (value: unknown) => {
  const name = String(value || 'Unnamed location').trim();
  return name.length >= 2 && name.startsWith('"') && name.endsWith('"') ? name.slice(1, -1) : name;
};

const normalizeLocation = (value: unknown): SwcrmLocation => {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: String(row.id || row.location_id || ''),
    created_at: optionalNumber(row.created_at),
    account_type: optionalString(row.account_type),
    location_id: String(row.location_id || ''),
    name: cleanName(row.name),
    email: String(row.email || ''),
    saas_mode: optionalString(row.saas_mode),
    stripe_customerId: optionalString(row.stripe_customerId),
    subscription_plan: optionalString(row.subscription_plan),
    subscription_status: optionalString(row.subscription_status),
    isPaused: row.isPaused === true,
    pause_message: optionalString(row.pause_message),
    lastUpdated: optionalNumber(row.lastUpdated),
  };
};

export const buildSwcrmFilter = (filter: SwcrmQuickFilter): Record<string, unknown> => {
  const statements: Array<{ field: string; value: string | boolean }> = [];
  if (filter.accountType.trim()) statements.push({ field: 'account_type', value: filter.accountType.trim() });
  if (filter.saasMode.trim()) statements.push({ field: 'saas_mode', value: filter.saasMode.trim() });
  if (filter.subscriptionStatus.trim()) statements.push({ field: 'subscription_status', value: filter.subscriptionStatus.trim() });
  if (filter.paused) statements.push({ field: 'isPaused', value: filter.paused === 'true' });
  if (!statements.length) return {};

  return {
    expression: [{
      or: false,
      type: 'group',
      group: {
        expression: statements.map(({ field, value }) => ({
          or: false,
          type: 'statement',
          statement: {
            left: { tag: 'col', operand: field },
            op: '==',
            right: { operand: value },
          },
        })),
      },
    }],
  };
};

export const swcrmApi = {
  list: async (input: SwcrmListInput, signal?: AbortSignal): Promise<SwcrmListResponse> => {
    const params = new URLSearchParams({
      is_staff: String(input.is_staff),
      page: String(input.page),
      per_page: String(input.per_page),
      sort: JSON.stringify(input.sort),
      filter: JSON.stringify(input.filter),
      search: input.search || '',
    });
    const response = await fetch(`${SWCRM_LOCATIONS_URL}?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
      signal,
    });
    if (!response.ok) throw new ApiError('Failed to load SWCRM locations', response.status);
    const payload = await response.json();
    return {
      itemsReceived: Number(payload?.itemsReceived || 0),
      curPage: Number(payload?.curPage || input.page),
      nextPage: payload?.nextPage == null ? null : Number(payload.nextPage),
      prevPage: payload?.prevPage == null ? null : Number(payload.prevPage),
      offset: Number(payload?.offset || 0),
      perPage: Number(payload?.perPage || input.per_page),
      itemsTotal: Number(payload?.itemsTotal || 0),
      pageTotal: Math.max(1, Number(payload?.pageTotal || 1)),
      items: Array.isArray(payload?.items) ? payload.items.map(normalizeLocation) : [],
    };
  },
};
