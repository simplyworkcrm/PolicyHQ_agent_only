const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { getProviderConfig, getMissingProviderEnv } = require('./config');
const { createProvider } = require('./providerFactory');
const { listPolicyhqTools } = require('./mcpClient');
const {
  getMcpStatus,
  planToolUsage,
  executeToolCalls,
  buildAssistantAnswer,
} = require('./tooling');

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(chatLimiter);

function getBearerToken(req) {
  const value = String(req.headers.authorization || '');
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((message) => message && typeof message === 'object')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: String(message.content || '').trim(),
    }))
    .filter((message) => message.content);
}

async function fetchUserProfile(authToken, config) {
  const response = await axios.get(config.policyhqAuthMeUrl, {
    timeout: config.timeoutMs,
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function fetchMcpConfig(authToken, config) {
  const response = await axios.get(config.policyhqMcpAuthTokenUrl, {
    timeout: config.timeoutMs,
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = response.data;
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload.item || payload.data || payload.mcp_authToken || payload.mcpAuthToken || payload;
}

router.get('/status', async (req, res) => {
  const authToken = getBearerToken(req);
  if (!authToken) {
    return res.status(401).json({
      error: 'Missing Authorization header.',
    });
  }

  try {
    const providerConfig = getProviderConfig();
    const mcpConfig = await fetchMcpConfig(authToken, providerConfig).catch((error) => {
      console.error('[internal-ai] failed to fetch MCP config', error.message);
      return null;
    });

    return res.json({
      mcpStatus: getMcpStatus(mcpConfig),
      providerConfigured: getMissingProviderEnv().length === 0,
    });
  } catch (error) {
    const status = error?.response?.status || 500;
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Internal AI status request failed.';

    console.error('[internal-ai] status request failed', {
      status,
      message,
    });

    return res.status(status).json({
      error: message,
    });
  }
});

router.post('/chat', async (req, res) => {
  const providerConfig = getProviderConfig();
  const missingProviderEnv = getMissingProviderEnv();

  if (missingProviderEnv.length > 0) {
    return res.status(503).json({
      error: 'Internal AI is not configured.',
      missingEnv: missingProviderEnv,
    });
  }

  const authToken = getBearerToken(req);
  if (!authToken) {
    return res.status(401).json({
      error: 'Missing Authorization header.',
    });
  }

  const messages = normalizeMessages(req.body?.messages);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  if (!latestUserMessage) {
    return res.status(400).json({
      error: 'At least one user message is required.',
    });
  }

  const context = req.body?.context && typeof req.body.context === 'object' ? req.body.context : {};

  try {
    const [userProfile, mcpConfig] = await Promise.all([
      fetchUserProfile(authToken, providerConfig),
      fetchMcpConfig(authToken, providerConfig).catch((error) => {
        console.error('[internal-ai] failed to fetch MCP config', error.message);
        return null;
      }),
    ]);

    const provider = createProvider(providerConfig);
    const mcpStatus = getMcpStatus(mcpConfig);

    let availableTools = [];
    if (mcpStatus.canUseTools && mcpConfig?.Authorization) {
      try {
        availableTools = await listPolicyhqTools(String(mcpConfig.Authorization));
      } catch (error) {
        console.error('[internal-ai] failed to list MCP tools', error.message);
      }
    }

    const plannerResult = await planToolUsage(
      provider,
      availableTools,
      {
        ...context,
        user: {
          id: userProfile?.id,
          name: [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ') || userProfile?.name || 'User',
          email: userProfile?.email || '',
          agentId: userProfile?.agent_id || null,
        },
      },
      mcpStatus,
      latestUserMessage.content,
      messages
    );

    let toolResults = [];
    let recoverableError = null;

    if (plannerResult.mode === 'tool' && plannerResult.toolCalls.length > 0) {
      if (mcpStatus.canUseTools && mcpConfig?.Authorization) {
        try {
          toolResults = await executeToolCalls({
            mcpAuthorization: String(mcpConfig.Authorization),
            toolCalls: plannerResult.toolCalls,
            prompt: latestUserMessage.content,
          });
        } catch (error) {
          console.error('[internal-ai] tool execution failed', error);
          recoverableError = 'PolicyHQ live data was unavailable for this request.';
        }
      } else {
        recoverableError = mcpStatus.reason || 'PolicyHQ MCP is unavailable.';
      }
    }

    const assistantText = await buildAssistantAnswer({
      provider,
      prompt: latestUserMessage.content,
      context,
      mcpStatus,
      toolResults,
      plannerDirectAnswer: plannerResult.directAnswer,
    });

    return res.json({
      message: {
        role: 'assistant',
        content: assistantText,
        usedLiveData: toolResults.length > 0,
        toolResults: toolResults.map((result) => result.meta),
        recoverableError,
        createdAt: Date.now(),
      },
      mcpStatus,
    });
  } catch (error) {
    const status = error?.response?.status || 500;
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Internal AI request failed.';

    console.error('[internal-ai] chat request failed', {
      status,
      message,
    });

    return res.status(status).json({
      error: message,
    });
  }
});

module.exports = {
  internalAiRouter: router,
};
