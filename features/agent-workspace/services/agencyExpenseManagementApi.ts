const AGENCY_EXPENSE_OVERVIEW_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_agency/expense-management/overview';
const AGENCY_EXPENSE_LOG_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_agency/expense-management/expense-log';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface AgencyExpenseOverviewQuery {
  agentId: string;
  timeframe: 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom' | null;
  startDate: string | null;
  endDate: string | null;
  debtStatus?: 'all' | 'resolved' | 'unresolved';
}

export interface AgencyExpenseLogQuery {
  agentId: string;
  timeframe: 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom' | null;
  startDate: string | null;
  endDate: string | null;
}

export interface AgencyExpenseLogRow {
  id?: string | number;
  expense_date?: string | null;
  expense?: string | null;
  cost?: number | string | null;
  notes?: string | null;
  agent_id?: string | null;
  agent_name?: string | null;
  profile?: unknown;
  [key: string]: unknown;
}

export interface AgencyExpenseLogSummary {
  total_cost?: number | string | null;
  expense_count?: number | string | null;
  [key: string]: unknown;
}

export interface AgencyExpenseLogResponse {
  expense_log?: {
    summary?: AgencyExpenseLogSummary | null;
    rundown?: AgencyExpenseLogRow[] | null;
  } | null;
}

export interface AgencyExpenseRiskAgent {
  agent_id?: string | null;
  agent_name?: string | null;
  expenses?: number | string | null;
  debts?: number | string | null;
  production?: number | string | null;
  [key: string]: unknown;
}

export interface AgencyDebtByCarrier {
  carrier?: string | null;
  total_debts?: number | string | null;
  debt_count?: number | string | null;
  [key: string]: unknown;
}

export interface AgencyExpenseOverviewResponse {
  overview?: {
    summary?: {
      total_expenses?: number | string | null;
      expense_count?: number | string | null;
      total_debts?: number | string | null;
      debt_count?: number | string | null;
      total_production?: number | string | null;
      [key: string]: unknown;
    } | null;
    agent_risk?: AgencyExpenseRiskAgent[] | null;
    debts_by_carrier?: AgencyDebtByCarrier[] | null;
  } | null;
}

const buildOverviewQuery = (query: AgencyExpenseOverviewQuery) => {
  const params = new URLSearchParams();

  params.set('agent_id', query.agentId);
  params.set('debt_status', query.debtStatus || 'all');
  if (query.timeframe) params.set('timeframe', query.timeframe);
  if (query.timeframe === 'custom') {
    if (query.startDate) params.set('start_date', query.startDate);
    if (query.endDate) params.set('end_date', query.endDate);
  }

  return params.toString();
};

const buildExpenseLogQuery = (query: AgencyExpenseLogQuery) => {
  const params = new URLSearchParams();

  params.set('agent_id', query.agentId);
  if (query.timeframe) params.set('timeframe', query.timeframe);
  if (query.timeframe === 'custom') {
    if (query.startDate) params.set('start_date', query.startDate);
    if (query.endDate) params.set('end_date', query.endDate);
  }

  return params.toString();
};

export const agencyExpenseManagementApi = {
  async getOverview(query: AgencyExpenseOverviewQuery): Promise<AgencyExpenseOverviewResponse> {
    const response = await fetch(`${AGENCY_EXPENSE_OVERVIEW_URL}?${buildOverviewQuery(query)}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async getExpenseLog(query: AgencyExpenseLogQuery): Promise<AgencyExpenseLogResponse> {
    const response = await fetch(`${AGENCY_EXPENSE_LOG_URL}?${buildExpenseLogQuery(query)}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },
};
