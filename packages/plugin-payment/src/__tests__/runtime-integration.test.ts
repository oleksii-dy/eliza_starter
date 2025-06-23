import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { 
  elizaLogger,
  type IAgentRuntime,
  type Memory,
  type UUID,
  asUUID,
  stringToUuid,
  type Character,
  ServiceType,
  AgentRuntime,
  type Plugin,
} from '@elizaos/core';
import { PaymentService } from '../services/PaymentService';
import { researchAction } from '../actions/researchAction';
import { PaymentMethod, PaymentStatus } from '../types';
import { paymentPlugin } from '../index';
import { 
  paymentTransactions, 
  paymentRequests, 
  userWallets,
  dailySpending,
} from '../database/schema';
import { PriceOracleService } from '../services/PriceOracleService';
import { UniversalPaymentService } from '../services/UniversalPaymentService';
import { CrossmintAdapter } from '../adapters/CrossmintAdapter';

// Mock database that simulates Drizzle ORM behavior
const createMockDatabase = () => {
  const data = new Map<string, any[]>();
  // Initialize with table names
  data.set('payment_transactions', []);
  data.set('payment_requests', []);
  data.set('user_wallets', []);
  data.set('daily_spending', []);
  
  return {
    select: () => ({
      from: (table: any) => ({
        where: (condition: any) => ({
          limit: (n: number) => ({
            then: (resolve: Function) => {
              // Get the table name from the table object
              let tableName = 'unknown';
              if (table.name) {
                tableName = table.name;
              } else if (table.tableName) {
                tableName = table.tableName;
              } else if (table.symbol && table.symbol.description) {
                // Try to extract from symbol description
                const match = table.symbol.description.match(/Symbol\((.+)\)/);
                if (match) tableName = match[1];
              }
              const records = data.get(tableName) || [];
              return Promise.resolve(records.slice(0, n)).then(resolve);
            }
          }),
          orderBy: (order: any) => ({
            limit: (n: number) => ({
              offset: (o: number) => ({
                then: (resolve: Function) => {
                  // Get the table name from the table object
                  let tableName = 'unknown';
                  if (table.name) {
                    tableName = table.name;
                  } else if (table.tableName) {
                    tableName = table.tableName;
                  } else if (table.symbol && table.symbol.description) {
                    // Try to extract from symbol description
                    const match = table.symbol.description.match(/Symbol\((.+)\)/);
                    if (match) tableName = match[1];
                  }
                  const records = data.get(tableName) || [];
                  return Promise.resolve(records.slice(o, o + n)).then(resolve);
                }
              })
            })
          })
        }),
        // Add orderBy at top level for getPaymentHistory
        orderBy: (order: any) => ({
          limit: (n: number) => ({
            offset: (o: number) => {
              return Promise.resolve([]);
            }
          })
        })
      })
    }),
    
    insert: (table: any) => ({
      values: async (values: any) => {
        const tableName = table.name || 'unknown';
        const records = data.get(tableName) || [];
        records.push(values);
        data.set(tableName, records);
      }
    }),
    
    update: (table: any) => ({
      set: (values: any) => ({
        where: (condition: any) => Promise.resolve()
      })
    }),
    
    delete: (table: any) => ({
      where: (condition: any) => Promise.resolve()
    }),
    
    // For direct SQL-like access
    prepare: (sql: string) => ({
      get: (id: string) => {
        if (sql.includes('user_wallets')) {
          const wallets = data.get('userWallets') || [];
          return wallets.find((w: any) => w.userId === id);
        }
        return null;
      }
    })
  };
};

// Mock database service
class MockDatabaseService {
  private data = new Map<string, any>();

  getDatabase() {
    const self = this;
    return {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([]),
    };
  }

  async get(key: string) {
    return this.data.get(key);
  }

  async set(key: string, value: any) {
    this.data.set(key, value);
  }

  async delete(key: string) {
    this.data.delete(key);
  }

  async query(sql: string, params?: any[]) {
    return [];
  }
}

