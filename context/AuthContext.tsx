
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, AgentAccess, AgencyAccess, HybridAccess } from '../shared/types/index';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (firstName: string, lastName: string, email: string, phone: string, pass: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize token from localStorage if available, otherwise use dev default
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('authToken');
  });

  const hasCheckedAutoLogin = useRef(false);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Auto-Authentication for GHL (Run Once)
      if (!hasCheckedAutoLogin.current) {
        hasCheckedAutoLogin.current = true;
        
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user_id');
        const locationId = urlParams.get('location_id');
        
        // Check Referrer or Hostname to ensure it's from an allowed source
        const referrer = document.referrer || '';
        const hostname = window.location.hostname;
        const allowedDomains = ['app.simplyworkcrm.com', 'app.gohighlevel.com'];
        
        const isAllowedSource = allowedDomains.some(d => referrer.includes(d) || hostname.includes(d));

        if (isAllowedSource && userId && locationId) {
          try {
            const newToken = await authApi.ghlLogin(userId, locationId);
            localStorage.setItem('authToken', newToken);
            setToken(newToken);
            // Return early to allow the re-render with new token to handle user fetching
            // This prevents setting isLoading(false) prematurely
            return;
          } catch (error) {
            console.error("Auto-authentication failed", error);
            // Fall through to normal auth check if auto-login fails
          }
        }
      }

      // 2. Standard Token Validation
      if (token) {
        // Ensure token is persisted for API services to access
        localStorage.setItem('authToken', token);
        try {
          const userData = await authApi.getMe(token);
          const mappedUser = mapApiUserToAppUser(userData);
          setUser(mappedUser);
        } catch (error) {
          console.error("Auth check failed", error);
          logout();
        }
      } else {
        localStorage.removeItem('authToken');
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, [token]);

  // Helper to normalize backend feature strings to frontend keys
  const normalizeFeature = (feature: string): string => {
    const lower = feature.toLowerCase().trim();
    
    // Agent Features
    if (lower.includes('polic')) return 'policies';
    if (lower.includes('debt')) return 'debts';
    if (lower.includes('commission')) return 'commissions';
    if (lower.includes('split')) return 'splits';
    if (lower.includes('overview')) return 'overview';
    if (lower.includes('downline')) return 'downlines';

    // Agency Features
    if (lower.includes('contract')) return 'contracting';
    if (lower.includes('ticket')) return 'ticketing';
    if (lower.includes('user')) return 'users'; // Handles 'user&roles'
    if (lower.includes('master')) return 'settings'; // Handles 'master' -> settings/admin
    
    return lower;
  };

  const mapApiUserToAppUser = (data: any): User => {
    const agentAccessRows = Array.isArray(data.agent_access) ? data.agent_access : [];
    const firstName = data.first_name || data.firstName || data.firstname || '';
    const lastName = data.last_name || data.lastName || data.lastname || '';
    const userAgentId = data.agent_id && data.agent_id !== 'null' ? data.agent_id : null;
    const primaryAgentRow = userAgentId
      ? agentAccessRows.find((a: any) => a.agent_id === data.agent_id)
      : agentAccessRows[0];
    const primaryAgentId = userAgentId || primaryAgentRow?.agent_id || '';
    const primaryAgentFeatures = Array.isArray(primaryAgentRow?.feature)
      ? primaryAgentRow.feature.map(normalizeFeature)
      : ['overview', 'policies', 'commissions', 'debts', 'splits', 'downlines'];

    const primaryAgentAccess: AgentAccess = {
      agentId: primaryAgentId,
      agentName: primaryAgentRow?.agent_name,
      npn: primaryAgentRow?.agent_npn,
      agencyName: primaryAgentRow?.agency_name,
      features: primaryAgentFeatures,
      downline: agentAccessRows.filter((a: any) => a.agent_id !== primaryAgentId).map((a: any) => ({
        agentId: a.agent_id,
        name: a.agent_name,
        npn: a.agent_npn,
        features: Array.isArray(a.feature) ? a.feature.map(normalizeFeature) : []
      }))
    };

    // Map Agency Access
    const agencyAccess: AgencyAccess[] = data.agency_access ? data.agency_access.map((a: any) => ({
      agencyId: a.agency_id,
      agencyName: a.agency_name,
      role: 'admin', // Defaulting role as it's not explicitly in the API response object for agency
      features: Array.isArray(a.feature) ? a.feature.map(normalizeFeature) : []
    })) : [];

    // Map Hybrid Access
    const hybridAccess: HybridAccess | null = data.hybrid_access ? {
      role: 'superuser',
      features: data.hybrid_access.feature ? data.hybrid_access.feature.map(normalizeFeature) : []
    } : null;

    return {
      id: data.id,
      name: data.name || [firstName, lastName].filter(Boolean).join(' '),
      firstName,
      lastName,
      email: data.email || '',
      phone: data.phone,
      agentId: userAgentId,
      npn: data.agent_npn || data.npn,
      agencyName: data.agency_name || data.agency,
      agencyLogoUrl: data.agency_logo?.url,
      agentAccess: [primaryAgentAccess],
      agencyAccess: agencyAccess,
      hybridAccess: hybridAccess
    };
  };

  const login = async (email: string, pass: string) => {
    try {
      const authToken = await authApi.login(email, pass);
      localStorage.setItem('authToken', authToken);
      setToken(authToken); // Triggers useEffect to fetch user
    } catch (error) {
      throw error;
    }
  };

  const signup = async (firstName: string, lastName: string, email: string, phone: string, pass: string) => {
    try {
      const authToken = await authApi.signup(firstName, lastName, email, phone, pass);
      localStorage.setItem('authToken', authToken);
      setToken(authToken);
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async () => {
    const authToken = localStorage.getItem('authToken') || token;
    if (!authToken) return;
    const userData = await authApi.getMe(authToken);
    const mappedUser = mapApiUserToAppUser(userData);
    setUser(mappedUser);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
