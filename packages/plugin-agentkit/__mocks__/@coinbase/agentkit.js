const { mock } = require('bun:test');

const mockAgentKit = {
  getActions: mock().mockReturnValue([
    {
      name: 'get_balance',
      description: 'Get wallet balance',
      schema: {
        _def: { shape: mock().mockReturnValue({}) },
        safeParse: mock().mockReturnValue({ success: true, data: {} }),
      },
      invoke: mock().mockResolvedValue('1.5 ETH'),
    },
    {
      name: 'transfer',
      description: 'Transfer tokens',
      schema: {
        _def: { shape: mock().mockReturnValue({}) },
        safeParse: mock().mockReturnValue({ success: true, data: {} }),
      },
      invoke: mock().mockResolvedValue({ hash: '0x123' }),
    },
  ]),
};

const mockWalletProvider = {
  getAddress: mock().mockResolvedValue('0x1234567890123456789012345678901234567890'),
  getNetwork: mock().mockResolvedValue('base-sepolia'),
  exportWallet: mock().mockResolvedValue('{"walletData": "test"}'),
  sendTransaction: mock().mockResolvedValue('0xabc123'),
};

module.exports = {
  AgentKit: {
    from: mock().mockResolvedValue(mockAgentKit),
  },
  CdpWalletProvider: {
    configureWithWallet: mock().mockResolvedValue(mockWalletProvider),
  },
};
