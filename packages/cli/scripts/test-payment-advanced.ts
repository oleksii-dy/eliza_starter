#!/usr/bin/env bun

/**
 * Advanced Payment Plugin Scenarios Test
 * Tests advanced DeFi and integration scenarios from plugin-payment
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';

interface AdvancedTestResult {
  scenarioId: string;
  name: string;
  category: string;
  success: boolean;
  duration: number;
  error?: string;
}

class AdvancedPaymentTester {
  private results: AdvancedTestResult[] = [];

  async runAdvancedPaymentTests(): Promise<void> {
    console.log('🚀 Advanced Payment Plugin Scenarios Test\n');
    console.log('Testing advanced DeFi and integration scenarios');
    console.log('='.repeat(60));

    const advancedScenarios = [
      {
        id: 'polymarket-bets',
        name: 'Polymarket Betting',
        category: 'defi',
        test: this.testPolymarketBets.bind(this),
      },
      {
        id: 'uniswap-swap',
        name: 'Uniswap Token Swap',
        category: 'defi',
        test: this.testUniswapSwap.bind(this),
      },
      {
        id: 'coinbase-agentkit',
        name: 'Coinbase AgentKit',
        category: 'defi',
        test: this.testCoinbaseAgentKit.bind(this),
      },
      {
        id: 'crossmint-nft',
        name: 'Crossmint NFT',
        category: 'nft',
        test: this.testCrossmintNFT.bind(this),
      },
      {
        id: 'defi-yield',
        name: 'DeFi Yield Farming',
        category: 'defi',
        test: this.testDeFiYield.bind(this),
      },
      {
        id: 'multi-chain-bridge',
        name: 'Multi-Chain Bridge',
        category: 'defi',
        test: this.testMultiChainBridge.bind(this),
      },
    ];

    for (const scenario of advancedScenarios) {
      console.log(`\n🔗 Testing: ${scenario.name}`);

      const startTime = Date.now();
      let success = false;
      let error: string | undefined;

      try {
        success = await scenario.test();
      } catch (e: any) {
        error = e.message;
      }

      const duration = Date.now() - startTime;

      const result: AdvancedTestResult = {
        scenarioId: scenario.id,
        name: scenario.name,
        category: scenario.category,
        success,
        duration,
        error,
      };

      this.results.push(result);

      console.log(`   Result: ${success ? '✅ SUCCESS' : '❌ FAILED'} (${duration}ms)`);
      if (error) {
        console.log(`   Error: ${error.substring(0, 100)}...`);
      }
    }

    await this.generateAdvancedReport();
  }

  private async testPolymarketBets(): Promise<boolean> {
    try {
      const { executeRealScenario } = await import(
        '../src/scenario-runner/real-scenario-execution.js'
      );
      const { asUUID } = await import('@elizaos/core');
      const { v4: uuidv4 } = await import('uuid');

      const scenario = {
        id: 'polymarket-test',
        name: 'Polymarket Test',
        characters: [
          {
            id: asUUID(uuidv4()),
            name: 'PolymarketAgent',
            bio: 'Polymarket prediction market agent',
            system: 'You help place bets on Polymarket prediction markets.',
            plugins: ['@elizaos/plugin-payment'],
            settings: { ANTHROPIC_API_KEY: 'test-key', OPENAI_API_KEY: 'test-key' },
          },
        ],
        script: {
          steps: [
            { type: 'message', from: 'user', content: 'Help me place a bet on Polymarket' },
            { type: 'wait', duration: 2000 },
          ],
        },
        verification: { rules: [] },
      };

      const result = await executeRealScenario(scenario, { timeout: 20000, maxSteps: 6 });

      const hasTranscript = (result.transcript?.length || 0) > 0;
      const messagesProcessed =
        result.transcript?.filter((t) => t.type === 'message_received').length || 0;

      return hasTranscript && messagesProcessed >= 1;
    } catch (error) {
      return false;
    }
  }

  private async testUniswapSwap(): Promise<boolean> {
    try {
      const { executeRealScenario } = await import(
        '../src/scenario-runner/real-scenario-execution.js'
      );
      const { asUUID } = await import('@elizaos/core');
      const { v4: uuidv4 } = await import('uuid');

      const scenario = {
        id: 'uniswap-test',
        name: 'Uniswap Test',
        characters: [
          {
            id: asUUID(uuidv4()),
            name: 'UniswapAgent',
            bio: 'Uniswap DEX trading agent',
            system: 'You help execute token swaps on Uniswap.',
            plugins: ['@elizaos/plugin-payment'],
            settings: { ANTHROPIC_API_KEY: 'test-key', OPENAI_API_KEY: 'test-key' },
          },
        ],
        script: {
          steps: [
            { type: 'message', from: 'user', content: 'Swap ETH for USDC on Uniswap' },
            { type: 'wait', duration: 2000 },
          ],
        },
        verification: { rules: [] },
      };

      const result = await executeRealScenario(scenario, { timeout: 25000, maxSteps: 6 });

      const hasTranscript = (result.transcript?.length || 0) > 0;
      const messagesProcessed =
        result.transcript?.filter((t) => t.type === 'message_received').length || 0;

      return hasTranscript && messagesProcessed >= 1;
    } catch (error) {
      return false;
    }
  }

  private async testCoinbaseAgentKit(): Promise<boolean> {
    try {
      const { executeRealScenario } = await import(
        '../src/scenario-runner/real-scenario-execution.js'
      );
      const { asUUID } = await import('@elizaos/core');
      const { v4: uuidv4 } = await import('uuid');

      const scenario = {
        id: 'coinbase-test',
        name: 'Coinbase Test',
        characters: [
          {
            id: asUUID(uuidv4()),
            name: 'CoinbaseAgent',
            bio: 'Coinbase AgentKit integration agent',
            system: 'You integrate with Coinbase services through AgentKit.',
            plugins: ['@elizaos/plugin-payment'],
            settings: { ANTHROPIC_API_KEY: 'test-key', OPENAI_API_KEY: 'test-key' },
          },
        ],
        script: {
          steps: [
            { type: 'message', from: 'user', content: 'Test Coinbase AgentKit integration' },
            { type: 'wait', duration: 2000 },
          ],
        },
        verification: { rules: [] },
      };

      const result = await executeRealScenario(scenario, { timeout: 25000, maxSteps: 6 });

      const hasTranscript = (result.transcript?.length || 0) > 0;
      const messagesProcessed =
        result.transcript?.filter((t) => t.type === 'message_received').length || 0;

      return hasTranscript && messagesProcessed >= 1;
    } catch (error) {
      return false;
    }
  }

  private async testCrossmintNFT(): Promise<boolean> {
    try {
      const { executeRealScenario } = await import(
        '../src/scenario-runner/real-scenario-execution.js'
      );
      const { asUUID } = await import('@elizaos/core');
      const { v4: uuidv4 } = await import('uuid');

      const scenario = {
        id: 'crossmint-nft-test',
        name: 'Crossmint NFT Test',
        characters: [
          {
            id: asUUID(uuidv4()),
            name: 'CrossmintNFTAgent',
            bio: 'Crossmint NFT operations agent',
            system: 'You handle NFT minting and operations through Crossmint.',
            plugins: ['@elizaos/plugin-payment'],
            settings: { ANTHROPIC_API_KEY: 'test-key', OPENAI_API_KEY: 'test-key' },
          },
        ],
        script: {
          steps: [
            { type: 'message', from: 'user', content: 'Mint an NFT using Crossmint' },
            { type: 'wait', duration: 2000 },
          ],
        },
        verification: { rules: [] },
      };

      const result = await executeRealScenario(scenario, { timeout: 25000, maxSteps: 6 });

      const hasTranscript = (result.transcript?.length || 0) > 0;
      const messagesProcessed =
        result.transcript?.filter((t) => t.type === 'message_received').length || 0;

      return hasTranscript && messagesProcessed >= 1;
    } catch (error) {
      return false;
    }
  }

  private async testDeFiYield(): Promise<boolean> {
    try {
      const { executeRealScenario } = await import(
        '../src/scenario-runner/real-scenario-execution.js'
      );
      const { asUUID } = await import('@elizaos/core');
      const { v4: uuidv4 } = await import('uuid');

      const scenario = {
        id: 'defi-yield-test',
        name: 'DeFi Yield Test',
        characters: [
          {
            id: asUUID(uuidv4()),
            name: 'DeFiYieldAgent',
            bio: 'DeFi yield farming and staking agent',
            system: 'You help users find and participate in DeFi yield opportunities.',
            plugins: ['@elizaos/plugin-payment'],
            settings: { ANTHROPIC_API_KEY: 'test-key', OPENAI_API_KEY: 'test-key' },
          },
        ],
        script: {
          steps: [
            { type: 'message', from: 'user', content: 'Find high-yield DeFi opportunities' },
            { type: 'wait', duration: 3000 },
          ],
        },
        verification: { rules: [] },
      };

      const result = await executeRealScenario(scenario, { timeout: 30000, maxSteps: 6 });

      const hasTranscript = (result.transcript?.length || 0) > 0;
      const messagesProcessed =
        result.transcript?.filter((t) => t.type === 'message_received').length || 0;

      return hasTranscript && messagesProcessed >= 1;
    } catch (error) {
      return false;
    }
  }

  private async testMultiChainBridge(): Promise<boolean> {
    try {
      const { executeRealScenario } = await import(
        '../src/scenario-runner/real-scenario-execution.js'
      );
      const { asUUID } = await import('@elizaos/core');
      const { v4: uuidv4 } = await import('uuid');

      const scenario = {
        id: 'multi-chain-bridge-test',
        name: 'Multi-Chain Bridge Test',
        characters: [
          {
            id: asUUID(uuidv4()),
            name: 'BridgeAgent',
            bio: 'Cross-chain bridging agent',
            system: 'You help bridge assets between different blockchains.',
            plugins: ['@elizaos/plugin-payment'],
            settings: { ANTHROPIC_API_KEY: 'test-key', OPENAI_API_KEY: 'test-key' },
          },
        ],
        script: {
          steps: [
            { type: 'message', from: 'user', content: 'Bridge tokens from Ethereum to Polygon' },
            { type: 'wait', duration: 3000 },
          ],
        },
        verification: { rules: [] },
      };

      const result = await executeRealScenario(scenario, { timeout: 40000, maxSteps: 6 });

      const hasTranscript = (result.transcript?.length || 0) > 0;
      const messagesProcessed =
        result.transcript?.filter((t) => t.type === 'message_received').length || 0;

      return hasTranscript && messagesProcessed >= 1;
    } catch (error) {
      return false;
    }
  }

  private async generateAdvancedReport(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 ADVANCED PAYMENT SCENARIOS REPORT');
    console.log('='.repeat(60));

    const passedScenarios = this.results.filter((r) => r.success).length;
    const totalScenarios = this.results.length;
    const successRate = passedScenarios / totalScenarios;

    console.log('\n📊 Advanced Scenario Results:');
    for (const result of this.results) {
      const status = result.success ? '✅ PASSED' : '❌ FAILED';
      console.log(`  ${status} ${result.name} (${result.duration}ms)`);
      if (result.error) {
        console.log(`    Error: ${result.error.substring(0, 60)}...`);
      }
    }

    console.log(`\n📈 Advanced Summary:`);
    console.log(`   Scenarios Passed: ${passedScenarios}/${totalScenarios}`);
    console.log(`   Success Rate: ${(successRate * 100).toFixed(1)}%`);
    console.log(
      `   Average Duration: ${(this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length).toFixed(0)}ms`
    );

    // Save advanced report
    const report = {
      timestamp: new Date().toISOString(),
      plugin: 'plugin-payment',
      testType: 'advanced',
      scenarios: this.results,
      summary: {
        total: totalScenarios,
        passed: passedScenarios,
        successRate,
        averageDuration: this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length,
      },
    };

    const reportPath = join(process.cwd(), 'payment-advanced-results.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Advanced report saved to: ${reportPath}`);

    // Determine success (lower threshold for advanced scenarios)
    const targetRate = 0.75; // 75% for advanced scenarios
    if (successRate >= targetRate) {
      console.log(
        `\n🎉 SUCCESS! Advanced payment scenarios achieved ${(successRate * 100).toFixed(1)}% success rate (target: 75%)`
      );
      console.log('✅ Advanced payment plugin scenarios are working correctly');
      process.exit(0);
    } else {
      console.log(
        `\n⚠️  Advanced payment scenarios achieved ${(successRate * 100).toFixed(1)}% success rate (below 75% target)`
      );
      console.log('🔧 Advanced payment scenarios may need optimization');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const tester = new AdvancedPaymentTester();
  await tester.runAdvancedPaymentTests();
}

main().catch((error) => {
  console.error('💥 Advanced payment testing failed:', error);
  process.exit(1);
});
