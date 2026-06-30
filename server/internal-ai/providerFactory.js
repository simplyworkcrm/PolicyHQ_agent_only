const { NvidiaProvider } = require('./providers/nvidia');

function createProvider(config) {
  if (config.provider === 'nvidia') {
    return new NvidiaProvider(config);
  }

  throw new Error(`Unsupported internal AI provider: ${config.provider}`);
}

module.exports = {
  createProvider,
};
