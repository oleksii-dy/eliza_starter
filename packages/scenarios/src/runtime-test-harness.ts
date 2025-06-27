import { IAgentRuntime, Character, Plugin, UUID, logger } from '@elizaos/core';
import { TestDatabaseManager } from '@elizaos/core/test-utils';
import chalk from 'chalk';
import { randomBytes } from 'crypto';

/**
 * Test Harness for running real benchmark scenarios
 * Properly initializes all required services including database
 */
export class RuntimeTestHarness {
  private testId: string;
  private activeRuntimes: Map<string, IAgentRuntime> = new Map();
  private cleanupFunctions: Map<string, () => Promise<void>> = new Map();
  private dbManager: TestDatabaseManager;

  constructor(testId: string) {
    this.testId = testId;
    this.dbManager = new TestDatabaseManager();
    this.setupEnvironment();
  }

  /**
   * Setup test environment with required configurations
   */
  private setupEnvironment() {
    console.log(chalk.yellow('🔧 Setting up test environment...'));

    // Use PGLite for in-memory database testing if no postgres URL
    if (!process.env.POSTGRES_URL) {
      process.env.USE_PGLITE_FOR_TEST = 'true';
      process.env.POSTGRES_URL = 'memory://';
      console.log(chalk.yellow('   Using in-memory PGLite database'));
    }

    // Secret salt (required for encryption)
    if (!process.env.SECRET_SALT) {
      process.env.SECRET_SALT = randomBytes(32).toString('hex');
      console.log(chalk.yellow('   Generated SECRET_SALT'));
    }

    // Set test environment flags
    process.env.NODE_ENV = 'test';
    process.env.ELIZA_ENV = 'test';

    console.log(chalk.green('✅ Test environment configured'));
  }

