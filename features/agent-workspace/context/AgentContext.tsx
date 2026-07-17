import React, { createContext, useContext, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { SubAgent } from '../../../shared/types/index';

interface AgentContextType {
  primaryAgentId: string;
  currentAgentId: string;
  selectedAgentIds: string[];
  isImpersonating: boolean;
  startImpersonation: (downlineAgentId: string) => void;
  stopImpersonation: () => void;
  toggleAgentSelection: (agentId: string) => void;
  selectAllAgents: () => void;
  availableFeatures: string[];
  subAgents: SubAgent[];
  viewingAgentName: string;
  hasAgentProfile: boolean;
  checkAgentFeature: (agentId: string, feature: string) => boolean;
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
    setSelectedImpersonatedIds(prev => {
      // If choosing the primary agent
      if (agentId === primaryAgent?.agentId) {
         if (prev.length === 0) return []; // Already only primary
         return []; // Reset to primary (which means empty array of impersonated)
      }
      
      // If toggling a subAgent
      if (subAgents.some(a => a.agentId === agentId)) {
         if (prev.includes(agentId)) {
           const newSelected = prev.filter(id => id !== agentId);
           return newSelected;
         } else {
           return [...prev, agentId];
         }
      }
      return prev;
    });
  };

  const selectAllAgents = () => {
     setSelectedImpersonatedIds(subAgents.map(a => a.agentId));
  };

  const isImpersonating = selectedImpersonatedIds.length > 0;
  
  // Maintain backward compatibility for single-agent features
  const impersonatedId = selectedImpersonatedIds.length === 1 ? selectedImpersonatedIds[0] : null;
  const currentAgentId = isImpersonating ? selectedImpersonatedIds[0] : (primaryAgent?.agentId || '');
  
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
      selectAllAgents,
      availableFeatures,
      subAgents,
      viewingAgentName,
      hasAgentProfile,
      checkAgentFeature
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
