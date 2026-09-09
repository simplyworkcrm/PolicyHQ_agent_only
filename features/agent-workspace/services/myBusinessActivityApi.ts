const ACTIVITY_LOG_BASE_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_business/activity-log';
const AGENCY_ACTIVITY_LOG_BASE_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_agency/activity-log';
const MANUAL_ACTIVITY_URL = `${ACTIVITY_LOG_BASE_URL}/manual`;
const AGENCY_MANUAL_ACTIVITY_URL = `${AGENCY_ACTIVITY_LOG_BASE_URL}/manual`;
const AGENCY_WAVV_ACTIVITY_URL = `${AGENCY_ACTIVITY_LOG_BASE_URL}/wavv`;
const WAVV_ACTIVITY_URL = `${ACTIVITY_LOG_BASE_URL}/wavv`;
const POLICYTEK_ACTIVITY_URL = `${ACTIVITY_LOG_BASE_URL}/policytek`;
const CALLX_ACTIVITY_URL = `${ACTIVITY_LOG_BASE_URL}/callx`;
const SALE_ACTIVITY_URL = `${ACTIVITY_LOG_BASE_URL}/sale`;
const UTILITY_SOURCES_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/utility/sources';
const UTILITY_CARRIERS_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/utility/carriers';
const MANUAL_APPOINTMENTS_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_business/appointments/manual';
const SWCRM_ACCOUNT_ACCESS_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/user/ghl_location/access';
const SYNC_APPOINTMENTS_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_business/appointments/sync';
const APPOINTMENTS_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_business/appointments';

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

export interface MyBusinessManualActivityByDateQuery {
  agentId: string;
  date: string;
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

export type MyBusinessManualActivityByDateResponse = ManualActivityRundownRow | null;

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

export interface AppointmentSourceOption {
  id: string;
  name: string;
}

export interface SwcrmAccountOption extends AppointmentSourceOption {}

export interface AppointmentCarrierOption extends AppointmentSourceOption {
  statuses?: unknown[];
  logo?: {
    url?: string | null;
    [key: string]: unknown;
  } | null;
}

export interface ManualAppointmentInput {
  client_name: string;
  booked_type: string | null;
  lead_source_id: string | null;
  lead_source: string | null;
  appointment_result: string | null;
  monthly_payment: number | null;
  ap: number | null;
  carrier_placement_id: string | null;
  carrier_placement: string | null;
  policy_status: string | null;
  date_booked: string;
  appointment_date: string;
}

export interface ManualAppointmentResponse extends ManualAppointmentInput {
  id: string;
  created_at: number;
  [key: string]: unknown;
}

export interface SyncAppointmentsInput {
  start_date: number;
  end_date: number;
  swcrm_account_id: string;
}

export interface UpdateAppointmentInput {
  id: string;
  booked_type: string | null;
  lead_source_id: string | null;
  lead_source: string | null;
  appointment_result: string | null;
  monthly_payment: number | null;
  ap: number | null;
  carrier_placement_id: string | null;
  carrier_placement: string | null;
  policy_status: string | null;
}

export interface SyncedAppointmentRow {
  id: string;
  created_at: number;
  ghl_event_id?: string | null;
  calendar_id?: string | null;
  contact_id?: string | null;
  client_name?: string | null;
  location_id?: string | null;
  assigned_user_id?: string | null;
  dateAdded?: number | null;
  startTime?: number | null;
  title?: string | null;
  appointmentStatus?: string | null;
  date_booked?: string | null;
  appointment_date?: string | null;
  booked_type?: string | null;
  lead_source_id?: string | null;
  lead_source?: string | null;
  appointment_result?: string | null;
  monthly_payment?: number | null;
  ap?: number | null;
  carrier_placement_id?: string | null;
  carrier_placement?: string | null;
  policy_status?: string | null;
  [key: string]: unknown;
}

export interface AppointmentsQuery {
  page: number;
  perPage: number;
  sort: Record<string, 'asc' | 'desc'>;
  filter: Record<string, unknown>;
  timeframe: string;
  startDate: string | null;
  endDate: string | null;
}

export interface AppointmentsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: SyncedAppointmentRow[];
}

const readLookupOptions = async <T extends AppointmentSourceOption>(url: string): Promise<T[]> => {
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeader(),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
  return rows
    .filter((item: unknown): item is T => Boolean(item && typeof item === 'object' && 'id' in item && 'name' in item))
    .map(item => ({ ...item, id: String(item.id), name: String(item.name) }));
};

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

  async getManualActivityByDate(query: MyBusinessManualActivityByDateQuery): Promise<MyBusinessManualActivityByDateResponse> {
    const params = new URLSearchParams({ agent_id: query.agentId });
    const response = await fetch(`${MANUAL_ACTIVITY_URL}/${encodeURIComponent(query.date)}?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (response.status === 404 || response.status === 204) return null;
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const payload = await response.json();
    if (!payload) return null;
    if (payload.manual_activity && !Array.isArray(payload.manual_activity)) return payload.manual_activity;
    return payload;
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

  getAppointmentSources(): Promise<AppointmentSourceOption[]> {
    return readLookupOptions<AppointmentSourceOption>(UTILITY_SOURCES_URL);
  },

  getAppointmentCarriers(): Promise<AppointmentCarrierOption[]> {
    return readLookupOptions<AppointmentCarrierOption>(UTILITY_CARRIERS_URL);
  },

  getSwcrmAccounts(): Promise<SwcrmAccountOption[]> {
    return readLookupOptions<SwcrmAccountOption>(SWCRM_ACCOUNT_ACCESS_URL);
  },

  async saveManualAppointment(input: ManualAppointmentInput): Promise<ManualAppointmentResponse> {
    const response = await fetch(MANUAL_APPOINTMENTS_URL, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async updateAppointment(input: UpdateAppointmentInput): Promise<SyncedAppointmentRow | null> {
    const response = await fetch(APPOINTMENTS_URL, {
      method: 'PATCH',
      headers: authHeader(),
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const body = await response.text();
    return body ? JSON.parse(body) : null;
  },

  async syncAppointments(input: SyncAppointmentsInput): Promise<SyncedAppointmentRow[]> {
    const response = await fetch(SYNC_APPOINTMENTS_URL, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  },

  async getAppointments(query: AppointmentsQuery): Promise<AppointmentsResponse> {
    const params = new URLSearchParams({
      page: String(query.page),
      per_page: String(query.perPage),
      sort: JSON.stringify(query.sort),
      filter: JSON.stringify(query.filter),
      timeframe: query.timeframe,
    });
    if (query.startDate) params.set('start_date', query.startDate);
    if (query.endDate) params.set('end_date', query.endDate);

    const response = await fetch(`${APPOINTMENTS_URL}?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return {
      itemsReceived: Number(payload?.itemsReceived ?? items.length),
      curPage: Number(payload?.curPage ?? query.page),
      nextPage: payload?.nextPage == null ? null : Number(payload.nextPage),
      prevPage: payload?.prevPage == null ? null : Number(payload.prevPage),
      offset: Number(payload?.offset ?? 0),
      perPage: Number(payload?.perPage ?? query.perPage),
      itemsTotal: Number(payload?.itemsTotal ?? items.length),
      pageTotal: Math.max(1, Number(payload?.pageTotal ?? 1)),
      items,
    };
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
