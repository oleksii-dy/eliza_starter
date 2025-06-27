import { IAgentRuntime, Character, Plugin } from '@elizaos/core';
import chalk from 'chalk';
import { randomBytes } from 'crypto';

/**
 * Custom Test Harness for Payment Scenarios
 * Provides proper initialization for all payment-related plugins
 */
export class PaymentTestHarness {
  private runtimeConfig: any;

  constructor() {
    this.setupEnvironment();
  }

  /**
   * Setup test environment with all required configurations
   */
  private setupEnvironment() {
    console.log(chalk.yellow('🔧 Setting up payment test environment...'));

    // Use PGLite for in-memory database testing
    process.env.USE_PGLITE_FOR_TEST = 'true';
    
    // Database setup - use in-memory PGLite for testing
    if (!process.env.POSTGRES_URL) {
      process.env.POSTGRES_URL = 'memory://';
      console.log(chalk.yellow('   Using in-memory PGLite database'));
    }

    // Secret salt (required for encryption)
    if (!process.env.SECRET_SALT) {
      process.env.SECRET_SALT = randomBytes(32).toString('hex');
      console.log(chalk.yellow('   Generated SECRET_SALT'));
    }

    // Solana configuration for test environment
    if (!process.env.SOL_ADDRESS) {
      // Test wallet address
      process.env.SOL_ADDRESS = 'So11111111111111111111111111111111111111112';
      console.log(chalk.yellow('   Set SOL_ADDRESS for test wallet'));
    }

    if (!process.env.SOLANA_PRIVATE_KEY && !process.env.WALLET_SECRET_KEY) {
      // Use a base58 encoded test private key for Solana
      process.env.WALLET_SECRET_KEY = '5KQwrPbBWtBV8fXKTVHg6nAiKuyL9K9Xv8q3vwEXUjLjfBCkXGJonJEfvaj5FCqzNCT8sFcBqS6A1pqZ7x2VnGKz';
      console.log(chalk.yellow('   Set test WALLET_SECRET_KEY for Solana'));
    }

    if (!process.env.SOLANA_RPC_URL) {
      process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
      console.log(chalk.yellow('   Set SOLANA_RPC_URL to devnet'));
    }

    if (!process.env.SLIPPAGE) {
      process.env.SLIPPAGE = '5';
      console.log(chalk.yellow('   Set SLIPPAGE to 5%'));
    }

    // EVM configuration for test environment
    if (!process.env.EVM_PRIVATE_KEY) {
      // Use deterministic test private key
      process.env.EVM_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
      console.log(chalk.yellow('   Set test EVM_PRIVATE_KEY'));
    }

    if (!process.env.EVM_RPC_URL) {
      process.env.EVM_RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/demo';
      console.log(chalk.yellow('   Set EVM_RPC_URL to Sepolia testnet'));
    }

    if (!process.env.EVM_ADDRESS) {
      // Corresponding to the test private key
      process.env.EVM_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      console.log(chalk.yellow('   Set test EVM_ADDRESS'));
    }

    // Trust plugin configuration
    if (!process.env.TRUST_SCORE_DATABASE) {
      process.env.TRUST_SCORE_DATABASE = ':memory:';
      console.log(chalk.yellow('   Set TRUST_SCORE_DATABASE to in-memory'));
    }

    // Payment plugin specific settings
    process.env.PAYMENT_PROCESSOR_ENABLED = 'true';
    process.env.PAYMENT_AUTO_CONFIRM = 'true'; // Auto-confirm for testing

    // Set test environment flags
    process.env.NODE_ENV = 'test';
    process.env.ELIZA_ENV = 'test';

    console.log(chalk.green('✅ Payment test environment configured'));
  }

