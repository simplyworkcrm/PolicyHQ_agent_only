const CALLS_API = 'https://api1.simplyworkcrm.com/api:xyNb4DPW';

const getAuthToken = () => localStorage.getItem('authToken') ?? null;

const authHeader = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface CallxCallEntry {
  id: string;
  callx_id: number;
  name: string;
  calls_received: number;
  valid_calls: number;
  paid_calls: number;
  submitted: number;
  submitted_premium: number;
  totalSpend: number;
}

/** Returns the Friday that starts the current business week (Fri–Thu) */
export const getCurrentWeekStart = (): Date => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun,1=Mon,...,5=Fri,6=Sat
  // Days since last Friday: Fri=0, Sat=1, Sun=2, Mon=3, Tue=4, Wed=5, Thu=6
  const daysSinceFri = (day + 2) % 7;
  const fri = new Date(now);
  fri.setDate(now.getDate() - daysSinceFri);
  return fri;
};

export const toDateStr = (d: Date): string => d.toISOString().split('T')[0];

const callReportCallxApi = {
  async getCallReport(startDate: string, endDate: string): Promise<CallxCallEntry[]> {
    const response = await fetch(`${CALLS_API}/reports/calls/callx`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({
        startDate: `${startDate}T00:00:00Z`,
        endDate: `${endDate}T23:59:59Z`,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },
};

export { callReportCallxApi };
