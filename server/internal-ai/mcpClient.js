const { getProviderConfig } = require('./config');

const ALLOWED_TOOL_NAMES = new Set(['policies', 'downlines', 'team_policies', 'splits']);

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

  if (result.structuredContent) {
    return result.structuredContent;
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
      return JSON.parse(textContent);
    } catch (error) {
      return { text: textContent };
    }
  }

  return result;
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
    return result.tools.filter((tool) => ALLOWED_TOOL_NAMES.has(tool.name));
  });
}

async function callPolicyhqTool(mcpAuthorization, name, args) {
  if (!ALLOWED_TOOL_NAMES.has(name)) {
    throw new Error(`Tool "${name}" is not allowed.`);
  }

  return withPolicyhqMcp(mcpAuthorization, async (client) => {
    await client.listTools();
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
  ALLOWED_TOOL_NAMES,
  listPolicyhqTools,
  callPolicyhqTool,
};