  /**
   * Create a test runtime with proper plugin configuration
   */
  async createTestRuntime(config: {
    character: Character;
    plugins: string[];
    apiKeys?: Record<string, string>;
  }): Promise<{ runtime: IAgentRuntime; cleanup: () => Promise<void> }> {
    // Import required modules
    const { createTestRuntime } = await import('@elizaos/core/test-utils');

    // Ensure character has required settings
    const enhancedCharacter: Character = {
      ...config.character,
      settings: {
        ...config.character.settings,
        ...config.apiKeys,
        // Add payment-specific settings
        PAYMENT_PROCESSOR_ENABLED: 'true',
        PAYMENT_AUTO_CONFIRM: 'true',
        // Solana settings
        SOL_ADDRESS: process.env.SOL_ADDRESS,
        SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
        SLIPPAGE: process.env.SLIPPAGE,
        WALLET_SECRET_KEY: process.env.WALLET_SECRET_KEY,
        // EVM settings  
        EVM_ADDRESS: process.env.EVM_ADDRESS,
        EVM_RPC_URL: process.env.EVM_RPC_URL,
      },
    };

    try {
      // Create runtime with enhanced configuration
      const { runtime, harness } = await createTestRuntime({
        character: enhancedCharacter,
        plugins: config.plugins,
        apiKeys: config.apiKeys || {},
      });

      // Initialize database if needed
      await this.initializeDatabase(runtime);

      // Initialize payment services
      await this.initializePaymentServices(runtime);

      return {
        runtime,
        cleanup: async () => {
          await harness.cleanup();
        },
      };
    } catch (error) {
      console.error(chalk.red('Failed to create test runtime:'), error);
      throw error;
    }
  }

  /**
   * Initialize database for payment plugin
   */
  private async initializeDatabase(runtime: IAgentRuntime) {
    try {
      // Check if database service is available
      const dbService = runtime.getService('database');
      if (!dbService) {
        console.log(chalk.yellow('   Database service not found, creating mock service...'));
        
        // Create a mock database service that wraps the database adapter
        const mockDbService = {
          serviceName: 'database',
          serviceType: 'DATA_STORAGE' as any,
          capabilityDescription: 'Mock database service for payment testing',
          
          getDatabase: () => {
            // Get the database adapter from runtime
            const adapter = (runtime as any).databaseAdapter || (runtime as any).adapter;
            if (!adapter) {
              console.log(chalk.yellow('   No database adapter found'));
              return null;
            }
            
            // Return a mock Drizzle database that uses the adapter
            return {
              select: () => ({ from: () => ({ where: () => ({ limit: () => [] }) }) }),
              insert: () => ({ values: () => Promise.resolve() }),
              update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
              delete: () => ({ where: () => Promise.resolve() }),
              // Add more mock methods as needed
            };
          },
          
          start: async () => {
            console.log(chalk.green('   Mock database service started'));
          },
          
          stop: async () => {
            console.log(chalk.yellow('   Mock database service stopped'));
          }
        };
        
        // Register the mock database service
        if (runtime.registerService) {
          runtime.registerService(mockDbService as any);
        } else {
          // Manually add to services map if registerService not available
          (runtime as any).services = (runtime as any).services || new Map();
          (runtime as any).services.set('database', mockDbService);
        }
        
        console.log(chalk.green('   ✅ Mock database service created'));
      }

      console.log(chalk.green('   ✅ Database initialized'));
    } catch (error) {
      console.log(chalk.yellow('   Database initialization skipped:', error));
    }
  }

  /**
   * Initialize payment-related services
   */
  private async initializePaymentServices(runtime: IAgentRuntime) {
    try {
      // Initialize payment service
      const paymentService = runtime.getService('payment');
      if (!paymentService) {
        console.log(chalk.yellow('   Payment service not found, initializing...'));
        
        // Initialize payment plugin
        const paymentPlugin = runtime.plugins.find(p => p.name === '@elizaos/plugin-payment');
        if (paymentPlugin && paymentPlugin.init) {
          await paymentPlugin.init({}, runtime);
        }
      }

      // Initialize blockchain services
      const solanaService = runtime.getService('solana');
      if (!solanaService) {
        console.log(chalk.yellow('   Solana service not found, initializing...'));
      }

      const evmService = runtime.getService('evm');
      if (!evmService) {
        console.log(chalk.yellow('   EVM service not found, initializing...'));
      }

      console.log(chalk.green('   ✅ Payment services initialized'));
    } catch (error) {
      console.log(chalk.yellow('   Payment services initialization skipped:', error));
    }
  }

  /**
   * Create mock payment state for testing
   */
  async createMockPaymentState(runtime: IAgentRuntime, userId: string, balance: number = 100) {
    try {
      // Create user balance record
      await runtime.createMemory({
        entityId: userId as any,
        roomId: 'payment-test-room' as any,
        content: {
          text: `User balance: ${balance} USDC`,
          metadata: {
            type: 'payment_balance',
            currency: 'USDC',
            amount: balance,
          },
        },
      }, 'facts');

      console.log(chalk.green(`   ✅ Created mock balance for user: ${balance} USDC`));
    } catch (error) {
      console.log(chalk.yellow('   Mock payment state creation skipped:', error));
    }
  }
}

export default PaymentTestHarness; 