  /**
   * Create a test runtime with proper configuration
   */
  async createTestRuntime(config: {
    character: Character;
    plugins: string[];
    apiKeys?: Record<string, string>;
  }): Promise<IAgentRuntime> {
    try {
      console.log(chalk.cyan(`Creating real test runtime for ${this.testId}`));

      // Create an isolated database for this test
      const testDbId = `${this.testId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const dbAdapter = await this.dbManager.createIsolatedDatabase(testDbId);
      
      // Get SQL plugin if available
      let sqlPlugin: Plugin | undefined;
      try {
        const sqlPluginModule = await import('@elizaos/plugin-sql');
        sqlPlugin = sqlPluginModule.default || sqlPluginModule.plugin;
        console.log(chalk.yellow('   SQL plugin loaded'));
      } catch (error) {
        console.log(chalk.yellow('   SQL plugin not available - using mock database'));
      }

      // Create the runtime using direct AgentRuntime constructor
      const { AgentRuntime } = await import('@elizaos/core');
      
      // Ensure character has required settings
      const enhancedCharacter: Character = {
        ...config.character,
        settings: {
          ...config.character.settings,
          ...config.apiKeys,
          // Ensure database connection is available
          POSTGRES_URL: process.env.POSTGRES_URL,
          SECRET_SALT: process.env.SECRET_SALT,
        },
        plugins: config.character.plugins || [],
      };

      // Create runtime - AgentRuntime doesn't accept databaseAdapter in constructor
      const runtime = new AgentRuntime({
        character: enhancedCharacter,
        evaluators: [],
        providers: [],
      });

      // Set the database adapter and db property for plugins that access it directly
      (runtime as any).databaseAdapter = dbAdapter;
      (runtime as any).db = dbAdapter;

      // Initialize the runtime
      await runtime.initialize();

      // Load plugins
      console.log(chalk.cyan('   Loading plugins...'));
      for (const pluginName of config.plugins) {
        try {
          console.log(chalk.cyan(`   Attempting to load plugin: ${pluginName}`));
          
          let plugin: Plugin;
          
          // Try to dynamically import the plugin
          if (pluginName.startsWith('@elizaos/')) {
            const { default: importedPlugin } = await import(pluginName);
            plugin = importedPlugin;
          } else {
            // For non-scoped plugins, try different import strategies
            try {
              const { default: importedPlugin } = await import(pluginName);
              plugin = importedPlugin;
            } catch {
              const { [pluginName]: namedExport } = await import(pluginName);
              plugin = namedExport;
            }
          }

          if (plugin) {
            await runtime.registerPlugin(plugin);
            console.log(chalk.green(`   ✅ Successfully loaded plugin: ${pluginName}`));
          }
        } catch (error) {
          console.error(chalk.red(`   ❌ Failed to load plugin ${pluginName}:`), error);
        }
      }

      // Store runtime and cleanup function
      this.activeRuntimes.set(runtime.agentId, runtime);
      this.cleanupFunctions.set(runtime.agentId, async () => {
        // Clean up the runtime
        for (const [name, service] of runtime.services) {
          try {
            await service.stop();
          } catch (error) {
            console.error(`Failed to stop service ${name}:`, error);
          }
        }
        
        // Close the database
        await dbAdapter.close();
      });

      console.log(chalk.green(`✅ Runtime created for ${enhancedCharacter.name} with database support`));
      return runtime;

    } catch (error) {
      console.error(chalk.red('Failed to create test runtime:'), error);
      throw error;
    }
  }

  /**
   * Create a real runtime (not test) for benchmark scenarios
   */
  async createRealRuntime(config: {
    character: Character;
    plugins: string[];
    apiKeys?: Record<string, string>;
  }): Promise<IAgentRuntime> {
    try {
      console.log(chalk.cyan(`Creating real runtime for benchmark`));

      // Create an isolated database for this test
      const testDbId = `${this.testId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const dbAdapter = await this.dbManager.createIsolatedDatabase(testDbId);

      // Create the runtime using direct AgentRuntime constructor
      const { AgentRuntime } = await import('@elizaos/core');
      
      // Ensure character has required settings
      const enhancedCharacter: Character = {
        ...config.character,
        settings: {
          ...config.character.settings,
          ...config.apiKeys,
          // Ensure database connection is available
          POSTGRES_URL: process.env.POSTGRES_URL,
          SECRET_SALT: process.env.SECRET_SALT,
        },
        plugins: config.character.plugins || [],
      };

      // Create runtime - AgentRuntime doesn't accept databaseAdapter in constructor
      const runtime = new AgentRuntime({
        character: enhancedCharacter,
        evaluators: [],
        providers: [],
      });

      // Set the database adapter and db property for plugins that access it directly
      (runtime as any).databaseAdapter = dbAdapter;
      (runtime as any).db = dbAdapter;

      // Initialize the runtime
      await runtime.initialize();

      // Load plugins
      console.log(chalk.cyan('   Loading plugins...'));
      for (const pluginName of config.plugins) {
        try {
          console.log(chalk.cyan(`   Attempting to load plugin: ${pluginName}`));
          
          let plugin: Plugin;
          
          // Try to dynamically import the plugin
          if (pluginName.startsWith('@elizaos/')) {
            const { default: importedPlugin } = await import(pluginName);
            plugin = importedPlugin;
          } else {
            // For non-scoped plugins, try different import strategies
            try {
              const { default: importedPlugin } = await import(pluginName);
              plugin = importedPlugin;
            } catch {
              const { [pluginName]: namedExport } = await import(pluginName);
              plugin = namedExport;
            }
          }

          if (plugin) {
            await runtime.registerPlugin(plugin);
            console.log(chalk.green(`   ✅ Successfully loaded plugin: ${pluginName}`));
          }
        } catch (error) {
          console.error(chalk.red(`   ❌ Failed to load plugin ${pluginName}:`), error);
        }
      }

      // Store runtime and cleanup function
      this.activeRuntimes.set(runtime.agentId, runtime);
      this.cleanupFunctions.set(runtime.agentId, async () => {
        // Clean up the runtime
        for (const [name, service] of runtime.services) {
          try {
            await service.stop();
          } catch (error) {
            console.error(`Failed to stop service ${name}:`, error);
          }
        }
        
        // Close the database
        await dbAdapter.close();
      });

      console.log(chalk.green(`✅ Runtime created for ${enhancedCharacter.name} with database support`));
      return runtime;

    } catch (error) {
      console.error(chalk.red('Failed to create real runtime:'), error);
      throw error;
    }
  }

  /**
   * Clean up all active runtimes
   */
  async cleanup() {
    console.log(chalk.yellow('🧹 Cleaning up test harness...'));

    for (const [agentId, cleanupFn] of this.cleanupFunctions) {
      try {
        await cleanupFn();
        console.log(chalk.green(`   ✅ Cleaned up runtime ${agentId}`));
      } catch (error) {
        console.log(chalk.red(`   ❌ Failed to cleanup runtime ${agentId}:`, error));
      }
    }

    this.activeRuntimes.clear();
    this.cleanupFunctions.clear();
    
    // Clean up all test databases
    await this.dbManager.cleanup();

    console.log(chalk.green('✅ Test harness cleanup complete'));
  }
}

export default RuntimeTestHarness; 