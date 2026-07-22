const FFL_ISSUE_PAID_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/ffl/issue_paid';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface FflIssuePaidRecord {
  id: string;
  created_at: number;
  year: number;
  ffl_uuid: string;
  agent_id: string;
  name: string;
  whole_life: number;
  term_life: number;
  annuity: number;
  ul: number;
  health: number;
  agency_green: number;
  hall_of_fame_red: number;
  first_leg_percent: number;
  outside_first_leg: number;
  [key: string]: unknown;
}

const toRecordArray = (payload: unknown): FflIssuePaidRecord[] => {
  if (Array.isArray(payload)) return payload as FflIssuePaidRecord[];
  if (payload && typeof payload === 'object') {
    const wrapped = payload as { data?: unknown; items?: unknown };
    if (Array.isArray(wrapped.data)) return wrapped.data as FflIssuePaidRecord[];
    if (Array.isArray(wrapped.items)) return wrapped.items as FflIssuePaidRecord[];
  }
  return [];
};

export const fflIssuePaidApi = {
  async getByAgentId(agentId: string): Promise<FflIssuePaidRecord | null> {
    const params = new URLSearchParams({ agent_id: agentId });
    const response = await fetch(`${FFL_ISSUE_PAID_URL}?${params}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const records = toRecordArray(await response.json());
    return records.find(record => record.agent_id === agentId) ?? records[0] ?? null;
  },
};