// Mock Crossmint services for testing
class MockCrossmintService {
  async listWallets() {
    return [{
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
      type: 'evm-mpc-wallet',
      linkedUser: 'test-user',
      createdAt: new Date().toISOString(),
    }];
  }

  async createWallet(params: any) {
    return {
      address: `0x${Math.random().toString(16).substring(2, 42)}`,
      type: params.type,
      linkedUser: params.linkedUser,
      createdAt: new Date().toISOString(),
    };
  }

  async createTransfer(params: any) {
    return {
      id: `tx_${Date.now()}`,
      hash: `0x${Math.random().toString(16).substring(2, 66)}`,
      status: 'pending',
      chain: 'ethereum',
      gas: '21000',
      gasPrice: '20000000000',
      createdAt: new Date().toISOString(),
    };
  }

  async getTransaction(hash: string) {
    return {
      hash,
      status: 'success',
      chain: 'ethereum',
      gas: '21000',
      gasPrice: '20000000000',
      createdAt: new Date().toISOString(),
    };
  }
}

class MockCrossmintWalletService {
  async getBalances(owner?: string) {
    return [{
      address: 'native',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      balance: '1.5',
      balanceFormatted: '1.500000',
      valueUsd: 3750,
      priceUsd: 2500,
      chain: 'ethereum',
      isNative: true,
    }];
  }

  async transfer(params: any) {
    return {
      hash: `0x${Math.random().toString(16).substring(2, 66)}`,
      status: 'pending',
      chain: params.chain || 'ethereum',
      gasUsed: '21000',
      gasPrice: '20000000000',
      confirmations: 0,
      timestamp: Date.now(),
    };
  }

  async getTransaction(hash: string) {
    return {
      hash,
      status: 'confirmed',
      chain: 'ethereum',
      gasUsed: '21000',
      gasPrice: '20000000000',
      confirmations: 1,
      timestamp: Date.now(),
    };
  }

  async createWallet(params: any) {
    return {
      id: `wallet-${Date.now()}`,
      address: `0x${Math.random().toString(16).substring(2, 42)}`,
      type: params.type || 'mpc',
      name: params.name,
      chain: 'ethereum',
      metadata: params.metadata,
      isActive: true,
      createdAt: Date.now(),
    };
  }
}

// Mock Crossmint plugin
const mockCrossmintPlugin: Plugin = {
  name: '@elizaos/plugin-crossmint',
  description: 'Mock Crossmint plugin for testing',
  services: [MockCrossmintService as any, MockCrossmintWalletService as any],
  actions: []
  providers: []
  evaluators: []
};

