import { ApiError } from '../../../services/api';

const AMERICO_PROFILE_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/americo/getProfile';
const AMERICO_POLICIES_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/americo/policies';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
  'Content-Type': 'application/json',
});

export interface AmericoAgentProfile {
  id: string;
  contractedOn: string | null;
  name: string;
  carrierAgentNumber: string;
  agentUplineName: string;
  carrierCommissionLevel: string;
  lineOfBusiness: string[];
  status: string;
  advanceType: string;
}

export type AmericoPoliciesTimeframe = 'all' | 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface AmericoPolicyAgent {
  name: string;
  carrierAgentNumber: string;
  splitLevel?: string;
  split?: number | null;
}

export interface AmericoHqPolicy {
  id: string;
  client: string;
  policyNumber: string;
  carrierProduct: string;
  annualPremium: number;
  initialDraftDate: string | null;
  carrier: string;
  status: string;
  paidStatus: string | null;
  agentName: string;
  sourceName: string;
}

export interface AmericoPolicy {
  id: string;
  createdAt: number;
  agentNumbers: string[];
  policyNumber: string;
  client: string;
  product: string;
  productDescription?: string;
  status: string;
  statusDescription?: string;
  statusDate: string | null;
  receivedDate: string | null;
  effectiveDate: string | null;
  paidToDate?: string | null;
  terminatedDate: string | null;
  annualPremium: number;
  hqMatch: boolean;
  agents: AmericoPolicyAgent[];
  hqPolicies: AmericoHqPolicy[];
}

export interface AmericoPoliciesResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: AmericoPolicy[];
}

export interface AmericoPoliciesQuery {
  agentId: string;
  page: number;
  perPage: number;
  search: string;
  sort: Record<string, 'asc' | 'desc'>;
  filter: Record<string, unknown>;
  timeframe: AmericoPoliciesTimeframe;
  startDate: string | null;
  endDate: string | null;
}

const getProfileRows = (payload: unknown): any[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const objectPayload = payload as Record<string, unknown>;
  const rows = objectPayload.data ?? objectPayload.items ?? objectPayload.records ?? objectPayload.results;
  return Array.isArray(rows) ? rows : [];
};

const normalizeProfile = (row: any): AmericoAgentProfile => ({
  id: String(row?.id || ''),
  contractedOn: row?.contracted_on ? String(row.contracted_on) : null,
  name: String(row?.name || ''),
  carrierAgentNumber: String(row?.carrier_agentNumber || row?.carrier_agent_number || ''),
  agentUplineName: String(row?.agent_upline_name || ''),
  carrierCommissionLevel: String(row?.carrier_commissionLevel || row?.carrier_commission_level || ''),
  lineOfBusiness: Array.isArray(row?.line_of_business)
    ? row.line_of_business.map((item: unknown) => String(item)).filter(Boolean)
    : [],
  status: String(row?.status || 'Unknown'),
  advanceType: String(row?.advanceType || row?.advance_type || ''),
});

const normalizePolicy = (row: any): AmericoPolicy => ({
  id: String(row?.id || ''),
  createdAt: Number(row?.created_at || 0),
  agentNumbers: Array.isArray(row?.agent_numbers)
    ? row.agent_numbers.map((item: unknown) => String(item)).filter(Boolean)
    : [],
  policyNumber: String(row?.policy_number || ''),
  client: String(row?.client || ''),
  product: String(row?.product || ''),
  status: String(row?.status || 'Unknown'),
  statusDate: row?.status_date ? String(row.status_date) : null,
  receivedDate: row?.received_date ? String(row.received_date) : null,
  effectiveDate: row?.effective_date ? String(row.effective_date) : null,
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
    ? row.hqPolicy.map((hqPolicy: any) => ({
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
        carrier: String(hqPolicy?.ref_carrier_name || hqPolicy?.carrier || 'Americo'),
        status: String(hqPolicy?.ref_policyStatus_name || hqPolicy?.policy_status || hqPolicy?.status || 'Unknown'),
        paidStatus: hqPolicy?.meta_policy_paidstatus_name || hqPolicy?.policy_paidStatus || hqPolicy?.paid_status
          ? String(hqPolicy.meta_policy_paidstatus_name || hqPolicy.policy_paidStatus || hqPolicy.paid_status)
          : null,
        agentName: String(hqPolicy?.ref_agent_owner_name || hqPolicy?.agent_name || ''),
        sourceName: String(hqPolicy?.ref_metacontactsource_name || hqPolicy?.source_name || ''),
      }))
    : [],
});

const normalizePoliciesResponse = (payload: any): AmericoPoliciesResponse => {
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
    items: rows.map(normalizePolicy).filter((policy: AmericoPolicy) => policy.id || policy.policyNumber),
  };
};

export const americoReconciliationApi = {
  getProfiles: async (agentId: string, signal?: AbortSignal): Promise<AmericoAgentProfile[]> => {
    const response = await fetch(`${AMERICO_PROFILE_URL}/${encodeURIComponent(agentId)}`, {
      method: 'GET',
      headers: authHeader(),
      signal,
    });

    if (!response.ok) {
      throw new ApiError('Failed to load Americo producer profiles', response.status);
    }

    return getProfileRows(await response.json())
      .map(normalizeProfile)
      .filter(profile => profile.id || profile.carrierAgentNumber);
  },

  getPolicies: async (query: AmericoPoliciesQuery, signal?: AbortSignal): Promise<AmericoPoliciesResponse> => {
    const response = await fetch(AMERICO_POLICIES_URL, {
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

    if (!response.ok) {
      throw new ApiError('Failed to load Americo policies', response.status);
    }

    return normalizePoliciesResponse(await response.json());
  },
};
