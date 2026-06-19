import { ApiError } from '../../../services/api';

const AGENT_PROFILE_API_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/agent-profile';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

export interface AgentProfile {
  id: string;
  created_at?: number | null;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  npn?: string | number | null;
  status?: string | null;
  ref_ffl_agency?: string | null;
  ref_ffl_agency_name?: string | null;
  ref_agent_upline?: string | null;
  ref_agent_upline_name?: string | null;
  profile_url?: string | null;
}

const normalizeProfile = (data: any, agentId: string): AgentProfile => ({
  id: String(data?.id || data?.agent_id || agentId),
  created_at: data?.created_at ?? null,
  first_name: String(data?.first_name || data?.firstName || ''),
  last_name: String(data?.last_name || data?.lastName || ''),
  phone: data?.phone || data?.work_phone || data?.business_phone || null,
  email: data?.email || data?.work_email || null,
  npn: data?.npn || data?.agent_npn || null,
  status: data?.status || data?.agent_status || null,
  ref_ffl_agency: data?.ref_ffl_agency || data?.agency_id || null,
  ref_ffl_agency_name: data?.ref_ffl_agency_name || data?.agency_name || data?.agency?.name || null,
  ref_agent_upline: data?.ref_agent_upline || data?.upline_id || null,
  ref_agent_upline_name: data?.ref_agent_upline_name || data?.upline_name || null,
  profile_url: data?.profile?.url || data?.profile_url || data?.profileUrl || data?.image_url || null,
});

export const agentProfileApi = {
  getProfile: async (agentId: string): Promise<AgentProfile> => {
    const response = await fetch(`${AGENT_PROFILE_API_URL}/${agentId}`, {
      method: 'GET',
      headers: authHeader(),
    });

    if (!response.ok) throw new ApiError('Failed to fetch agent profile', response.status);
    return normalizeProfile(await response.json(), agentId);
  },
};
