import { mock } from 'bun:test';
import 'reflect-metadata';

// Mock @coinbase/cdp-sdk
mock.module('@coinbase/cdp-sdk', () => ({
  Wallet: {
    create: mock().mockRejectedValue(new Error('Mocked - should not be called')),
    import: mock().mockRejectedValue(new Error('Mocked - should not be called')),
  },
  Coinbase: {
    configure: mock(),
  },
}));

// Mock the new @coinbase/agentkit module
mock.module('@coinbase/agentkit', () => {
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
    getNetwork: mock().mockResolvedValue({ networkId: 'base-sepolia' }),
    exportWallet: mock().mockResolvedValue('{"walletData": "test"}'),
    sendTransaction: mock().mockResolvedValue('0xabc123'),
  };

  // Create mock that includes the mockRejectedValueOnce method for testing error scenarios
  const mockFromFunction = mock().mockResolvedValue(mockAgentKit);

  return {
    AgentKit: {
      from: mockFromFunction,
    },
    CdpWalletProvider: {
      configureWithWallet: mock().mockResolvedValue(mockWalletProvider),
    },
  };
});

// Mock @elizaos/core types and utilities
mock.module('@elizaos/core', () => ({
  Service: class Service {
    runtime: any;
    constructor(runtime: any) {
      this.runtime = runtime;
    }
    stop() {}
  },
  ServiceType: {
    WALLET: 'wallet',
    UNKNOWN: 'unknown',
  },
  elizaLogger: {
    info: mock(),
    error: mock(),
    warn: mock(),
    debug: mock(),
  },
  default: {},
}));

// Mock fs module for wallet data file operations - don't provide default implementations
mock.module('fs', () => ({
  existsSync: mock(),
  readFileSync: mock(),
  writeFileSync: mock(),
  default: {
    existsSync: mock(),
    readFileSync: mock(),
    writeFileSync: mock(),
  },
}));

// Global test utilities
global.mock = mock;

// Setup default environment variables for tests
process.env.NODE_ENV = 'test';

// Mock reflect-metadata decorator functionality to prevent decorator errors during testing
const originalDefineMetadata = Reflect.defineMetadata;
const originalGetMetadata = Reflect.getMetadata;

// Override reflect-metadata functions to provide safe defaults for tests
if (typeof originalDefineMetadata !== 'undefined') {
  Reflect.defineMetadata = mock(
    (metadataKey: any, metadataValue: any, target: any, propertyKey?: any) => {
      // Safe no-op for tests
    }
  );
}

if (typeof originalGetMetadata !== 'undefined') {
  Reflect.getMetadata = mock((metadataKey: any, target: any, propertyKey?: any) => {
    if (metadataKey === 'design:paramtypes') {
      // Return empty array for parameter types to prevent decorator validation errors
      return [];
    }
    return undefined;
  });
}
