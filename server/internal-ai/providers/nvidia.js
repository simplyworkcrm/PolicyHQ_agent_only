const axios = require('axios');

function isNemotronModel(model) {
  return String(model || '').toLowerCase().includes('nemotron');
}

class NvidiaProvider {
  constructor(config) {
    this.config = config;
  }

  async createChatCompletion(messages, options = {}) {
    const model = options.model || this.config.nvidiaModel;
    const payload = {
      model,
      messages,
      max_tokens: options.maxTokens || 1400,
      temperature: options.temperature ?? 0.2,
      top_p: options.topP ?? 0.9,
      stream: false,
      ...(isNemotronModel(model)
        ? {
            chat_template_kwargs: {
              enable_thinking: options.enableThinking ?? true,
            },
            reasoning_budget: options.reasoningBudget || 16384,
          }
        : {}),
      ...(options.extraBody && typeof options.extraBody === 'object'
        ? options.extraBody
        : {}),
    };

    const response = await axios.post(
      this.config.nvidiaApiUrl,
      payload,
      {
        timeout: this.config.timeoutMs,
        headers: {
          Authorization: `Bearer ${options.apiKey || this.config.nvidiaApiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  extractText(response) {
    return String(
      response?.choices?.[0]?.message?.content ||
        response?.choices?.[0]?.text ||
        ''
    ).trim();
  }
}

module.exports = {
  NvidiaProvider,
};
