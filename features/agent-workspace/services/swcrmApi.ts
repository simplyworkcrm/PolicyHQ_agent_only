import { ApiError } from '../../../services/api';

const SWCRM_LOCATIONS_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/swcrm/locations';
const SWCRM_ACCOUNT_TYPE_SCHEMA_URL = `${SWCRM_LOCATIONS_URL}/schema/account_type`;
const SWCRM_SAAS_MODE_SCHEMA_URL = `${SWCRM_LOCATIONS_URL}/schema/saas_mode`;
const SWCRM_SUBSCRIPTION_PLAN_SCHEMA_URL = `${SWCRM_LOCATIONS_URL}/schema/subscription_plan`;
const SWCRM_PIT_VERIFY_URL = `${SWCRM_LOCATIONS_URL}/pit/verify`;
export const SWCRM_NULL_FILTER_VALUE = '__swcrm_null__';

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
  PIT: string | null;
  pit_status: boolean;
  pit_message: string | null;
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
  locationId: string;
  accountType: string[];
  saasMode: string[];
  subscriptionPlan: string[];
  paused: '' | 'true' | 'false';
  pitStatus: '' | 'true' | 'false';
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

export interface SwcrmPitVerificationInput {
  is_staff: boolean;
  location_id: string;
  pit: string;
}

export interface SwcrmPitVerificationResponse {
  id: string;
  location_id: string;
  PIT: string | null;
  pit_status: boolean;
  pit_message: string | null;
}

export interface SwcrmLocationPatchInput {
  id: string;
  [field: string]: unknown;
}

const optionalString = (value: unknown) => value == null || value === '' ? null : String(value);
const optionalDisplayValue = (value: unknown) => {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value);
};
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
    PIT: optionalDisplayValue(row.PIT),
    pit_status: row.pit_status === true,
    pit_message: optionalString(row.pit_message),
    lastUpdated: optionalNumber(row.lastUpdated),
  };
};

export const buildSwcrmFilter = (filter: SwcrmQuickFilter): Record<string, unknown> => {
  const expression: Array<Record<string, unknown>> = [];
  const statement = (field: string, value: string | boolean | null, or = false) => ({
    or,
    type: 'statement',
    statement: {
      left: { tag: 'col', operand: field },
      op: '==',
      right: { operand: value },
    },
  });
  const addMultiple = (field: string, values: string[] = []) => {
    const uniqueValues = [...new Set(values.map(value => value.trim()).filter(Boolean))];
    const operand = (value: string) => value === SWCRM_NULL_FILTER_VALUE ? null : value;
    if (uniqueValues.length === 1) expression.push(statement(field, operand(uniqueValues[0])));
    else if (uniqueValues.length > 1) expression.push({
      or: false,
      type: 'group',
      group: { expression: uniqueValues.map((value, index) => statement(field, operand(value), index > 0)) },
    });
  };

  if (filter.locationId.trim()) expression.push(statement('location_id', filter.locationId.trim()));
  addMultiple('account_type', filter.accountType);
  addMultiple('saas_mode', filter.saasMode);
  addMultiple('subscription_plan', filter.subscriptionPlan);
  if (filter.paused) expression.push(statement('isPaused', filter.paused === 'true'));
  if (filter.pitStatus) expression.push(statement('pit_status', filter.pitStatus === 'true'));
  if (!expression.length) return {};

  return {
    expression: [{
      or: false,
      type: 'group',
      group: {
        expression,
      },
    }],
  };
};

const getSchemaOptions = async (url: string, isStaff: boolean, signal?: AbortSignal): Promise<string[]> => {
  const params = new URLSearchParams({ is_staff: String(isStaff) });
  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'GET',
    headers: authHeader(),
    signal,
  });
  if (!response.ok) throw new ApiError('Failed to load SWCRM filter options', response.status);
  const payload = await response.json();
  const options = Array.isArray(payload)
    ? [...new Set(payload.flatMap(value => value === null
      ? [SWCRM_NULL_FILTER_VALUE]
      : typeof value === 'string' && value.trim().length > 0 ? [value] : []))]
    : [];
  return [SWCRM_NULL_FILTER_VALUE, ...options.filter(value => value !== SWCRM_NULL_FILTER_VALUE)];
};

export const swcrmApi = {
  getAccountTypeOptions: (isStaff: boolean, signal?: AbortSignal) => getSchemaOptions(SWCRM_ACCOUNT_TYPE_SCHEMA_URL, isStaff, signal),
  getSaasModeOptions: (isStaff: boolean, signal?: AbortSignal) => getSchemaOptions(SWCRM_SAAS_MODE_SCHEMA_URL, isStaff, signal),
  getSubscriptionPlanOptions: (isStaff: boolean, signal?: AbortSignal) => getSchemaOptions(SWCRM_SUBSCRIPTION_PLAN_SCHEMA_URL, isStaff, signal),
  updateLocation: async (input: SwcrmLocationPatchInput, signal?: AbortSignal): Promise<Record<string, unknown>> => {
    const response = await fetch(SWCRM_LOCATIONS_URL, {
      method: 'PATCH',
      headers: authHeader(),
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) throw new ApiError('Failed to update SWCRM location', response.status);
    const payload = await response.json();
    return payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  },
  verifyPit: async (input: SwcrmPitVerificationInput, signal?: AbortSignal): Promise<SwcrmPitVerificationResponse> => {
    const response = await fetch(SWCRM_PIT_VERIFY_URL, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) throw new ApiError('Failed to verify SWCRM PIT', response.status);
    const payload = await response.json();
    return {
      id: String(payload?.id || ''),
      location_id: String(payload?.location_id || input.location_id),
      PIT: optionalDisplayValue(payload?.PIT),
      pit_status: payload?.pit_status === true,
      pit_message: optionalString(payload?.pit_message),
    };
  },
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
