import { ApiError } from '../../../services/api';

export type InternalAiRequestMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type InternalAiContextPayload = {
  route: string;
  pageType: string;
  currentAgentId: string;
  selectedAgentIds: string[];
  viewingAgentName: string;
  pageMetadata?: Record<string, unknown> | null;
};

export type InternalAiResponse = {
  message: {
    role: 'assistant';
    content: string;
    usedLiveData: boolean;
    toolResults: Array<{
      tool: string;
      arguments?: Record<string, unknown>;
      itemCount?: number;
      summary?: string;
    }>;
    recoverableError?: string | null;
    createdAt: number;
  };
  mcpStatus?: {
    state: 'unknown' | 'missing' | 'expired' | 'ready' | 'unavailable';
    generatedDate?: string | null;
    expirationDate?: string | null;
    canUseTools?: boolean;
    reason?: string | null;
  };
};

export type InternalAiStatusResponse = {
  mcpStatus?: InternalAiResponse['mcpStatus'];
  providerConfigured?: boolean;
};

const getAuthToken = () => localStorage.getItem('authToken');

export const internalAiApi = {
  getStatus: async (): Promise<InternalAiStatusResponse> => {
    const authToken = getAuthToken();
    if (!authToken) {
      throw new ApiError('Missing auth token');
    }

    const response = await fetch('/internal-ai/status', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new ApiError(data?.error || 'Internal AI status request failed', response.status);
    }

    return data as InternalAiStatusResponse;
  },
  chat: async (
    messages: InternalAiRequestMessage[],
    context: InternalAiContextPayload
  ): Promise<InternalAiResponse> => {
    const authToken = getAuthToken();
    if (!authToken) {
      throw new ApiError('Missing auth token');
    }

    const response = await fetch('/internal-ai/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, context }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 429) {
        throw new ApiError(
          data?.error || 'The AI assistant is receiving too many requests. Please wait a moment and try again.',
          response.status
        );
      }

      throw new ApiError(data?.error || 'Internal AI request failed', response.status);
    }

    return data as InternalAiResponse;
  },
};
