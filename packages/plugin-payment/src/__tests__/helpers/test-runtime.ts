import {
  type IAgentRuntime,
  type UUID,
  type Character,
  type Plugin,
  type Memory,
  asUUID,
  stringToUuid,
} from '@elizaos/core';
import { createMockRuntime as createCoreMockRuntime, createMockMemory } from '@elizaos/core/test-utils';

export interface TestRuntimeOptions {
  character?: Partial<Character>;
  plugins?: Plugin[];
  databasePath?: string;
  settings?: Record<string, string>;
}

export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  // Create stateful mock services
  const mockSettings = {
    autoApprovalEnabled: true,
    autoApprovalThreshold: 10,
    defaultCurrency: 'USDC',
    maxDailySpend: 1000,
    requireConfirmation: false,
  };

  const runtimeSettings: Record<string, string> = {
    PAYMENT_AUTO_APPROVAL_ENABLED: 'true',
    PAYMENT_AUTO_APPROVAL_THRESHOLD: '10',
    PAYMENT_DEFAULT_CURRENCY: 'USDC',
    PAYMENT_REQUIRE_CONFIRMATION: 'false',
    PAYMENT_TRUST_THRESHOLD: '70',
    PAYMENT_MAX_DAILY_SPEND: '1000',
    WALLET_ENCRYPTION_KEY: `0x${'0'.repeat(64)}`,
    ETH_RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/demo',
    POLYGON_RPC_URL: 'https://polygon-mumbai.g.alchemy.com/v2/demo',
    NODE_ENV: 'test',
  };

  return createCoreMockRuntime({
    character: {
      name: 'PaymentTestAgent',
      bio: ['AI agent specialized in payment processing and financial operations'],
      system: 'You are a test agent for payment functionality',
      topics: ['payments', 'crypto', 'finance', 'transactions'],
      plugins: ['@elizaos/plugin-payment'],
    },
    getSetting: (key: string) => {
      return runtimeSettings[key];
    },
    setSetting: (key: string, value: string) => {
      runtimeSettings[key] = value;
    },
    registerAction: () => {},
    getService: (name: string) => {
      const services: Record<string, any> = {
        payment: {
          processPayment: async (request: any) => {
            const amount = BigInt(request.amount);
            const requiresConfirmation = request.requiresConfirmation;
            const trustScore = request.metadata?.trustScore || 50;
            const paymentMethod = request.method;

            // Check for unsupported payment methods
            const supportedMethods = ['USDC_ETH', 'ETH', 'SOL', 'USDC_SOL'];
            if (!supportedMethods.includes(paymentMethod)) {
              return {
                id: request.id,
                status: 'FAILED',
                error: `Payment method ${paymentMethod} not supported`,
                metadata: {},
              };
            }

            // Check if amount exceeds daily limit or auto-approval threshold
            const isLargeAmount = amount > BigInt(50000000); // 50 USDC
            const isTrustedUser = trustScore >= 70;

            if (requiresConfirmation || (isLargeAmount && !isTrustedUser)) {
              return {
                id: request.id,
                status: 'PENDING',
                metadata: { pendingReason: 'USER_CONFIRMATION_REQUIRED' },
              };
            } else if (isTrustedUser && amount <= BigInt(200000000)) { // 200 USDC
              return {
                id: request.id,
                status: 'FAILED',
                error: 'Insufficient funds or mock payment service',
                metadata: {},
              };
            } else {
              return {
                id: request.id,
                status: 'FAILED',
                error: 'Insufficient funds or mock payment service',
                metadata: {},
              };
            }
          },
          getUserBalance: async () => new Map([['USDC', '1000000000']]),
          getCapabilities: async () => ({
            supportedMethods: ['USDC_ETH', 'ETH', 'SOL', 'USDC_SOL'],
            features: { autoApproval: true },
            limits: { minAmount: 0.01, maxAmount: 1000, dailyLimit: 1000 },
          }),
          getSettings: () => mockSettings,
          updateSettings: async (settings: any) => {
            // Update mock settings state
            Object.assign(mockSettings, settings);
            // Also update runtime settings
            if (settings.autoApprovalThreshold !== undefined) {
              runtimeSettings.PAYMENT_AUTO_APPROVAL_THRESHOLD = settings.autoApprovalThreshold.toString();
            }
            if (settings.maxDailySpend !== undefined) {
              runtimeSettings.PAYMENT_MAX_DAILY_SPEND = settings.maxDailySpend.toString();
            }
            if (settings.requireConfirmation !== undefined) {
              runtimeSettings.PAYMENT_REQUIRE_CONFIRMATION = settings.requireConfirmation.toString();
            }
          },
        },
        database: {
          getDatabase: () => ({
            select: () => ({
              from: () => ({
                where: () => ({
                  limit: () => Promise.resolve([]),
                  orderBy: () => ({
                    limit: () => ({
                      offset: () => Promise.resolve([]),
                    }),
                  }),
                }),
                orderBy: () => ({
                  limit: () => ({
                    offset: () => Promise.resolve([]),
                  }),
                }),
                limit: () => Promise.resolve([]),
              }),
            }),
            insert: () => ({
              values: () => ({
                then: (resolve: any) => resolve({ insertedId: 'test-id' }),
                onConflictDoUpdate: () => ({
                  set: () => Promise.resolve({ insertedId: 'test-id' }),
                }),
              }),
            }),
            update: () => ({
              set: () => ({
                where: () => Promise.resolve({ rowsAffected: 1 }),
              }),
            }),
            delete: () => ({
              where: () => Promise.resolve({ rowsAffected: 1 }),
            }),
          }),
        },
        'crossmint-service': {
          listWallets: async () => [
            {
              address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
              type: 'evm-mpc-wallet',
              linkedUser: 'test-user',
              createdAt: new Date().toISOString(),
            },
          ],
          createWallet: async () => ({
            address: `0x${Math.random().toString(16).substring(2, 42)}`,
            type: 'evm-mpc-wallet',
            linkedUser: 'test-user',
            createdAt: new Date().toISOString(),
          }),
          createTransfer: async () => ({
            id: `tx_${Date.now()}`,
            hash: `0x${Math.random().toString(16).substring(2, 66)}`,
            status: 'pending',
            chain: 'ethereum',
          }),
        },
        'crossmint-wallet': {
          getBalances: async () => [
            {
              address: 'native',
              symbol: 'ETH',
              balance: '1.5',
              valueUsd: 3750,
              priceUsd: 2500,
              chain: 'ethereum',
            },
          ],
          transfer: async () => ({
            hash: `0x${Math.random().toString(16).substring(2, 66)}`,
            status: 'pending',
            chain: 'ethereum',
          }),
        },
        priceOracle: {
          convertToUSD: async () => 2500,
          getPrice: async () => ({ usd: 2500 }),
        },
      };
      return services[name];
    },
    ...overrides,
  }) as unknown as IAgentRuntime;
}

