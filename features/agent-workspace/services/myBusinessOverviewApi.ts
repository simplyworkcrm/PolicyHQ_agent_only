const MY_BUSINESS_OVERVIEW_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_business/overview';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export type MyBusinessOverviewTimeframe = 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom' | null;

export interface MyBusinessOverviewQuery {
  agentId: string;
  timeframe: MyBusinessOverviewTimeframe;
  startDate: string | null;
  endDate: string | null;
}

export interface MyBusinessStateBreakdown {
  state: string;
  records: number;
  total_ap: number;
}

export interface MyBusinessSourceBreakdown {
  source: string;
  source_name?: string;
  name?: string;
  records: number;
  total_ap: number;
}

export interface MyBusinessPolicyStatusBreakdown {
  policy_status?: string;
  policy_status_name?: string;
  status?: string;
  name?: string;
  records?: number;
  policy_count?: number;
  total_ap?: number;
}

export interface MyBusinessOverviewResponse {
  by_state?: MyBusinessStateBreakdown[];
  by_source?: MyBusinessSourceBreakdown[];
  by_policyStatus?: MyBusinessPolicyStatusBreakdown[];
  [key: string]: unknown;
}

export const myBusinessOverviewApi = {
  async getOverview(query: MyBusinessOverviewQuery): Promise<MyBusinessOverviewResponse> {
    const params = new URLSearchParams();

    params.set('agent_id', query.agentId);
    if (query.timeframe) params.set('timeframe', query.timeframe);
    if (query.timeframe === 'custom') {
      if (query.startDate) params.set('start_date', query.startDate);
      if (query.endDate) params.set('end_date', query.endDate);
    }

    const url = params.toString() ? `${MY_BUSINESS_OVERVIEW_URL}?${params}` : MY_BUSINESS_OVERVIEW_URL;
    const response = await fetch(url, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },
};
