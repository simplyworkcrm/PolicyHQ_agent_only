import { ApiError } from '../../../services/api';
import {
  AmericoPoliciesQuery,
  AmericoPoliciesResponse,
  AmericoPolicy,
} from './americoReconciliationApi';

const CARRIER_API_ROOT = 'https://api1.simplyworkcrm.com/api:SZgR1JsR';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
  'Content-Type': 'application/json',
});

export interface AetnaAgentProfile {
  id: string;
  createdAt: number;
  contractedOn: string | null;
  name: string;
  npn: number | null;
  carrierAgentNumber: string;
  uplineName: string;
  uplineNpn: number | null;
  carrierAgentUplineNumber: string;
  carrierCommissionLevel: string;
  status: string;
}

const normalizeProfile = (row: any): AetnaAgentProfile => ({
  id: String(row?.id || ''),
  createdAt: Number(row?.created_at || 0),
  contractedOn: row?.contracted_on ? String(row.contracted_on) : null,
  name: String(row?.name || ''),
  npn: row?.npn === null || row?.npn === undefined ? null : Number(row.npn),
  carrierAgentNumber: String(row?.carrier_agentNumber || row?.carrier_agent_number || ''),
  uplineName: String(row?.upline_name || ''),
  uplineNpn: row?.upline_npn === null || row?.upline_npn === undefined ? null : Number(row.upline_npn),
  carrierAgentUplineNumber: String(row?.carrier_agentUpline_number || row?.carrier_agent_upline_number || ''),
  carrierCommissionLevel: String(row?.carrier_commissionLevel || row?.carrier_commission_level || ''),
  status: String(row?.status || 'Unknown'),
});

const normalizeHqPolicy = (hqPolicy: any, carrierName: string) => ({
  id: String(hqPolicy?.id || hqPolicy?.policy_id || ''),
  client: String(hqPolicy?.client || ''),
  policyNumber: String(hqPolicy?.policy_number || ''),
  carrierProduct: String(hqPolicy?.carrier_product || hqPolicy?.product || ''),
  annualPremium: Number(hqPolicy?.annual_premium || 0),
  initialDraftDate: hqPolicy?.initial_draft_date
    ? String(hqPolicy.initial_draft_date)
    : hqPolicy?.effective_date
      ? String(hqPolicy.effective_date)
      : null,
  carrier: String(hqPolicy?.ref_carrier_name || hqPolicy?.carrier || carrierName),
  status: String(hqPolicy?.ref_policyStatus_name || hqPolicy?.policy_status || hqPolicy?.status || 'Unknown'),
  paidStatus: hqPolicy?.meta_policy_paidstatus_name || hqPolicy?.policy_paidStatus || hqPolicy?.paid_status
    ? String(hqPolicy.meta_policy_paidstatus_name || hqPolicy.policy_paidStatus || hqPolicy.paid_status)
    : null,
  agentName: String(hqPolicy?.ref_agent_owner_name || hqPolicy?.agent_name || ''),
  sourceName: String(hqPolicy?.ref_metacontactsource_name || hqPolicy?.source_name || ''),
});

const normalizePolicy = (row: any, carrierName: string): AmericoPolicy => ({
  id: String(row?.id || ''),
  createdAt: Number(row?.created_at || 0),
  agentNumbers: Array.isArray(row?.agent_numbers)
    ? row.agent_numbers.map((item: unknown) => String(item)).filter(Boolean)
    : [],
  policyNumber: String(row?.policy_number || ''),
  client: String(row?.client || ''),
  product: String(row?.product || ''),
  productDescription: String(row?.product_description || ''),
  status: String(row?.status || 'Unknown'),
  statusDescription: String(row?.status_description || ''),
  statusDate: null,
  receivedDate: row?.received_date ? String(row.received_date) : null,
  effectiveDate: row?.effective_date ? String(row.effective_date) : null,
  paidToDate: row?.paid_to_date ? String(row.paid_to_date) : null,
  terminatedDate: row?.terminated_date ? String(row.terminated_date) : null,
  annualPremium: Number(row?.annual_premium || 0),
  hqMatch: row?.hq_match === true,
  agents: Array.isArray(row?.agent)
    ? row.agent.map((agent: any) => ({
        name: String(agent?.name || ''),
        carrierAgentNumber: String(agent?.carrierAgent_number || agent?.carrier_agent_number || ''),
        splitLevel: String(agent?.split_level || ''),
        split: agent?.split === null || agent?.split === undefined ? null : Number(agent.split),
      }))
    : [],
  hqPolicies: Array.isArray(row?.hqPolicy)
    ? row.hqPolicy.map((hqPolicy: any) => normalizeHqPolicy(hqPolicy, carrierName))
    : [],
});

