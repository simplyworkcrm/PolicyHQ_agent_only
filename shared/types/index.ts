
// Access Modes
export interface SubAgent {
  agentId: string;
  name: string;
  npn?: number;
  features: string[]; // Permissions specific to this agent view
}

export interface AgentAccess {
  agentId: string;
  agentName?: string;
  npn?: string | number;
  agencyName?: string;
  features: string[]; // e.g., ['policies', 'commissions']
  downline: SubAgent[]; // IDs and Names of agents this user can impersonate
}

export interface AgencyAccess {
  agencyId: string;
  agencyName: string;
  role: 'owner' | 'admin' | 'manager';
  features: string[]; // e.g., ['contracting', 'users']
}

export interface HybridAccess {
  role: 'superuser' | 'auditor';
  features: string[]; // e.g., ['audit', 'config']
}

// User Principal
export interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string | null;
  agentId?: string | null;
  npn?: string | number;
  agencyName?: string;
  agencyLogoUrl?: string;
  avatarUrl?: string;
  agentAccess?: AgentAccess[]; // Can be an agent in multiple contexts
  agencyAccess?: AgencyAccess[]; // Can manage multiple agencies
  hybridAccess?: HybridAccess | null; // System admin access
}

// Domain Models
export interface Policy {
  policy_id: string;
  client: string;
  policy_number: string | null;
  carrier: string;
  carrier_product: string;
  status: string; // 'Approved', 'Underwriting', etc.
  annual_premium: number;
  initial_draft_date: string; // YYYY-MM-DD
  isLocked: boolean;
  agent_id: string;
  agent_name: string;
  source_name?: string;
  created_at: number; // timestamp
  paid_status?: string | null;
}

export interface SplitPolicy {
  id: string;
  created_at: number;
  policy_id: string;
  client: string;
  policy_number: string | null;
  carrier: string;
  custom_carrier: string | null;
  carrier_product: string;
  annual_premium: number;
  status: string;
  paid_status: string | null;
  initial_draft_date: string;
  split_percentage: number;
  agent_name: string;
  agent_id: string;
  source_name?: string | null;
  contact_type_name?: string | null;
  phone?: string | null;
  state?: string | null;
}

export interface AgentMetric {
  label: string;
  value: string | number;
  trend: number; // percentage
  trendDirection: 'up' | 'down';
}
