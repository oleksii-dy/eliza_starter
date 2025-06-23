const { vi } = require('vitest');

const mockAgentKit = {
    getActions: vi.fn().mockReturnValue([
        {
            name: 'get_balance',
            description: 'Get wallet balance',
            schema: {
                _def: { shape: vi.fn().mockReturnValue({}) },
                safeParse: vi.fn().mockReturnValue({ success: true, data: {} })
            },
            invoke: vi.fn().mockResolvedValue('1.5 ETH')
        },
        {
            name: 'transfer',
            description: 'Transfer tokens',
            schema: {
                _def: { shape: vi.fn().mockReturnValue({}) },
                safeParse: vi.fn().mockReturnValue({ success: true, data: {} })
            },
            invoke: vi.fn().mockResolvedValue({ hash: '0x123' })
        }
    ])
};

const mockWalletProvider = {
    getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
    getNetwork: vi.fn().mockResolvedValue('base-sepolia'),
    exportWallet: vi.fn().mockResolvedValue('{"walletData": "test"}'),
    sendTransaction: vi.fn().mockResolvedValue('0xabc123')
};

module.exports = {
    AgentKit: {
        from: vi.fn().mockResolvedValue(mockAgentKit)
    },
    CdpWalletProvider: {
        configureWithWallet: vi.fn().mockResolvedValue(mockWalletProvider)
    }
}; 