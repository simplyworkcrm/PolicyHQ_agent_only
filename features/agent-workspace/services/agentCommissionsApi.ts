import { BASE_URL, ApiError } from '../../../services/api';

const COMMISSIONS_SUMMARY_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/my_business/commissions/summary';

// Helper to handle authenticated requests
const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export const agentCommissionsApi = {
  /**
   * Fetches commission summary
   */
  getCommissionsSummary: async (input: {
    timeframe: string | null;
    agent_id: string;
    search: string;
    start_date: string | null;
    end_date: string | null;
  }) => {
    const response = await fetch(COMMISSIONS_SUMMARY_URL, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(input),
    });

    if (!response.ok) throw new ApiError('Failed to fetch commission summary', response.status);
    const data = await response.json();
    return data?.summary ?? data?.commissions_summary ?? data;
  },

  /**
   * Fetches commission transactions list
   */
  getCommissions: async (agentId: string, startDate: number | null, endDate: number | null, statusId: string | null = null) => {
    const params = new URLSearchParams({ agent_id: agentId });

    if (startDate !== null) params.append('start_date', String(startDate));
    if (endDate !== null) params.append('end_date', String(endDate));
    
    if (statusId) {
        params.append('status_id', statusId);
    }

    const response = await fetch(`${BASE_URL}/commissions?${params.toString()}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch commissions', response.status);
    return response.json();
  }
};
