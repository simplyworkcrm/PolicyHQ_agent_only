import { BASE_URL } from '../../../services/api';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

// ── Types ────────────────────────────────────────────────────────────────────

export interface PolicyV2 {
  policy_id: string;
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
  itemsTotal?: number;
  pageTotal?: number;
  items: PolicyV2[];
}

export type PolicySortField =
  | 'client'
  | 'carrier'
  | 'status'
  | 'annual_premium'
  | 'created_at'
  | 'initial_draft_date'
  | 'source_name'
  | 'paid_status';

export type SortDirection = 'asc' | 'desc';

export interface PoliciesV2Query {
  agentId: string;
  page: number;
  perPage: number;
  search?: string;
  sort?: { field: PolicySortField; dir: SortDirection };
  statusFilter?: string;
  paidFilter?: string;
  lockedFilter?: boolean;
  startDate?: number;
  endDate?: number;
}

export interface PoliciesV2Stats {
  submittedPolicies: number;
  submittedPolicies_premium: number;
  issued_placed: number;
  issued_placed_premium: number;
  active_inForce: number;
  active_inForce_premium: number;
  need_attention: number;
  need_attention_premium: number;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const agentPoliciesV2Api = {
  async getStats(agentId: string, startDate?: number, endDate?: number): Promise<PoliciesV2Stats> {
    const params = new URLSearchParams({ agent_id: agentId });
    params.set('dateRange', JSON.stringify({
      start: startDate ?? null,
      end:   endDate   ?? null,
    }));
    const response = await fetch(`${BASE_URL}/policies/optimized/stats?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  async getPolicies(query: PoliciesV2Query): Promise<PoliciesV2Response> {
    const params = new URLSearchParams({
      agent_id: query.agentId,
      page: String(query.page),
      per_page: String(query.perPage),
    });

    if (query.search) params.set('search', query.search);

    if (query.sort) {
      params.set('sort', JSON.stringify({ [query.sort.field]: query.sort.dir }));
    }

    // Build Xano filter expression from status/paid filters
    const filterExpressions: Array<{ statement: { left: { tag: string; operand: string }; op: string; right: { operand: string } } }> = [];

    if (query.statusFilter) {
      filterExpressions.push({
        statement: {
          left: { tag: 'col', operand: 'status' },
          op: '==',
          right: { operand: query.statusFilter },
        },
      });
    }

    if (query.paidFilter) {
      filterExpressions.push({
        statement: {
          left: { tag: 'col', operand: 'paid_status' },
          op: '==',
          right: { operand: query.paidFilter },
        },
      });
    }

    if (query.lockedFilter !== undefined) {
      filterExpressions.push({
        statement: {
          left: { tag: 'col', operand: 'isLocked' },
          op: '==',
          right: { operand: query.lockedFilter as unknown as string },
        },
      });
    }

    if (filterExpressions.length > 0) {
      params.set('filter', JSON.stringify({ expression: filterExpressions }));
    }

    params.set('dateRange', JSON.stringify({
      start: query.startDate ?? null,
      end:   query.endDate   ?? null,
    }));

    const response = await fetch(`${BASE_URL}/policies/optimized?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },
};
