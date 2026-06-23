import { BASE_URL, ApiError } from '../../../services/api';
import { SplitPolicy } from '../../../shared/types/index';

const SPLITS_API_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/splits';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export type SplitsTimeframe = 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom' | null;

export interface SplitsQuery {
  agentIds: string[];
  page: number;
  perPage: number;
  search: string;
  sort: Record<string, 'asc' | 'desc'>;
  filter: Record<string, unknown> | null;
  startDate: string | null;
  endDate: string | null;
  timeframe: SplitsTimeframe;
}

export interface SplitPartnerSummary {
  id: string;
  name: string;
  totalPremium: number;
  policyCount: number;
}

export interface SplitsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: SplitPolicy[];
  partners: SplitPartnerSummary[];
  policiesByStatus: Array<{
    id: string;
    name: string;
    totalPremium: number;
    policyCount: number;
  }>;
  policiesByPaidStatus: Array<{
    id: string;
    name: string;
    totalPremium: number;
    policyCount: number;
  }>;
}

interface RawSplitPolicy {
  id: string;
  created_at: number;
  ref_agent_owner: string;
  client: string;
  policy_number: string | null;
  ref_carrier_name: string | null;
  carrier_product: string;
  annual_premium: number;
  ref_policyStatus_name: string | null;
  policy_status: string | null;
  meta_policy_paidstatus_name: string | null;
  policy_paidStatus: string | null;
  initial_draft_date: string;
  ref_agent_owner_name: string;
  ref_metacontactsource_name?: string | null;
  ref_metacontacttype_name?: string | null;
  phone?: string | null;
  state?: string | null;
  split?: {
    id?: string | null;
    split_percent?: number | null;
  } | null;
}

interface RawSplitsResponse {
  policies?: {
    itemsReceived?: number;
    curPage?: number;
    nextPage?: number | null;
    prevPage?: number | null;
    offset?: number;
    perPage?: number;
    itemsTotal?: number;
    pageTotal?: number;
    items?: RawSplitPolicy[];
  };
  partner?: Array<{
    policy_ref_agent_owner?: string | null;
    ref_agent_owner_name?: string | null;
    policy_annual_premium_total?: number | null;
    policy_count?: number | null;
  }>;
  policies_by_status?: Array<{
    policy_ref_policyStatus_id?: string | null;
    ref_policyStatus_name?: string | null;
    policy_annual_premium_total?: number | null;
    policy_count?: number | null;
  }>;
  policies_by_paidStatus?: RawPaidStatusSummary[];
  policies_by_paid_status?: RawPaidStatusSummary[];
}

interface RawPaidStatusSummary {
  meta_policy_paidstatus_id?: string | null;
  meta_policy_paidStatus_id?: string | null;
  policy_meta_policy_paidstatus_id?: string | null;
  meta_policy_paidstatus_name?: string | null;
  meta_policy_paidStatus_name?: string | null;
  policy_paidStatus?: string | null;
  policy_annual_premium_total?: number | null;
  policy_count?: number | null;
}

const normalizeSplitsResponse = (payload: RawSplitsResponse): SplitsResponse => {
  const policies = payload.policies || {};
  const items = (policies.items || []).map((policy, index): SplitPolicy => ({
    id: policy.split?.id || `${policy.id}-${index}`,
    created_at: policy.created_at,
    policy_id: policy.id,
    client: policy.client,
    policy_number: policy.policy_number,
    carrier: policy.ref_carrier_name || '—',
    custom_carrier: null,
    carrier_product: policy.carrier_product || '—',
    annual_premium: policy.annual_premium || 0,
    status: policy.ref_policyStatus_name || policy.policy_status || '—',
    paid_status: policy.meta_policy_paidstatus_name || policy.policy_paidStatus || null,
    initial_draft_date: policy.initial_draft_date,
    split_percentage: Number(policy.split?.split_percent ?? 0),
    agent_name: policy.ref_agent_owner_name || 'Unknown Agent',
    agent_id: policy.ref_agent_owner,
    source_name: policy.ref_metacontactsource_name || null,
    contact_type_name: policy.ref_metacontacttype_name || null,
    phone: policy.phone || null,
    state: policy.state || null,
  }));

  return {
    itemsReceived: policies.itemsReceived ?? items.length,
    curPage: policies.curPage ?? 1,
    nextPage: policies.nextPage ?? null,
    prevPage: policies.prevPage ?? null,
    offset: policies.offset ?? 0,
    perPage: policies.perPage ?? items.length,
    itemsTotal: policies.itemsTotal ?? items.length,
    pageTotal: policies.pageTotal ?? 1,
    items,
    partners: (payload.partner || []).map(partner => ({
      id: String(partner.policy_ref_agent_owner || ''),
      name: String(partner.ref_agent_owner_name || 'Unknown Agent'),
      totalPremium: Number(partner.policy_annual_premium_total || 0),
      policyCount: Number(partner.policy_count || 0),
    })).filter(partner => partner.id),
    policiesByStatus: (payload.policies_by_status || []).map(status => ({
      id: String(status.policy_ref_policyStatus_id || ''),
      name: String(status.ref_policyStatus_name || 'Unknown'),
      totalPremium: Number(status.policy_annual_premium_total || 0),
      policyCount: Number(status.policy_count || 0),
    })).filter(status => status.id || status.name),
    policiesByPaidStatus: (payload.policies_by_paidStatus || payload.policies_by_paid_status || []).map(status => ({
      id: String(status.meta_policy_paidstatus_id || status.meta_policy_paidStatus_id || status.policy_meta_policy_paidstatus_id || ''),
      name: String(status.meta_policy_paidstatus_name || status.meta_policy_paidStatus_name || status.policy_paidStatus || 'Unknown'),
      totalPremium: Number(status.policy_annual_premium_total || 0),
      policyCount: Number(status.policy_count || 0),
    })).filter(status => status.id || status.name),
  };
};

export const agentSplitsApi = {
  /**
   * Fetches split business agreements
   */
  getSplits: async (query: SplitsQuery): Promise<SplitsResponse> => {
    const response = await fetch(SPLITS_API_URL, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({
        agent_id: query.agentIds,
        page: query.page,
        per_page: query.perPage,
        search: query.search || null,
        sort: query.sort ?? {},
        filter: query.filter,
        start_date: query.startDate,
        end_date: query.endDate,
        timeframe: query.timeframe,
      }),
    });

    if (!response.ok) throw new ApiError('Failed to fetch splits', response.status);
    return normalizeSplitsResponse(await response.json());
  },

  /**
   * Fetches splits for a specific policy
   */
  getPolicySplits: async (policyId: string) => {
    const response = await fetch(`${BASE_URL}/splits/${policyId}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch policy splits', response.status);
    return response.json();
  },

  /**
   * Validates an agent NPN for split addition
   */
  validateAgent: async (npn: string) => {
    const response = await fetch(`${BASE_URL}/agent/${npn}/validate`, {
        method: 'GET',
        headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Invalid NPN', response.status);
    return response.json();
  },

  /**
   * Updates splits for a specific policy
   */
  updatePolicySplits: async (policyId: string, splits: any[]) => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}/splits`, {
      method: 'PUT',
      headers: authHeader(),
      body: JSON.stringify({ splits })
    });

    if (!response.ok) throw new ApiError('Failed to update splits', response.status);
    return response.json();
  }
};
