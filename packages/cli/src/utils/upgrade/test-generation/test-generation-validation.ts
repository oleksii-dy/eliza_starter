/**
 * ELIZAOS TEST GENERATION VALIDATION SCRIPT
 *
 * This script validates that our ElizaOS test generation fixes work correctly
 * by running comprehensive tests on the test generation system.
 */

import { logger } from '@elizaos/core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AITestEnvironment } from './ai-test-environment.js';
import {
  buildTestGenerationPrompt,
  generateRobustTemplateVariables,
} from '../test-templates/test-template.js';
import { UTILS_TS_EXACT_CONTENT } from '../test-templates/utils-template.js';
import type { PluginAnalysis } from './types.js';
import type { MigrationContext } from '../types.js';

/**
 * Sample plugin analysis for testing
 */
const SAMPLE_PLUGIN_ANALYSIS: PluginAnalysis = {
  name: 'sample-test-plugin',
  description: 'A sample plugin for testing ElizaOS test generation',
  hasActions: true,
  hasProviders: true,
  hasServices: false,
  hasTests: false,
  complexity: 'medium',
  packageJson: { name: '@elizaos/plugin-sample-test' },
  services: [],
  actions: [
    {
      name: 'testAction',
      description: 'A test action for validation',
      handler: 'testActionHandler',
      hasValidation: true,
      hasExamples: true,
      complexity: 3,
    },
  ],
  providers: [
    {
      name: 'testProvider',
      description: 'A test provider for validation',
      hasGet: true,
      complexity: 2,
    },
  ],
  evaluators: [],
  dependencies: [],
};

/**
 * Create mock migration context for testing
 */
function createMockMigrationContext(): MigrationContext {
  return {
    repoPath: os.tmpdir(),
    pluginName: 'sample-test-plugin',
    hasService: false,
    hasProviders: true,
    hasActions: true,
    hasTests: false,
    packageJson: SAMPLE_PLUGIN_ANALYSIS.packageJson,
    existingFiles: [],
    changedFiles: new Set<string>(),
    claudePrompts: new Map<string, string>(),
  };
}

/**
 * Validation test result interface
 */
interface ValidationResult {
  testName: string;
  success: boolean;
  message: string;
  details?: string[];
  error?: Error;
}

/**
 * Test result summary
 */
interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: ValidationResult[];
  overallSuccess: boolean;
}

/**
 * Run comprehensive ElizaOS test generation validation
 */
export async function runElizaOSTestGenerationValidation(): Promise<TestSummary> {
  logger.info('🧪 Starting ElizaOS Test Generation Validation...');

  const tests: Array<() => Promise<ValidationResult>> = [
    testTemplateVariableGeneration,
    testPromptBuilding,
    testUtilsTemplateContent,
    testFallbackGeneration,
    testEmergencyGeneration,
    testCodeValidation,
    testEdgeCases,
  ];

  const results: ValidationResult[] = [];

  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);

      if (result.success) {
        logger.info(`✅ ${result.testName}: ${result.message}`);
      } else {
        logger.error(`❌ ${result.testName}: ${result.message}`);
        if (result.error) {
          logger.error('Error details:', result.error);
        }
      }
    } catch (error) {
      logger.error(`💥 Test crashed: ${error}`);
      results.push({
        testName: 'Unknown test',
        success: false,
        message: `Test crashed: ${error}`,
        error: error as Error,
      });
    }
  }

  const passedTests = results.filter((r) => r.success).length;
  const failedTests = results.filter((r) => !r.success).length;
  const overallSuccess = failedTests === 0;

  const summary: TestSummary = {
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
    overallSuccess,
  };

  logger.info(`📊 Test Summary: ${passedTests}/${results.length} tests passed`);

  if (overallSuccess) {
    logger.info('🎉 All ElizaOS test generation validation tests PASSED!');
  } else {
    logger.error(`💥 ${failedTests} tests FAILED. ElizaOS test generation needs fixes.`);
  }

  return summary;
}

/**
 * Test 1: Template variable generation
 */
