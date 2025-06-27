#!/usr/bin/env node

/**
 * Simple test to verify AutoCoder scenarios build and load correctly
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testAutocoderScenarios() {
  console.log('🧪 Testing AutoCoder scenarios...');

  try {
    // Test importing the autocoder scenarios
    const scenarios = await import('./src/autocoder-scenarios/index.ts');
    
    console.log('✅ Successfully imported autocoder scenarios');
    
    // Test basic suite
    if (scenarios.autocoderBasicTestSuite) {
      console.log(`✅ Basic test suite loaded: ${scenarios.autocoderBasicTestSuite.scenarios.length} scenarios`);
    } else {
      console.log('❌ Basic test suite not found');
      return false;
    }

    // Test comprehensive benchmarks
    if (scenarios.autocoderComprehensiveBenchmarks) {
      console.log(`✅ Comprehensive benchmarks loaded: ${scenarios.autocoderComprehensiveBenchmarks.scenarios.length} scenarios`);
    } else {
      console.log('❌ Comprehensive benchmarks not found');
      return false;
    }

    // Test swarm coordination
    if (scenarios.autocoderSwarmCoordinationSuite) {
      console.log(`✅ Swarm coordination suite loaded: ${scenarios.autocoderSwarmCoordinationSuite.scenarios.length} scenarios`);
    } else {
      console.log('❌ Swarm coordination suite not found');
      return false;
    }

    // Test artifact management
    if (scenarios.autocoderArtifactManagementSuite) {
      console.log(`✅ Artifact management suite loaded: ${scenarios.autocoderArtifactManagementSuite.scenarios.length} scenarios`);
    } else {
      console.log('❌ Artifact management suite not found');
      return false;
    }

    // Test GitHub integration
    if (scenarios.autocoderGitHubIntegrationSuite) {
      console.log(`✅ GitHub integration suite loaded: ${scenarios.autocoderGitHubIntegrationSuite.scenarios.length} scenarios`);
    } else {
      console.log('❌ GitHub integration suite not found');
      return false;
    }

    // Test runner
    if (scenarios.AutocoderTestRunner) {
      console.log('✅ AutoCoder test runner loaded');
    } else {
      console.log('❌ AutoCoder test runner not found');
      return false;
    }

    // Test main scenarios export
    const mainScenarios = await import('./src/index.ts');
    if (mainScenarios.autocoderScenarios && mainScenarios.autocoderScenarios.length > 0) {
      console.log(`✅ AutoCoder scenarios exported from main index: ${mainScenarios.autocoderScenarios.length} scenarios`);
    } else {
      console.log('❌ AutoCoder scenarios not properly exported from main index');
      return false;
    }

    // Test scenario structure
    const firstScenario = scenarios.autocoderBasicTestSuite.scenarios[0];
    if (firstScenario && firstScenario.id && firstScenario.name && firstScenario.actors && firstScenario.setup && firstScenario.execution && firstScenario.verification) {
      console.log('✅ Scenario structure validation passed');
    } else {
      console.log('❌ Scenario structure validation failed');
      return false;
    }

    console.log('\n🎉 All AutoCoder scenario tests passed!');
    console.log('\n📊 Summary:');
    console.log(`   - Basic Test Suite: ${scenarios.autocoderBasicTestSuite.scenarios.length} scenarios`);
    console.log(`   - Comprehensive Benchmarks: ${scenarios.autocoderComprehensiveBenchmarks.scenarios.length} scenarios`);
    console.log(`   - Swarm Coordination: ${scenarios.autocoderSwarmCoordinationSuite.scenarios.length} scenarios`);
    console.log(`   - Artifact Management: ${scenarios.autocoderArtifactManagementSuite.scenarios.length} scenarios`);
    console.log(`   - GitHub Integration: ${scenarios.autocoderGitHubIntegrationSuite.scenarios.length} scenarios`);
    
    const totalScenarios = scenarios.autocoderBasicTestSuite.scenarios.length +
                          scenarios.autocoderComprehensiveBenchmarks.scenarios.length +
                          scenarios.autocoderSwarmCoordinationSuite.scenarios.length +
                          scenarios.autocoderArtifactManagementSuite.scenarios.length +
                          scenarios.autocoderGitHubIntegrationSuite.scenarios.length;
    
    console.log(`   - Total AutoCoder Scenarios: ${totalScenarios}`);

    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test
testAutocoderScenarios().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test crashed:', error);
  process.exit(1);
});