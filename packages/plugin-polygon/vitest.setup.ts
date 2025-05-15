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

// Mock ethers module
vi.mock('ethers', () => {
  // Create a more robust mock transaction object
  const mockApprovalTx = {
    hash: '0xApprovalTxHash',
    wait: vi.fn().mockResolvedValue({
      status: 1,
      transactionHash: '0xApprovalTxHash'
    })
  };
  
  const mockDepositTx = {
    hash: '0xDepositErc20TxHash',
    wait: vi.fn().mockResolvedValue({
      status: 1,
      transactionHash: '0xDepositErc20TxHash'
    })
  };
  
  const mockDepositEthTx = {
    hash: '0xDepositEthTxHash',
    wait: vi.fn().mockResolvedValue({
      status: 1,
      transactionHash: '0xDepositEthTxHash'
    })
  };
  
  const mockContract = vi.fn().mockImplementation(() => ({
    allowance: vi.fn().mockResolvedValue(BigInt(0)),
    approve: vi.fn().mockReturnValue(mockApprovalTx),
    depositEtherFor: vi.fn().mockReturnValue(mockDepositEthTx),
    depositFor: vi.fn().mockReturnValue(mockDepositTx),
    balanceOf: vi.fn().mockResolvedValue(BigInt(5000000000000000000n)),
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

// Mock GasService
vi.mock('./src/services/GasService', () => ({
  getGasPriceEstimates: vi.fn().mockResolvedValue({
    fast: { maxPriorityFeePerGas: BigInt(5000000000) },
    estimatedBaseFee: BigInt(20000000000),
    fallbackGasPrice: null
  })
}));

// Mock viem module
vi.mock('viem', () => {
  const mockPublicClient = {
    getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000000)),
    getBlock: vi.fn().mockResolvedValue({
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      number: BigInt(1000000),
      timestamp: BigInt(1600000000),
      gasUsed: BigInt(1000000),
      gasLimit: BigInt(30000000),
    }),
    getTransaction: vi.fn().mockResolvedValue({
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      from: '0xSenderAddress',
      to: '0xRecipientAddress',
      value: BigInt(1000000000000000000), // 1 ETH/MATIC
      gasPrice: BigInt(20000000000),
    }),
    getTransactionReceipt: vi.fn().mockResolvedValue({
      status: 'success',
      blockNumber: BigInt(1000000),
      gasUsed: BigInt(21000),
    }),
    getBalance: vi.fn().mockResolvedValue(BigInt(2000000000000000000)), // 2 ETH/MATIC
    readContract: vi.fn().mockImplementation(({ functionName }) => {
      if (functionName === 'balanceOf') return BigInt(500000000000000000); // 0.5 tokens
      if (functionName === 'decimals') return 18;
      if (functionName === 'symbol') return 'TKN';
      return null;
    }),
  };
  
  const mockWalletClient = {
    sendTransaction: vi.fn().mockResolvedValue('0xTransactionHash'),
    writeContract: vi.fn().mockResolvedValue('0xTransactionHash'),
    account: { address: '0xUserAddress' },
  };
  
  const mockTestClient = {
    sendTransaction: vi.fn().mockResolvedValue('0xTransactionHash'),
    writeContract: vi.fn().mockResolvedValue('0xTransactionHash'),
    account: { address: '0xUserAddress' },
  };

  return {
    createPublicClient: vi.fn().mockReturnValue(mockPublicClient),
    createWalletClient: vi.fn().mockReturnValue(mockWalletClient),
    createTestClient: vi.fn().mockReturnValue(mockTestClient),
    formatEther: vi.fn().mockReturnValue('2.0'),
    formatUnits: vi.fn().mockReturnValue('2.0'),
    toHex: vi.fn().mockImplementation((value) => `0x${value.toString(16)}`),
    http: vi.fn().mockImplementation((url) => ({ url })), // Add url property to the returned object
    custom: vi.fn().mockReturnValue({}),
    publicActions: vi.fn(),
    walletActions: vi.fn(),
    testActions: vi.fn()
  };
});

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

vi.mock('viem/chains', () => {
  return {
    mainnet: {
      id: 1,
      name: 'Ethereum',
      network: 'mainnet',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: ['https://ethereum-rpc.com'] },
      },
    },
    polygon: {
      id: 137,
      name: 'Polygon',
      network: 'polygon',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      rpcUrls: {
        default: { http: ['https://polygon-rpc.com'] },
      },
    },
  };
}); 