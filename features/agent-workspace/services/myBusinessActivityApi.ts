const ACTIVITY_LOG_BASE_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_business/activity-log';
const AGENCY_ACTIVITY_LOG_BASE_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_agency/activity-log';
const MANUAL_ACTIVITY_URL = `${ACTIVITY_LOG_BASE_URL}/manual`;
const AGENCY_MANUAL_ACTIVITY_URL = `${AGENCY_ACTIVITY_LOG_BASE_URL}/manual`;
const AGENCY_WAVV_ACTIVITY_URL = `${AGENCY_ACTIVITY_LOG_BASE_URL}/wavv`;
const WAVV_ACTIVITY_URL = `${ACTIVITY_LOG_BASE_URL}/wavv`;
const POLICYTEK_ACTIVITY_URL = `${ACTIVITY_LOG_BASE_URL}/policytek`;
const CALLX_ACTIVITY_URL = `${ACTIVITY_LOG_BASE_URL}/callx`;
const SALE_ACTIVITY_URL = `${ACTIVITY_LOG_BASE_URL}/sale`;

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface MyBusinessManualActivityQuery {
  agentId: string;
  timeframe: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface MyBusinessManualActivitySaveInput {
  agentId: string;
  activityDate?: string | null;
  leads?: number;
  dials?: number;
  contacts?: number;
  appointments?: number;
  presentations?: number;
  sold?: number;
  totalAp?: number;
}

export interface MyBusinessManualActivityUpdateInput {
  id: string | number;
  leads?: number;
  dials?: number;
  contacts?: number;
  appointments?: number;
  presentations?: number;
  sold?: number;
  totalAp?: number;
}

export interface ManualActivityTotals {
  leads?: number | string | null;
  dials?: number | string | null;
  contacts?: number | string | null;
  appointments?: number | string | null;
  presentations?: number | string | null;
  sold?: number | string | null;
  total_ap?: number | string | null;
}

export interface ManualActivityRundownRow extends ManualActivityTotals {
  id?: string | number;
  created_date?: string | null;
  [key: string]: unknown;
}

export interface MyBusinessManualActivityResponse {
  manual_activity?: {
    summary?: ManualActivityTotals | null;
    rundown?: ManualActivityRundownRow[] | null;
    today_activity?: ManualActivityTotals | null;
  } | null;
}

export interface AgencyManualActivityAgent {
  agent_id: string;
  name?: string | null;
  profile?: {
    url?: string | null;
    name?: string | null;
    mime?: string | null;
  } | null;
  summary?: ManualActivityTotals | null;
}

export interface MyAgencyManualActivityResponse {
  manual_activity?: AgencyManualActivityAgent[] | null;
}

export interface AgencyWavvActivityAgent {
  agent_id: string;
  name?: string | null;
  profile?: {
    url?: string | null;
    name?: string | null;
    mime?: string | null;
  } | null;
  summary?: {
    connected?: boolean | null;
    summary?: WavvActivitySummary | null;
  } | null;
}

export interface WavvActivitySummary {
  dials?: number | string | null;
  conversations?: number | string | null;
  contacts?: number | string | null;
  talk_time?: number | string | null;
  avgCallLength?: number | string | null;
}

export interface WavvActivityRundownRow {
  id?: string | number;
  stat_date?: string | null;
  userId?: string | null;
  teamMemberId?: string | null;
  name?: string | null;
  calls?: number | string | null;
  conversations?: number | string | null;
  contactsCalled?: number | string | null;
  talktime?: number | string | null;
  dialtime?: number | string | null;
  avgCallLength?: number | string | null;
  [key: string]: unknown;
}

export interface MyBusinessWavvActivityResponse {
  wavv?: {
    connected?: boolean | null;
    summary?: WavvActivitySummary | null;
    rundown?: WavvActivityRundownRow[] | null;
  } | null;
}

export interface PolicyTekActivitySummary {
  calls_received?: number | string | null;
  valid_calls?: number | string | null;
  submitted?: number | string | null;
  submitted_premium?: number | string | null;
  totalSpend?: number | string | null;
  total_duration?: number | string | null;
  averageMin_perCall?: number | string | null;
}

export interface PolicyTekCallRundownRow {
  id?: string | number;
  created_at?: number | string | null;
  callRecordId?: string | null;
  duration?: number | string | null;
  direction?: string | null;
  leadSource?: string | null;
  result?: string | null;
  [key: string]: unknown;
}

export interface PolicyTekLeadStatRow {
  id?: string | number;
  date?: string | null;
  leadsAssigned?: number | string | null;
  validLeads?: number | string | null;
  noSale?: number | string | null;
  refund?: number | string | null;
  quoted?: number | string | null;
  applicationSubmitted?: number | string | null;
  submittedPremium?: number | string | null;
  totalCost?: number | string | null;
  [key: string]: unknown;
}

export interface MyBusinessPolicyTekActivityResponse {
  policytek?: {
    connected?: boolean | null;
    summary?: PolicyTekActivitySummary | null;
    rundown?: {
      call_rundown?: PolicyTekCallRundownRow[] | null;
      lead_stat?: PolicyTekLeadStatRow[] | null;
    } | null;
  } | null;
}

export interface CallXActivitySummary {
  calls_received?: number | string | null;
  valid_calls?: number | string | null;
  submitted?: number | string | null;
  submitted_premium?: number | string | null;
  totalSpend?: number | string | null;
}

export interface CallXActivityRundownRow {
  id?: string | number;
  stat_date?: number | string | null;
  total?: number | string | null;
  paid?: number | string | null;
  valid?: number | string | null;
  refund?: number | string | null;
  submitted?: number | string | null;
  quoted?: number | string | null;
  submittedPercentage?: number | string | null;
  quotedPercentage?: number | string | null;
  closePercentage?: number | string | null;
  scpa?: number | string | null;
  totalSpend?: number | string | null;
  totalSubmittedAP?: number | string | null;
  [key: string]: unknown;
}

export interface MyBusinessCallXActivityResponse {
  callx?: {
    connected?: boolean | null;
    summary?: CallXActivitySummary | null;
    rundown?: CallXActivityRundownRow[] | null;
  } | null;
}

export interface SubmittedSaleActivitySummary {
  dials?: number | string | null;
  sits?: number | string | null;
  contacts?: number | string | null;
  submitted?: number | string | null;
  submitted_ap?: number | string | null;
}

export interface SubmittedSaleActivityRundownRow {
  id?: string | number;
  created_at?: number | string | null;
  client?: string | null;
  policy_number?: string | null;
  annual_premium?: number | string | null;
  outboundLogDials?: number | string | null;
  outboundLogContacts?: number | string | null;
  outboundLogSits?: number | string | null;
  outboundLogSales?: number | string | null;
  [key: string]: unknown;
}

export interface MyBusinessSubmittedSaleActivityResponse {
  submitted_sale?: {
    connected?: boolean | null;
    summary?: SubmittedSaleActivitySummary | null;
    rundown?: SubmittedSaleActivityRundownRow[] | null;
  } | null;
}

const buildActivityQuery = (query: MyBusinessManualActivityQuery) => {
  const params = new URLSearchParams();

  params.set('agent_id', query.agentId);
  if (query.timeframe) params.set('timeframe', query.timeframe);
  if (query.timeframe === 'custom') {
    if (query.startDate) params.set('start_date', query.startDate);
    if (query.endDate) params.set('end_date', query.endDate);
  }

  return params.toString();
};

export const myBusinessActivityApi = {
  async getManualActivity(query: MyBusinessManualActivityQuery): Promise<MyBusinessManualActivityResponse> {
    const response = await fetch(`${MANUAL_ACTIVITY_URL}?${buildActivityQuery(query)}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async saveManualActivity(input: MyBusinessManualActivitySaveInput): Promise<MyBusinessManualActivityResponse> {
    const response = await fetch(MANUAL_ACTIVITY_URL, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({
        agent_id: input.agentId,
        ...(input.activityDate ? { activity_date: input.activityDate } : {}),
        leads: input.leads ?? 0,
        dials: input.dials ?? 0,
        contacts: input.contacts ?? 0,
        appointments: input.appointments ?? 0,
        presentations: input.presentations ?? 0,
        sold: input.sold ?? 0,
        total_ap: input.totalAp ?? 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async updateManualActivity(input: MyBusinessManualActivityUpdateInput): Promise<MyBusinessManualActivityResponse> {
    const { id, totalAp, ...values } = input;
    const response = await fetch(`${MANUAL_ACTIVITY_URL}/${encodeURIComponent(String(id))}`, {
      method: 'PATCH',
      headers: authHeader(),
      body: JSON.stringify({ ...values, ...(totalAp !== undefined ? { total_ap: totalAp } : {}) }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async getWavvActivity(query: MyBusinessManualActivityQuery): Promise<MyBusinessWavvActivityResponse> {
    const response = await fetch(`${WAVV_ACTIVITY_URL}?${buildActivityQuery(query)}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async getPolicyTekActivity(query: MyBusinessManualActivityQuery): Promise<MyBusinessPolicyTekActivityResponse> {
    const response = await fetch(`${POLICYTEK_ACTIVITY_URL}?${buildActivityQuery(query)}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async getCallXActivity(query: MyBusinessManualActivityQuery): Promise<MyBusinessCallXActivityResponse> {
    const response = await fetch(`${CALLX_ACTIVITY_URL}?${buildActivityQuery(query)}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async getSubmittedSaleActivity(query: MyBusinessManualActivityQuery): Promise<MyBusinessSubmittedSaleActivityResponse> {
    const response = await fetch(`${SALE_ACTIVITY_URL}?${buildActivityQuery(query)}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },
};

export const myAgencyActivityApi = {
  async getManualActivity(query: MyBusinessManualActivityQuery): Promise<MyAgencyManualActivityResponse> {
    const response = await fetch(`${AGENCY_MANUAL_ACTIVITY_URL}?${buildActivityQuery(query)}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async getWavvActivity(query: MyBusinessManualActivityQuery): Promise<AgencyWavvActivityAgent[]> {
    const response = await fetch(`${AGENCY_WAVV_ACTIVITY_URL}?${buildActivityQuery(query)}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },
} as const;