async function testTemplateVariableGeneration(): Promise<ValidationResult> {
  try {
    // Test normal case
    const variables = generateRobustTemplateVariables('sample-test-plugin', {
      name: '@elizaos/plugin-sample-test',
    });

    if (!variables.PLUGIN_NAME || !variables.PLUGIN_VARIABLE || !variables.API_KEY_NAME) {
      return {
        testName: 'Template Variable Generation',
        success: false,
        message: 'Missing required template variables',
      };
    }

    // Test edge cases
    const fallbackVars = generateRobustTemplateVariables('', {});
    if (!fallbackVars.PLUGIN_NAME) {
      return {
        testName: 'Template Variable Generation',
        success: false,
        message: 'Fallback template variables failed',
      };
    }

    return {
      testName: 'Template Variable Generation',
      success: true,
      message: 'Template variables generated correctly with fallbacks',
    };
  } catch (error) {
    return {
      testName: 'Template Variable Generation',
      success: false,
      message: 'Template variable generation failed',
      error: error as Error,
    };
  }
}

/**
 * Test 2: Prompt building
 */
async function testPromptBuilding(): Promise<ValidationResult> {
  try {
    const templateVars = generateRobustTemplateVariables(
      SAMPLE_PLUGIN_ANALYSIS.name,
      SAMPLE_PLUGIN_ANALYSIS.packageJson
    );

    const prompt = buildTestGenerationPrompt(SAMPLE_PLUGIN_ANALYSIS, templateVars);

    // Check prompt contains essential ElizaOS patterns
    const requiredPatterns = [
      '@elizaos/core',
      'TestSuite',
      'IAgentRuntime',
      'createMockRuntime',
      'testAction',
      'testProvider',
    ];

    const missingPatterns = requiredPatterns.filter((pattern) => !prompt.includes(pattern));

    if (missingPatterns.length > 0) {
      return {
        testName: 'Prompt Building',
        success: false,
        message: `Missing required patterns: ${missingPatterns.join(', ')}`,
      };
    }

    // Ensure no vitest patterns
    const vitestPatterns = ['vi.fn()', 'jest.fn()', 'expect(', 'describe(', 'it('];
    const foundVitestPatterns = vitestPatterns.filter((pattern) => prompt.includes(pattern));

    if (foundVitestPatterns.length > 0) {
      return {
        testName: 'Prompt Building',
        success: false,
        message: `Found vitest patterns (should be removed): ${foundVitestPatterns.join(', ')}`,
      };
    }

    return {
      testName: 'Prompt Building',
      success: true,
      message: 'Prompt contains proper ElizaOS patterns and no vitest patterns',
    };
  } catch (error) {
    return {
      testName: 'Prompt Building',
      success: false,
      message: 'Prompt building failed',
      error: error as Error,
    };
  }
}

/**
 * Test 3: Utils template content
 */
async function testUtilsTemplateContent(): Promise<ValidationResult> {
  try {
    // Check utils template has proper ElizaOS content
    const requiredPatterns = [
      'createMockRuntime',
      'IAgentRuntime',
      '@elizaos/core',
      'agentId',
      'getSetting',
      'messageManager',
    ];

    const missingPatterns = requiredPatterns.filter(
      (pattern) => !UTILS_TS_EXACT_CONTENT.includes(pattern)
    );

    if (missingPatterns.length > 0) {
      return {
        testName: 'Utils Template Content',
        success: false,
        message: `Utils template missing patterns: ${missingPatterns.join(', ')}`,
      };
    }

    return {
      testName: 'Utils Template Content',
      success: true,
      message: 'Utils template contains proper ElizaOS mock implementation',
    };
  } catch (error) {
    return {
      testName: 'Utils Template Content',
      success: false,
      message: 'Utils template validation failed',
      error: error as Error,
    };
  }
}

/**
 * Test 4: Fallback generation
 */
async function testFallbackGeneration(): Promise<ValidationResult> {
  try {
    const context = createMockMigrationContext();
    const aiTestEnv = new AITestEnvironment(context, null as any);

    // Access the private method through any to test fallback
    const fallbackCode = (aiTestEnv as any).generateFallbackElizaOSTest(
      SAMPLE_PLUGIN_ANALYSIS,
      generateRobustTemplateVariables(
        SAMPLE_PLUGIN_ANALYSIS.name,
        SAMPLE_PLUGIN_ANALYSIS.packageJson
      )
    );

    if (!fallbackCode || typeof fallbackCode !== 'string') {
      return {
        testName: 'Fallback Generation',
        success: false,
        message: 'Fallback test generation returned empty or invalid result',
      };
    }

    // Check fallback contains essential patterns
    const requiredPatterns = ['TestSuite', 'tests =', 'IAgentRuntime', '@elizaos/core'];
    const missingPatterns = requiredPatterns.filter((pattern) => !fallbackCode.includes(pattern));

    if (missingPatterns.length > 0) {
      return {
        testName: 'Fallback Generation',
        success: false,
        message: `Fallback missing patterns: ${missingPatterns.join(', ')}`,
      };
    }

    return {
      testName: 'Fallback Generation',
      success: true,
      message: 'Fallback test generation works correctly',
    };
  } catch (error) {
    return {
      testName: 'Fallback Generation',
      success: false,
      message: 'Fallback generation test failed',
      error: error as Error,
    };
  }
}

