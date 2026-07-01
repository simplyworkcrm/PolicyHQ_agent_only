const { callPolicyhqTool } = require('./mcpClient');
const { getProviderConfig } = require('./config');

const TOOL_DESCRIPTIONS = {
  policies: 'Fetches the current user policy records in PolicyHQ.',
  downlines: 'Retrieves the full hierarchy tree for the current user agent profile.',
  team_policies: 'Fetches overall team policy records for the current user and their downlines.',
  splits: 'Fetches the current user split policy records, partner summaries, and status summaries.',
};

const PAGINATED_TOOLS = new Set(['policies', 'team_policies', 'splits']);

function cleanJsonReply(value) {
  const trimmed = String(value || '').trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function tryParseJson(value) {
  try {
    return JSON.parse(cleanJsonReply(value));
  } catch (error) {
    return null;
  }
}

function truncateText(value, maxLength = 5000) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}\n...[truncated]`;
}

function parseMcpDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;

  const [, month, day, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function getMcpStatus(mcpConfig) {
  const token = String(mcpConfig?.Authorization || '').trim();
  const expirationDate = mcpConfig?.mcp_pit_expiration_date || null;
  const generatedDate = mcpConfig?.mcp_pit_generated_date || null;

  if (!token) {
    return {
      state: 'missing',
      generatedDate,
      expirationDate,
      canUseTools: false,
      reason: 'MCP Authorization is not configured.',
    };
  }

  const parsedExpiration = parseMcpDate(expirationDate);
  if (!parsedExpiration) {
    return {
      state: 'unavailable',
      generatedDate,
      expirationDate,
      canUseTools: false,
      reason: 'MCP expiration date is unavailable.',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (parsedExpiration.getTime() <= today.getTime()) {
    return {
      state: 'expired',
      generatedDate,
      expirationDate,
      canUseTools: false,
      reason: 'MCP Authorization has expired.',
    };
  }

  return {
    state: 'ready',
    generatedDate,
    expirationDate,
    canUseTools: true,
    reason: null,
  };
}

function shouldAutoPaginate(prompt) {
  const value = String(prompt || '').toLowerCase();
  return ['all', 'everything', 'entire', 'every record', 'full list'].some((token) =>
    value.includes(token)
  );
}

function normalizePagedArguments(args) {
  const nextArgs = { ...(args || {}) };
  if (nextArgs.page == null) nextArgs.page = 1;
  if (nextArgs.per_page == null) nextArgs.per_page = 25;
  if (nextArgs.search == null) nextArgs.search = '';
  if (nextArgs.sort == null) nextArgs.sort = null;
  if (nextArgs.filter == null) nextArgs.filter = null;
  return nextArgs;
}

function getPolicyItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.policies?.items)) return payload.policies.items;
  return [];
}

function getPolicyTotal(payload) {
  if (Array.isArray(payload)) return payload.length;
  if (payload?.itemsTotal != null) return Number(payload.itemsTotal);
  if (payload?.policies?.itemsTotal != null) return Number(payload.policies.itemsTotal);
  return getPolicyItems(payload).length;
}

function getNextPage(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.nextPage != null) return Number(payload.nextPage);
  if (payload.policies?.nextPage != null) return Number(payload.policies.nextPage);
  return null;
}

function mergePagedPayloads(name, aggregate, nextPayload) {
  if (!aggregate) return nextPayload;
  if (!nextPayload || typeof nextPayload !== 'object') return aggregate;

  if (Array.isArray(aggregate) && Array.isArray(nextPayload)) {
    return [...aggregate, ...nextPayload];
  }

  if (name === 'splits' && aggregate.policies && nextPayload.policies) {
    return {
      ...aggregate,
      policies: {
        ...aggregate.policies,
        ...nextPayload.policies,
        items: [...(aggregate.policies.items || []), ...(nextPayload.policies.items || [])],
      },
    };
  }

  if (Array.isArray(aggregate.items) && Array.isArray(nextPayload.items)) {
    return {
      ...aggregate,
      ...nextPayload,
      items: [...aggregate.items, ...nextPayload.items],
    };
  }

  return aggregate;
}

function countDownlines(node) {
  if (!node || typeof node !== 'object') return 0;
  const children = Array.isArray(node.downlines) ? node.downlines : [];
  return children.reduce((total, child) => total + 1 + countDownlines(child), 0);
}

function buildToolMeta(name, args, payload) {
  if (name === 'downlines') {
    const totalDownlines = Array.isArray(payload)
      ? payload.reduce((count, item) => count + countDownlines(item), 0)
      : countDownlines(payload);

    return {
      tool: name,
      arguments: args,
      itemCount: totalDownlines,
      summary: `Loaded ${totalDownlines} downline records.`,
    };
  }

  if (name === 'splits') {
    const splitItems = getPolicyItems(payload);
    const statusCount = Array.isArray(payload?.policies_by_status) ? payload.policies_by_status.length : 0;
    const paidStatusCount = Array.isArray(payload?.policies_by_paidStatus) ? payload.policies_by_paidStatus.length : 0;

    return {
      tool: name,
      arguments: args,
      itemCount: splitItems.length,
      summary: `Loaded ${splitItems.length} split policies with ${statusCount} policy status groups and ${paidStatusCount} paid status groups.`,
    };
  }

  const items = getPolicyItems(payload);
  const total = getPolicyTotal(payload);
  const stats = payload?.policy_stats || null;

  return {
    tool: name,
    arguments: args,
    itemCount: total,
    summary: stats
      ? `Loaded ${total} records. Submitted ${stats.submittedPolicies ?? 0}, issued ${stats.issued_placed ?? 0}, active ${stats.active_inForce ?? 0}.`
      : `Loaded ${total} records.`,
  };
}

function buildToolPayloadPreview(name, payload) {
  if (name === 'downlines') {
    return truncateText(payload, 8000);
  }

  if (name === 'splits') {
    const splitItems = getPolicyItems(payload);
    const preview = {
      policies: {
        itemsTotal: getPolicyTotal(payload),
        items: splitItems.slice(0, 10),
      },
      partner: payload?.partner || [],
      policies_by_status: payload?.policies_by_status || [],
      policies_by_paidStatus: payload?.policies_by_paidStatus || [],
    };
    return truncateText(preview, 8000);
  }

  const preview = {
    itemsTotal: getPolicyTotal(payload),
    items: getPolicyItems(payload).slice(0, 10),
    policy_stats: payload?.policy_stats || null,
  };

  return truncateText(preview, 8000);
}

function buildToolPlannerPrompt({ tools, context, mcpStatus, prompt }) {
  return [
    'You are the PolicyHQ internal assistant planning layer.',
    'Decide whether to answer directly or to call PolicyHQ tools.',
    'Use tools only when the question needs user-specific PolicyHQ data.',
    'If MCP is unavailable, do not plan tool calls.',
    'Return JSON only.',
    '',
    `MCP status: ${JSON.stringify(mcpStatus)}`,
    `Context: ${JSON.stringify(context)}`,
    `User prompt: ${prompt}`,
    `Available tools: ${JSON.stringify(
      tools.map((tool) => ({
        name: tool.name,
        description: tool.description || TOOL_DESCRIPTIONS[tool.name] || '',
        inputSchema: tool.inputSchema || null,
      }))
    )}`,
    '',
    'JSON shape:',
    '{"mode":"direct"|"tool","directAnswer":"","toolCalls":[{"name":"tool_name","arguments":{}}]}',
    '',
    'Rules:',
    '- Prefer direct mode for general guidance, copywriting, or explanation.',
    '- Prefer tool mode for policy, split, team, hierarchy, or production questions.',
    '- Do not invent unsupported tool names.',
    '- If a paginated tool is used, default to page 1 and per_page 25 unless the prompt clearly needs a larger or complete fetch.',
    '- If timeframe is not explicitly asked, leave it null unless the schema requires it.',
  ].join('\n');
}

async function planToolUsage(provider, tools, context, mcpStatus, prompt, conversation) {
  const messages = [
    {
      role: 'system',
      content: buildToolPlannerPrompt({ tools, context, mcpStatus, prompt }),
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await provider.createChatCompletion(messages, {
    model: provider.config?.nvidiaToolModel,
    apiKey: provider.config?.nvidiaToolApiKey,
    maxTokens: 800,
    temperature: 0.1,
    topP: 0.95,
  });

  const parsed = tryParseJson(provider.extractText(response));
  if (!parsed || typeof parsed !== 'object') {
    return {
      mode: 'direct',
      directAnswer: '',
      toolCalls: [],
    };
  }

  return {
    mode: parsed.mode === 'tool' ? 'tool' : 'direct',
    directAnswer: typeof parsed.directAnswer === 'string' ? parsed.directAnswer : '',
    toolCalls: Array.isArray(parsed.toolCalls) ? parsed.toolCalls : [],
  };
}

async function executeToolCalls({ mcpAuthorization, toolCalls, prompt }) {
  const config = getProviderConfig();
  const executedTools = [];

  for (const call of toolCalls) {
    if (!call || typeof call !== 'object' || !call.name) continue;

    const toolName = String(call.name);
    let args = call.arguments && typeof call.arguments === 'object' ? call.arguments : {};

    if (PAGINATED_TOOLS.has(toolName)) {
      args = normalizePagedArguments(args);
    }

    let { payload } = await callPolicyhqTool(mcpAuthorization, toolName, args);

    if (PAGINATED_TOOLS.has(toolName) && shouldAutoPaginate(prompt)) {
      let nextPage = getNextPage(payload);
      let pagesFetched = 1;
      let aggregate = payload;

      while (nextPage && pagesFetched < config.maxToolPages) {
        const nextArgs = { ...args, page: nextPage };
        const nextResult = await callPolicyhqTool(mcpAuthorization, toolName, nextArgs);
        aggregate = mergePagedPayloads(toolName, aggregate, nextResult.payload);
        nextPage = getNextPage(nextResult.payload);
        pagesFetched += 1;
      }

      payload = aggregate;
    }

    executedTools.push({
      name: toolName,
      arguments: args,
      payload,
      meta: buildToolMeta(toolName, args, payload),
      preview: buildToolPayloadPreview(toolName, payload),
    });
  }

  return executedTools;
}

function buildAnswerPrompt({ prompt, context, mcpStatus, toolResults, plannerDirectAnswer }) {
  return [
    'You are the internal PolicyHQ assistant inside the agent portal.',
    'Answer concisely and clearly.',
    'If live PolicyHQ data was used, rely on the tool results and do not invent fields.',
    'If tools were unavailable, say that plainly and keep the answer useful.',
    'If no live data was used, answer as a general assistant and do not claim you checked PolicyHQ.',
    'Do not expose raw authorization values or internal system details.',
    '',
    `Context: ${JSON.stringify(context)}`,
    `MCP status: ${JSON.stringify(mcpStatus)}`,
    `User prompt: ${prompt}`,
    plannerDirectAnswer ? `Planner note: ${plannerDirectAnswer}` : '',
    '',
    'Tool results:',
    ...toolResults.map((result) => `Tool ${result.name}:\n${result.preview}`),
  ].join('\n');
}

async function buildAssistantAnswer({
  provider,
  prompt,
  context,
  mcpStatus,
  toolResults,
  plannerDirectAnswer,
}) {
  const answerModel = toolResults.length
    ? provider.config?.nvidiaToolModel
    : provider.config?.nvidiaGeneralModel;
  const answerApiKey = toolResults.length
    ? provider.config?.nvidiaToolApiKey
    : provider.config?.nvidiaGeneralApiKey;

  const response = await provider.createChatCompletion(
    [
      {
        role: 'system',
        content: buildAnswerPrompt({
          prompt,
          context,
          mcpStatus,
          toolResults,
          plannerDirectAnswer,
        }),
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      model: answerModel,
      apiKey: answerApiKey,
      maxTokens: toolResults.length ? 1800 : 4096,
      temperature: toolResults.length ? 0.35 : 0.6,
      topP: 0.95,
      enableThinking: !toolResults.length,
      reasoningBudget: !toolResults.length ? 16384 : undefined,
    }
  );

  const answer = provider.extractText(response);
  return answer || 'I could not generate a response from the model.';
}

module.exports = {
  TOOL_DESCRIPTIONS,
  getMcpStatus,
  planToolUsage,
  executeToolCalls,
  buildAssistantAnswer,
};
