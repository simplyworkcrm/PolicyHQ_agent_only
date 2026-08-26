import { ApiError } from '../../../services/api';

const BASE_URL = '/insurance-toolkits';

export type InsuranceToolkitsConnectionState = 'connected' | 'disconnected' | 'expired' | 'error';

export interface InsuranceToolkitsConnectInput {
  email: string;
  password: string;
  custom_auth?: string | null;
}

export interface InsuranceToolkitsConnectionStatus {
  connected: boolean;
  status: InsuranceToolkitsConnectionState;
  account_email?: string | null;
  connected_at?: string | null;
  last_verified_at?: string | null;
  token_expires_at?: string | null;
  message?: string | null;
}

export interface InsuranceToolkitsDisconnectOutput {
  disconnected: boolean;
  status: 'disconnected';
}

export type FexCoverageType = 'Level' | 'Graded/Modified' | 'Guaranteed' | 'Limited Pay' | 'SPWL';
export type FexSex = 'Male' | 'Female';
export type FexTobacco =
  | 'None'
  | 'Cigarettes'
  | 'Cigarettes + Other Nicotine Products'
  | 'Occasional pipe/cigar use only'
  | 'Other Nicotine Products';
export type FexPaymentType = 'Bank Draft/EFT' | 'Direct Express' | 'Credit Card' | 'Debit Card';

export interface FexQuoteInput {
  toolkit: 'FEX';
  coverageType: FexCoverageType;
  sex: FexSex;
  state: string;
  tobacco: FexTobacco;
  paymentType: FexPaymentType;
  faceAmount?: number;
  premiumAmount?: number;
  age?: number;
  month?: string;
  day?: string;
  year?: string;
  feet?: number;
  inches?: number;
  weight?: number;
  underwritingItems: unknown[];
}

export interface FexQuote {
  company: string;
  monthly?: number | null;
  yearly?: number | null;
  face_amount?: number | null;
  plan_name?: string | null;
  tier_name?: string | null;
  plan_info?: string | null;
  eapp_link?: string | null;
  logo?: string | null;
  warning?: string | null;
  full_comp?: number | string | null;
  compensation_text?: string | null;
  limited_pay?: boolean | null;
  riders?: unknown[];
  additional_benefits?: unknown[];
  [key: string]: unknown;
}

export interface FexExcludedCarrier {
  name: string;
  why: string;
  [key: string]: unknown;
}

export interface FexQuoteOutput {
  quotes: FexQuote[];
  excluded: FexExcludedCarrier[];
  request_id?: string | null;
  quoted_at?: string | null;
}

const authHeaders = (includeJson = true): HeadersInit => ({
  Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
  ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
});

const parseError = async (response: Response, fallback: string): Promise<ApiError> => {
  try {
    const payload = await response.json();
    const message = payload?.message || payload?.error || fallback;
    return new ApiError(String(message), response.status);
  } catch {
    return new ApiError(fallback, response.status);
  }
};

const normalizeQuoteOutput = (payload: any): FexQuoteOutput => ({
  quotes: Array.isArray(payload?.quotes) ? payload.quotes : [],
  excluded: Array.isArray(payload?.excluded) ? payload.excluded : [],
  request_id: payload?.request_id ?? null,
  quoted_at: payload?.quoted_at ?? null,
});

export const insuranceToolkitsApi = {
  connect: async (input: InsuranceToolkitsConnectInput, signal?: AbortSignal): Promise<InsuranceToolkitsConnectionStatus> => {
    const response = await fetch(`${BASE_URL}/connect`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) throw await parseError(response, 'Unable to connect InsuranceToolkits.');
    return response.json();
  },

  getStatus: async (signal?: AbortSignal): Promise<InsuranceToolkitsConnectionStatus> => {
    const response = await fetch(`${BASE_URL}/status`, {
      method: 'GET',
      headers: authHeaders(false),
      signal,
    });
    if (!response.ok) throw await parseError(response, 'Unable to check InsuranceToolkits connection.');
    return response.json();
  },

  quoteFex: async (input: FexQuoteInput, signal?: AbortSignal): Promise<FexQuoteOutput> => {
    const response = await fetch(`${BASE_URL}/fex/quote`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) throw await parseError(response, 'Unable to retrieve FEX quotes.');
    return normalizeQuoteOutput(await response.json());
  },

  disconnect: async (signal?: AbortSignal): Promise<InsuranceToolkitsDisconnectOutput> => {
    const response = await fetch(`${BASE_URL}/disconnect`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
      signal,
    });
    if (!response.ok) throw await parseError(response, 'Unable to disconnect InsuranceToolkits.');
    return response.json();
  },
};
