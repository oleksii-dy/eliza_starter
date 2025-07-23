#!/usr/bin/env bun

/**
 * Docker Test Runner for ElizaOS
 * 
 * A simple script to run Docker tests with proper setup and cleanup.
 * This can be expanded as the framework grows.
 */

import { execCommand, cleanupTestContainers, isDockerAvailable, isDockerComposeAvailable } from './utils/docker-test-utils';

interface TestOptions {
  verbose: boolean;
  target?: string;
  cleanup: boolean;
  coverage: boolean;
}

function parseArgs(): TestOptions {
  const args = process.argv.slice(2);
  
  return {
    verbose: args.includes('--verbose') || args.includes('-v'),
    target: args.find(arg => arg.startsWith('--target='))?.split('=')[1],
    cleanup: !args.includes('--no-cleanup'),
    coverage: args.includes('--coverage')
  };
}

function printUsage() {
  console.log(`
🐳 ElizaOS Docker Test Runner

Usage: bun run eliza/docker/tests/run-docker-tests.ts [options]

Options:
  --verbose, -v     Enable verbose output
  --target=<name>   Run tests for specific target (dev, prod, docs)
  --coverage        Run tests with coverage report
  --no-cleanup      Skip cleanup after tests
  --help, -h        Show this help message

Examples:
  bun run eliza/docker/tests/run-docker-tests.ts
  bun run eliza/docker/tests/run-docker-tests.ts --verbose
  bun run eliza/docker/tests/run-docker-tests.ts --target=dev --coverage
`);
}

async function checkPrerequisites(): Promise<boolean> {
  console.log('🔍 Checking prerequisites...');
  
  const dockerAvailable = await isDockerAvailable();
  if (!dockerAvailable) {
    console.error('❌ Docker is not available. Please install Docker and ensure it is running.');
    return false;
  }
  console.log('✅ Docker is available');
  
  const composeAvailable = await isDockerComposeAvailable();
  if (!composeAvailable) {
    console.error('❌ Docker Compose is not available. Please install Docker Compose.');
    return false;
  }
  console.log('✅ Docker Compose is available');
  
  return true;
}

async function runTests(options: TestOptions): Promise<number> {
  try {
    console.log('🧪 Running Docker tests...');
    
    // Set environment variables for tests
    const env = {
      ...process.env,
      TEST_VERBOSE: options.verbose ? 'true' : 'false',
      TEST_TARGET: options.target || '',
    };
    
    // Build test command
    let testCommand = 'bun test eliza/docker/tests/';
    
    if (options.coverage) {
      testCommand += ' --coverage';
    }
    
    if (options.verbose) {
      console.log(`📝 Running: ${testCommand}`);
    }
    
    // Execute tests
    const result = await execCommand(testCommand, 60000); // 60 second timeout
    
    // Output results
    if (result.stdout) {
      console.log(result.stdout);
    }
    
    if (result.stderr) {
      console.error(result.stderr);
    }
    
    if (result.exitCode === 0) {
      console.log('✅ All Docker tests passed!');
    } else {
      console.error('❌ Some Docker tests failed.');
    }
    
    return result.exitCode;
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    return 1;
  }
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return 0;
  }
  
  const options = parseArgs();
  
  console.log('🐳 ElizaOS Docker Test Runner');
  console.log('================================');
  
  // Check prerequisites
  const prerequisitesMet = await checkPrerequisites();
  if (!prerequisitesMet) {
    return 1;
  }
  
  // Run tests
  const exitCode = await runTests(options);
  
  // Cleanup
  if (options.cleanup) {
    console.log('🧹 Cleaning up test containers...');
    await cleanupTestContainers();
    console.log('✨ Cleanup complete');
  }
  
  console.log('📊 Test run complete');
  return exitCode;
}

// Run if called directly
if (import.meta.main) {
  main().then(code => process.exit(code));
}

export { main as runDockerTests, type TestOptions }; 