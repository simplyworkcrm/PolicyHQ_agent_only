import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { SubAgent } from '../../../shared/types/index';
import { publishedIncomePlanApi } from '../services/incomeGamePlanApi';
import { IncomePlanPublishedSnapshot } from '../types/incomeGamePlan';

interface AgentContextType {
  primaryAgentId: string;
  currentAgentId: string;
  selectedAgentIds: string[];
  isImpersonating: boolean;
  startImpersonation: (downlineAgentId: string) => void;
  stopImpersonation: () => void;
  toggleAgentSelection: (agentId: string) => void;
  availableFeatures: string[];
  subAgents: SubAgent[];
  viewingAgentName: string;
  hasAgentProfile: boolean;
  checkAgentFeature: (agentId: string, feature: string) => boolean;
  incomePlan: IncomePlanPublishedSnapshot | null;
  incomePlanLoading: boolean;
  incomePlanError: boolean;
  refreshIncomePlan: () => Promise<IncomePlanPublishedSnapshot | null>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Default to the user's primary agent identity
  const primaryAgent = user?.agentAccess?.[0];
  const primaryAgentId = primaryAgent?.agentId || '';
  const [selectedImpersonatedIds, setSelectedImpersonatedIds] = useState<string[]>([]);

  const subAgents = primaryAgent?.downline || [];

  const startImpersonation = (targetId: string) => {
    if (subAgents.some(a => a.agentId === targetId)) {
      setSelectedImpersonatedIds([targetId]);
    }
  };

  const stopImpersonation = () => {
    setSelectedImpersonatedIds([]);
  };

  const toggleAgentSelection = (agentId: string) => {
    if (agentId === primaryAgent?.agentId) {
      setSelectedImpersonatedIds([]);
      return;
    }

    if (subAgents.some(agent => agent.agentId === agentId)) {
      setSelectedImpersonatedIds([agentId]);
    }
  };

  const isImpersonating = selectedImpersonatedIds.length > 0;
  
  // Maintain backward compatibility for single-agent features
  const impersonatedId = selectedImpersonatedIds.length === 1 ? selectedImpersonatedIds[0] : null;
  const currentAgentId = isImpersonating ? selectedImpersonatedIds[0] : (primaryAgent?.agentId || '');
  const [incomePlan, setIncomePlan] = useState<IncomePlanPublishedSnapshot | null>(null);
  const [incomePlanLoading, setIncomePlanLoading] = useState(true);
  const [incomePlanError, setIncomePlanError] = useState(false);
  const [incomePlanAgentId, setIncomePlanAgentId] = useState('');

  const refreshIncomePlan = useCallback(async () => {
    if (!currentAgentId) {
      setIncomePlan(null);
      setIncomePlanAgentId('');
      setIncomePlanLoading(false);
      setIncomePlanError(false);
      return null;
    }
    setIncomePlanLoading(true);
    setIncomePlanError(false);
    try {
      const plan = await publishedIncomePlanApi.get(currentAgentId, { start_date: null, end_date: null });
      setIncomePlan(plan);
      setIncomePlanAgentId(currentAgentId);
      setIncomePlanError(false);
      return plan;
    } catch (error) {
      console.error('Unable to load the current Income Game Plan', error);
      setIncomePlan(null);
      setIncomePlanAgentId(currentAgentId);
      setIncomePlanError(true);
      return null;
    } finally {
      setIncomePlanLoading(false);
    }
  }, [currentAgentId]);

  useEffect(() => { void refreshIncomePlan(); }, [refreshIncomePlan]);
  const currentIncomePlan = incomePlanAgentId === currentAgentId ? incomePlan : null;
  const currentIncomePlanLoading = incomePlanLoading || incomePlanAgentId !== currentAgentId;
  
  // For multi-select aware features
  const selectedAgentIds = isImpersonating ? [...selectedImpersonatedIds] : [primaryAgent?.agentId || ''];

  const hasAgentProfile = !!currentAgentId;

  // Calculate Features
  // If multiple are selected, we might intersect features or just take union. Let's take union to be permissive or intersection to be strict.
  // Actually, let's use the first selected agent's features for the general app, and we'll check specific features per agent in the API call.
  // We'll update the loop logic in Policies tab to check each agent's features.
  let availableFeatures: string[] = [];
  
  if (isImpersonating) {
    // Collect intersection of features or just primary selected
    const target = subAgents.find(a => a.agentId === currentAgentId);
    availableFeatures = target?.features || [];
  } else {
    availableFeatures = primaryAgent?.features || [];
  }

  // Determine the name of the agent currently being viewed
  let viewingAgentName = 'My Workspace';
  if (selectedImpersonatedIds.length === 1) {
     viewingAgentName = subAgents.find(a => a.agentId === selectedImpersonatedIds[0])?.name || 'Unknown Agent';
  } else if (selectedImpersonatedIds.length > 1) {
     viewingAgentName = `${selectedImpersonatedIds.length} Agents Selected`;
  }

  const checkAgentFeature = (agentId: string, feature: string) => {
    if (agentId === primaryAgent?.agentId) {
       return primaryAgent?.features?.includes(feature) || false;
    }
    const target = subAgents.find(a => a.agentId === agentId);
    return target?.features?.includes(feature) || false;
  };

  return (
    <AgentContext.Provider value={{
      primaryAgentId,
      currentAgentId,
      selectedAgentIds,
      isImpersonating,
      startImpersonation,
      stopImpersonation,
      toggleAgentSelection,
      availableFeatures,
      subAgents,
      viewingAgentName,
      hasAgentProfile,
      checkAgentFeature,
      incomePlan: currentIncomePlan,
      incomePlanLoading: currentIncomePlanLoading,
      incomePlanError,
      refreshIncomePlan,
    }}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (!context) throw new Error('useAgentContext must be used within AgentProvider');
  return context;
};
