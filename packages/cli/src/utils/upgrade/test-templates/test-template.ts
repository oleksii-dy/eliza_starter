/**
 * DYNAMIC TEST TEMPLATE GENERATOR
 *
 * Responsibilities:
 * - Generate comprehensive ElizaOS V2 test templates dynamically
 * - Handle plugin analysis-based conditional test generation
 * - Provide sophisticated test template with 10-12 comprehensive tests
 * - Single source of truth for all test generation logic
 */

import type { PluginAnalysis } from '../test-generation/types.js';
import { logger } from '@elizaos/core';

/**
 * Template Variables Interface
 */
export interface TestTemplateVariables {
  PLUGIN_NAME: string;
  PLUGIN_NAME_LOWER: string;
  PLUGIN_VARIABLE: string;
  API_KEY_NAME: string;
}

/**
 * ENHANCED: Generate robust template variables that handle edge cases and avoid conflicts
 */
export function generateRobustTemplateVariables(
  pluginName: string,
  packageJson: { name?: string; [key: string]: unknown }
): TestTemplateVariables {
  // ENHANCED: Handle edge cases and invalid inputs
  let normalizedPluginName = pluginName;
  if (!pluginName || typeof pluginName !== 'string') {
    logger.warn('⚠️ Invalid plugin name provided, using fallback');
    normalizedPluginName = packageJson?.name || 'unknown-plugin';
  }

  // Extract clean plugin name from package.json or analysis
  const baseName = extractCleanPluginName(packageJson?.name, normalizedPluginName);

  // ENHANCED: Ensure we have a valid base name
  if (!baseName || baseName.length === 0) {
    logger.warn('⚠️ Could not extract valid plugin name, using fallback');
    const fallbackName = `test-plugin-${Date.now()}`;
    return createTemplateVariables(fallbackName);
  }

  // Generate and validate variable names
  const variables = createTemplateVariables(baseName);

  // Validate generated names
  try {
    validateTemplateVariables(variables);
  } catch (error) {
    logger.warn('⚠️ Template validation failed, using safe fallback:', error);
    // Use safe fallback variables
    return {
      PLUGIN_NAME: 'Test Plugin',
      PLUGIN_NAME_LOWER: 'testplugin',
      PLUGIN_VARIABLE: 'testPlugin',
      API_KEY_NAME: 'TEST_API_KEY',
    };
  }

  return variables;
}

/**
 * Extract clean plugin name handling various package name formats
 */
function extractCleanPluginName(packageName: string | undefined, analysisName: string): string {
  let baseName = packageName || analysisName || 'unknown';

  // Remove common prefixes
  baseName = baseName
    .replace('@elizaos/plugin-', '')
    .replace('@elizaos/', '')
    .replace('plugin-', '')
    .replace('eliza-', '')
    .replace('elizaos-', '');

  // Handle scoped packages
  if (baseName.includes('/')) {
    baseName = baseName.split('/').pop() || baseName;
  }

  // Clean up any remaining special characters but preserve hyphens
  baseName = baseName.replace(/[^a-zA-Z0-9-]/g, '');

  return baseName;
}

/**
 * Create template variables with proper naming conventions
 */
function createTemplateVariables(baseName: string): TestTemplateVariables {
  // Convert to human-readable name
  const humanName = baseName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Create safe camelCase variable name
  const camelCaseName = createSafeCamelCase(baseName);

  // Create environment variable name
  const envVarName = createEnvVarName(baseName);

  return {
    PLUGIN_NAME: humanName,
    PLUGIN_NAME_LOWER: baseName.toLowerCase().replace(/-/g, ''),
    PLUGIN_VARIABLE: `${camelCaseName}Plugin`,
    API_KEY_NAME: envVarName,
  };
}

/**
 * Create safe camelCase identifier that avoids conflicts
 */
