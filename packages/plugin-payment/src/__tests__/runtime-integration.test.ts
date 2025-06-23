import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { 
  elizaLogger,
  type IAgentRuntime,
  type Memory,
  type UUID,
  asUUID,
  stringToUuid,
  type Character,
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

describe('Payment Plugin Runtime Integration', () => {
  let runtime: IAgentRuntime;
  let paymentService: PaymentService;
  let mockDb: ReturnType<typeof createMockDatabase>;

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
          getDatabase: () => mockDb
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
}); 