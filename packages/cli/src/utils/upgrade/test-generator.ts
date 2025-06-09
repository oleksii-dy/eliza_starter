import { logger } from '@elizaos/core';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { execa } from 'execa';
import type { MigrationContext, StepResult } from './types.js';

export interface TestGenerationResult {
  success: boolean;
  message: string;
  testsGenerated: number;
  buildPassed: boolean;
  testsPassed: boolean;
  iterations: number;
}

/**
 * Enhanced test generator for V2 plugins with iterative testing and fixing
 */
export class TestGenerator {
  private context: MigrationContext;
  private maxIterations = 5;

  constructor(context: MigrationContext) {
    this.context = context;
  }

  /**
   * Generate comprehensive tests with iterative testing and fixing
   */
  async generateComprehensiveTests(): Promise<TestGenerationResult> {
    logger.info('🧪 Starting comprehensive test generation with iterative validation...');

    try {
      // Step 1: Generate initial test files
      const generation = await this.generateInitialTests();
      if (!generation.success) {
        return {
          success: false,
          message: generation.message,
          testsGenerated: 0,
          buildPassed: false,
          testsPassed: false,
          iterations: 0
        };
      }

      // Step 2: Register tests in index.ts
      await this.registerTestsInIndex();

      // Step 3: Iterative testing and fixing
      const validation = await this.iterativeTestingAndFixing();

      return {
        success: validation.success,
        message: validation.message,
        testsGenerated: generation.testsGenerated,
        buildPassed: validation.buildPassed,
        testsPassed: validation.testsPassed,
        iterations: validation.iterations
      };

    } catch (error) {
      logger.error('Failed to generate and validate tests:', error);
      return {
        success: false,
        message: `Test generation failed: ${error instanceof Error ? error.message : String(error)}`,
        testsGenerated: 0,
        buildPassed: false,
        testsPassed: false,
        iterations: 0
      };
    }
  }

