import { IAgentRuntime, elizaLogger } from '@elizaos/core';
import { generateMissingPlugins, checkPluginGenerationStatus } from './generate-missing-plugins';
import { walletScenarios, getMissingPlugins, validateScenario } from './index';
import { ConsolidatedScenarioTestRunner } from '../test-runner';
import { Scenario, ScenarioExecutionResult } from '../types';

interface WalletScenarioRunnerOptions {
  generatePlugins?: boolean;
  scenarioIds?: string[];
  skipValidation?: boolean;
  testnet?: boolean;
}

export class WalletScenarioRunner {
  private runtime: IAgentRuntime;
  private scenarioRunner: ConsolidatedScenarioTestRunner;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
    this.scenarioRunner = new ConsolidatedScenarioTestRunner();
  }

  async run(options: WalletScenarioRunnerOptions = {}): Promise<void> {
    const {
      generatePlugins = true,
      scenarioIds,
      skipValidation = false,
      testnet = true
    } = options;

    elizaLogger.info('\n┌═══════════════════════════════════════┐');
    elizaLogger.info('│     WALLET SCENARIOS TEST RUNNER      │');
    elizaLogger.info('└═══════════════════════════════════════┘\n');

    // Step 1: Validate scenarios
    if (!skipValidation) {
      elizaLogger.info('🔍 Validating scenarios...');
      const invalidScenarios: string[] = [];
      
      for (const scenario of walletScenarios) {
        const validation = validateScenario(scenario);
        if (!validation.valid) {
          invalidScenarios.push(scenario.id);
          elizaLogger.error(`❌ Scenario ${scenario.id} validation failed:`, validation.errors);
        }
      }

      if (invalidScenarios.length > 0) {
        throw new Error(`Invalid scenarios found: ${invalidScenarios.join(', ')}`);
      }
      elizaLogger.info('✅ All scenarios validated successfully\n');
    }

    // Step 2: Check for missing plugins
    const missingPlugins = getMissingPlugins();
    elizaLogger.info(`📦 Required plugins: ${missingPlugins.length} missing`);
    
    if (missingPlugins.length > 0) {
      elizaLogger.info('Missing plugins:', missingPlugins);
      
      if (generatePlugins) {
        elizaLogger.info('\n🔨 Generating missing plugins...');
        await this.generateMissingPlugins();
      } else {
        elizaLogger.warn('⚠️ Missing plugins will not be generated. Scenarios may fail.');
      }
    }

    // Step 3: Configure for testnet
    if (testnet) {
      await this.configureTestnetEnvironment();
    }

    // Step 4: Run scenarios
    const scenariosToRun = scenarioIds 
      ? walletScenarios.filter(s => scenarioIds.includes(s.id))
      : walletScenarios;

    elizaLogger.info(`\n🚀 Running ${scenariosToRun.length} scenarios...\n`);

    const results = [];
    for (const scenario of scenariosToRun) {
      elizaLogger.info(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      elizaLogger.info(`📋 Running: ${scenario.name}`);
      elizaLogger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      try {
        // Execute single scenario using the test runner
        const testResult = await this.scenarioRunner.runAllScenarios({
          filter: scenario.id,
          continueOnError: false,
          verbose: true
        });
        
        const scenarioResult = testResult.results[0];
        results.push(scenarioResult);
        
        if (scenarioResult.status === 'passed') {
          elizaLogger.info(`✅ Scenario passed: ${scenario.name}`);
        } else {
          elizaLogger.error(`❌ Scenario failed: ${scenario.name}`);
          elizaLogger.error('Failures:', scenarioResult.errors);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        elizaLogger.error(`💥 Scenario crashed: ${scenario.name}`, error);
        results.push({
          scenario: scenario.id,
          status: 'failed',
          duration: 0,
          transcript: [],
          errors: [errorMessage]
        } as ScenarioExecutionResult);
      }
    }

    // Step 5: Generate report
    this.generateReport(results);
  }

  private async generateMissingPlugins(): Promise<void> {
    const jobIds = await generateMissingPlugins(this.runtime);
    
    elizaLogger.info(`\n⏳ Waiting for plugin generation to complete...`);
    
    // Poll for completion
    let allCompleted = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes timeout
    
    while (!allCompleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statuses = await checkPluginGenerationStatus(this.runtime, jobIds);
      const pending = Array.from(statuses.values()).filter(s => 
        s.status === 'pending' || s.status === 'running'
      );
      
      if (pending.length === 0) {
        allCompleted = true;
      } else {
        elizaLogger.info(`⏳ ${pending.length} plugins still generating...`);
      }
      
      attempts++;
    }
    
    // Check final status
    const finalStatuses = await checkPluginGenerationStatus(this.runtime, jobIds);
    const failed = Array.from(finalStatuses.entries()).filter(([_, status]) => 
      status.status === 'failed'
    );
    
    if (failed.length > 0) {
      elizaLogger.error('❌ Some plugins failed to generate:');
      failed.forEach(([name, status]) => {
        elizaLogger.error(`  - ${name}: ${status.error}`);
      });
    } else {
      elizaLogger.info('✅ All plugins generated successfully!');
    }
  }

  private async configureTestnetEnvironment(): Promise<void> {
    elizaLogger.info('🔧 Configuring testnet environment...');
    
    // Set testnet RPC endpoints
    const testnetConfig = {
      // EVM Testnets
      ETHEREUM_RPC_URL: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
      POLYGON_RPC_URL: 'https://rpc-mumbai.maticvigil.com',
      ARBITRUM_RPC_URL: 'https://sepolia-rollup.arbitrum.io/rpc',
      BASE_RPC_URL: 'https://sepolia.base.org',
      
      // Solana Testnet
      SOLANA_RPC_URL: 'https://api.testnet.solana.com',
      
      // Test tokens
      USE_TEST_TOKENS: 'true',
      REQUEST_TEST_TOKENS: 'true'
    };
    
    // Apply configuration
    for (const [key, value] of Object.entries(testnetConfig)) {
      process.env[key] = value;
    }
    
    elizaLogger.info('✅ Testnet configuration applied');
  }

  private generateReport(results: ScenarioExecutionResult[]): void {
    elizaLogger.info('\n┌═══════════════════════════════════════┐');
    elizaLogger.info('│          SCENARIO RESULTS             │');
    elizaLogger.info('└═══════════════════════════════════════┘\n');
    
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const passRate = results.length > 0 ? (passed / results.length * 100).toFixed(1) : 0;
    
    elizaLogger.info(`Total Scenarios: ${results.length}`);
    elizaLogger.info(`✅ Passed: ${passed}`);
    elizaLogger.info(`❌ Failed: ${failed}`);
    elizaLogger.info(`📊 Pass Rate: ${passRate}%`);
    
    if (failed > 0) {
      elizaLogger.info('\n❌ Failed Scenarios:');
      results.filter(r => r.status === 'failed').forEach(result => {
        elizaLogger.info(`  - ${result.scenario}`);
        result.errors?.forEach((error: string) => {
          elizaLogger.info(`    • ${error}`);
        });
      });
    }
    
    // Save detailed report
    const reportPath = './wallet-scenarios-report.json';
    require('fs').writeFileSync(reportPath, JSON.stringify(results, null, 2));
    elizaLogger.info(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// CLI execution
if (require.main === module) {
  (async () => {
    try {
      // This would need to be initialized with a proper runtime
      elizaLogger.info('⚠️ CLI execution requires proper runtime initialization');
      elizaLogger.info('Use this module through the main test runner');
    } catch (error: unknown) {
      elizaLogger.error('Failed to run wallet scenarios:', error);
      process.exit(1);
    }
  })();
} 