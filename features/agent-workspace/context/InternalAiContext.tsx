import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useAgentContext } from './AgentContext';
import {
  internalAiApi,
  InternalAiContextPayload,
  InternalAiRequestMessage,
} from '../services/internalAiApi';

export type InternalAiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  usedLiveData?: boolean;
  toolResults?: Array<{
    tool: string;
    arguments?: Record<string, unknown>;
    itemCount?: number;
    summary?: string;
  }>;
  recoverableError?: string | null;
};

type McpStatusState = {
  state: 'unknown' | 'missing' | 'expired' | 'ready' | 'unavailable';
  generatedDate?: string | null;
  expirationDate?: string | null;
  canUseTools?: boolean;
  reason?: string | null;
};

type InternalAiContextType = {
  isOpen: boolean;
  isSending: boolean;
  messages: InternalAiMessage[];
  mcpStatus: McpStatusState;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  clearConversation: () => void;
  sendMessage: (content: string) => Promise<void>;
  setPageMetadata: (metadata: Record<string, unknown> | null) => void;
  contextSnapshot: InternalAiContextPayload;
};

const InternalAiContext = createContext<InternalAiContextType | undefined>(undefined);

const INITIAL_ASSISTANT_MESSAGE: InternalAiMessage = {
  id: 'assistant-welcome',
  role: 'assistant',
  content:
    'I can answer general questions or use live PolicyHQ data when you ask for policies, downlines, team production, or splits.',
  createdAt: Date.now(),
};

const inferPageType = (pathname: string) => {
  if (pathname.startsWith('/policies')) return 'policies';
  if (pathname.startsWith('/downlines')) return 'downlines';
  if (pathname.startsWith('/splits')) return 'splits';
  if (pathname.startsWith('/commissions')) return 'commissions';
  if (pathname.startsWith('/debts')) return 'debts';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/leaderboard')) return 'leaderboard';
  return 'overview';
};

export const InternalAiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { currentAgentId, selectedAgentIds, viewingAgentName } = useAgentContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<InternalAiMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [pageMetadata, setPageMetadataState] = useState<Record<string, unknown> | null>(null);
  const [mcpStatus, setMcpStatus] = useState<McpStatusState>({ state: 'unknown' });

  useEffect(() => {
    if (!user || !isOpen) return;

    let cancelled = false;

    const loadStatus = async () => {
      try {
        const response = await internalAiApi.getStatus();
        if (!cancelled) {
          setMcpStatus(response.mcpStatus || { state: 'unknown' });
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Internal AI status request failed.';
          setMcpStatus({
            state: 'unavailable',
            canUseTools: false,
            reason: message,
          });
        }
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [isOpen, user]);

  useEffect(() => {
    setPageMetadataState(null);
  }, [location.pathname, location.search]);

  const contextSnapshot = useMemo<InternalAiContextPayload>(
    () => ({
      route: `${location.pathname}${location.search}`,
      pageType: inferPageType(location.pathname),
      currentAgentId,
      selectedAgentIds,
      viewingAgentName,
      pageMetadata,
    }),
    [currentAgentId, location.pathname, location.search, pageMetadata, selectedAgentIds, viewingAgentName]
  );

  const openDrawer = () => setIsOpen(true);
  const closeDrawer = () => setIsOpen(false);
  const toggleDrawer = () => setIsOpen((value) => !value);
  const clearConversation = () => setMessages([INITIAL_ASSISTANT_MESSAGE]);
  const setPageMetadata = (metadata: Record<string, unknown> | null) => setPageMetadataState(metadata);

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || !user || isSending) return;

    const nextUserMessage: InternalAiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };

    const outboundMessages: InternalAiRequestMessage[] = [...messages, nextUserMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setMessages((current) => [...current, nextUserMessage]);
    setIsSending(true);

    try {
      const response = await internalAiApi.chat(outboundMessages, contextSnapshot);
      setMcpStatus(response.mcpStatus || { state: 'unknown' });

      const nextAssistantMessage: InternalAiMessage = {
        id: `assistant-${response.message.createdAt || Date.now()}`,
        role: 'assistant',
        content: response.message.content,
        createdAt: response.message.createdAt || Date.now(),
        usedLiveData: response.message.usedLiveData,
        toolResults: response.message.toolResults || [],
        recoverableError: response.message.recoverableError || null,
      };

      setMessages((current) => [...current, nextAssistantMessage]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal AI request failed.';
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: message,
          createdAt: Date.now(),
          recoverableError: message,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <InternalAiContext.Provider
      value={{
        isOpen,
        isSending,
        messages,
        mcpStatus,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        clearConversation,
        sendMessage,
        setPageMetadata,
        contextSnapshot,
      }}
    >
      {children}
    </InternalAiContext.Provider>
  );
};

export const useInternalAi = () => {
  const context = useContext(InternalAiContext);
  if (!context) {
    throw new Error('useInternalAi must be used within InternalAiProvider');
  }

  return context;
};
