const POLICIES_API_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/policies';
const TEAM_POLICIES_API_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/team/policies';
const UTILITY_API_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/utility';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

// ── Types ────────────────────────────────────────────────────────────────────

export interface PolicyV2 {
  policy_id: string;
  selectionKey: string;
  created_at: number;
  client: string;
  policy_number: string | null;
  carrier_product: string;
  initial_draft_date: string;
  annual_premium: number;
  isLocked: boolean;
  carrier: string;
  status: string;
  paid_status: string | null;
  paid_status_id?: string | null;
  agent_id: string;
  agent_name: string;
  source_name: string;
}

export interface PoliciesV2Response {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage?: number;
  itemsTotal?: number;
  pageTotal?: number;
  items: PolicyV2[];
  policy_stats?: PoliciesV2Stats;
}

interface RawPolicyV2 {
  id: string;
  created_at: number;
  ref_agent_owner: string;
  client: string;
  policy_number: string | null;
  carrier_product: string;
  initial_draft_date: string;
  annual_premium: number;
  isLocked: boolean;
  policy_status: string | null;
  policy_paidStatus: string | null;
  ref_agent_owner_name: string;
  ref_metacontactsource_name: string;
  ref_carrier_name: string | null;
  ref_policyStatus_name: string | null;
  meta_policy_paidstatus_name: string | null;
  meta_policy_paidstatus_id?: string | null;
  meta_policy_paidStatus_id?: string | null;
  meta_policy_paidStatus_name?: string | null;
  meta_policy_paidstatus?: string | null;
  meta_policy_paidStatus?: string | null;
  policy_paid_status?: string | null;
}

interface RawPoliciesV2Response extends Omit<PoliciesV2Response, 'items'> {
  items: RawPolicyV2[];
}

export type PolicySortField =
  | 'client'
  | 'policy_number'
  | 'carrier_product'
  | 'carrier'
  | 'status'
  | 'annual_premium'
  | 'created_at'
  | 'initial_draft_date'
  | 'source_name'
  | 'paid_status';

export type SortDirection = 'asc' | 'desc';

export interface PolicyFilterOption {
  id: string;
  label: string;
}

export interface PoliciesV2Query {
  agentIds: string[];
  page: number;
  perPage: number;
  search: string;
  sort: Record<string, SortDirection>;
  filter: Record<string, unknown>;
  startDate: string | null;
  endDate: string | null;
  timeframe: 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom' | null;
}

export interface PoliciesV2Stats {
  submittedPolicies: number;
  submittedPolicies_premium: number;
  issued_placed: number;
  issued_placed_premium: number;
  active_inForce: number;
  active_inForce_premium: number;
  failed_inforce: number;
  failed_inforce_premium: number;
  need_attention: number;
  need_attention_premium: number;
}

// ── API ──────────────────────────────────────────────────────────────────────

const getMetaOptionItems = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  return data.items
    || data.data
    || data.records
    || data.results
    || data.carriers
    || data.policy_statuses
    || data.policyStatuses
    || data.statuses
    || data.policy_paid_statuses
    || data.policyPaidStatuses
    || data.paid_statuses
    || data.paidStatuses
    || [];
};

const normalizeMetaOptions = (data: unknown, fallbackLabel: string): PolicyFilterOption[] => (
  getMetaOptionItems(data)
    .map((item: any) => ({
      id: String(item.id ?? item.value ?? ''),
      label: String(
        item.label
        ?? item.name
        ?? item.carrier
        ?? item.carrier_name
        ?? item.status
        ?? item.policy_status
        ?? item.policy_status_name
        ?? item.paid_status
        ?? item.paid_status_name
        ?? item.policyPaidStatus
        ?? item.policyStatus
        ?? item.title
        ?? item.value
        ?? item.id
        ?? fallbackLabel
      ),
    }))
    .filter((item: PolicyFilterOption) => item.id)
);

const pickFirstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string') return value;
  }
  return null;
};

