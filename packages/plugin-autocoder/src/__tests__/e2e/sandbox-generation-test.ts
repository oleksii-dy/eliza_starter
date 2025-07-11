import { CodeGenerationService } from '../../services/CodeGenerationService';
import { elizaLogger } from '@elizaos/core';
import { GitHubService } from '../../services/GitHubService';
import { SecretsManagerService } from '../../services/SecretsManagerService';

// Mock E2B service if not available
let E2BService: any;
try {
  E2BService = require('@elizaos/plugin-e2b').E2BService;
} catch (e) {
  E2BService = class {
    async start() {
      console.log('Mock E2B service started');
    }
    async stop() {
      console.log('Mock E2B service stopped');
    }
  };
}

/**
 * Test the real sandbox-based Claude Code generation
 * This test requires real API keys to run
 */
async function testSandboxGeneration() {
  console.log('🚀 Testing real sandbox-based Claude Code generation...\n');

  // Check for required API keys
  const requiredKeys = ['ANTHROPIC_API_KEY', 'E2B_API_KEY'];
  const missingKeys = requiredKeys.filter((key) => !process.env[key]);

  if (missingKeys.length > 0) {
    console.error('❌ Missing required API keys:', missingKeys.join(', '));
    console.log('\nPlease set the following environment variables:');
    missingKeys.forEach((key) => console.log(`  export ${key}=your_api_key_here`));
    process.exit(1);
  }

  // Create services directly
  const e2bService = new E2BService();

  // Create a mock runtime with required services
  const mockRuntime = {
    agentId: 'test-agent-id',
    getSetting: (key: string) => process.env[key],
    getService: (serviceName: string) => {
      switch (serviceName) {
        case 'e2b':
          return e2bService;
        case 'forms':
          return {
            createForm: async () => ({ id: 'test-form' }),
          } as any;
        default:
          return null;
      }
    },
    logger: elizaLogger,
  } as any;

  try {
    // Initialize services
    const codeGenService = new CodeGenerationService(mockRuntime);
    const githubService = new GitHubService(mockRuntime);
    const secretsManager = new SecretsManagerService(mockRuntime);

    // Start E2B service
    await e2bService.start();
    await githubService.start();
    await secretsManager.start();

    // Set services on the code generation service
    (codeGenService as any).e2bService = e2bService;
    (codeGenService as any).formsService = mockRuntime.getService('forms');
    (codeGenService as any).githubService = githubService;
    (codeGenService as any).secretsManager = secretsManager;

    console.log('✅ Services initialized\n');

    // Test request - create a simple plugin
    const testRequest = {
      projectName: 'hello-world-plugin',
      description: 'A simple ElizaOS plugin that responds to hello messages',
      targetType: 'plugin' as const,
      requirements: [
        'Create a hello action that responds to "hello" messages',
        'Include proper TypeScript types',
        'Add comprehensive tests',
        'Follow ElizaOS plugin best practices',
      ],
      apis: [],
      testScenarios: [
        'Test that the action responds correctly to hello',
        'Test that the plugin loads properly',
      ],
    };

    console.log('📋 Test Request:');
    console.log(`  Project: ${testRequest.projectName}`);
    console.log(`  Type: ${testRequest.targetType}`);
    console.log(`  Description: ${testRequest.description}`);
    console.log(`  Requirements: ${testRequest.requirements.length} items\n`);

    console.log('🏗️ Starting code generation in sandbox...\n');

    // Run the actual generation
    const result = await codeGenService.generateCode(testRequest);

    if (result.success) {
      console.log('✅ Code generation successful!\n');

      console.log('📊 Results:');
      console.log(`  Files generated: ${result.files?.length || 0}`);

      if (result.executionResults) {
        console.log('\n🧪 Quality Checks:');
        console.log(`  Tests: ${result.executionResults.testsPass ? '✅ Pass' : '❌ Fail'}`);
        console.log(`  Build: ${result.executionResults.buildPass ? '✅ Pass' : '❌ Fail'}`);
        console.log(`  Types: ${result.executionResults.typesPass ? '✅ Pass' : '❌ Fail'}`);
        console.log(`  Lint: ${result.executionResults.lintPass ? '✅ Pass' : '❌ Fail'}`);
      }

      if (result.files && result.files.length > 0) {
        console.log('\n📁 Generated Files:');
        result.files.forEach((file) => {
          console.log(`  - ${file.path} (${file.content.length} bytes)`);
        });

        // Show package.json content
        const packageJson = result.files.find((f) => f.path === 'package.json');
        if (packageJson) {
          console.log('\n📦 package.json:');
          console.log('```json');
          console.log(packageJson.content);
          console.log('```');
        }

        // Show main index.ts content
        const indexFile = result.files.find((f) => f.path === 'src/index.ts');
        if (indexFile) {
          console.log('\n📄 src/index.ts:');
          console.log('```typescript');
          console.log(indexFile.content.substring(0, 500) + '...');
          console.log('```');
        }
      }
    } else {
      console.error('❌ Code generation failed!');
      if (result.errors && result.errors.length > 0) {
        console.error('\nErrors:');
        result.errors.forEach((error) => console.error(`  - ${error}`));
      }
    }

    // Clean up
    await e2bService.stop();
    console.log('\n🧹 Cleanup completed');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSandboxGeneration()
    .then(() => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testSandboxGeneration };
