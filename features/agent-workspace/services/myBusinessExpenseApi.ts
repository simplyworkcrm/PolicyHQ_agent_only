import type { ImageMetadata } from './agentTicketsApi';

const EXPENSE_LOG_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_business/expense-log';
const UTILITY_AGENTS_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/utility/agents';
const ASSIST_SPLITS_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/assist/splits';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface MyBusinessExpenseQuery {
  agentId: string;
  type: 'personal' | 'assist';
  timeframe: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface MyBusinessExpenseSaveInput {
  agentId: string;
  expenseDate: string;
  expense: string;
  cost: number;
  notes?: string | null;
  type: 'personal' | 'assist';
  agentOnAssist?: string | null;
  receipt: ImageMetadata[];
}

export interface MyBusinessExpenseUpdateInput extends MyBusinessExpenseSaveInput {
  id: string | number;
}

export interface MyBusinessExpenseRow {
  id?: string | number;
  expense_date?: string | null;
  expense?: string | null;
  cost?: number | string | null;
  notes?: string | null;
  type?: 'personal' | 'assist' | null;
  agent_on_assist?: string | null;
  agent_on_assist_name?: string | null;
  receipt?: unknown;
  [key: string]: unknown;
}

export interface UtilityAgent {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
}

export interface AssistPolicySplit {
  id: string;
  client?: string | null;
  state?: string | null;
  policy_number?: string | null;
  carrier_product?: string | null;
  initial_draft_date?: string | null;
  monthly_premium?: number | string | null;
  annual_premium?: number | string | null;
  ref_agent_owner_name?: string | null;
  ref_carrier_name?: string | null;
  ref_policyStatus_name?: string | null;
  meta_policy_paidstatus_name?: string | null;
  split?: {
    id?: string | null;
    policy_id?: string | null;
    on_split_agent_id?: string | null;
    agent_on_split_percent?: number | string | null;
  } | null;
  [key: string]: unknown;
}

export interface AssistPolicySplitQuery {
  agentId: string;
  agentOnAssist: string;
  expenseDate: string;
}

export interface MyBusinessExpenseSummary {
  total_cost?: number | string | null;
  expense_count?: number | string | null;
  [key: string]: unknown;
}

export interface MyBusinessExpenseResponse {
  expense_log?: {
    summary?: MyBusinessExpenseSummary | null;
    rundown?: MyBusinessExpenseRow[] | null;
  } | null;
}

const buildExpenseQuery = (query: MyBusinessExpenseQuery) => {
  const params = new URLSearchParams();

  params.set('agent_id', query.agentId);
  params.set('type', query.type);
  if (query.timeframe) params.set('timeframe', query.timeframe);
  if (query.timeframe === 'custom') {
    if (query.startDate) params.set('start_date', query.startDate);
    if (query.endDate) params.set('end_date', query.endDate);
  }

  return params.toString();
};

const expenseFields = (input: MyBusinessExpenseSaveInput) => ({
  agent_id: input.agentId,
  expense_date: input.expenseDate,
  expense: input.expense,
  cost: input.cost,
  notes: input.notes ?? '',
  type: input.type,
  agent_on_assist: input.type === 'assist' ? input.agentOnAssist ?? null : null,
  receipt: input.receipt,
});

const expenseRequest = (input: MyBusinessExpenseSaveInput) => ({
  headers: authHeader(),
  body: JSON.stringify(expenseFields(input)),
});

export const myBusinessExpenseApi = {
  async getUtilityAgents(): Promise<UtilityAgent[]> {
    const response = await fetch(UTILITY_AGENTS_URL, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const payload = await response.json();
    if (Array.isArray(payload)) return payload;
    return Array.isArray(payload?.agents) ? payload.agents : [];
  },

  async getExpenses(query: MyBusinessExpenseQuery): Promise<MyBusinessExpenseResponse> {
    const response = await fetch(`${EXPENSE_LOG_URL}?${buildExpenseQuery(query)}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async getAssistSplits(query: AssistPolicySplitQuery): Promise<AssistPolicySplit[]> {
    const response = await fetch(ASSIST_SPLITS_URL, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({
        agent_id: query.agentId,
        agent_on_assist: query.agentOnAssist,
        expense_date: query.expenseDate,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const payload = await response.json();
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.splits)) return payload.splits;
    if (Array.isArray(payload?.policies)) return payload.policies;
    return [];
  },

  async createExpense(input: MyBusinessExpenseSaveInput): Promise<MyBusinessExpenseResponse> {
    const request = expenseRequest(input);
    const response = await fetch(EXPENSE_LOG_URL, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async updateExpense(input: MyBusinessExpenseUpdateInput): Promise<MyBusinessExpenseResponse> {
    const request = expenseRequest(input);
    const response = await fetch(`${EXPENSE_LOG_URL}/${input.id}`, {
      method: 'PATCH',
      headers: request.headers,
      body: request.body,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async deleteExpense(id: string | number): Promise<MyBusinessExpenseResponse> {
    const response = await fetch(`${EXPENSE_LOG_URL}/${id}`, {
      method: 'DELETE',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },
};
