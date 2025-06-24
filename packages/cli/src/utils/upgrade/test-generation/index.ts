/**
 * TEST GENERATION MODULE - MAIN ENTRY POINT
 *
 * Responsibilities:
 * - Export all test generation components
 * - Provide unified interface for test generation
 * - Maintain backward compatibility with existing code
 * - Export AI-powered test framework components
 */

// Legacy test generation components
export { PluginAnalyzer } from './plugin-analyzer.js';
export { TemplateGenerator } from './template-generator.js';
export { TestValidator } from './test-validator.js';

// AI-Powered Test Framework Components
export { AITestEnvironment } from './ai-test-environment.js';
export { AIMockGenerator } from './ai-mock-generator.js';
export { SelfHealingTestRunner } from './self-healing-test-runner.js';
export { TestFailureAnalyzer } from './test-failure-analyzer.js';

// Re-export types for convenience
export type {
  PluginAnalysis,
  TestTemplateVariables,
  TestGenerationResult,
  // AI-Powered Test Framework Types
  TestFailure,
  FailureAnalysis,
  MockDetails,
  EnvironmentDetails,
  CodeFix,
  TestFix,
  AITestResult,
  TestOptimization,
  AITestConfig,
  MockEvolution,
  MockBehavior,
} from './types.js';
