import { handleError } from '@/src/utils';
import { logger, type IAgentRuntime, type TestSuite } from '@elizaos/core';
import { Command } from 'commander';
import { detectDirectoryType } from '../../utils/directory-detection';
import { loadAndPreparePlugin } from '../start/utils/plugin-utils';
import { createRealRuntime } from '../../utils/real-runtime-factory';

interface PluginTestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
}

interface TestSummary {
  totalSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: PluginTestResult[];
  totalDuration: number;
}

async function runTestSuite(runtime: IAgentRuntime, testSuite: TestSuite): Promise<PluginTestResult[]> {
  const results: PluginTestResult[] = [];
  
  console.log(`\n🧪 Running test suite: ${testSuite.name}`);
  console.log(`   ${testSuite.tests.length} tests to run\n`);

  for (const test of testSuite.tests) {
    const startTime = Date.now();
    console.log(`   ▶ ${test.name}`);
    
    try {
      await test.fn(runtime);
      const duration = Date.now() - startTime;
      console.log(`   ✅ ${test.name} (${duration}ms)`);
      
      results.push({
        suiteName: testSuite.name,
        testName: test.name,
        passed: true,
        duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ ${test.name} (${duration}ms)`);
      console.log(`      Error: ${errorMessage}`);
      
      results.push({
        suiteName: testSuite.name,
        testName: test.name,
        passed: false,
        error: errorMessage,
        duration
      });
    }
  }

  return results;
}

function displayTestSummary(summary: TestSummary): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`Total test suites: ${summary.totalSuites}`);
  console.log(`Total tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passedTests}`);
  console.log(`Failed: ${summary.failedTests}`);
  console.log(`Duration: ${summary.totalDuration}ms`);
  
  if (summary.failedTests > 0) {
    console.log('\n❌ FAILED TESTS:');
    summary.results
      .filter(result => !result.passed)
      .forEach(result => {
        console.log(`   ${result.suiteName} > ${result.testName}`);
        if (result.error) {
          console.log(`     ${result.error}`);
        }
      });
  }
  
  console.log('='.repeat(60));
  
  const successRate = summary.totalTests > 0 ? 
    Math.round((summary.passedTests / summary.totalTests) * 100) : 0;
  
  if (summary.failedTests === 0) {
    console.log(`🎉 All tests passed! (${successRate}%)`);
  } else {
    console.log(`💥 ${summary.failedTests} test(s) failed (${successRate}% passed)`);
  }
}

export const test = new Command()
  .name('test')
  .description('Run tests defined in the current plugin\'s tests array')
  .action(async () => {
    try {
      // Ensure we're in test mode
      process.env.NODE_ENV = 'test';
      process.env.ELIZA_TEST_MODE = 'true';
      
      // Set database type to PGLite for testing
      try {
        const sqlModule = (await import('@elizaos/plugin-sql')) as any;
        if ('setDatabaseType' in sqlModule && typeof sqlModule.setDatabaseType === 'function') {
          sqlModule.setDatabaseType('pglite');
          console.log('✅ Set database type to PGLite for testing');
        }
      } catch (error) {
        console.warn('⚠️  Failed to set database type for testing:', error);
      }
      // Detect the current directory type
      const directoryInfo = detectDirectoryType(process.cwd());
      
      if (directoryInfo.type !== 'elizaos-plugin') {
        console.error('❌ Error: elizaos test must be run from within a plugin directory');
        console.error('   Current directory is not detected as an ElizaOS plugin');
        console.error('   Make sure you are in a plugin directory with a valid package.json');
        process.exit(1);
      }

      if (!directoryInfo.packageName) {
        console.error('❌ Error: Could not determine plugin name from package.json');
        process.exit(1);
      }

      console.log(`🔍 Detected plugin: ${directoryInfo.packageName}`);
      console.log('📦 Loading plugin and preparing runtime...\n');

      // Load the plugin
      const plugin = await loadAndPreparePlugin(directoryInfo.packageName);
      
      if (!plugin) {
        console.error(`❌ Error: Failed to load plugin ${directoryInfo.packageName}`);
        console.error('   Make sure the plugin is built and exports are correct');
        process.exit(1);
      }

      if (!plugin.tests || plugin.tests.length === 0) {
        console.log('⚠️  No tests found in plugin\'s tests array');
        console.log('   Add test suites to the plugin\'s tests property to run tests');
        process.exit(0);
      }

      console.log(`✅ Plugin loaded: ${plugin.name}`);
      console.log(`🧪 Found ${plugin.tests.length} test suite(s)\n`);

      // Create runtime for test execution
      console.log('🚀 Initializing test runtime...');
      
      // Create a simple character for testing with the plugin
      const testCharacter = {
        name: 'TestAgent',
        bio: ['Test agent for running plugin tests'],
        system: 'You are a test agent.',
        plugins: [plugin.name],
        messageExamples: [],
        postExamples: [],
        topics: [],
        knowledge: [],
      };
      
      const runtime = await createRealRuntime(testCharacter);
      console.log('✅ Runtime initialized\n');

      // Run all test suites
      const startTime = Date.now();
      const allResults: PluginTestResult[] = [];
      
      for (const testSuite of plugin.tests) {
        const results = await runTestSuite(runtime, testSuite);
        allResults.push(...results);
      }

      const totalDuration = Date.now() - startTime;

      // Create summary
      const summary: TestSummary = {
        totalSuites: plugin.tests.length,
        totalTests: allResults.length,
        passedTests: allResults.filter(r => r.passed).length,
        failedTests: allResults.filter(r => !r.passed).length,
        results: allResults,
        totalDuration
      };

      // Display results
      displayTestSummary(summary);

      // Exit with appropriate code
      process.exit(summary.failedTests > 0 ? 1 : 0);

    } catch (error) {
      handleError(error);
    }
  });

// Export the command directly for the CLI to pick up
export default test;
