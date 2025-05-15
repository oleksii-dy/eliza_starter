import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WalletProvider } from '../../src/providers/PolygonWalletProvider';
import { elizaLogger } from '../mocks/core-mock';

// Import the mocked functions from vitest.setup.ts
import { createPublicClient, createWalletClient, createTestClient } from 'viem';

// Mock node-cache
vi.mock('node-cache', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
    }))
  };
});

// Mock viem
vi.mock('viem', () => {
  return {
    createPublicClient: vi.fn(),
    createWalletClient: vi.fn(),
    createTestClient: vi.fn(),
    formatUnits: vi.fn().mockReturnValue('2.0'),
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

// Mock viem/chains
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
    hardhat: {
      id: 31337,
      name: 'Hardhat',
      network: 'hardhat',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: ['http://127.0.0.1:8545'] },
      },
    },
  };
});

describe('PolygonWalletProvider', () => {
  let provider: WalletProvider;
  let mockPublicClient: any;
  let mockWalletClient: any;
  let mockTestClient: any;
  
  const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockUserAddress = '0xUserAddress';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock clients
    mockPublicClient = {
      getBalance: vi.fn().mockResolvedValue(BigInt(2000000000000000000)), // 2 ETH/MATIC
    };
    
    mockWalletClient = {
      account: { address: mockUserAddress },
    };
    
    mockTestClient = {
      account: { address: mockUserAddress },
    };
    
    // Configure the mock functions
    (createPublicClient as any).mockReturnValue(mockPublicClient);
    (createWalletClient as any).mockReturnValue(mockWalletClient);
    (createTestClient as any).mockReturnValue(mockTestClient);
    
    // Initialize the provider with private key
    provider = new WalletProvider(mockPrivateKey);
    
    // Add account property for testing
    provider.account = { address: mockUserAddress };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with private key', () => {
      expect(provider).toBeDefined();
      expect(provider.getAddress()).toBe('0xUserAddress');
    });

    it('should initialize with custom chains', () => {
      const customChains = {
        testnet: {
          id: 80001,
          name: 'Polygon Mumbai',
          network: 'mumbai',
          nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
          rpcUrls: {
            default: { http: ['https://rpc-mumbai.maticvigil.com'] },
          },
        },
      };
      
      const walletProviderWithChains = new WalletProvider(mockPrivateKey, customChains);
      // Add account property for testing
      walletProviderWithChains.account = { address: '0xUserAddress' };
      
      expect(walletProviderWithChains.chains.testnet).toBeDefined();
      expect(walletProviderWithChains.chains.testnet.id).toBe(80001);
    });
  });

  describe('Client getters', () => {
    it('should get public client for a chain', () => {
      vi.spyOn(provider, 'getPublicClient').mockReturnValue(mockPublicClient);
      const publicClient = provider.getPublicClient('mainnet');
      expect(publicClient).toBeDefined();
    });

    it('should get wallet client for a chain', () => {
      vi.spyOn(provider, 'getWalletClient').mockReturnValue(mockWalletClient);
      const walletClient = provider.getWalletClient('mainnet');
      expect(walletClient).toBeDefined();
      expect(walletClient.account?.address).toBe('0xUserAddress');
    });

    it('should get test client', () => {
      vi.spyOn(provider, 'getTestClient').mockReturnValue(mockTestClient);
      const testClient = provider.getTestClient();
      expect(testClient).toBeDefined();
    });
  });

  describe('Chain management', () => {
    it('should get chain configs', () => {
      const chain = provider.getChainConfigs('mainnet');
      expect(chain).toBeDefined();
      expect(chain.id).toBe(1);
    });

    it('should add a new chain', () => {
      const newChain = {
        customChain: {
          id: 12345,
          name: 'Custom Chain',
          network: 'custom',
          nativeCurrency: { name: 'Custom', symbol: 'CUST', decimals: 18 },
          rpcUrls: {
            default: { http: ['https://custom-chain.rpc'] },
          },
        },
      };
      
      provider.addChain(newChain);
      expect(provider.chains.customChain).toBeDefined();
      expect(provider.chains.customChain.id).toBe(12345);
    });

    it('should switch chain', () => {
      // Initial chain
      provider.switchChain('mainnet');
      expect(provider.getCurrentChain().id).toBe(1);
      
      // Switch to different chain
      provider.switchChain('polygon');
      expect(provider.getCurrentChain().id).toBe(137);
    });

    it('should switch to a new chain that needs to be added', () => {
      // Generate a chain from name and switch to it
      provider.switchChain('polygon');
      expect(provider.getCurrentChain().id).toBe(137);
    });
  });

  describe('Balance operations', () => {
    it('should get wallet balance for current chain', async () => {
      vi.spyOn(provider, 'getWalletBalance').mockResolvedValue('2.0');
      const balance = await provider.getWalletBalance();
      expect(balance).toBe('2.0');
    });

    it('should get wallet balance for specified chain', async () => {
      vi.spyOn(provider, 'getWalletBalanceForChain').mockResolvedValue('2.0');
      const balance = await provider.getWalletBalanceForChain('polygon');
      expect(balance).toBe('2.0');
    });
  });

  describe('Static chain helpers', () => {
    it('should generate chain from name', () => {
      const chain = WalletProvider.genChainFromName('polygon');
      expect(chain).toBeDefined();
      expect(chain.id).toBe(137);
    });

    it('should generate chain from name with custom RPC URL', () => {
      const customRpcUrl = 'https://custom-polygon-rpc.io';
      const chain = WalletProvider.genChainFromName('polygon', customRpcUrl);
      
      expect(chain).toBeDefined();
      expect(chain.id).toBe(137);
      expect(chain.rpcUrls.custom.http[0]).toBe(customRpcUrl);
    });

    it('should throw on invalid chain name', () => {
      expect(() => WalletProvider.genChainFromName('invalid-chain')).toThrow();
    });
  });
}); 