  /**
   * Generate initial test files with proper variable substitution
   */
  private async generateInitialTests(): Promise<{ success: boolean; message: string; testsGenerated: number }> {
    try {
      // Import test templates
      const { generateTestContent, UTILS_TS_EXACT_CONTENT } = await import('./test-templates.js');
      
      // Read package.json to get proper plugin info
      const packageJsonPath = path.join(this.context.repoPath, 'package.json');
      const packageJson = await fs.readJson(packageJsonPath);
      
      // Ensure test directory exists
      const testDir = path.join(this.context.repoPath, 'src/test');
      await fs.ensureDir(testDir);
      
      // Create utils.ts (exact content)
      const utilsPath = path.join(testDir, 'utils.ts');
      await fs.writeFile(utilsPath, UTILS_TS_EXACT_CONTENT);
      logger.info('✅ Created src/test/utils.ts');
      
      // Generate dynamic test variables properly
      const testVars = this.generateTestVariables(packageJson);
      logger.info('🔍 Generated test variables:', testVars);
      
      // Generate test content with proper substitution
      let testContent = generateTestContent(this.context.pluginName, packageJson);
      
      // Double-check variable substitution
      testContent = this.validateAndFixVariableSubstitution(testContent, testVars);
      
      // Write test.ts
      const testPath = path.join(testDir, 'test.ts');
      await fs.writeFile(testPath, testContent);
      
      // Count tests
      const testCount = (testContent.match(/name:\s*"/g) || []).length;
      
      logger.info(`✅ Generated ${testCount} tests with proper variable substitution`);
      
      return {
        success: true,
        message: `Generated ${testCount} tests successfully`,
        testsGenerated: testCount
      };
      
    } catch (error) {
      logger.error('Failed to generate initial tests:', error);
      return {
        success: false,
        message: `Initial test generation failed: ${error instanceof Error ? error.message : String(error)}`,
        testsGenerated: 0
      };
    }
  }

  /**
   * Generate proper test variables based on package.json and plugin structure
   */
  private generateTestVariables(packageJson: Record<string, unknown>): {
    PLUGIN_NAME: string;
    PLUGIN_NAME_LOWER: string;
    PLUGIN_VARIABLE: string;
    API_KEY_NAME: string;
  } {
    // Extract plugin name from package.json name field
    const packageName = (packageJson.name as string) || `plugin-${this.context.pluginName}`;
    
    // Clean plugin name extraction
    let cleanPluginName = packageName
      .replace('@elizaos/plugin-', '')
      .replace('@elizaos/', '')
      .replace('plugin-', '');
    
    // Handle special cases
    if (cleanPluginName.includes('-')) {
      cleanPluginName = cleanPluginName.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    } else {
      cleanPluginName = cleanPluginName.charAt(0).toUpperCase() + cleanPluginName.slice(1);
    }

    // Generate variable name (camelCase for import)
    const baseVarName = packageName
      .replace('@elizaos/plugin-', '')
      .replace('@elizaos/', '')
      .replace('plugin-', '')
      .replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
    
    const variableName = `${baseVarName}Plugin`;

    // Generate API key name
    const apiKeyName = `${packageName
      .replace('@elizaos/plugin-', '')
      .replace('@elizaos/', '')
      .replace('plugin-', '')
      .toUpperCase()
      .replace(/-/g, '_')}_API_KEY`;

    const lowerName = packageName
      .replace('@elizaos/plugin-', '')
      .replace('@elizaos/', '')
      .replace('plugin-', '');

    return {
      PLUGIN_NAME: cleanPluginName,
      PLUGIN_NAME_LOWER: lowerName,
      PLUGIN_VARIABLE: variableName,
      API_KEY_NAME: apiKeyName,
    };
  }

  /**
   * Validate and fix variable substitution in generated content
   */
  private validateAndFixVariableSubstitution(content: string, vars: Record<string, string>): string {
    let fixedContent = content;
    
    // Check for any remaining template variables
    const templateVarRegex = /\{\{([^}]+)\}\}/g;
    const remainingVars = content.match(templateVarRegex);
    
    if (remainingVars) {
      logger.warn(`⚠️ Found unsubstituted template variables: ${remainingVars.join(', ')}`);
      
      // Fix remaining substitutions
      for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        fixedContent = fixedContent.replace(regex, value as string);
      }
    }
    
    // Check for obvious syntax errors
    const syntaxIssues = [
      { pattern: /@elizaosPlugins\/\w+/, fix: vars.PLUGIN_VARIABLE },
      { pattern: /@elizaos Plugins\/\w+/, fix: `${vars.PLUGIN_NAME}` },
      { pattern: /import\s+@[^;]+from/, fix: `import ${vars.PLUGIN_VARIABLE} from` },
      { pattern: /export class @[^{]+{/, fix: `export class ${vars.PLUGIN_NAME}TestSuite {` },
    ];
    
    for (const issue of syntaxIssues) {
      if (issue.pattern.test(fixedContent)) {
        logger.warn(`🔧 Fixing syntax issue: ${issue.pattern}`);
        fixedContent = fixedContent.replace(issue.pattern, issue.fix);
      }
    }
    
    return fixedContent;
  }

  /**
   * Register test suite in index.ts
   */
  private async registerTestsInIndex(): Promise<void> {
    const indexPath = path.join(this.context.repoPath, 'src/index.ts');
    
    if (!await fs.pathExists(indexPath)) {
      logger.warn('⚠️ src/index.ts not found, skipping test registration');
      return;
    }
    
    let indexContent = await fs.readFile(indexPath, 'utf-8');
    
    // Check if test import already exists
    if (!indexContent.includes('from "./test/test"') && !indexContent.includes('from \'./test/test\'')) {
      // Add test import
      const importLine = 'import testSuite from "./test/test";';
      
      // Find where to insert the import (after other imports)
      const lines = indexContent.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ') && !lines[i].includes('type')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, importLine);
      } else {
        lines.unshift(importLine);
      }
      
      indexContent = lines.join('\n');
    }
    
    // Check if tests are registered in plugin object
    if (!indexContent.includes('tests:') && !indexContent.includes('tests ')) {
      // Add tests to plugin object
      const pluginObjectRegex = /(export\s+(?:const|default)\s+\w+Plugin\s*[:=]\s*\{[^}]*)(evaluators:\s*\[[^\]]*\],?)([^}]*\})/s;
      const match = indexContent.match(pluginObjectRegex);
      