const getPaidStatusLabel = (policy: RawPolicyV2): string | null => pickFirstString(
  policy.meta_policy_paidstatus_name,
  policy.meta_policy_paidStatus_name,
  (policy.meta_policy_paidstatus as unknown as { name?: string | null })?.name,
  (policy.meta_policy_paidStatus as unknown as { name?: string | null })?.name,
  policy.meta_policy_paidstatus,
  policy.meta_policy_paidStatus,
  policy.policy_paidStatus,
  policy.policy_paid_status,
);

const getPaidStatusId = (policy: RawPolicyV2): string | null => (
  policy.meta_policy_paidstatus_id
  || policy.meta_policy_paidStatus_id
  || ((policy.meta_policy_paidstatus as unknown as { id?: string | null })?.id ?? null)
  || ((policy.meta_policy_paidStatus as unknown as { id?: string | null })?.id ?? null)
  || null
);

const normalizePoliciesResponse = (payload: RawPoliciesV2Response): PoliciesV2Response => ({
  ...payload,
  items: (payload.items || []).map((policy, index) => ({
    policy_id: policy.id,
    selectionKey: `${String(policy.id || policy.policy_number || `${policy.client || 'client'}-${policy.ref_agent_owner || 'agent'}-${policy.created_at || Date.now()}`)}-${index}`,
    created_at: policy.created_at,
    client: policy.client,
    policy_number: policy.policy_number,
    carrier_product: policy.carrier_product,
    initial_draft_date: policy.initial_draft_date,
    annual_premium: policy.annual_premium,
    isLocked: policy.isLocked,
    carrier: policy.ref_carrier_name || '—',
    status: policy.ref_policyStatus_name || policy.policy_status || '—',
    paid_status: getPaidStatusLabel(policy),
    paid_status_id: getPaidStatusId(policy),
    agent_id: policy.ref_agent_owner,
    agent_name: policy.ref_agent_owner_name,
    source_name: policy.ref_metacontactsource_name,
  })),
});

export const agentPoliciesV2Api = {
  async getPolicies(query: PoliciesV2Query): Promise<PoliciesV2Response> {
    const response = await fetch(POLICIES_API_URL, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({
        agent_id: query.agentIds,
        page: query.page,
        per_page: query.perPage,
        search: query.search || null,
        sort: query.sort ?? {},
        filter: query.filter ?? { expression: [] },
        start_date: query.startDate,
        end_date: query.endDate,
        timeframe: query.timeframe,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const payload = await response.json() as RawPoliciesV2Response;
    return normalizePoliciesResponse(payload);
  },

  async getTeamPolicies(query: PoliciesV2Query): Promise<PoliciesV2Response> {
    const response = await fetch(TEAM_POLICIES_API_URL, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({
        agent_id: query.agentIds[0] || null,
        page: query.page,
        per_page: query.perPage,
        search: query.search || null,
        sort: query.sort ?? {},
        filter: query.filter ?? { expression: [] },
        start_date: query.startDate,
        end_date: query.endDate,
        timeframe: query.timeframe,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const payload = await response.json() as RawPoliciesV2Response;
    return normalizePoliciesResponse(payload);
  },

  async getCarrierOptions(): Promise<PolicyFilterOption[]> {
    const response = await fetch(`${UTILITY_API_URL}/carriers`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return normalizeMetaOptions(await response.json(), 'Unknown Carrier');
  },

  async getPolicyStatusOptions(): Promise<PolicyFilterOption[]> {
    const response = await fetch(`${UTILITY_API_URL}/policy_statuses`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return normalizeMetaOptions(await response.json(), 'Unknown Policy Status');
  },

  async getPolicyPaidStatusOptions(): Promise<PolicyFilterOption[]> {
    const response = await fetch(`${UTILITY_API_URL}/policy_paid_statuses`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return normalizeMetaOptions(await response.json(), 'Unknown Paid Status');
  },
};
