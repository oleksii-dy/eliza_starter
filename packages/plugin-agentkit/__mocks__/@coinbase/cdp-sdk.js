const { vi } = require('vitest');

module.exports = {
    Wallet: {
        create: vi.fn().mockRejectedValue(new Error('Mocked - should not be called')),
        import: vi.fn().mockRejectedValue(new Error('Mocked - should not be called'))
    },
    Coinbase: {
        configure: vi.fn(),
    }
}; 