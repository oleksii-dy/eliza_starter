/**
 * TEST GENERATION TYPE DEFINITIONS
 *
 * Responsibilities:
 * - Interface definitions for plugin analysis
 * - Template variable types
 * - Test generation result types
 */

export interface PluginAnalysis {
  name: string;
  description?: string;
  hasServices: boolean;
  hasActions: boolean;
  hasProviders: boolean;
  hasEvaluators?: boolean;
  hasTests: boolean;
  packageJson?: { name?: string; description?: string; [key: string]: unknown };
  complexity: number | 'low' | 'medium' | 'high';
  services: Array<{
    name: string;
    type: string;
    methods: string[];
    filePath?: string;
    hasStart?: boolean;
    hasStop?: boolean;
    hasServiceType?: boolean;
    complexity?: number;
  }>;
  actions: Array<{
    name: string;
    description: string;
    handler: string;
    filePath?: string;
    hasValidate?: boolean;
    hasHandler?: boolean;
    hasExamples?: boolean;
    validationRules?: string[];
    examples?: string[];
    complexity?: number;
  }>;
  providers: Array<{
    name: string;
    description: string;
    methods: string[];
    filePath?: string;
    hasGet?: boolean;
    dependencies?: string[];
    isAsync?: boolean;
    complexity?: number;
  }>;
  evaluators?: Array<{
    name: string;
    description: string;
    filePath?: string;
    hasHandler?: boolean;
    criteria?: string[];
    complexity?: number;
  }>;
}

export interface TestTemplateVariables {
  PLUGIN_NAME: string;
  PLUGIN_NAME_LOWER: string;
  PLUGIN_VARIABLE: string;
  API_KEY_NAME: string;
}

export interface TestGenerationResult {
  success: boolean;
  message: string;
  testsGenerated: number;
  buildPassed: boolean;
  testsPassed: boolean;
  iterations: number;
  changes?: string[];
  warnings?: string[];
}

/**
 * AI-POWERED TEST FRAMEWORK TYPE DEFINITIONS
 *
 * Extended types for the enhanced test framework with AI capabilities
 */

/**
 * Test failure details with AI analysis support
 */
export interface TestFailure {
  testName: string;
  errorMessage: string;
  stackTrace?: string;
  errorType: 'import' | 'type' | 'runtime' | 'assertion' | 'timeout' | 'unknown';
  severity: 'critical' | 'high' | 'medium' | 'low';
  filePath: string;
  lineNumber?: number;
  suggestions: string[];
}

/**
 * Comprehensive failure analysis result
 */
export interface FailureAnalysis {
  rootCause: string;
  category: 'dependency' | 'environment' | 'mock' | 'configuration' | 'code';
  confidence: number; // 0-1
  requiredMocks: MockDetails[];
  environmentChanges: EnvironmentDetails[];
  codeFixes: CodeFix[];
  estimatedComplexity: number; // 1-10
}

/**
 * Mock generation details
 */
export interface MockDetails {
  dependency: string;
  expectedBehavior: string;
  interface: string;
  usageContext: string;
  sophisticationLevel: number; // 1-5
  existingFailures: string[];
}

/**
 * Environment configuration details
 */
export interface EnvironmentDetails {
  type: 'variable' | 'dependency' | 'configuration' | 'setup';
  name: string;
  value: string | number | boolean | Record<string, unknown>;
  required: boolean;
  source: 'package.json' | 'env' | 'config' | 'runtime';
}

/**
 * Code fix specification
 */
export interface CodeFix {
  filePath: string;
  type: 'import' | 'type' | 'logic' | 'structure';
  description: string;
  confidence: number; // 0-1
  changes: Array<{
    lineNumber: number;
    oldCode: string;
    newCode: string;
    reason: string;
  }>;
}

/**
 * Test fix result
 */
export interface TestFix {
  success: boolean;
  fixesApplied: number;
  mocksGenerated: number;
  environmentChanges: number;
  remainingIssues: TestFailure[];
  iteration: number;
  confidence: number;
}

/**
 * AI Test Environment execution result
 */
export interface AITestResult {
  success: boolean;
  duration: number; // seconds
  iterations: number;
  fixesApplied: number;
  mocksGenerated: number;
  environmentChanges: number;
  finalScore: number; // 0-100 test health score
  summary: string;
}

/**
 * Test execution optimization data
 */
export interface TestOptimization {
  executionOrder: string[];
  parallelGroups: string[][];
  estimatedDuration: number;
  riskFactors: string[];
  optimizationLevel: number; // 1-5
}

/**
 * Test framework configuration
 */
export interface AITestConfig {
  maxIterations: number;
  maxHealingAttempts: number;
  sophisticationLevel: number;
  enableLearning: boolean;
  enableParallelExecution: boolean;
  timeoutDuration: number; // seconds
  confidenceThreshold: number; // 0-1
}

/**
 * Mock evolution tracking
 */
export interface MockEvolution {
  dependency: string;
  attemptedLevels: number[];
  successfulLevel?: number;
  failureReasons: string[];
  lastSuccess?: MockBehavior;
  usagePatterns: string[];
}

/**
 * Mock behavior specification
 */
export interface MockBehavior {
  inputs: unknown[];
  outputs: unknown[];
  sideEffects: string[];
  timingRequirements: string[];
  stateManagement: boolean;
  errorConditions: string[];
}