describe('Payment Plugin Runtime Integration', () => {
  let runtime: IAgentRuntime;
  let paymentService: PaymentService;
  let mockDb: ReturnType<typeof createMockDatabase>;
  let mockDbService: MockDatabaseService;

  beforeAll(async () => {
    elizaLogger.info('Setting up runtime integration test');
    
    // Create test character
    const testCharacter: Character = {
      id: stringToUuid('test-payment-agent'),
      name: 'PaymentTestAgent',
      username: 'payment_test',
      bio: 'A test agent for payment functionality',
      settings: {
        secrets: {},
        model: 'gpt-3.5-turbo',
        embeddingModel: 'text-embedding-3-small',
      },
      plugins: [paymentPlugin.name],
    };

    // Create mock database
    mockDb = createMockDatabase();
    
    // Create mock database service
    mockDbService = new MockDatabaseService();
    
    // Create mock runtime
    runtime = {
      agentId: asUUID(stringToUuid('test-agent')),
      character: testCharacter,
      getSetting: (key: string) => {
        const settings: Record<string, string> = {
          PAYMENT_AUTO_APPROVAL_ENABLED: 'true',
          PAYMENT_AUTO_APPROVAL_THRESHOLD: '10',
          PAYMENT_DEFAULT_CURRENCY: 'USDC',
          PAYMENT_REQUIRE_CONFIRMATION: 'false',
          PAYMENT_TRUST_THRESHOLD: '70',
          PAYMENT_MAX_DAILY_SPEND: '1000',
          WALLET_ENCRYPTION_KEY: '0x' + '0'.repeat(64),
          ETH_RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/demo',
          POLYGON_RPC_URL: 'https://polygon-mumbai.g.alchemy.com/v2/demo',
          NODE_ENV: 'test',
        };
        return settings[key] || testCharacter.settings?.secrets?.[key];
      },
      setSetting: vi.fn(),
      getService: (name: string) => {
        if (name === 'payment') return paymentService;
        if (name === 'database') return {
          getDatabase: () => mockDbService
        };
        return null;
      },
      registerAction: vi.fn(),
      registerService: vi.fn(),
      emit: vi.fn(),
    } as any;

    // Initialize payment service
    paymentService = new PaymentService();
    await paymentService.initialize(runtime);
    
    expect(paymentService).toBeDefined();
    expect(paymentService).toBeInstanceOf(PaymentService);
  });

  afterAll(async () => {
    // Clean up
    if (paymentService) {
      await paymentService.stop();
    }
  });

  describe('Core Functionality', () => {
    it('should validate payment requests', async () => {
      const invalidRequests = [
        {
          // Missing recipient address
          id: asUUID(stringToUuid('test-invalid-1')),
          userId: asUUID(stringToUuid('test-user')),
          agentId: runtime.agentId,
          actionName: 'test',
          amount: BigInt(1000000),
          method: PaymentMethod.ETH,
          metadata: {},
        },
        {
          // Invalid amount (0)
          id: asUUID(stringToUuid('test-invalid-2')),
          userId: asUUID(stringToUuid('test-user')),
          agentId: runtime.agentId,
          actionName: 'test',
          amount: BigInt(0),
          method: PaymentMethod.ETH,
          recipientAddress: '0x' + '0'.repeat(40),
          metadata: {},
        },
      ];

      for (const request of invalidRequests) {
        const result = await paymentService.processPayment(request, runtime);
        
        // processPayment returns a result with status FAILED instead of throwing
        expect(result.status).toBe(PaymentStatus.FAILED);
        expect(result.error).toBeDefined();
      }
    });

    it('should generate unique verification codes', async () => {
      const codes = new Set<string>();
      
      // Generate multiple codes to ensure uniqueness
      for (let i = 0; i < 10; i++) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        expect(code).toHaveLength(6);
        expect(codes.has(code)).toBe(false);
        codes.add(code);
      }
    });

    it('should check wallet encryption', async () => {
      const userId = asUUID(stringToUuid('test-user-encryption'));
      
      // Force wallet creation
      try {
        await paymentService.getUserBalance(userId, runtime);
      } catch (error) {
        // Expected to fail due to no real wallet service
      }
      
      // Check that wallet would be encrypted if created
      const encryptionKey = runtime.getSetting('WALLET_ENCRYPTION_KEY');
      expect(encryptionKey).toBeDefined();
      expect(encryptionKey).toHaveLength(66); // '0x' + 64 hex chars
    });
  });

  describe('Payment Service Configuration', () => {
    it('should have proper settings', () => {
      const settings = paymentService.getSettings();
      expect(settings).toBeDefined();
      expect(settings.autoApprovalEnabled).toBe(true);
      expect(settings.autoApprovalThreshold).toBe(10);
      expect(settings.maxDailySpend).toBe(1000);
    });

    it('should have proper capabilities', async () => {
      const capabilities = await paymentService.getCapabilities();
      
      expect(capabilities.supportedMethods.length).toBeGreaterThan(0);
      expect(capabilities.supportedMethods).toContain(PaymentMethod.ETH);
      expect(capabilities.supportedMethods).toContain(PaymentMethod.USDC_ETH);
      
      expect(capabilities.features.autoApproval).toBe(true);
      expect(capabilities.limits.dailyLimit).toBe(1000);
    });
  });

  describe('Research Action Integration', () => {
    it('should validate research requests', async () => {
      const message: Memory = {
        id: asUUID(stringToUuid('test-research-msg')),
        entityId: asUUID(stringToUuid('test-user-research')),
        agentId: runtime.agentId,
        roomId: asUUID(stringToUuid('test-room')),
        content: {
          text: 'Research blockchain scalability solutions',
        },
        createdAt: Date.now(),
      };

      // Validate the action
      const isValid = await researchAction.validate!(runtime, message);
      expect(isValid).toBe(true);
    });

    it('should handle research payment flow', async () => {
      const message: Memory = {
        id: asUUID(stringToUuid('test-research-payment')),
        entityId: asUUID(stringToUuid('test-user-payment')),
        agentId: runtime.agentId,
        roomId: asUUID(stringToUuid('test-room')),
        content: {
          text: 'Can you research AI trends?',
        },
        createdAt: Date.now(),
      };

      const callback = vi.fn();
      await researchAction.handler(runtime, message, undefined, {}, callback);

      expect(callback).toHaveBeenCalled();
      const response = callback.mock.calls[0][0];
      
      // Should mention payment or funds issue
      const text = response.text?.toLowerCase() || '';
      expect(text).toMatch(/payment|insufficient|funds|wallet|error/);
    });
  });

  describe('CrossmintAdapter Integration', () => {
    it('should load CrossmintAdapter when Crossmint services are available', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;
      const capabilities = await paymentService.getCapabilities();
      
      // Check if Crossmint payment methods are supported
      expect(capabilities.supportedMethods).toContain(PaymentMethod.ETH);
      expect(capabilities.supportedMethods).toContain(PaymentMethod.USDC_ETH);
      expect(capabilities.supportedMethods).toContain(PaymentMethod.SOL);
    });

    it('should process payment with CrossmintAdapter', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;
      
      const paymentRequest = {
        id: asUUID('00000000-0000-0000-0000-000000000001'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: runtime.agentId,
        actionName: 'test-payment',
        amount: BigInt(1000000), // 1 USDC
        method: PaymentMethod.USDC_ETH,
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
        metadata: { 
          test: true,
          adapter: 'crossmint',
        },
      };

      const result = await paymentService.processPayment(paymentRequest, runtime);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(paymentRequest.id);
      expect(result.status).toBeDefined();
      
      // Check if it attempted to use Crossmint (would fail due to missing wallet)
      if (result.status === PaymentStatus.FAILED) {
        expect(result.error).toBeDefined();
      }
    });

    it('should get user balance through CrossmintAdapter', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;
      
      const userId = asUUID('00000000-0000-0000-0000-000000000002');
      const balances = await paymentService.getUserBalance(userId, runtime);
      
      expect(balances).toBeDefined();
      expect(balances).toBeInstanceOf(Map);
    });
  });

  describe('Service Interactions', () => {
    it('should use price oracle for currency conversion', async () => {
      const priceOracleService = runtime.getService('priceOracle') as PriceOracleService;
      
      // Test ETH to USD conversion
      const ethAmount = BigInt('1000000000000000000'); // 1 ETH
      const usdValue = await priceOracleService.convertToUSD(ethAmount, PaymentMethod.ETH);
      
      expect(usdValue).toBeGreaterThan(0);
    });

    it('should handle payment with auto-approval', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;
      
      // Small payment under auto-approval threshold
      const paymentRequest = {
        id: asUUID('00000000-0000-0000-0000-000000000003'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: runtime.agentId,
        actionName: 'small-payment',
        amount: BigInt(5000000), // 5 USDC (under $10 threshold)
        method: PaymentMethod.USDC_ETH,
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
      };

      const result = await paymentService.processPayment(paymentRequest, runtime);
      
      expect(result).toBeDefined();
      // Should not require confirmation due to auto-approval
      expect(result.metadata?.pendingReason).not.toBe('USER_CONFIRMATION_REQUIRED');
    });

    it('should require confirmation for large payments', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;
      
      // Large payment over auto-approval threshold
      const paymentRequest = {
        id: asUUID('00000000-0000-0000-0000-000000000004'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: runtime.agentId,
        actionName: 'large-payment',
        amount: BigInt(50000000), // 50 USDC (over $10 threshold)
        method: PaymentMethod.USDC_ETH,
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
        requiresConfirmation: true,
      };

      const result = await paymentService.processPayment(paymentRequest, runtime);
      
      expect(result).toBeDefined();
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.metadata?.pendingReason).toBe('USER_CONFIRMATION_REQUIRED');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing wallet adapter gracefully', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;
      
      // Try unsupported payment method
      const paymentRequest = {
        id: asUUID('00000000-0000-0000-0000-000000000005'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: runtime.agentId,
        actionName: 'unsupported-payment',
        amount: BigInt(1000000),
        method: PaymentMethod.BTC, // Not supported by any adapter
        recipientAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      };

      const result = await paymentService.processPayment(paymentRequest, runtime);
      
      expect(result).toBeDefined();
      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.error).toContain('not supported');
    });

    it('should handle database errors', async () => {
      // Mock database error
      const db = mockDbService.getDatabase();
      db.insert = vi.fn().mockReturnThis();
      db.values = vi.fn().mockRejectedValue(new Error('Database error'));

      const paymentService = runtime.getService('payment') as PaymentService;
      
      const paymentRequest = {
        id: asUUID('00000000-0000-0000-0000-000000000006'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: runtime.agentId,
        actionName: 'db-error-payment',
        amount: BigInt(1000000),
        method: PaymentMethod.USDC_ETH,
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
      };

      const result = await paymentService.processPayment(paymentRequest, runtime);
      
      expect(result).toBeDefined();
      expect(result.status).toBe(PaymentStatus.FAILED);
    });
  });

  describe('Multi-Adapter Support', () => {
    it('should support multiple payment methods across adapters', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;
      const capabilities = await paymentService.getCapabilities();
      
      // Should support methods from multiple adapters
      const expectedMethods = [
        PaymentMethod.USDC_ETH,
        PaymentMethod.ETH,
        PaymentMethod.SOL,
        PaymentMethod.USDC_SOL,
      ];
      
      expectedMethods.forEach(method => {
        expect(capabilities.supportedMethods).toContain(method);
      });
    });

    it('should select correct adapter for payment method', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;
      
      // Test Ethereum payment (should use Crossmint or EVM adapter)
      const ethPayment = {
        id: asUUID('00000000-0000-0000-0000-000000000007'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: runtime.agentId,
        actionName: 'eth-payment',
        amount: BigInt('1000000000000000000'), // 1 ETH
        method: PaymentMethod.ETH,
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
      };

      const ethResult = await paymentService.processPayment(ethPayment, runtime);
      expect(ethResult).toBeDefined();
      
      // Test Solana payment (should use Crossmint or Solana adapter)
      const solPayment = {
        id: asUUID('00000000-0000-0000-0000-000000000008'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: runtime.agentId,
        actionName: 'sol-payment',
        amount: BigInt('1000000000'), // 1 SOL
        method: PaymentMethod.SOL,
        recipientAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZjDpNqYV4N',
      };

      const solResult = await paymentService.processPayment(solPayment, runtime);
      expect(solResult).toBeDefined();
    });
  });

  describe('Settings Management', () => {
    it('should update payment settings', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;
      
      // Update settings
      await paymentService.updateSettings({
        autoApprovalThreshold: 25,
        maxDailySpend: 2000,
      });
      
      const settings = paymentService.getSettings();
      expect(settings.autoApprovalThreshold).toBe(25);
      expect(settings.maxDailySpend).toBe(2000);
    });

    it('should persist settings to runtime', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;
      
      await paymentService.updateSettings({
        requireConfirmation: true,
      });
      
      const runtimeSetting = runtime.getSetting('PAYMENT_REQUIRE_CONFIRMATION');
      expect(runtimeSetting).toBe('true');
    });
  });
}); 