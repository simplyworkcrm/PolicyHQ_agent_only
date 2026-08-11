import { ApiError } from '../../../services/api';

const BOOK_OF_BUSINESS_API_BASE = import.meta.env.DEV
  ? '/xano-api/api:SZgR1JsR'
  : 'https://api1.simplyworkcrm.com/api:SZgR1JsR';
const BOOK_OF_BUSINESS_SUMMARY_URL = `${BOOK_OF_BUSINESS_API_BASE}/my_business/book-of-business/summary`;
const BOOK_OF_BUSINESS_MONTHLY_PERFORMANCE_URL = `${BOOK_OF_BUSINESS_API_BASE}/my_business/book-of-business/monthly_performance`;
const AGENCY_BOOK_OF_BUSINESS_SUMMARY_URL = `${BOOK_OF_BUSINESS_API_BASE}/my_agency/book-of-business/summary`;
const AGENCY_BOOK_OF_BUSINESS_MONTHLY_PERFORMANCE_URL = `${BOOK_OF_BUSINESS_API_BASE}/my_agency/book-of-business/monthly_performance`;
const POLICIES_BY_ID_URL = `${BOOK_OF_BUSINESS_API_BASE}/policies/by_id`;

export type BookOfBusinessSummary = {
  gross: { ap: number; count: number };
  net: { ap: number; chargeback_ap: number };
  issued_paid: { ap: number; count: number; paid: { ap: number; count: number } };
  persistency: { percentile: number; cb: number; missed: number };
  average: number;
};

export type BookOfBusinessMonthlyPerformance = {
  submitted_date: string;
  count: number;
  total_annual_premium: number;
  policy_ids: string[];
};

export type BookOfBusinessPolicy = {
  id: string;
  client: string;
  agentName: string;
  policyNumber: string;
  carrier: string;
  product: string;
  source: string;
  annualPremium: number;
  monthlyPremium: number;
  policyStatus: string;
  paidStatus: string;
};

const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeSummary = (payload: any): BookOfBusinessSummary => {
  const data = payload?.summary ?? payload?.data ?? payload;

  return {
    gross: { ap: asNumber(data?.gross?.ap), count: asNumber(data?.gross?.count) },
    net: { ap: asNumber(data?.net?.ap), chargeback_ap: asNumber(data?.net?.chargeback_ap) },
    issued_paid: {
      ap: asNumber(data?.issued_paid?.ap),
      count: asNumber(data?.issued_paid?.count),
      paid: {
        ap: asNumber(data?.issued_paid?.paid?.ap),
        count: asNumber(data?.issued_paid?.paid?.count),
      },
    },
    persistency: {
      percentile: asNumber(data?.persistency?.percentile),
      cb: asNumber(data?.persistency?.cb),
      missed: asNumber(data?.persistency?.missed),
    },
    average: asNumber(data?.average),
  };
};

const normalizeMonthlyPerformance = (payload: any): BookOfBusinessMonthlyPerformance[] => {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.monthly_performance)
        ? payload.monthly_performance
        : [];

  return rows.map((row: any) => ({
    submitted_date: String(row?.submitted_date || row?.date || ''),
    count: asNumber(row?.count),
    total_annual_premium: asNumber(row?.total_annual_premium),
    policy_ids: Array.isArray(row?.policy_ids) ? row.policy_ids.map(String) : [],
  })).filter((row: BookOfBusinessMonthlyPerformance) => row.submitted_date);
};

const normalizePolicies = (payload: any): BookOfBusinessPolicy[] => {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.policies)
        ? payload.policies
        : [];

  return rows.map((row: any) => ({
    id: String(row?.id || ''),
    client: String(row?.client || 'Unnamed client'),
    agentName: String(row?.ref_agent_owner_name || row?.agent_name || row?.agent || ''),
    policyNumber: String(row?.policy_number || ''),
    carrier: String(row?.ref_carrier_name || ''),
    product: String(row?.carrier_product || row?.ref_metacontacttype_name || ''),
    source: String(row?.ref_metacontactsource_name || ''),
    annualPremium: asNumber(row?.annual_premium),
    monthlyPremium: asNumber(row?.monthly_premium),
    policyStatus: String(row?.ref_policyStatus_name || ''),
    paidStatus: String(row?.meta_policy_paidstatus_name || ''),
  })).filter((policy: BookOfBusinessPolicy) => policy.id);
};

export const bookOfBusinessApi = {
  getSummary: async (agentId: string, signal?: AbortSignal): Promise<BookOfBusinessSummary> => {
    const response = await fetch(BOOK_OF_BUSINESS_SUMMARY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agent_id: agentId }),
      signal,
    });

    if (!response.ok) throw new ApiError(`Failed to fetch Book of Business summary (${response.status})`, response.status);
    return normalizeSummary(await response.json());
  },

  getAgencySummary: async (agentId: string, signal?: AbortSignal): Promise<BookOfBusinessSummary> => {
    const response = await fetch(AGENCY_BOOK_OF_BUSINESS_SUMMARY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agent_id: agentId }),
      signal,
    });

    if (!response.ok) throw new ApiError(`Failed to fetch Agency Book of Business summary (${response.status})`, response.status);
    return normalizeSummary(await response.json());
  },

  getMonthlyPerformance: async (input: {
    agentId: string;
    startDate: string;
    endDate: string;
    scope?: 'submitted' | 'issued_paid';
  }, signal?: AbortSignal): Promise<BookOfBusinessMonthlyPerformance[]> => {
    const response = await fetch(BOOK_OF_BUSINESS_MONTHLY_PERFORMANCE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: input.agentId,
        start_date: input.startDate,
        end_date: input.endDate,
        scope: input.scope || 'submitted',
      }),
      signal,
    });

    if (!response.ok) throw new ApiError(`Failed to fetch monthly performance (${response.status})`, response.status);
    return normalizeMonthlyPerformance(await response.json());
  },

  getAgencyMonthlyPerformance: async (input: {
    agentId: string;
    startDate: string;
    endDate: string;
    scope?: 'submitted' | 'issued_paid';
  }, signal?: AbortSignal): Promise<BookOfBusinessMonthlyPerformance[]> => {
    const response = await fetch(AGENCY_BOOK_OF_BUSINESS_MONTHLY_PERFORMANCE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: input.agentId,
        start_date: input.startDate,
        end_date: input.endDate,
        scope: input.scope || 'submitted',
      }),
      signal,
    });

    if (!response.ok) throw new ApiError(`Failed to fetch Agency monthly performance (${response.status})`, response.status);
    return normalizeMonthlyPerformance(await response.json());
  },

  getPoliciesByIds: async (agentId: string, policyIds: string[], signal?: AbortSignal): Promise<BookOfBusinessPolicy[]> => {
    const response = await fetch(POLICIES_BY_ID_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        policy_ids: policyIds,
      }),
      signal,
    });

    if (!response.ok) throw new ApiError(`Failed to fetch policies by ID (${response.status})`, response.status);
    return normalizePolicies(await response.json());
  },
};
