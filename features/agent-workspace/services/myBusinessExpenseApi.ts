const EXPENSE_LOG_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_business/expense-log';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface MyBusinessExpenseQuery {
  agentId: string;
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
  [key: string]: unknown;
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
  if (query.timeframe) params.set('timeframe', query.timeframe);
  if (query.timeframe === 'custom') {
    if (query.startDate) params.set('start_date', query.startDate);
    if (query.endDate) params.set('end_date', query.endDate);
  }

  return params.toString();
};

const expenseBody = (input: MyBusinessExpenseSaveInput) => JSON.stringify({
  agent_id: input.agentId,
  expense_date: input.expenseDate,
  expense: input.expense,
  cost: input.cost,
  notes: input.notes ?? '',
});

export const myBusinessExpenseApi = {
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

  async createExpense(input: MyBusinessExpenseSaveInput): Promise<MyBusinessExpenseResponse> {
    const response = await fetch(EXPENSE_LOG_URL, {
      method: 'POST',
      headers: authHeader(),
      body: expenseBody(input),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async updateExpense(input: MyBusinessExpenseUpdateInput): Promise<MyBusinessExpenseResponse> {
    const response = await fetch(`${EXPENSE_LOG_URL}/${input.id}`, {
      method: 'PATCH',
      headers: authHeader(),
      body: expenseBody(input),
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
