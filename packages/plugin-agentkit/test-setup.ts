import { vi } from 'vitest';
import 'reflect-metadata';

// Mock @coinbase/cdp-sdk
vi.mock('@coinbase/cdp-sdk', () => ({
    Wallet: {
        create: vi.fn().mockRejectedValue(new Error('Mocked - should not be called')),
        import: vi.fn().mockRejectedValue(new Error('Mocked - should not be called'))
    },
    Coinbase: {
        configure: vi.fn(),
    }
}));

// Mock the new @coinbase/agentkit module
vi.mock('@coinbase/agentkit', () => {
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
        getNetwork: vi.fn().mockResolvedValue({ networkId: 'base-sepolia' }),
        exportWallet: vi.fn().mockResolvedValue('{"walletData": "test"}'),
        sendTransaction: vi.fn().mockResolvedValue('0xabc123')
    };
    
    // Create mock that includes the mockRejectedValueOnce method for testing error scenarios
    const mockFromFunction = vi.fn().mockResolvedValue(mockAgentKit);
    
    return {
        AgentKit: {
            from: mockFromFunction
        },
        CdpWalletProvider: {
            configureWithWallet: vi.fn().mockResolvedValue(mockWalletProvider)
        }
    };
});

// Mock @elizaos/core types and utilities
vi.mock('@elizaos/core', () => ({
    Service: class Service {
        runtime: any;
        constructor(runtime: any) {
            this.runtime = runtime;
        }
        stop() {}
    },
    ServiceType: {
        WALLET: 'wallet',
        UNKNOWN: 'unknown'
    },
    elizaLogger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    },
    default: {}
}));

// Mock fs module for wallet data file operations - don't provide default implementations
vi.mock('fs', () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    default: {
        existsSync: vi.fn(),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn()
    }
}));

// Global test utilities
global.vi = vi;

// Setup default environment variables for tests
process.env.NODE_ENV = 'test';

// Mock reflect-metadata decorator functionality to prevent decorator errors during testing
const originalDefineMetadata = Reflect.defineMetadata;
const originalGetMetadata = Reflect.getMetadata;

// Override reflect-metadata functions to provide safe defaults for tests
if (originalDefineMetadata) {
    Reflect.defineMetadata = vi.fn((metadataKey: any, metadataValue: any, target: any, propertyKey?: any) => {
        // Safe no-op for tests
        return;
    });
}

if (originalGetMetadata) {
    Reflect.getMetadata = vi.fn((metadataKey: any, target: any, propertyKey?: any) => {
        if (metadataKey === 'design:paramtypes') {
            // Return empty array for parameter types to prevent decorator validation errors
            return [];
        }
        return undefined;
    });
} 