import { vi } from 'vitest';

// Mock the @elizaos/core module directly
vi.mock('@elizaos/core', () => {
  // Mock logger
  const elizaLogger = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  };
  
  // Base Service class
  class Service {
    static serviceType: string;
    capabilityDescription?: string;
    runtime?: any;
    
    constructor(runtime?: any) {
      this.runtime = runtime;
    }
    
    static async start(runtime: any): Promise<any> {
      return new this(runtime);
    }
    
    static async stop(runtime: any): Promise<void> {}
    
    async stop(): Promise<void> {}
  }
  
  // Mock runtime
  const mockRuntime = {
    getConfig: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
      const configs: Record<string, any> = {
        'polygon.privateKey': '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        'polygon.ethereumRpcUrl': 'https://mainnet.infura.io/v3/mock-key',
        'polygon.polygonRpcUrl': 'https://polygon-mainnet.infura.io/v3/mock-key',
        'polygon.polygonscanKey': 'MOCK_POLYGONSCAN_KEY',
      };
      return configs[key] || defaultValue;
    }),
    getSetting: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
      const settings: Record<string, any> = {
        'PRIVATE_KEY': '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        'ETHEREUM_RPC_URL': 'https://mainnet.infura.io/v3/mock-key',
        'POLYGON_RPC_URL': 'https://polygon-mainnet.infura.io/v3/mock-key',
        'POLYGONSCAN_KEY': 'MOCK_POLYGONSCAN_KEY',
      };
      return settings[key] || defaultValue;
    }),
    registerAction: vi.fn(),
    registerService: vi.fn(),
    getService: vi.fn(),
    evaluateAction: vi.fn(),
  };
  
  // Export model types
  const ModelType = {
    LARGE: 'large',
    SMALL: 'small',
  };
  
  return {
    elizaLogger,
    logger: elizaLogger,
    Service,
    ModelType,
    mockRuntime,
  };
});

// Mock the @elizaos/plugin-tee module
vi.mock('@elizaos/plugin-tee', () => {
  class PhalaDeriveKeyProvider {
    deriveKey = vi.fn().mockReturnValue('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
  }
  
  return {
    PhalaDeriveKeyProvider
  };
});

// Mock node-cache
vi.mock('node-cache', () => {
  const NodeCache = vi.fn().mockImplementation(() => ({
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
  }));
  
  return {
    default: NodeCache,
  };
});

// Mock viem module
vi.mock('viem', () => {
  return {
    createPublicClient: vi.fn().mockImplementation(() => ({
      getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000000)),
      getBlock: vi.fn().mockResolvedValue({
        hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        number: BigInt(1000000),
        timestamp: BigInt(1600000000),
      }),
      getTransaction: vi.fn().mockResolvedValue({
        hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        from: '0xSenderAddress',
        to: '0xRecipientAddress',
        value: BigInt(1000000000000000000),
      }),
      getTransactionReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
      getBalance: vi.fn().mockResolvedValue(BigInt(2000000000000000000)),
      readContract: vi.fn(),
    })),
    createWalletClient: vi.fn().mockImplementation(() => ({
      sendTransaction: vi.fn().mockResolvedValue('0xTransactionHash'),
      writeContract: vi.fn().mockResolvedValue('0xTransactionHash'),
      account: { address: '0xUserAddress' },
    })),
    createTestClient: vi.fn().mockImplementation(() => ({})),
    formatEther: vi.fn().mockReturnValue('2.0'),
    formatUnits: vi.fn().mockReturnValue('2.0'),
    toHex: vi.fn().mockImplementation((value) => `0x${value.toString(16)}`),
  };
});

// Mock viem/accounts
vi.mock('viem/accounts', () => {
  return {
    privateKeyToAccount: vi.fn().mockReturnValue({
      address: '0xUserAddress',
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      signTypedData: vi.fn(),
    }),
  };
});

// Mock ethers module
vi.mock('ethers', () => {
  const mockContract = vi.fn().mockImplementation(() => ({
    allowance: vi.fn().mockResolvedValue(BigInt(0)),
    approve: vi.fn().mockResolvedValue({
      hash: '0xApprovalTxHash',
      wait: vi.fn().mockResolvedValue(true),
    }),
    depositEtherFor: vi.fn().mockResolvedValue({
      hash: '0xDepositEthTxHash',
      wait: vi.fn().mockResolvedValue(true),
    }),
    depositFor: vi.fn().mockResolvedValue({
      hash: '0xDepositErc20TxHash',
      wait: vi.fn().mockResolvedValue(true),
    }),
  }));
  
  const mockWallet = vi.fn().mockImplementation(() => ({
    address: '0xUserAddress',
    connect: vi.fn().mockReturnThis(),
  }));
  
  const mockProvider = vi.fn().mockImplementation(() => ({
    getBalance: vi.fn().mockResolvedValue(BigInt(2000000000000000000)),
  }));
  
  return {
    Contract: mockContract,
    Wallet: mockWallet,
    JsonRpcProvider: mockProvider,
    isAddress: vi.fn().mockImplementation((address) => {
      // Simple check for 0x prefix and length
      return typeof address === 'string' && 
        address.startsWith('0x') && 
        address.length === 42;
    })
  };
}); 