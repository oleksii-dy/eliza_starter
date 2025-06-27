import { IAgentRuntime, Character, Plugin, UUID, logger } from '@elizaos/core';
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

  constructor(testId: string) {
    this.testId = testId;
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

      // Create the runtime using direct AgentRuntime constructor
      const { AgentRuntime } = await import('@elizaos/core');
      
      // Ensure character has required settings and SQL plugin
      const enhancedCharacter: Character = {
        ...config.character,
        settings: {
          ...config.character.settings,
          ...config.apiKeys,
          // Ensure database connection is available
          POSTGRES_URL: process.env.POSTGRES_URL,
          SECRET_SALT: process.env.SECRET_SALT,
        },
        plugins: [
          // Always include SQL plugin for database functionality
          '@elizaos/plugin-sql',
          ...(config.character.plugins || []),
        ],
      };

      // Create runtime without manually specifying adapter - let SQL plugin handle it
      const runtime = new AgentRuntime({
        character: enhancedCharacter,
      });

      // Initialize the runtime - this will trigger SQL plugin initialization
      console.log(chalk.cyan('   Initializing runtime...'));
      await runtime.initialize();

      // Load additional plugins (SQL plugin is already loaded during initialize)
      console.log(chalk.cyan('   Loading additional plugins...'));
      const additionalPlugins = config.plugins.filter(p => p !== '@elizaos/plugin-sql');
      
      for (const pluginName of additionalPlugins) {
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
        
        // Database cleanup is handled by the SQL plugin
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

      // Create the runtime using direct AgentRuntime constructor
      const { AgentRuntime } = await import('@elizaos/core');
      
      // Ensure character has required settings and SQL plugin
      const enhancedCharacter: Character = {
        ...config.character,
        settings: {
          ...config.character.settings,
          ...config.apiKeys,
          // Ensure database connection is available
          POSTGRES_URL: process.env.POSTGRES_URL,
          SECRET_SALT: process.env.SECRET_SALT,
        },
        plugins: [
          // Always include SQL plugin for database functionality
          '@elizaos/plugin-sql',
          ...(config.character.plugins || []),
        ],
      };

      // Create runtime without manually specifying adapter - let SQL plugin handle it
      const runtime = new AgentRuntime({
        character: enhancedCharacter,
      });

      // Initialize the runtime - this will trigger SQL plugin initialization
      console.log(chalk.cyan('   Initializing runtime...'));
      await runtime.initialize();

      // Load additional plugins (SQL plugin is already loaded during initialize)
      console.log(chalk.cyan('   Loading additional plugins...'));
      const additionalPlugins = config.plugins.filter(p => p !== '@elizaos/plugin-sql');
      
      for (const pluginName of additionalPlugins) {
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
        
        // Database cleanup is handled by the SQL plugin
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
    
    console.log(chalk.green('✅ Test harness cleanup complete'));
  }
}

export default RuntimeTestHarness; 