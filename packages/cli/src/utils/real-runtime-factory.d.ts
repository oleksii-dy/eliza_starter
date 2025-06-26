/**
 * Real Runtime Factory for ElizaOS Scenario Testing
 *
 * This factory creates actual IAgentRuntime instances with real database adapters,
 * proper plugin registration, and full service initialization. Used to replace
 * mock runtime implementations for realistic scenario testing.
 */
import { type IAgentRuntime, type Character } from '@elizaos/core';
export interface RealRuntimeConfig {
  /**
   * Character definition for the agent
   */
  character: Character;
  /**
   * Database configuration
   */
  database: {
    type: 'postgres';
    url?: string;
  };
  /**
   * Plugin loading configuration
   */
  plugins: {
    enabled: string[];
    config?: Record<string, any>;
  };
  /**
   * Environment settings
   */
  environment: {
    apiKeys: Record<string, string>;
    settings: Record<string, any>;
  };
  /**
   * Isolation settings for testing
   */
  isolation: {
    uniqueAgentId: boolean;
    isolatedDatabase: boolean;
    cleanupOnStop: boolean;
  };
}
export declare class RealRuntimeFactory {
  private static instances;
  /**
   * Create a real runtime instance with proper initialization
   */
  static createRuntime(config: RealRuntimeConfig): Promise<IAgentRuntime>;
  /**
   * Create database adapter based on configuration
   */
  private static createDatabaseAdapter;
  /**
   * Create PostgreSQL adapter for production testing
   */
  private static createPostgresAdapter;
  /**
   * Create a minimal mock database adapter for fallback testing
   */
  private static createMockDatabaseAdapter;
  /**
   * Setup environment variables and settings for the runtime
   */
  private static setupEnvironment;
  /**
   * Generate a test token for the runtime
   */
  /**
   * Stop and cleanup a runtime instance
   */
  static stopRuntime(runtime: IAgentRuntime): Promise<void>;
  /**
   * Stop all tracked runtime instances
   */
  static stopAllRuntimes(): Promise<void>;
  /**
   * Create a test configuration with sensible defaults
   */
  static createTestConfig(
    character: Character,
    overrides?: Partial<RealRuntimeConfig>
  ): RealRuntimeConfig;
  /**
   * Utility method to create a simple test runtime
   */
  static createTestRuntime(character: Character): Promise<IAgentRuntime>;
}
/**
 * Utility function for quick runtime creation in tests
 */
export declare function createRealRuntime(character: Character): Promise<IAgentRuntime>;
/**
 * Utility function for runtime cleanup in tests
 */
export declare function stopRealRuntime(runtime: IAgentRuntime): Promise<void>;
