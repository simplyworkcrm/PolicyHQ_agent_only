import { ApiError } from '../../../services/api';

const DOWNLINES_API_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/downlines/direct';

export interface DownlineAgent {
  agent_id: string;
  first_name: string;
  last_name: string;
  directDownline_count: number;
  direct_upline_name?: string | null;
  ref_ffl_agency_name?: string | null;
  profile_url?: string | null;
  phone?: string | null;
  npn?: string | number | null;
  status?: string | null;
}

export type DownlineSortDirection = 'asc' | 'desc';

export interface DownlineQuery {
  page: number;
  perPage: number;
  search: string;
  sort?: Record<string, DownlineSortDirection> | null;
}

export interface DownlineHierarchy {
  id: string;
  first_name: string;
  last_name: string;
  direct_downlines: DownlineAgent[];
  itemsReceived?: number;
  curPage?: number;
  nextPage?: number | null;
  prevPage?: number | null;
  offset?: number;
  perPage?: number;
  itemsTotal?: number;
  pageTotal?: number;
}

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

const splitName = (name?: string | null) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || 'Selected',
    last_name: parts.slice(1).join(' ') || 'Agent',
  };
};

const getProfileUrl = (item: any) => {
  const profile = item.profile || item.agent_profile || item.agentProfile || item.profile_image || item.avatar;
  if (typeof profile === 'string') return profile;
  return profile?.url || item.profile_url || item.profileUrl || item.image_url || item.avatar_url || null;
};

const getDirectDownlineCount = (item: any) => {
  const directDownlines = item.direct_downlines ?? item.directDownlines;
  if (Array.isArray(directDownlines)) return directDownlines.length;
  return Number(
    directDownlines
    ?? item.directDownline_count
    ?? item.direct_downline_count
    ?? item.direct_downlines_count
    ?? item.downline_count
    ?? item.downlines_count
    ?? item.recruits
    ?? 0
  );
};

const normalizeAgent = (item: any): DownlineAgent => {
  const fullName = item.agent_name || item.name || item.full_name;
  const fallback = splitName(fullName);

  return {
    agent_id: String(item.agent_id || item.agentId || item.id || ''),
    first_name: String(item.first_name || item.firstName || fallback.first_name),
    last_name: String(item.last_name || item.lastName || fallback.last_name),
    directDownline_count: getDirectDownlineCount(item),
    direct_upline_name: item.direct_upline_name || item.directUplineName || item.upline_name || item.uplineName || null,
    ref_ffl_agency_name: item.ref_ffl_agency_name || item.agency_name || item.agencyName || item.agency?.name || null,
    profile_url: getProfileUrl(item),
    phone: item.phone || item.work_phone || item.business_phone || null,
    npn: item.npn || item.agent_npn || item.agentNpn || null,
    status: item.status || item.agent_status || 'Active',
  };
};

const getDirectDownlineItems = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  return data.direct_downlines
    || data.downlines
    || data.items
    || data.data
    || data.records
    || data.results
    || [];
};

const normalizeHierarchy = (agentId: string, data: any): DownlineHierarchy => {
  const rootName = splitName(data?.agent_name || data?.name || data?.full_name);
  const directDownlines = getDirectDownlineItems(data)
    .map(normalizeAgent)
    .filter(agent => agent.agent_id);

  return {
    id: String(data?.id || data?.agent_id || data?.agentId || agentId),
    first_name: String(data?.first_name || data?.firstName || rootName.first_name),
    last_name: String(data?.last_name || data?.lastName || rootName.last_name),
    direct_downlines: directDownlines,
    itemsReceived: Number(data?.itemsReceived ?? directDownlines.length),
    curPage: Number(data?.curPage ?? 1),
    nextPage: data?.nextPage ?? null,
    prevPage: data?.prevPage ?? null,
    offset: Number(data?.offset ?? 0),
    perPage: Number(data?.perPage ?? data?.per_page ?? directDownlines.length),
    itemsTotal: Number(data?.itemsTotal ?? directDownlines.length),
    pageTotal: Number(data?.pageTotal ?? 1),
  };
};

export const agentDownlineApi = {
  /**
   * Fetches direct downlines for an agent.
   */
  getHierarchy: async (agentId: string, query?: Partial<DownlineQuery>): Promise<DownlineHierarchy> => {
    const params = new URLSearchParams({
      page: String(query?.page ?? 1),
      per_page: String(query?.perPage ?? 25),
      search: query?.search || '',
      sort: JSON.stringify(query?.sort ?? null),
    });

    const response = await fetch(`${DOWNLINES_API_URL}/${agentId}?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch direct downlines', response.status);
    return normalizeHierarchy(agentId, await response.json());
  },
};