const normalizePoliciesResponse = (payload: any, carrierName: string): AmericoPoliciesResponse => {
  const rows = Array.isArray(payload?.items) ? payload.items : [];
  const perPage = Number(payload?.perPage ?? payload?.per_page ?? 25);
  const itemsTotal = Number(payload?.itemsTotal ?? payload?.items_total ?? rows.length);
  return {
    itemsReceived: Number(payload?.itemsReceived ?? payload?.items_received ?? rows.length),
    curPage: Number(payload?.curPage ?? payload?.cur_page ?? 1),
    nextPage: payload?.nextPage ?? payload?.next_page ?? null,
    prevPage: payload?.prevPage ?? payload?.prev_page ?? null,
    offset: Number(payload?.offset ?? 0),
    perPage,
    itemsTotal,
    pageTotal: Number(payload?.pageTotal ?? payload?.page_total ?? Math.max(1, Math.ceil(itemsTotal / Math.max(perPage, 1)))),
    items: rows
      .map((row: any) => normalizePolicy(row, carrierName))
      .filter((policy: AmericoPolicy) => policy.id || policy.policyNumber),
  };
};

export const createAetnaLikePoliciesApi = (carrierSlug: string, carrierName: string) => ({
  getProfile: async (agentId: string, signal?: AbortSignal): Promise<AetnaAgentProfile | null> => {
    const response = await fetch(`${CARRIER_API_ROOT}/${carrierSlug}/getProfile/${encodeURIComponent(agentId)}`, {
      method: 'GET',
      headers: authHeader(),
      signal,
    });
    if (response.status === 404 || response.status === 204) return null;
    if (!response.ok) throw new ApiError(`Failed to load ${carrierName} producer profile`, response.status);
    const payload = await response.json();
    const row = Array.isArray(payload)
      ? payload[0]
      : payload?.data && !Array.isArray(payload.data)
        ? payload.data
        : payload;
    if (!row || typeof row !== 'object') return null;
    const profile = normalizeProfile(row);
    return profile.id || profile.carrierAgentNumber ? profile : null;
  },

  getPolicies: async (query: AmericoPoliciesQuery, signal?: AbortSignal): Promise<AmericoPoliciesResponse> => {
    const response = await fetch(`${CARRIER_API_ROOT}/${carrierSlug}/policies`, {
      method: 'POST',
      headers: authHeader(),
      signal,
      body: JSON.stringify({
        agent_id: query.agentId,
        page: query.page,
        per_page: query.perPage,
        search: query.search,
        sort: query.sort,
        filter: query.filter,
        timeframe: query.timeframe === 'all' ? null : query.timeframe,
        start_date: query.timeframe === 'custom' ? query.startDate : null,
        end_date: query.timeframe === 'custom' ? query.endDate : null,
      }),
    });
    if (!response.ok) throw new ApiError(`Failed to load ${carrierName} policies`, response.status);
    return normalizePoliciesResponse(await response.json(), carrierName);
  },
});

export const aetnaPoliciesApi = createAetnaLikePoliciesApi('aetna', 'Aetna');
export const aflacPoliciesApi = createAetnaLikePoliciesApi('aflac', 'Aflac');
