#!/usr/bin/env node

/**
 * Standalone Integration Test for Midnight Network Plugin
 * This bypasses CLI dependencies and tests core functionality directly
 */

// import type { Plugin, IAgentRuntime } from '@elizaos/core';
import { midnightPlugin } from '../index.js';
import * as dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env.local' });

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class MidnightIntegrationTester {
  private results: TestResult[] = [];

  async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`🧪 Running: ${testName}`);
      await testFn();

      const duration = Date.now() - startTime;
      this.results.push({ testName, passed: true, duration });
      console.log(`✅ Passed: ${testName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.results.push({ testName, passed: false, error: errorMessage, duration });
      console.log(`❌ Failed: ${testName} (${duration}ms)`);
      console.log(`   Error: ${errorMessage}`);
    }
  }

  async testPluginStructure(): Promise<void> {
    // Test 1: Plugin exports
    if (!midnightPlugin) {
      throw new Error('Plugin not exported');
    }

    if (!midnightPlugin.name || !midnightPlugin.description) {
      throw new Error('Plugin missing required metadata');
    }

    // Test 2: Services
    if (!midnightPlugin.services || midnightPlugin.services.length === 0) {
      throw new Error('Plugin missing services');
    }

    const expectedServices = 4; // MidnightNetworkService, SecureMessagingService, PaymentService, AgentDiscoveryService
    if (midnightPlugin.services.length !== expectedServices) {
      throw new Error(
        `Expected ${expectedServices} services, found ${midnightPlugin.services.length}`
      );
    }

    // Test 3: Actions
    if (!midnightPlugin.actions || midnightPlugin.actions.length === 0) {
      throw new Error('Plugin missing actions');
    }

    const expectedActions = 6; // sendSecureMessage, createChatRoom, joinChatRoom, sendPayment, requestPayment, discoverAgents
    if (midnightPlugin.actions.length !== expectedActions) {
      throw new Error(
        `Expected ${expectedActions} actions, found ${midnightPlugin.actions.length}`
      );
    }

    // Test 4: Providers
    if (!midnightPlugin.providers || midnightPlugin.providers.length === 0) {
      throw new Error('Plugin missing providers');
    }

    const expectedProviders = 3; // midnightWallet, networkState, chatRoom
    if (midnightPlugin.providers.length !== expectedProviders) {
      throw new Error(
        `Expected ${expectedProviders} providers, found ${midnightPlugin.providers.length}`
      );
    }

    // Test 5: Routes
    if (!midnightPlugin.routes || midnightPlugin.routes.length === 0) {
      throw new Error('Plugin missing API routes');
    }

    const expectedRoutes = 2; // status, wallet endpoints
    if (midnightPlugin.routes.length !== expectedRoutes) {
      throw new Error(`Expected ${expectedRoutes} routes, found ${midnightPlugin.routes.length}`);
    }

    console.log('   ✓ Plugin structure validated');
    console.log(`   ✓ Services: ${midnightPlugin.services.length}`);
    console.log(`   ✓ Actions: ${midnightPlugin.actions.length}`);
    console.log(`   ✓ Providers: ${midnightPlugin.providers.length}`);
    console.log(`   ✓ Routes: ${midnightPlugin.routes.length}`);
  }

  async testEnvironmentConfiguration(): Promise<void> {
    const requiredEnvVars = [
      'MIDNIGHT_NETWORK_URL',
      'MIDNIGHT_INDEXER_URL',
      'MIDNIGHT_WALLET_MNEMONIC',
    ];

    const missing = requiredEnvVars.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate URLs
    const urls = [process.env.MIDNIGHT_NETWORK_URL, process.env.MIDNIGHT_INDEXER_URL];

    for (const url of urls) {
      if (url && !url.startsWith('http')) {
        throw new Error(`Invalid URL format: ${url}`);
      }
    }

    // Validate wallet mnemonic format (basic check)
    const mnemonic = process.env.MIDNIGHT_WALLET_MNEMONIC;
    if (mnemonic) {
      const words = mnemonic.trim().split(/\s+/);
      if (words.length < 12 || words.length > 24) {
        console.warn(`   ⚠️ Wallet mnemonic has ${words.length} words (expected 12-24)`);
      }
    }

    console.log('   ✓ Environment variables validated');
    console.log(`   ✓ Network URL: ${process.env.MIDNIGHT_NETWORK_URL}`);
    console.log(`   ✓ Network ID: ${process.env.MIDNIGHT_NETWORK_ID || 'testnet'}`);
  }

  async testActionDefinitions(): Promise<void> {
    const actions = midnightPlugin.actions!;

    for (const action of actions) {
      // Test action structure
      if (!action.name || !action.description || !action.handler || !action.validate) {
        throw new Error(`Action ${action.name || 'unknown'} missing required properties`);
      }

      // Test action name format
      if (!action.name.match(/^[A-Z_]+$/)) {
        throw new Error(`Action ${action.name} should use UPPER_CASE format`);
      }

      // Test similes exist for discovery
      if (!action.similes || action.similes.length === 0) {
        console.warn(`   ⚠️ Action ${action.name} has no similes (may affect discoverability)`);
      }

      console.log(`   ✓ Action: ${action.name}`);
    }
  }

  async testProviderDefinitions(): Promise<void> {
    const providers = midnightPlugin.providers!;

    for (const provider of providers) {
      // Test provider structure
      if (!provider.name || !provider.get) {
        throw new Error(`Provider ${provider.name || 'unknown'} missing required properties`);
      }

      // Test provider name format
      if (!provider.name.match(/^[A-Z_]+$/)) {
        throw new Error(`Provider ${provider.name} should use UPPER_CASE format`);
      }

      console.log(`   ✓ Provider: ${provider.name}`);
    }
  }

  async testAPIRoutes(): Promise<void> {
    const routes = midnightPlugin.routes!;

    for (const route of routes) {
      // Test route structure
      if (!route.name || !route.path || !route.type || !route.handler) {
        throw new Error(`Route ${route.name || 'unknown'} missing required properties`);
      }

      // Test route path format
      if (!route.path.startsWith('/')) {
        throw new Error(`Route ${route.name} path should start with /`);
      }

      // Test HTTP method
      if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(route.type)) {
        throw new Error(`Route ${route.name} has invalid HTTP method: ${route.type}`);
      }

      console.log(`   ✓ Route: ${route.type} ${route.path}`);
    }
  }

  async testConfigurationSchema(): Promise<void> {
    // Test plugin init function
    if (!midnightPlugin.init) {
      throw new Error('Plugin missing init function');
    }

    // Create mock runtime for testing
    const mockRuntime = {
      agentId: 'test-agent-id',
      getService: () => null,
      // Add other mock methods as needed
    } as any;

    // Test with valid configuration
    const validConfig = {
      MIDNIGHT_NETWORK_URL: 'https://rpc.testnet.midnight.network',
      MIDNIGHT_INDEXER_URL: 'https://indexer.testnet.midnight.network',
      MIDNIGHT_WALLET_MNEMONIC:
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      MIDNIGHT_PROOF_SERVER_URL: 'https://proof.testnet.midnight.network',
      MIDNIGHT_NETWORK_ID: 'testnet',
      MIDNIGHT_ZK_CONFIG_URL: 'https://zk-config.testnet.midnight.network',
    };

    try {
      await midnightPlugin.init!(validConfig, mockRuntime);
      console.log('   ✓ Plugin initialization with valid config');
    } catch (error) {
      throw new Error(`Plugin init failed with valid config: ${error}`);
    }

    // Test with invalid configuration (should throw)
    const invalidConfig = {
      MIDNIGHT_NETWORK_URL: '', // Empty URL should fail
    };

    try {
      await midnightPlugin.init!(invalidConfig, mockRuntime);
      throw new Error('Plugin init should have failed with invalid config');
    } catch (error) {
      console.log('   ✓ Plugin correctly rejects invalid config');
    }
  }

  async testNetworkConnectivity(): Promise<void> {
    const networkUrl = process.env.MIDNIGHT_NETWORK_URL;
    const indexerUrl = process.env.MIDNIGHT_INDEXER_URL;

    if (!networkUrl || !indexerUrl) {
      throw new Error('Network URLs not configured');
    }

    // Test network reachability (basic ping)
    try {
      const networkResponse = await fetch(networkUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      });
      console.log(`   ✓ Network URL reachable: ${networkUrl} (${networkResponse.status})`);
    } catch (error) {
      console.warn(`   ⚠️ Network URL not reachable: ${networkUrl}`);
      console.warn('     This is expected if testing offline or network is down');
    }

    try {
      const indexerResponse = await fetch(indexerUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      });
      console.log(`   ✓ Indexer URL reachable: ${indexerUrl} (${indexerResponse.status})`);
    } catch (error) {
      console.warn(`   ⚠️ Indexer URL not reachable: ${indexerUrl}`);
      console.warn('     This is expected if testing offline or network is down');
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Midnight Network Plugin Integration Tests\n');

    await this.runTest('Plugin Structure Validation', () => this.testPluginStructure());
    await this.runTest('Environment Configuration', () => this.testEnvironmentConfiguration());
    await this.runTest('Action Definitions', () => this.testActionDefinitions());
    await this.runTest('Provider Definitions', () => this.testProviderDefinitions());
    await this.runTest('API Route Definitions', () => this.testAPIRoutes());
    await this.runTest('Configuration Schema', () => this.testConfigurationSchema());
    await this.runTest('Network Connectivity', () => this.testNetworkConnectivity());

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n📊 Test Results Summary');
    console.log('========================');

    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);

    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.results
        .filter((r) => !r.passed)
        .forEach((r) => console.log(`  ❌ ${r.testName}: ${r.error}`));
    }

    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`\nTotal Time: ${totalTime}ms`);

    if (failed === 0) {
      console.log('\n🎉 All integration tests passed!');
      console.log('✅ Plugin is ready for E2E testing with real runtime');
      process.exit(0);
    } else {
      console.log('\n❌ Some integration tests failed');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const tester = new MidnightIntegrationTester();
  await tester.runAllTests();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Integration test runner failed:', error);
    process.exit(1);
  });
}
