const { mock } = require('bun:test');

module.exports = {
  Wallet: {
    create: mock().mockRejectedValue(new Error('Mocked - should not be called')),
    import: mock().mockRejectedValue(new Error('Mocked - should not be called')),
  },
  Coinbase: {
    configure: mock(),
  },
};
