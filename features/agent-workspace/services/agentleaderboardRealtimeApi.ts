import { BASE_URL, ApiError } from '../../../services/api';

const TRAINER_API_BASE_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR';
const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface ArenaEntry {
  agent_id: string;
  agent_name: string;
  agency: string;
  total_annualPremium: number;
  records: number;
  agent_profile?: {
    url?: string;
    access?: string;
    path?: string;
    name?: string;
    type?: string;
    size?: number;
    mime?: string;
    meta?: any;
  } | null;
}

export interface MTDLeaderboardResponse {
  mtd_rundown: ArenaEntry[];
  applications: {
    total_premium: number;
    total_records: number;
  };
}

export interface TodayLeaderboardResponse {
  today_rundown: ArenaEntry[];
  applications: {
    total_premium: number;
    total_records: number;
  };
}

export interface WeekYearResponse {
  week_application: {
    total_premium: number;
    total_records: number;
  };
  year_application: {
    total_premium: number;
    total_records: number;
  };
}

export interface SaleRecord {
  id: string;
  created_at: number;
  annual_premium: number;
  agentOwner_name: string;
  agentId: string;
  teamName: string;
  teamId: string;
  sourceName: string;
  policyStatus: string;
  policyCarrier: string;
}

export interface AgentDetailsResponse {
  production: {
    today: { premium: number; apps: number };
    this_week: { premium: number; apps: number };
    mtd: { premium: number; apps: number };
    this_year: { premium: number; apps: number };
  };
  sources: { name: string; apps: number; premium: number }[];
  carrier: { name: string; apps: number; premium: number }[];
}

export const agentleaderboardRealtimeApi = {
  /**
   * Fetches detailed production breakdown for a single agent
   */
  getAgentDetails: async (agentId: string): Promise<AgentDetailsResponse> => {
    const response = await fetch(`${BASE_URL}/leaderboard/agent_details?agent_id=${encodeURIComponent(agentId)}`, {
      method: 'GET',
      headers: authHeader(),
    });
    if (!response.ok) throw new ApiError('Failed to fetch agent details', response.status);
    return response.json();
  },

  /**
   * Fetches production rankings for Today
   */
  getRealtimeLeaderboard: async (agencyId: string | null = null, sourceId?: string, teamId?: string): Promise<TodayLeaderboardResponse> => {
    const params = new URLSearchParams();
    if (agencyId) params.append('agency_id', agencyId);
    
    let url = `${BASE_URL}/arena/today`;
    if (teamId) {
      url = `${BASE_URL}/team/arena/today/${teamId}`;
    } else if (sourceId) {
      url = `${BASE_URL}/arena/today/${sourceId}`;
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch today standings', response.status);
    return response.json();
  },

  /**
   * Fetches production rankings for Month to Date (MTD)
   */
  getMTDLeaderboard: async (sourceId?: string, teamId?: string): Promise<MTDLeaderboardResponse> => {
    let url = `${BASE_URL}/arena/mtd`;
    if (teamId) {
      url = `${BASE_URL}/team/arena/mtd/${teamId}`;
    } else if (sourceId) {
      url = `${BASE_URL}/arena/mtd/${sourceId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch MTD arena data', response.status);
    return response.json();
  },

  /**
   * Fetches aggregated stats for the current week and year
   */
  getWeekYearStats: async (sourceId?: string, teamId?: string): Promise<WeekYearResponse> => {
    let url = `${BASE_URL}/arena/week_year`;
    if (teamId) {
      url = `${BASE_URL}/team/arena/week_year/${teamId}`;
    } else if (sourceId) {
      url = `${BASE_URL}/arena/week_year/${sourceId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch weekly and yearly stats', response.status);
    return response.json();
  },

  /**
   * Leaderboard overhaul split into three endpoints for specialized querying on Xano.
   */
  getAgentLeaderboard: async (payload: {
    timeframe: 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    startDate?: number | null;
    endDate?: number | null;
    teamId?: string | null;
    sourceId?: string | null;
    agencyIds?: string[] | null;
  }): Promise<any[]> => {
    const url = `${BASE_URL}/arena/leaderboard/agents`;
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.warn("Unified agent endpoint failed. Using mock data.");
      return [];
    }
    return response.json();
  },

  getTeamLeaderboard: async (payload: {
    timeframe: 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    startDate?: number;
    endDate?: number;
    teamIds?: string[];
    sourceId?: string;
  }): Promise<any[]> => {
    const url = `${BASE_URL}/arena/leaderboard/teams`;
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.warn("Unified team endpoint failed. Using mock data.");
      return [];
    }
    return response.json();
  },

  getSourceLeaderboard: async (payload: {
    timeframe: 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    startDate?: number;
    endDate?: number;
    sourceIds?: string[];
    sourceId?: string;
  }): Promise<any[]> => {
    const url = `${BASE_URL}/arena/leaderboard/sources`;
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.warn("Unified source endpoint failed. Using mock data.");
      return [];
    }
    return response.json();
  },

  getTrainerLeaderboard: async (payload: {
    timeframe: 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    startDate?: number | null;
    endDate?: number | null;
    trainerIds?: string[];
    teamId?: string | null;
    sourceId?: string | null;
  }): Promise<any[]> => {
    const url = `${TRAINER_API_BASE_URL}/arena/leaderboard/trainers`;
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.warn("Trainer leaderboard endpoint failed.");
      return [];
    }
    return response.json();
  },

  /**
   * Fetches the recent sales feed for the arena
   */
  getArenaFeed: async (sourceId?: string, teamId?: string): Promise<SaleRecord[]> => {
    let url = `${BASE_URL}/arena/feed`;
    if (teamId) {
      url = `${BASE_URL}/team/arena/feed/${teamId}`;
    } else if (sourceId) {
      url = `${BASE_URL}/arena/feed/${sourceId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch arena feed', response.status);
    return response.json();

  }
};