/**
 * Test 5: Emergency generation
 */
async function testEmergencyGeneration(): Promise<ValidationResult> {
  try {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'elizaos-test-'));
    const context = createMockMigrationContext();
    context.repoPath = tempDir;

    const aiTestEnv = new AITestEnvironment(context, null as any);

    // Access the private method to test emergency generation
    await (aiTestEnv as any).generateEmergencyElizaOSTest();

    // Check files were created
    const testPath = path.join(tempDir, 'src', 'test', 'test.ts');
    const utilsPath = path.join(tempDir, 'src', 'test', 'utils.ts');

    const testExists = await fs
      .access(testPath)
      .then(() => true)
      .catch(() => false);
    const utilsExists = await fs
      .access(utilsPath)
      .then(() => true)
      .catch(() => false);

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });

    if (!testExists || !utilsExists) {
      return {
        testName: 'Emergency Generation',
        success: false,
        message: 'Emergency test files were not created',
      };
    }

    return {
      testName: 'Emergency Generation',
      success: true,
      message: 'Emergency test generation creates proper files',
    };
  } catch (error) {
    return {
      testName: 'Emergency Generation',
      success: false,
      message: 'Emergency generation test failed',
      error: error as Error,
    };
  }
}

/**
 * Test 6: Code validation
 */
async function testCodeValidation(): Promise<ValidationResult> {
  try {
    const context = createMockMigrationContext();
    const aiTestEnv = new AITestEnvironment(context, null as any);

    // Test code with vitest patterns (should be removed)
    const codeWithVitest = `
import { vi } from 'vitest';
import { expect } from 'vitest';
describe('test', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
    `;

    const cleanedCode = (aiTestEnv as any).validateAndCleanTestCode(codeWithVitest);

    // Should not contain vitest patterns anymore
    const vitestPatterns = ['vi.', 'expect(', 'describe(', 'it('];
    const remainingVitest = vitestPatterns.filter((pattern) => cleanedCode.includes(pattern));

    if (remainingVitest.length > 0) {
      return {
        testName: 'Code Validation',
        success: false,
        message: `Code validation failed to remove vitest patterns: ${remainingVitest.join(', ')}`,
      };
    }

    return {
      testName: 'Code Validation',
      success: true,
      message: 'Code validation properly removes vitest patterns',
    };
  } catch (error) {
    return {
      testName: 'Code Validation',
      success: false,
      message: 'Code validation test failed',
      error: error as Error,
    };
  }
}

/**
 * Test 7: Edge cases
 */
async function testEdgeCases(): Promise<ValidationResult> {
  try {
    // Test with malformed plugin analysis
    const malformedAnalysis: PluginAnalysis = {
      name: '',
      description: '',
      hasActions: false,
      hasProviders: false,
      hasServices: false,
      hasTests: false,
      complexity: 0,
      packageJson: {},
      services: [],
      actions: [],
      providers: [],
      evaluators: [],
      dependencies: [],
    };

    const variables = generateRobustTemplateVariables('', {});

    if (!variables.PLUGIN_NAME || !variables.PLUGIN_VARIABLE) {
      return {
        testName: 'Edge Cases',
        success: false,
        message: 'Edge case handling failed for empty inputs',
      };
    }

    const prompt = buildTestGenerationPrompt(malformedAnalysis, variables);

    if (!prompt || prompt.length < 100) {
      return {
        testName: 'Edge Cases',
        success: false,
        message: 'Edge case handling failed for malformed analysis',
      };
    }

    return {
      testName: 'Edge Cases',
      success: true,
      message: 'Edge cases handled properly with fallbacks',
    };
  } catch (error) {
    return {
      testName: 'Edge Cases',
      success: false,
      message: 'Edge cases test failed',
      error: error as Error,
    };
  }
}

// Export validation runner
export default runElizaOSTestGenerationValidation;
