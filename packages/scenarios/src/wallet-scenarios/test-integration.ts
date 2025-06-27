#!/usr/bin/env tsx

/**
 * Integration test for wallet scenarios
 * This demonstrates how to use the wallet scenario runner with plugin generation
 */

import { elizaLogger } from '@elizaos/core';
import { WalletScenarioRunner } from './run-wallet-scenarios';

// Mock runtime for testing
class MockRuntime {
  private services: Map<string, any> = new Map();
  
  constructor() {
    // Mock the plugin creation service
    this.services.set('plugin_creation', {
      createPlugin: async (spec: any) => {
        elizaLogger.info(`Mock: Creating plugin ${spec.name}`);
        return `job-${spec.name}-${Date.now()}`;
      },
      getJobStatus: (jobId: string) => ({
        status: 'completed',
        outputPath: `/tmp/plugins/${jobId}`
      })
    });
  }
  
  getService(name: string): any {
    return this.services.get(name);
  }
  
  get agentId(): string {
    return 'test-agent-123';
  }
  
  getSetting(key: string): string | undefined {
    // Mock settings
    const settings: Record<string, string> = {
      ANTHROPIC_API_KEY: 'test-key',
      ETHEREUM_RPC_URL: 'https://sepolia.infura.io/v3/test',
      SOLANA_RPC_URL: 'https://api.testnet.solana.com'
    };
    return settings[key];
  }
}

async function main() {
  elizaLogger.info('🧪 Starting Wallet Scenarios Integration Test');
  
  try {
    // Create mock runtime
    const runtime = new MockRuntime() as any;
    
    // Create wallet scenario runner
    const runner = new WalletScenarioRunner(runtime);
    
    // Test 1: Run with plugin generation
    elizaLogger.info('\n📋 Test 1: Running scenarios with plugin generation');
    await runner.run({
      generatePlugins: true,
      testnet: true,
      scenarioIds: ['wallet-scenario-01'] // Run only the first scenario
    });
    
    // Test 2: Run without plugin generation
    elizaLogger.info('\n📋 Test 2: Running scenarios without plugin generation');
    await runner.run({
      generatePlugins: false,
      testnet: true,
      scenarioIds: ['wallet-scenario-02', 'wallet-scenario-03']
    });
    
    // Test 3: Validate only
    elizaLogger.info('\n📋 Test 3: Validation only mode');
    await runner.run({
      skipValidation: false,
      generatePlugins: false,
      testnet: false
    });
    
    elizaLogger.info('\n✅ Integration tests completed successfully!');
    
  } catch (error) {
    elizaLogger.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

// Instructions for running
if (require.main === module) {
  elizaLogger.info('\n════════════════════════════════════════════════════════════');
  elizaLogger.info('  WALLET SCENARIOS INTEGRATION TEST');
  elizaLogger.info('════════════════════════════════════════════════════════════');
  elizaLogger.info('\nThis test demonstrates how to:');
  elizaLogger.info('1. Generate missing plugins automatically');
  elizaLogger.info('2. Run wallet scenarios on testnet');
  elizaLogger.info('3. Validate scenarios without execution');
  elizaLogger.info('4. Generate comprehensive reports');
  elizaLogger.info('\nTo run with a real agent runtime:');
  elizaLogger.info('1. Import WalletScenarioRunner in your agent');
  elizaLogger.info('2. Pass the agent runtime to the constructor');
  elizaLogger.info('3. Call runner.run() with your desired options');
  elizaLogger.info('════════════════════════════════════════════════════════════\n');
  
  main();
} 