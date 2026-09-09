import { ApiError } from '../../../services/api';

const HCMS_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/hcms';
const HCMS_TEAM_SCHEMA_URL = `${HCMS_URL}/schema/team`;

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
  'Content-Type': 'application/json',
});

export interface HcmsCarrier {
  meta_policy_carrier_id: string | null;
  carrier: string;
  ffl_upline_uuid: string | null;
  upline_name: string | null;
  upline_npn: number | null;
  upline_agent_id: string | null;
}

export interface HcmsRecord {
  id: string;
  created_at: number | null;
  contracted_on: string | null;
  ffl_uuid: string | null;
  name: string;
  npn: number | null;
  phone: string | null;
  team: string | null;
  compensation: number | null;
  agent_id: string | null;
  status: string | null;
  primaryUpline_ffl_uuid: string | null;
  primaryUpline_name: string | null;
  primaryUpline_npn: number | null;
  primaryUpline_agent_id: string | null;
  productionUpline_ffl_uuid: string | null;
  productionUpline_name: string | null;
  productionUpline_npn: number | null;
  productionUpline_agent_id: string | null;
  team_npn: unknown[];
  carriers: HcmsCarrier[];
}

export interface HcmsListInput {
  is_staff: boolean;
  page: number;
  per_page: number;
  search: string | null;
  filter: Record<string, unknown>;
  sort: Record<string, 'asc' | 'desc'>;
}

export interface HcmsQuickFilter {
  name: string;
  status: string;
  team: string;
  npn: string;
  primaryUpline: string;
  productionUpline: string;
}

export interface HcmsListResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: HcmsRecord[];
}

const optionalString = (value: unknown) => value == null || value === '' ? null : String(value);
const optionalNumber = (value: unknown) => {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeCarrier = (value: unknown): HcmsCarrier => {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    meta_policy_carrier_id: optionalString(row.meta_policy_carrier_id),
    carrier: String(row.carrier || 'Unknown carrier'),
    ffl_upline_uuid: optionalString(row.ffl_upline_uuid),
    upline_name: optionalString(row.upline_name),
    upline_npn: optionalNumber(row.upline_npn),
    upline_agent_id: optionalString(row.upline_agent_id),
  };
};

const normalizeRecord = (value: unknown): HcmsRecord => {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: String(row.id || row.ffl_uuid || row.npn || ''),
    created_at: optionalNumber(row.created_at),
    contracted_on: optionalString(row.contracted_on),
    ffl_uuid: optionalString(row.ffl_uuid),
    name: String(row.name || 'Unnamed agent'),
    npn: optionalNumber(row.npn),
    phone: optionalString(row.phone),
    team: optionalString(row.team),
    compensation: optionalNumber(row.compensation),
    agent_id: optionalString(row.agent_id),
    status: optionalString(row.status),
    primaryUpline_ffl_uuid: optionalString(row.primaryUpline_ffl_uuid),
    primaryUpline_name: optionalString(row.primaryUpline_name),
    primaryUpline_npn: optionalNumber(row.primaryUpline_npn),
    primaryUpline_agent_id: optionalString(row.primaryUpline_agent_id),
    productionUpline_ffl_uuid: optionalString(row.productionUpline_ffl_uuid),
    productionUpline_name: optionalString(row.productionUpline_name),
    productionUpline_npn: optionalNumber(row.productionUpline_npn),
    productionUpline_agent_id: optionalString(row.productionUpline_agent_id),
    team_npn: Array.isArray(row.team_npn) ? row.team_npn : [],
    carriers: Array.isArray(row.carriers) ? row.carriers.map(normalizeCarrier) : [],
  };
};

export const buildHcmsFilter = (filter: HcmsQuickFilter): Record<string, unknown> => {
  const groups: Array<{ field: string; op: '==' | 'ilike'; value: string | number }> = [];
  if (filter.name.trim()) groups.push({ field: 'name', op: 'ilike', value: `%${filter.name.trim()}%` });
  if (filter.status.trim()) groups.push({ field: 'status', op: '==', value: filter.status.trim() });
  if (filter.team.trim()) groups.push({ field: 'team', op: 'ilike', value: `%${filter.team.trim()}%` });
  if (filter.npn.trim()) groups.push({ field: 'npn', op: 'ilike', value: `%${filter.npn.trim()}%` });
  if (filter.primaryUpline.trim()) groups.push({ field: 'primaryUpline_name', op: 'ilike', value: `%${filter.primaryUpline.trim()}%` });
  if (filter.productionUpline.trim()) groups.push({ field: 'productionUpline_name', op: 'ilike', value: `%${filter.productionUpline.trim()}%` });
  if (!groups.length) return {};

  return {
    expression: [{
      or: false,
      type: 'group',
      group: {
        expression: groups.map(group => ({
          or: false,
          type: 'statement',
          statement: {
            left: { tag: 'col', operand: group.field },
            op: group.op,
            right: { operand: group.value },
          },
        })),
      },
    }],
  };
};

export const hcmsApi = {
  getTeamOptions: async (isStaff: boolean, signal?: AbortSignal): Promise<string[]> => {
    const params = new URLSearchParams({ is_staff: String(isStaff) });
    const response = await fetch(`${HCMS_TEAM_SCHEMA_URL}?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
      signal,
    });
    if (!response.ok) throw new ApiError('Failed to load HCMS teams', response.status);
    const payload = await response.json();
    return Array.isArray(payload)
      ? payload.map(value => String(value).trim()).filter(Boolean)
      : [];
  },
  list: async (input: HcmsListInput, signal?: AbortSignal): Promise<HcmsListResponse> => {
    const params = new URLSearchParams({
      is_staff: String(input.is_staff),
      page: String(input.page),
      per_page: String(input.per_page),
      search: input.search || '',
      filter: JSON.stringify(input.filter),
      sort: JSON.stringify(input.sort),
    });
    const response = await fetch(`${HCMS_URL}?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
      signal,
    });
    if (!response.ok) throw new ApiError('Failed to load HCMS resources', response.status);
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
      items: Array.isArray(payload?.items) ? payload.items.map(normalizeRecord) : [],
    };
  },
};