      if (match) {
        const beforeEvaluators = match[1];
        const evaluatorsLine = match[2];
        const afterEvaluators = match[3];
        
        // Insert tests after evaluators
        const newContent = beforeEvaluators + evaluatorsLine + '\n  tests: [testSuite],' + afterEvaluators;
        indexContent = indexContent.replace(pluginObjectRegex, newContent);
      }
    }
    
    await fs.writeFile(indexPath, indexContent);
    logger.info('✅ Registered test suite in src/index.ts');
  }

  /**
   * Iterative testing and fixing until tests pass
   */
  private async iterativeTestingAndFixing(): Promise<{
    success: boolean;
    message: string;
    buildPassed: boolean;
    testsPassed: boolean;
    iterations: number;
  }> {
    let iteration = 0;
    let buildPassed = false;
    let testsPassed = false;
    let lastError = '';

    while (iteration < this.maxIterations) {
      iteration++;
      logger.info(`🔄 Testing iteration ${iteration}/${this.maxIterations}`);

      // Step 1: Try build
      const buildResult = await this.runBuild();
      if (!buildResult.success) {
        logger.warn(`❌ Build failed on iteration ${iteration}: ${buildResult.message}`);
        await this.fixBuildErrors(buildResult.message);
        continue;
      }
      
      buildPassed = true;
      logger.info(`✅ Build passed on iteration ${iteration}`);

      // Step 2: Try tests
      const testResult = await this.runTests();
      if (!testResult.success) {
        logger.warn(`❌ Tests failed on iteration ${iteration}: ${testResult.message}`);
        await this.fixTestErrors(testResult.message);
        lastError = testResult.message;
        continue;
      }

      testsPassed = true;
      logger.info(`🎉 Both build and tests passed on iteration ${iteration}!`);
      
      return {
        success: true,
        message: `Tests validated successfully after ${iteration} iterations`,
        buildPassed: true,
        testsPassed: true,
        iterations: iteration
      };
    }

    // If we got here, max iterations reached
    return {
      success: false,
      message: `Failed to fix issues after ${this.maxIterations} iterations. Last error: ${lastError}`,
      buildPassed,
      testsPassed,
      iterations: iteration
    };
  }

  /**
   * Run build and capture results
   */
  private async runBuild(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await execa('bun', ['run', 'build'], {
        cwd: this.context.repoPath,
        stdio: 'pipe',
        timeout: 60000
      });
      
      return {
        success: true,
        message: 'Build successful'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.stdout || error.stderr || error.message || 'Build failed'
      };
    }
  }

  /**
   * Run tests and capture results
   */
  private async runTests(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await execa('bun', ['run', 'test'], {
        cwd: this.context.repoPath,
        stdio: 'pipe',
        timeout: 120000
      });
      
      return {
        success: true,
        message: 'Tests passed'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.stdout || error.stderr || error.message || 'Tests failed'
      };
    }
  }

  /**
   * Fix build errors automatically
   */
  private async fixBuildErrors(errorMessage: string): Promise<void> {
    logger.info('🔧 Attempting to fix build errors...');
    
    // Common build error patterns and fixes
    const fixes = [
      {
        pattern: /Cannot find module.*from.*test\/test/,
        action: async () => {
          // Ensure test file exists and is properly formatted
          const testPath = path.join(this.context.repoPath, 'src/test/test.ts');
          if (!await fs.pathExists(testPath)) {
            logger.info('🔧 Regenerating missing test file...');
            await this.generateInitialTests();
          }
        }
      },
      {
        pattern: /Declaration or statement expected|Unexpected token/,
        action: async () => {
          // Fix syntax errors in test file
          const testPath = path.join(this.context.repoPath, 'src/test/test.ts');
          if (await fs.pathExists(testPath)) {
            let content = await fs.readFile(testPath, 'utf-8');
            
            // Fix common syntax issues
            content = content.replace(/@elizaosPlugins\/\w+/g, this.generateTestVariables(this.context.packageJson).PLUGIN_VARIABLE);
            content = content.replace(/@elizaos Plugins\/\w+/g, this.generateTestVariables(this.context.packageJson).PLUGIN_NAME);
            content = content.replace(/import\s+@[^;]+from/g, `import ${this.generateTestVariables(this.context.packageJson).PLUGIN_VARIABLE} from`);
            
            await fs.writeFile(testPath, content);
            logger.info('🔧 Fixed syntax errors in test file');
          }
        }
      },
      {
        pattern: /Type.*has no properties in common with type/,
        action: async () => {
          // Fix type issues by ensuring proper imports
          await this.fixTestImports();
        }
      }
    ];

    for (const fix of fixes) {
      if (fix.pattern.test(errorMessage)) {
        await fix.action();
        break;
      }
    }
  }

  /**
   * Fix test errors automatically
   */
  private async fixTestErrors(errorMessage: string): Promise<void> {
    logger.info('🔧 Attempting to fix test errors...');
    
    const fixes = [
      {
        pattern: /Cannot read properties of undefined/,
        action: async () => {
          // Likely mock runtime issue - regenerate utils.ts
          const { UTILS_TS_EXACT_CONTENT } = await import('./test-templates.js');
          const utilsPath = path.join(this.context.repoPath, 'src/test/utils.ts');
          await fs.writeFile(utilsPath, UTILS_TS_EXACT_CONTENT);
          logger.info('🔧 Regenerated test utils');
        }
      },
      {
        pattern: /Environment variable.*not found|API.*key.*required/,
        action: async () => {
          // Add missing environment variables
          await this.createTestEnvironment(errorMessage);
        }
      },
      {
        pattern: /Expected.*received.*nan|number.*string/,
        action: async () => {
          // Fix Zod coercion issues
          await this.fixZodCoercionIssues();
        }
      }
    ];

    for (const fix of fixes) {
      if (fix.pattern.test(errorMessage)) {
        await fix.action();
        break;
      }
    }
  }

  /**
   * Fix test imports
   */
  private async fixTestImports(): Promise<void> {
    const testPath = path.join(this.context.repoPath, 'src/test/test.ts');
    if (!await fs.pathExists(testPath)) return;

    let content = await fs.readFile(testPath, 'utf-8');
    
    // Fix import statements
    content = content.replace(/import\s+{([^}]+)}\s+from\s+"@elizaos\/core"/g, (match, imports) => {
      const importList = imports.split(',').map((imp: string) => imp.trim());
      const typeImports = [];
      const valueImports = [];
      
      for (const imp of importList) {
        if (imp.includes('type ') || ['ActionExample', 'Content', 'HandlerCallback', 'State', 'TestSuite'].includes(imp)) {
          typeImports.push(imp.replace('type ', ''));
        } else {
          valueImports.push(imp);
        }
      }
      
      let result = '';
      if (valueImports.length > 0) {
        result += `import { ${valueImports.join(', ')} } from "@elizaos/core";\n`;
      }
      if (typeImports.length > 0) {
        result += `import type { ${typeImports.join(', ')} } from "@elizaos/core";`;
      }
      
      return result;
    });
    
    await fs.writeFile(testPath, content);
    logger.info('🔧 Fixed test imports');
  }

  /**
   * Create test environment with required variables
   */
  private async createTestEnvironment(errorMessage: string): Promise<void> {
    const envPath = path.join(this.context.repoPath, '.env');
    let envContent = '';
    
    if (await fs.pathExists(envPath)) {
      envContent = await fs.readFile(envPath, 'utf-8');
    }
    
    // Add OPENAI_API_KEY if missing
    if (!envContent.includes('OPENAI_API_KEY')) {
      envContent += '\nOPENAI_API_KEY=\n';
    }
    
    // Extract plugin-specific API key from error message or test variables
    const testVars = this.generateTestVariables(this.context.packageJson);
    if (!envContent.includes(testVars.API_KEY_NAME)) {
      envContent += `${testVars.API_KEY_NAME}=test-api-key-12345\n`;
    }
    
    await fs.writeFile(envPath, envContent);
    logger.info('🔧 Created/updated .env with required variables');
  }

  /**
   * Fix Zod coercion issues in config files
   */
  private async fixZodCoercionIssues(): Promise<void> {
    const configPath = path.join(this.context.repoPath, 'src/config.ts');
    if (!await fs.pathExists(configPath)) return;

    let content = await fs.readFile(configPath, 'utf-8');
    
    // Replace z.number() with z.coerce.number() for environment variables
    content = content.replace(/z\.number\(\)/g, 'z.coerce.number()');
    content = content.replace(/z\.number\(\)\./g, 'z.coerce.number().');
    
    await fs.writeFile(configPath, content);
    logger.info('🔧 Fixed Zod coercion issues in config');
  }
} 