
import { BASE_URL, ApiError } from '../../../services/api';
import { Policy } from '../../../shared/types/index';

const TEAM_POLICIES_API_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/team/policies';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

type TeamPoliciesTimeframe = 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom' | null;

interface TeamPoliciesQuery {
  agentId: string;
  page?: number;
  perPage?: number;
  search?: string | null;
  sort?: Record<string, unknown> | null;
  filter?: Record<string, unknown> | null;
  startDate?: string | null;
  endDate?: string | null;
  timeframe?: TeamPoliciesTimeframe;
}

const getPolicyItems = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  return payload.items || payload.data || payload.records || payload.results || [];
};

const normalizeTeamPolicy = (policy: any, index: number): Policy => ({
  policy_id: String(policy.id || policy.policy_id || policy.policy_number || `${policy.client || 'client'}-${index}`),
  client: String(policy.client || ''),
  policy_number: policy.policy_number ?? null,
  carrier: String(policy.ref_carrier_name || policy.carrier || policy.carrier_name || '—'),
  carrier_product: String(policy.carrier_product || policy.product || ''),
  status: String(policy.ref_policyStatus_name || policy.policy_status || policy.status || '—'),
  paid_status: policy.meta_policy_paidstatus_name
    || policy.meta_policy_paidStatus_name
    || policy.policy_paidStatus
    || policy.policy_paid_status
    || null,
  annual_premium: Number(policy.annual_premium || 0),
  initial_draft_date: String(policy.initial_draft_date || ''),
  isLocked: Boolean(policy.isLocked ?? policy.is_locked ?? false),
  agent_id: String(policy.ref_agent_owner || policy.agent_id || ''),
  agent_name: String(policy.ref_agent_owner_name || policy.agent_name || ''),
  source_name: policy.ref_metacontactsource_name || policy.source_name || policy.source || undefined,
  created_at: Number(policy.created_at || 0),
});

export const agentPoliciesApi = {
  /**
   * Fetches aggregated production for one agent and that agent's downline tree.
   */
  getTeamPolicies: async (query: TeamPoliciesQuery): Promise<Policy[]> => {
    const response = await fetch(TEAM_POLICIES_API_URL, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({
        agent_id: query.agentId,
        page: query.page ?? 1,
        per_page: query.perPage ?? 500,
        search: query.search || null,
        sort: query.sort ?? null,
        filter: query.filter ?? null,
        start_date: query.timeframe === 'custom' ? query.startDate : null,
        end_date: query.timeframe === 'custom' ? query.endDate : null,
        timeframe: query.timeframe,
      }),
    });

    if (!response.ok) throw new ApiError('Failed to fetch team policies', response.status);
    const payload = await response.json();
    return getPolicyItems(payload).map(normalizeTeamPolicy);
  },

  /**
   * Fetches the list of policies based on agent_id and date range
   */
  getPolicies: async (agentId: string, startDate: number, endDate: number): Promise<Policy[]> => {
    const params = new URLSearchParams({
      agent_id: agentId,
      start_date: String(startDate ?? ''),
      end_date: String(endDate ?? '')
    });

    const response = await fetch(`${BASE_URL}/policies?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch policies', response.status);
    return response.json();
  },

  /**
   * Searches for specific policies by name or number
   */
  searchPolicies: async (agentId: string, query: string): Promise<Policy[]> => {
    const params = new URLSearchParams({
      agent_id: agentId,
      search: query
    });

    const response = await fetch(`${BASE_URL}/policies?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Search failed', response.status);
    return response.json();
  },

  /**
   * Deletes a policy with a required reason
   */
  deletePolicy: async (policyId: string, reason: string): Promise<void> => {
    const response = await fetch(`${BASE_URL}/policies/${policyId}`, {
      method: 'DELETE',
      headers: authHeader(),
      body: JSON.stringify({ reason })
    });

    if (!response.ok) throw new ApiError('Failed to delete policy', response.status);
  }
};
