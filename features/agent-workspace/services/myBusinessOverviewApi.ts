const OVERVIEW_URLS = {
  business: 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_business/overview',
  agency: 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_agency/overview',
} as const;

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
  mode?: keyof typeof OVERVIEW_URLS;
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

export interface MyBusinessAgencyLogo {
  url?: string | null;
  [key: string]: unknown;
}

export interface MyBusinessAgencyProfile {
  id: string;
  name: string;
  ref_agent_manager?: string | null;
  monthly_goal_ap?: number | null;
  logo?: string | MyBusinessAgencyLogo | null;
}

export interface MyBusinessAgentBreakdown {
  id?: string;
  agent_id?: string;
  ref_agent_owner?: string;
  agent?: string;
  name?: string;
  agent_name?: string;
  first_name?: string;
  last_name?: string;
  records?: number;
  policy_count?: number;
  total_ap?: number;
  annual_premium?: number;
  profile?: string | MyBusinessAgencyLogo | null;
  profile_image?: string | MyBusinessAgencyLogo | null;
  image?: string | MyBusinessAgencyLogo | null;
  [key: string]: unknown;
}

export interface MyBusinessOverviewResponse {
  by_state?: MyBusinessStateBreakdown[];
  by_source?: MyBusinessSourceBreakdown[];
  by_policyStatus?: MyBusinessPolicyStatusBreakdown[];
  by_agents?: MyBusinessAgentBreakdown[];
  isAgency_manager?: boolean;
  ffl_agency?: MyBusinessAgencyProfile | null;
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

    const baseUrl = OVERVIEW_URLS[query.mode || 'business'];
    const url = params.toString() ? `${baseUrl}?${params}` : baseUrl;
    const response = await fetch(url, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async updateAgencyMonthlyGoal(agencyId: string, monthlyGoalAp: number | null): Promise<MyBusinessOverviewResponse> {
    const response = await fetch(`https://api1.simplyworkcrm.com/api:SZgR1JsR/my_agency/${agencyId}/monthly_goal`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({ monthly_goal_ap: monthlyGoalAp }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },
};
