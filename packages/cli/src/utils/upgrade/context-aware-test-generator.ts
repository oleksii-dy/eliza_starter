import { logger } from '@elizaos/core';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { execa } from 'execa';
import { fileURLToPath } from 'node:url';
import type { MigrationContext, StepResult } from './types.js';

// Setup __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PluginAnalysis {
  name: string;
  description: string;
  hasServices: boolean;
  hasActions: boolean;
  hasProviders: boolean;
  hasEvaluators: boolean;
  services: Array<{
    name: string;
    type: string;
    methods: string[];
  }>;
  actions: Array<{
    name: string;
    description: string;
    handler: string;
  }>;
  providers: Array<{
    name: string;
    description: string;
    methods: string[];
  }>;
  evaluators: Array<{
    name: string;
    description: string;
  }>;
}

export class ContextAwareTestGenerator {
  private context: MigrationContext;
  private repoPath: string;

  constructor(context: MigrationContext) {
    this.context = context;
    this.repoPath = context.repoPath;
  }

  /**
   * Run Claude Code with a specific prompt
   */
  private async runClaudeCodeWithPrompt(prompt: string): Promise<void> {
    if (!this.repoPath) throw new Error('Repository path not set');
    process.chdir(this.repoPath);

    const maxRetries = 3;
    let retryCount = 0;
    let lastError: unknown = null;

    while (retryCount < maxRetries) {
      try {
        logger.info('🤖 Running Claude Code for test generation...');

        await execa(
          'claude',
          [
            '--print',
            '--max-turns',
            '30',
            '--verbose',
            '--model',
            'claude-opus-4-20250514',
            '--dangerously-skip-permissions',
            prompt,
          ],
          {
            stdio: 'inherit',
            cwd: this.repoPath,
            timeout: 15 * 60 * 1000, // 15 minutes
          }
        );

        logger.info('✅ Claude Code test generation completed successfully');
        return; // Success - exit the retry loop
      } catch (error: unknown) {
        lastError = error;
        const err = error as { code?: string; message?: string; stderr?: string };

        if (err.code === 'ENOENT') {
          throw new Error(
            'Claude Code not found! Install with: npm install -g @anthropic-ai/claude-code'
          );
        }

        // Check for rate limiting errors
        const errorMessage = err.message || err.stderr || '';
        const isRateLimitError = 
          errorMessage.includes('rate limit') ||
          errorMessage.includes('429') ||
          errorMessage.includes('too many requests') ||
          errorMessage.includes('quota exceeded');

        if (isRateLimitError && retryCount < maxRetries - 1) {
          retryCount++;
          const waitTime = Math.min(60 * retryCount, 300); // Wait 1-5 minutes
          logger.warn(`⏸️  Rate limit detected. Waiting ${waitTime} seconds before retry ${retryCount}/${maxRetries - 1}...`);
          
          // Show countdown
          for (let i = waitTime; i > 0; i--) {
            process.stdout.write(`\r⏱️  Resuming in ${i} seconds...  `);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          process.stdout.write('\r\n');
          
          logger.info('🔄 Resuming Claude Code test generation...');
          continue; // Retry
        }

        logger.error('❌ Claude Code test generation failed:', err.message);
        throw error;
      }
    }

    // If we exhausted all retries
    throw new Error(`Claude Code test generation failed after ${maxRetries} attempts. Last error: ${(lastError as Error)?.message}`);
  }

  /**
   * Analyze plugin structure to understand what tests are needed
   */
  private async analyzePlugin(): Promise<PluginAnalysis> {
    const analysis: PluginAnalysis = {
      name: this.context.pluginName || 'unknown',
      description: '',
      hasServices: false,
      hasActions: false,
      hasProviders: false,
      hasEvaluators: false,
      services: [],
      actions: [],
      providers: [],
      evaluators: []
    };

    try {
      // Check for services
      const servicesPath = path.join(this.repoPath, 'src', 'services');
      if (await fs.pathExists(servicesPath)) {
        analysis.hasServices = true;
        const serviceFiles = await fs.readdir(servicesPath);
        for (const file of serviceFiles.filter(f => f.endsWith('.ts'))) {
          analysis.services.push({
            name: file.replace('.ts', ''),
            type: 'service',
            methods: [] // Will be filled by Claude analysis
          });
        }
      }

      // Check for actions
      const actionsPath = path.join(this.repoPath, 'src', 'actions');
      if (await fs.pathExists(actionsPath)) {
        analysis.hasActions = true;
        const actionFiles = await fs.readdir(actionsPath);
        for (const file of actionFiles.filter(f => f.endsWith('.ts'))) {
          analysis.actions.push({
            name: file.replace('.ts', ''),
            description: '',
            handler: ''
          });
        }
      }

      // Check for providers
      const providersPath = path.join(this.repoPath, 'src', 'providers');
      if (await fs.pathExists(providersPath)) {
        analysis.hasProviders = true;
        const providerFiles = await fs.readdir(providersPath);
        for (const file of providerFiles.filter(f => f.endsWith('.ts'))) {
          analysis.providers.push({
            name: file.replace('.ts', ''),
            description: '',
            methods: []
          });
        }
      }

      // Check for evaluators
      const evaluatorsPath = path.join(this.repoPath, 'src', 'evaluators');
      if (await fs.pathExists(evaluatorsPath)) {
        analysis.hasEvaluators = true;
        const evaluatorFiles = await fs.readdir(evaluatorsPath);
        for (const file of evaluatorFiles.filter(f => f.endsWith('.ts'))) {
          analysis.evaluators.push({
            name: file.replace('.ts', ''),
            description: ''
          });
        }
      }

      logger.info(`📊 Plugin Analysis: ${analysis.name}`, {
        services: analysis.services.length,
        actions: analysis.actions.length,
        providers: analysis.providers.length,
        evaluators: analysis.evaluators.length
      });

    } catch (error) {
      logger.warn('⚠️  Could not fully analyze plugin structure:', error);
    }

    return analysis;
  }

  /**
   * Generate comprehensive test suites using Claude
   */
  async generateTestSuites(): Promise<StepResult> {
    try {
      logger.info('🧪 Generating comprehensive test suites using Claude...');

      const analysis = await this.analyzePlugin();

      const testGenerationPrompt = `# Generate Comprehensive ElizaOS V2 Plugin Test Suite

Generate a complete test suite for the "${analysis.name}" plugin using the PROVEN patterns that work in ElizaOS V2.

## 🎯 CRITICAL REQUIREMENTS - USE THESE EXACT PATTERNS:

### Test File Structure (src/test/test.ts - NOT test.test.ts):
\`\`\`typescript
import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { IAgentRuntime, type Memory, type State } from '@elizaos/core';
import { logger } from '@elizaos/core';
import pluginInstance from '../index.js';

// Mock runtime for testing
const mockRuntime: IAgentRuntime = {
  agentId: 'test-agent-id',
  logger,
  // ... other required properties
};

// Test Suite Export (CRITICAL - must match this pattern)
const testSuite = {
  name: "${analysis.name} Plugin Test Suite",
  tests: [
    {
      name: "Plugin Structure Validation",
      test: async () => {
        expect(pluginInstance).toBeDefined();
        expect(pluginInstance.name).toBe("${analysis.name}");
        expect(Array.isArray(pluginInstance.tests)).toBe(true);
      }
    },
    // ... more tests
  ]
};

export default testSuite;
\`\`\`

### Index.ts Integration (CRITICAL - follow exact pattern):
\`\`\`typescript
import testSuite from "./test/test.js";  // ✅ .js extension, NOT test.test.js
import type { Plugin } from "@elizaos/core";

const ${analysis.name}Plugin: Plugin = {
  name: "${analysis.name}",
  description: "Plugin description",
  services: [],
  actions: [],
  providers: [],
  evaluators: [],
  tests: [testSuite],  // ✅ Use testSuite variable
};

export default ${analysis.name}Plugin;
\`\`\`

## 📋 SPECIFIC TESTS TO GENERATE:

Based on the plugin analysis:
${analysis.hasServices ? '- Services: ' + analysis.services.map(s => s.name).join(', ') : ''}
${analysis.hasActions ? '- Actions: ' + analysis.actions.map(a => a.name).join(', ') : ''}
${analysis.hasProviders ? '- Providers: ' + analysis.providers.map(p => p.name).join(', ') : ''}
${analysis.hasEvaluators ? '- Evaluators: ' + analysis.evaluators.map(e => e.name).join(', ') : ''}

## 🔧 INSTRUCTIONS:

1. **Create src/test/test.ts** (NOT test.test.ts) with comprehensive tests for all components
2. **Update src/index.ts** to properly export the test suite
3. **Remove any duplicate/broken test imports** from index.ts
4. **Use .js extensions** for all imports (not .ts)
5. **Follow the EXACT patterns** shown above
6. **Test all plugin components** based on the analysis above
7. **Include error handling tests** for robustness
8. **Add API key validation tests** if applicable

## ✅ SUCCESS CRITERIA:
- File named exactly: src/test/test.ts (NOT test.test.ts)
- No TypeScript errors
- All imports use correct .js extensions
- Test suite exports properly
- Plugin structure is validated
- All components are tested

CRITICAL: The file MUST be named src/test/test.ts - this is the ElizaOS V2 standard.

Generate the complete test suite now using these proven patterns!`;

      await this.runClaudeCodeWithPrompt(testGenerationPrompt);

      return {
        success: true,
        message: '✅ Comprehensive test suites generated successfully using Claude',
        details: {
          hasServices: analysis.hasServices,
          hasActions: analysis.hasActions,
          hasProviders: analysis.hasProviders,
          hasEvaluators: analysis.hasEvaluators,
          totalComponents: analysis.services.length + analysis.actions.length + analysis.providers.length + analysis.evaluators.length
        }
      };

    } catch (error) {
      logger.error('❌ Failed to generate test suites:', error);
      return {
        success: false,
        message: `Failed to generate test suites: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Fix existing broken test imports and structure using Claude
   */
  async fixBrokenTestStructure(): Promise<StepResult> {
    try {
      logger.info('🔧 Fixing broken test structure using Claude...');

      const fixTestStructurePrompt = `# Fix Broken ElizaOS V2 Test Structure

Fix ALL test-related issues in this plugin to match the working patterns.

## 🚨 COMMON ISSUES TO FIX:

### 1. Wrong Import Extensions:
❌ \`import AlloraTestSuite from './test/test.ts'\`
✅ \`import testSuite from "./test/test.js"\`

### 2. Wrong Variable Names:
❌ \`tests: [AlloraTestSuite]\`
✅ \`tests: [testSuite]\`

### 3. Duplicate Imports:
❌ Multiple test imports in index.ts
✅ Single clean import

### 4. Missing Test Export:
❌ No default export from test.ts
✅ \`export default testSuite;\`

## 🎯 INSTRUCTIONS:

1. **Check src/index.ts** for broken test imports
2. **Fix import extensions** (.ts → .js)
3. **Fix variable names** (use \`testSuite\`)
4. **Remove duplicates** and clean up
5. **Ensure src/test/test.ts** exports properly
6. **Validate plugin structure** is correct

## ✅ TARGET PATTERN:

### src/index.ts should look like:
\`\`\`typescript
import testSuite from "./test/test.js";
import type { Plugin } from "@elizaos/core";
// ... other imports

const pluginName: Plugin = {
  name: "plugin-name",
  // ... other properties
  tests: [testSuite],
};

export default pluginName;
\`\`\`

### src/test/test.ts should look like:
\`\`\`typescript
// ... test implementation
const testSuite = {
  name: "Test Suite Name",
  tests: [/* test objects */]
};

export default testSuite;
\`\`\`

Fix all these issues now!`;

      await this.runClaudeCodeWithPrompt(fixTestStructurePrompt);

      return {
        success: true,
        message: '✅ Broken test structure fixed successfully using Claude'
      };

    } catch (error) {
      logger.error('❌ Failed to fix test structure:', error);
      return {
        success: false,
        message: `Failed to fix test structure: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Validate that tests are working correctly
   */
  async validateTests(): Promise<StepResult> {
    try {
      logger.info('🔍 Validating generated tests...');

      const validationPrompt = `# Validate ElizaOS V2 Test Suite

Validate that the test suite is correctly structured and will work without errors.

## 🔍 VALIDATION CHECKLIST:

1. **File Exists**: src/test/test.ts exists
2. **Import Syntax**: All imports use correct syntax and .js extensions
3. **Export Pattern**: Default export matches expected pattern
4. **Index Integration**: src/index.ts properly imports and uses the test suite
5. **TypeScript Compatibility**: No TypeScript errors
6. **Test Structure**: Tests follow the expected object structure

## 🎯 INSTRUCTIONS:

1. **Check all test files** exist and are properly structured
2. **Verify imports** are correct (especially .js extensions)
3. **Validate exports** match the expected patterns
4. **Fix any TypeScript errors** immediately
5. **Ensure consistency** across all files

## ✅ SUCCESS CRITERIA:

- No TypeScript compilation errors
- All imports resolve correctly
- Test suite exports properly
- Plugin loads without errors
- Tests can be executed

If any issues are found, fix them immediately using the proven patterns!`;

      await this.runClaudeCodeWithPrompt(validationPrompt);

      return {
        success: true,
        message: '✅ Test validation completed successfully using Claude'
      };

    } catch (error) {
      logger.error('❌ Test validation failed:', error);
      return {
        success: false,
        message: `Test validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }
}