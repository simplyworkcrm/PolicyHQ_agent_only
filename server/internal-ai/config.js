const INTERNAL_AI_PROVIDER = process.env.INTERNAL_AI_PROVIDER || 'nvidia';
const NVIDIA_API_URL = process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'minimaxai/minimax-m3';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const INTERNAL_AI_TIMEOUT_MS = Number(process.env.INTERNAL_AI_TIMEOUT_MS || 45000);
const INTERNAL_AI_MAX_TOOL_PAGES = Number(process.env.INTERNAL_AI_MAX_TOOL_PAGES || 5);
const POLICYHQ_MCP_SSE_URL = process.env.POLICYHQ_MCP_SSE_URL || 'https://api1.simplyworkcrm.com/x2/mcp/V4CeR1bI/mcp/sse';
const POLICYHQ_AUTH_ME_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/auth/me';
const POLICYHQ_MCP_AUTH_TOKEN_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR/mcp_authToken';

function getProviderConfig() {
  return {
    provider: INTERNAL_AI_PROVIDER,
    nvidiaApiUrl: NVIDIA_API_URL,
    nvidiaModel: NVIDIA_MODEL,
    nvidiaApiKey: NVIDIA_API_KEY,
    timeoutMs: INTERNAL_AI_TIMEOUT_MS,
    maxToolPages: INTERNAL_AI_MAX_TOOL_PAGES,
    policyhqMcpSseUrl: POLICYHQ_MCP_SSE_URL,
    policyhqAuthMeUrl: POLICYHQ_AUTH_ME_URL,
    policyhqMcpAuthTokenUrl: POLICYHQ_MCP_AUTH_TOKEN_URL,
  };
}

function getMissingProviderEnv() {
  const config = getProviderConfig();

  if (config.provider === 'nvidia' && !config.nvidiaApiKey) {
    return ['NVIDIA_API_KEY'];
  }

  return [];
}

module.exports = {
  getProviderConfig,
  getMissingProviderEnv,
};
