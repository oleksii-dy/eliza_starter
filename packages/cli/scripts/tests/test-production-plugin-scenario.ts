#!/usr/bin/env bun

/**
 * Individual Production Plugin Configuration Scenario Test
 */

import { executeRealScenario } from '../../src/scenario-runner/real-scenario-execution.js';
import { productionPluginConfigurationScenario } from '../../scenarios/plugin-configuration-production-test.js';

async function testProductionPluginConfig() {
  console.log('🔄 Testing Production Plugin Configuration Scenario...');
  
  try {
    const result = await executeRealScenario(productionPluginConfigurationScenario, {
      verbose: false,
      timeout: 180000,
      maxSteps: 15
    });

    console.log(`📊 Result: ${result.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    console.log(`📈 Score: ${result.score.toFixed(3)}`);

    if (result.passed) {
      console.log('✅ Production Plugin Configuration test passed');
      process.exit(0);
    } else {
      console.log('❌ Production Plugin Configuration test failed');
      console.log('Errors:', result.errors);
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Production Plugin Configuration test error:', error);
    process.exit(1);
  }
}

testProductionPluginConfig();
