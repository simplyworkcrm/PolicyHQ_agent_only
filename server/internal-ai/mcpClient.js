const { getProviderConfig } = require('./config');

function getConfiguredAllowedToolNames() {
  const raw = String(process.env.POLICYHQ_MCP_ALLOWED_TOOLS || '').trim();
  if (!raw) return null;

  const names = raw
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  return names.length > 0 ? new Set(names) : null;
}

function isToolAllowedByConfig(name) {
  const allowedToolNames = getConfiguredAllowedToolNames();
  return !allowedToolNames || allowedToolNames.has(name);
}

function getUsableTools(tools) {
  return (Array.isArray(tools) ? tools : []).filter((tool) =>
    tool?.name && isToolAllowedByConfig(tool.name)
  );
}

function hasPayloadValue(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function parseJsonText(value) {
  const text = String(value || '').trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function unwrapKnownPayload(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 4) {
    return value;
  }

  if (Array.isArray(value)) {
    return value;
  }

  const looksLikeApiPayload =
    Array.isArray(value.items) ||
    value.itemsTotal != null ||
    value.policy_stats ||
    Array.isArray(value.policies_by_status) ||
    Array.isArray(value.policies_by_paidStatus) ||
    value.policies;

  if (looksLikeApiPayload) {
    return value;
  }

  for (const key of ['data', 'result', 'results', 'response', 'output', 'payload']) {
    if (hasPayloadValue(value[key])) {
      const unwrapped = unwrapKnownPayload(value[key], depth + 1);
      if (hasPayloadValue(unwrapped)) return unwrapped;
    }
  }

  if (typeof value.text === 'string') {
    const parsed = parseJsonText(value.text);
    if (hasPayloadValue(parsed)) return unwrapKnownPayload(parsed, depth + 1);
  }

  return value;
}

async function createMcpConnection(mcpAuthorization) {
  const { Client } = require('@modelcontextprotocol/sdk/client');
  const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
  const config = getProviderConfig();

  const transport = new SSEClientTransport(new URL(config.policyhqMcpSseUrl), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${mcpAuthorization}`,
      },
    },
  });

  const client = new Client({
    name: 'policyhq-agent-portal-internal-ai',
    version: '1.0.0',
  });

  await client.connect(transport);

  return {
    client,
    transport,
  };
}

function extractToolPayload(result) {
  if (!result || typeof result !== 'object') {
    return result;
  }

  if (hasPayloadValue(result.structuredContent)) {
    const structuredPayload = unwrapKnownPayload(result.structuredContent);
    if (hasPayloadValue(structuredPayload)) {
      return structuredPayload;
    }
  }

  if (Array.isArray(result.content)) {
    const textContent = result.content
      .filter((item) => item?.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text)
      .join('\n')
      .trim();

    if (!textContent) {
      return result.content;
    }

    try {
      return unwrapKnownPayload(JSON.parse(textContent));
    } catch (error) {
      return { text: textContent };
    }
  }

  return unwrapKnownPayload(result);
}

async function withPolicyhqMcp(mcpAuthorization, fn) {
  const connection = await createMcpConnection(mcpAuthorization);
  try {
    return await fn(connection.client);
  } finally {
    await connection.transport.close().catch(() => undefined);
  }
}

async function listPolicyhqTools(mcpAuthorization) {
  return withPolicyhqMcp(mcpAuthorization, async (client) => {
    const result = await client.listTools();
    return getUsableTools(result.tools);
  });
}

async function callPolicyhqTool(mcpAuthorization, name, args) {
  return withPolicyhqMcp(mcpAuthorization, async (client) => {
    const toolsResult = await client.listTools();
    const tools = getUsableTools(toolsResult.tools);
    const tool = tools.find((item) => item.name === name);

    if (!tool) {
      throw new Error(`Tool "${name}" is not available from PolicyHQ MCP.`);
    }

    const result = await client.callTool({
      name,
      arguments: args || {},
    });

    return {
      raw: result,
      payload: extractToolPayload(result),
    };
  });
}

module.exports = {
  listPolicyhqTools,
  callPolicyhqTool,
};