function createSafeCamelCase(baseName: string): string {
  const parts = baseName.split('-').filter((part) => part.length > 0);

  if (parts.length === 0) {
    return 'unknown';
  }

  // First part stays lowercase, subsequent parts get capitalized
  const camelCase = parts
    .map((part, index) => {
      if (index === 0) {
        return part.toLowerCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');

  // Ensure it doesn't start with a number
  if (/^\d/.test(camelCase)) {
    return `plugin${camelCase.charAt(0).toUpperCase() + camelCase.slice(1)}`;
  }

  return camelCase;
}

/**
 * Create environment variable name following conventions
 */
function createEnvVarName(baseName: string): string {
  const envName = baseName
    .toUpperCase()
    .replace(/-/g, '_')
    .replace(/[^A-Z0-9_]/g, '');

  // Add API_KEY suffix if not already present
  if (!envName.includes('API_KEY') && !envName.includes('TOKEN')) {
    return `${envName}_API_KEY`;
  }

  return envName;
}

/**
 * Validate template variables to ensure they're safe to use
 */
function validateTemplateVariables(variables: TestTemplateVariables): void {
  const reservedWords = [
    'class',
    'function',
    'import',
    'export',
    'default',
    'const',
    'let',
    'var',
    'if',
    'else',
    'for',
    'while',
    'do',
    'switch',
    'case',
    'break',
    'continue',
    'return',
    'try',
    'catch',
    'finally',
    'throw',
    'new',
    'this',
    'super',
    'extends',
    'implements',
    'interface',
    'enum',
    'type',
    'namespace',
    'test',
    'describe',
    'it',
    'expect',
    'before',
    'after',
    'setup',
    'teardown',
  ];

  // Check plugin variable name
  const varName = variables.PLUGIN_VARIABLE.replace('Plugin', '').toLowerCase();
  if (reservedWords.includes(varName)) {
    throw new Error(`Generated variable name conflicts with reserved word: ${varName}`);
  }

  // Validate identifier format
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(varName)) {
    throw new Error(`Generated variable name is not a valid identifier: ${varName}`);
  }

  // Validate environment variable format
  if (!/^[A-Z][A-Z0-9_]*$/.test(variables.API_KEY_NAME)) {
    throw new Error(`Generated API key name is not valid: ${variables.API_KEY_NAME}`);
  }
}

/**
 * Generate detailed component analysis for the prompt
 */
function generateDetailedComponentAnalysis(analysis: PluginAnalysis): string {
  let componentDetails = '';

  if (analysis.actions.length > 0) {
    componentDetails += `\n**Actions (${analysis.actions.length}):**\n`;
    for (const action of analysis.actions) {
      componentDetails += `- ${action.name}: ${action.description}\n`;
    }
  }

  if (analysis.providers.length > 0) {
    componentDetails += `\n**Providers (${analysis.providers.length}):**\n`;
    for (const provider of analysis.providers) {
      componentDetails += `- ${provider.name}: ${provider.description}\n`;
    }
  }

  if (analysis.services.length > 0) {
    componentDetails += `\n**Services (${analysis.services.length}):**\n`;
    for (const service of analysis.services) {
      componentDetails += `- ${service.name}: ${service.type}\n`;
    }
  }

  return componentDetails;
}

/**
 * Generate test cases for specific components
 */
function generateTestsForComponents(
  analysis: PluginAnalysis,
  templateVars: TestTemplateVariables
): string {
  const tests: string[] = [];

  // Action tests
  if (analysis.actions.length > 0) {
    tests.push(`    {
      name: "Action validation and structure",
      fn: async (runtime: IAgentRuntime) => {
        console.log("⚡ Testing actions...");
        
        const actions = ${templateVars.PLUGIN_VARIABLE}.actions || [];
        for (const action of actions) {
          if (!action.name) throw new Error("Action missing name");
          if (!action.handler) throw new Error("Action missing handler");
          console.log(\`✅ Action \${action.name} structure valid\`);
        }
      },
    }`);
  }

  // Provider tests
  if (analysis.providers.length > 0) {
    tests.push(`    {
      name: "Provider functionality",
      fn: async (runtime: IAgentRuntime) => {
        console.log("📡 Testing providers...");
        
        const providers = ${templateVars.PLUGIN_VARIABLE}.providers || [];
        for (const provider of providers) {
          if (!provider.name) throw new Error("Provider missing name");
          if (!provider.get) throw new Error("Provider missing get method");
          console.log(\`✅ Provider \${provider.name} structure valid\`);
        }
      },
    }`);
  }

  // Service tests
  if (analysis.services.length > 0) {
    tests.push(`    {
      name: "Service initialization",
      fn: async (runtime: IAgentRuntime) => {
        console.log("🔌 Testing services...");
        
        const services = ${templateVars.PLUGIN_VARIABLE}.services || [];
        for (const ServiceClass of services) {
          if (!ServiceClass.serviceType) throw new Error("Service missing serviceType");
          console.log(\`✅ Service \${ServiceClass.serviceType} structure valid\`);
        }
      },
    }`);
  }

  return tests.join(',\n');
}

/**
 * BUILD COMPREHENSIVE TEST GENERATION PROMPT
 *
 * This is the main function that generates the sophisticated dynamic test template
 * based on plugin analysis - moved from context-aware-test-generator.ts
 */
export function buildTestGenerationPrompt(
  analysis: PluginAnalysis,
  templateVars: TestTemplateVariables
): string {
  const componentAnalysis =
    analysis.actions.length > 0 || analysis.providers.length > 0 || analysis.services.length > 0
      ? generateDetailedComponentAnalysis(analysis)
      : 'No specific components detected - will generate basic plugin validation tests.';

  return `# 🚫 CRITICAL: NO VITEST ALLOWED - ELIZAOS ONLY 🚫

⚠️ **ABSOLUTE REQUIREMENTS - READ CAREFULLY:**
- ❌ **NEVER use vitest, jest, or any external test framework**
- ❌ **NEVER import from 'vitest', 'jest', or similar**
- ❌ **NEVER use describe(), it(), expect(), beforeEach(), afterEach()**
- ❌ **NEVER use vi.fn(), jest.fn(), mock(), spy() or similar**
- ✅ **ONLY use ElizaOS native TestSuite interface**
- ✅ **ONLY import from "@elizaos/core"**
- ✅ **ONLY use createMockRuntime() for mocking**

# ElizaOS V2 Plugin Test Generation

## Plugin Information
- **Name**: ${templateVars.PLUGIN_NAME}
- **Variable**: ${templateVars.PLUGIN_VARIABLE}
- **API Key**: ${templateVars.API_KEY_NAME}

## Component Analysis
${componentAnalysis}

## 🎯 REQUIRED OUTPUT FORMAT - ELIZAOS TESTSUITE ONLY

Generate EXACTLY this structure with NO vitest patterns:

\`\`\`typescript
import type {
  IAgentRuntime,
  TestSuite,
  Memory,
  UUID,
  Content,
  HandlerCallback,
  State
} from "@elizaos/core";
import { createMockRuntime } from "./utils.js";
import ${templateVars.PLUGIN_VARIABLE} from "../index.js";

/**
 * ${templateVars.PLUGIN_NAME} Plugin Test Suite
 * ElizaOS V2 Native Testing Framework
 */
export class ${templateVars.PLUGIN_NAME.charAt(0).toUpperCase() + templateVars.PLUGIN_NAME.slice(1).replace(/[^a-zA-Z0-9]/g, '')}TestSuite implements TestSuite {
  name = "${templateVars.PLUGIN_NAME_LOWER}";
  description = "Comprehensive tests for ${templateVars.PLUGIN_NAME} plugin - ElizaOS V2 Architecture";

  tests = [
    {
      name: "Plugin structure validation",
      fn: async (runtime: IAgentRuntime) => {
        console.log("🔍 Testing plugin structure...");
        
        if (!${templateVars.PLUGIN_VARIABLE}) {
          throw new Error("Plugin not exported");
        }
        
        if (!${templateVars.PLUGIN_VARIABLE}.name) {
          throw new Error("Plugin missing name");
        }
        
        console.log("✅ Plugin structure is valid");
      },
    },
    ${generateTestsForComponents(analysis, templateVars)}
  ];
}

export const test: TestSuite = new ${templateVars.PLUGIN_NAME.charAt(0).toUpperCase() + templateVars.PLUGIN_NAME.slice(1).replace(/[^a-zA-Z0-9]/g, '')}TestSuite();
export default test;
\`\`\`

## 🚫 FORBIDDEN PATTERNS (Never use these):
- import { describe, it, expect } from 'vitest'
- import { vi } from 'vitest'
- describe("test name", () => {})
- it("should do something", () => {})
- expect(value).toBe(expected)
- vi.fn(), jest.fn(), mock()
- beforeEach(), afterEach()

## ✅ REQUIRED PATTERNS (Always use these):
- import type { IAgentRuntime, TestSuite } from "@elizaos/core"
- implements TestSuite
- tests = [{ name: "test name", fn: async (runtime: IAgentRuntime) => {} }]
- const mockRuntime = createMockRuntime()
- console.log() for test output
- throw new Error() for test failures

## 🧪 Test Generation Guidelines:
1. **Plugin Structure Tests**: Validate plugin exports and basic structure
2. **Action Tests**: Test each action's validation and handler functions with mock runtime
3. **Provider Tests**: Test provider get() methods with proper context
4. **Service Tests**: Test service initialization and methods if present
5. **Configuration Tests**: Test plugin with various configuration scenarios
6. **Error Handling**: Test plugin behavior with invalid inputs

## 🎭 Mock Runtime Usage:
\`\`\`typescript
const mockRuntime = createMockRuntime();
// Use mockRuntime for all plugin testing
\`\`\`

**GENERATE THE COMPLETE TYPESCRIPT TEST CODE NOW - NO VITEST ALLOWED!**`;
}

/**
 * LEGACY COMPATIBILITY: Simple template variables for backward compatibility
 */
export function getTestTemplateVariables(
  pluginName: string,
  packageJson: { name?: string; [key: string]: unknown }
): TestTemplateVariables {
  return generateRobustTemplateVariables(pluginName, packageJson);
}
