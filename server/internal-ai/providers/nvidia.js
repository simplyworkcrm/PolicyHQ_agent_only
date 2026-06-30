const axios = require('axios');

class NvidiaProvider {
  constructor(config) {
    this.config = config;
  }

  async createChatCompletion(messages, options = {}) {
    const response = await axios.post(
      this.config.nvidiaApiUrl,
      {
        model: this.config.nvidiaModel,
        messages,
        max_tokens: options.maxTokens || 1400,
        temperature: options.temperature ?? 0.2,
        top_p: options.topP ?? 0.9,
        stream: false,
      },
      {
        timeout: this.config.timeoutMs,
        headers: {
          Authorization: `Bearer ${this.config.nvidiaApiKey}`,
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
