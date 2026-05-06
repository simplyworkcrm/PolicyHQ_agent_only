const CALLS_API = 'https://api1.simplyworkcrm.com/api:xyNb4DPW';

const getAuthToken = () => localStorage.getItem('authToken') ?? null;

const authHeader = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface WavvCallEntry {
  name: string;
  calls: number;           // total calls dialed
  conversations: number;   // connected calls
  contactsCalled: number;  // unique contacts reached
  talktime: number;        // seconds of talk time
  dialtime: number;        // seconds of total dial time
  avgCallLength: number;   // seconds avg per connected call
}

/** Returns the Friday that starts the current business week (Fri–Thu) */
export const getCurrentWeekStart = (): Date => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun,1=Mon,...,5=Fri,6=Sat
  const daysSinceFri = (day + 2) % 7;
  const fri = new Date(now);
  fri.setDate(now.getDate() - daysSinceFri);
  return fri;
};

export const toDateStr = (d: Date): string => d.toISOString().split('T')[0];

const callReportWavvApi = {
  async getCallReport(startDate: string, endDate: string): Promise<WavvCallEntry[]> {
    const response = await fetch(`${CALLS_API}/reports/calls/wavv`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({
        startDate,
        endDate,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },
};

export { callReportWavvApi };