export async function createTestRuntime(options: TestRuntimeOptions = {}): Promise<IAgentRuntime> {
  const runtime = createMockRuntime({
    character: {
      name: 'Test Agent',
      username: 'testagent',
      bio: 'A test agent for payment plugin',
      plugins: [],
      ...options.character,
    },
    getSetting: (key: string) => {
      const defaultSettings: Record<string, string> = {
        PAYMENT_AUTO_APPROVAL_ENABLED: 'true',
        PAYMENT_AUTO_APPROVAL_THRESHOLD: '10',
        PAYMENT_DEFAULT_CURRENCY: 'USDC',
        PAYMENT_REQUIRE_CONFIRMATION: 'false',
        PAYMENT_TRUST_THRESHOLD: '70',
        PAYMENT_MAX_DAILY_SPEND: '1000',
        WALLET_ENCRYPTION_KEY: `0x${'0'.repeat(64)}`,
        ETH_RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/demo',
        POLYGON_RPC_URL: 'https://polygon-mumbai.g.alchemy.com/v2/demo',
        NODE_ENV: 'test',
        ...options.settings,
      };
      return defaultSettings[key];
    },
  });

  // Initialize plugins if provided
  if (options.plugins) {
    for (const plugin of options.plugins) {
      if (plugin.init) {
        const settings = {
          PAYMENT_AUTO_APPROVAL_ENABLED: 'true',
          PAYMENT_AUTO_APPROVAL_THRESHOLD: '10',
          PAYMENT_DEFAULT_CURRENCY: 'USDC',
          PAYMENT_REQUIRE_CONFIRMATION: 'false',
          PAYMENT_TRUST_THRESHOLD: '70',
          PAYMENT_MAX_DAILY_SPEND: '1000',
          WALLET_ENCRYPTION_KEY: `0x${'0'.repeat(64)}`,
          ETH_RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/demo',
          POLYGON_RPC_URL: 'https://polygon-mumbai.g.alchemy.com/v2/demo',
          NODE_ENV: 'test',
          ...options.settings,
        };
        await plugin.init(settings, runtime);
      }
    }
  }

  return runtime;
}

export async function cleanupTestRuntime(runtime: IAgentRuntime): Promise<void> {
  try {
    // Stop any services
    const services = (runtime as any).services || new Map();
    for (const [_, service] of services) {
      if (service && typeof service.stop === 'function') {
        await service.stop();
      }
    }
  } catch (error) {
    console.warn('Error during test cleanup:', error);
  }
}

export function createTestMemory(overrides: Partial<Memory> = {}): Memory {
  return createMockMemory({
    content: {
      text: 'Test payment message',
      ...overrides.content,
    },
    ...overrides,
  });
}

export function createTestUserId(): UUID {
  return asUUID(stringToUuid(`user-${Date.now()}-${Math.random()}`));
}
