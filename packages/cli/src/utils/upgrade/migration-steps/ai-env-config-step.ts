import type Anthropic from '@anthropic-ai/sdk';
import { logger } from '@elizaos/core';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import type { MigrationContext } from '../types.js';
import { AIEnvConfigManager, type EnvConfig, type EnvVar } from '../core/ai-env-config-manager.js';

export interface AIEnvConfigResult {
  success: boolean;
  config?: EnvConfig;
  duration: number;
  iterations: number;
  variablesDetected: number;
  variablesInferred: number;
  validationScore: number;
  errorMessage?: string;
  summary: string;
  details: {
    detectedVariables: string[];
    inferredVariables: string[];
    missingCritical: string[];
    warnings: string[];
    healthScore: number;
  };
}

// Extended migration context for environment config
interface ExtendedMigrationContext extends MigrationContext {
  environmentConfig?: {
    variables: EnvVar[];
    healthScore: number;
    completeness: number;
  };
}

/**
 * AI Environment Configuration Migration Step
 *
 * Integrates the AI-powered environment variable detection and configuration
 * system into the migration pipeline, ensuring 100% environment setup.
 */
export class AIEnvConfigStep {
  readonly name = 'AI Environment Configuration';
  readonly description = 'AI-powered environment variable detection and configuration';
  readonly priority = 5; // High priority - run early in migration

  constructor(private anthropic: Anthropic) {}

  /**
   * Execute the AI environment configuration step
   */
  async execute(context: MigrationContext): Promise<AIEnvConfigResult> {
    const startTime = Date.now();
    logger.info('🤖 Starting AI Environment Configuration step...');
    logger.info(`📁 Repository: ${context.repoPath}`);
    logger.info(`🔧 Plugin: ${context.pluginName}`);

    try {
      // 1. Initialize AI Environment Config Manager
      const configManager = new AIEnvConfigManager(
        context.repoPath,
        context.pluginName,
        this.anthropic
      );

      // 2. Execute perfect configuration process
      const config = await configManager.perfectConfiguration();

      // 3. Apply configuration to environment
      await this.applyConfiguration(config, context as ExtendedMigrationContext);

      // 4. Generate configuration files
      await this.generateConfigFiles(config, context);

      // 5. Validate final configuration
      const finalValidation = await this.validateFinalConfiguration(config, context);

      const duration = Date.now() - startTime;

      // Get current iteration safely
      const currentIteration = this.getCurrentIteration(configManager);

      const result: AIEnvConfigResult = {
        success: true,
        config,
        duration,
        iterations: currentIteration,
        variablesDetected: config.variables.filter((v) => v.source === 'detected').length,
        variablesInferred: config.variables.filter((v) => v.source === 'inferred').length,
        validationScore: config.validation.score,
        summary: `Successfully configured ${config.variables.length} environment variables with ${config.healthScore}/100 health score`,
        details: {
          detectedVariables: config.variables
            .filter((v) => v.source === 'detected')
            .map((v) => v.name),
          inferredVariables: config.variables
            .filter((v) => v.source === 'inferred')
            .map((v) => v.name),
          missingCritical: config.missingCritical,
          warnings: config.warnings,
          healthScore: config.healthScore,
        },
      };

      logger.info('🎉 AI Environment Configuration completed successfully!');
      logger.info(
        `📊 Results: ${result.variablesDetected} detected, ${result.variablesInferred} inferred`
      );
      logger.info(`✅ Health Score: ${result.details.healthScore}/100`);
      logger.info(`⏱️ Duration: ${Math.round(duration / 1000)}s`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('❌ AI Environment Configuration failed:', error);

      return {
        success: false,
        duration,
        iterations: 0,
        variablesDetected: 0,
        variablesInferred: 0,
        validationScore: 0,
        errorMessage,
        summary: `Failed to configure environment: ${errorMessage}`,
        details: {
          detectedVariables: [],
          inferredVariables: [],
          missingCritical: [],
          warnings: [`Configuration failed: ${errorMessage}`],
          healthScore: 0,
        },
      };
    }
  }

  /**
   * Safely get current iteration from config manager
   */
  private getCurrentIteration(configManager: AIEnvConfigManager): number {
    try {
      // Access private property safely
      const manager = configManager as unknown as { currentIteration?: number };
      return manager.currentIteration || 1;
    } catch {
      return 1;
    }
  }

  /**
   * Apply configuration to environment
   */
  private async applyConfiguration(
    config: EnvConfig,
    context: ExtendedMigrationContext
  ): Promise<void> {
    logger.info('🔧 Applying environment configuration...');

    // 1. Update existing environment variables in runtime
    for (const variable of config.variables) {
      if (variable.defaultValue && !process.env[variable.name]) {
        process.env[variable.name] = variable.defaultValue;
        logger.info(`🔧 Set runtime value for ${variable.name}`);
      }
    }

    // 2. Update migration context with environment info
    context.environmentConfig = {
      variables: config.variables,
      healthScore: config.healthScore,
      completeness: config.completeness,
    };

    logger.info(`✅ Applied configuration for ${config.variables.length} variables`);
  }

  /**
   * Generate configuration files
   */
  private async generateConfigFiles(config: EnvConfig, context: MigrationContext): Promise<void> {
    logger.info('📝 Generating environment configuration files...');

    const taskmasterDir = path.join(context.repoPath, '.taskmaster');
    const configDir = path.join(taskmasterDir, 'config');
    const docsDir = path.join(taskmasterDir, 'docs');

    // Ensure directories exist
    await fs.ensureDir(configDir);
    await fs.ensureDir(docsDir);

    // 1. Generate .env.example file
    await this.generateEnvExample(config, context.repoPath);

    // 2. Generate environment configuration documentation
    await this.generateEnvDocumentation(config, docsDir);

    // 3. Generate environment validation script
    await this.generateValidationScript(config, configDir);

    // 4. Update .gitignore if needed
    await this.updateGitignore(context.repoPath);

    logger.info('✅ Generated all configuration files');
  }

  /**
   * Generate .env.example file
   */
  private async generateEnvExample(config: EnvConfig, repoPath: string): Promise<void> {
    const envExamplePath = path.join(repoPath, '.env.example');

    let content = '# Environment Configuration\n';
    content += '# Generated by ElizaOS Plugin Migrator v2\n';
    content += `# Configuration Health Score: ${config.healthScore}/100\n\n`;

    // Group variables by category
    const categories = new Map<string, EnvVar[]>();
    for (const variable of config.variables) {
      const category = variable.category;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      const categoryVars = categories.get(category);
      if (categoryVars) {
        categoryVars.push(variable);
      }
    }

    // Generate content by category
    for (const [category, variables] of categories) {
      content += `# ${category.toUpperCase()} CONFIGURATION\n`;

      for (const variable of variables) {
        content += `# ${variable.description}\n`;

        if (variable.examples && variable.examples.length > 0) {
          content += `# Examples: ${variable.examples.join(', ')}\n`;
        }

        if (variable.required) {
          content += '# REQUIRED\n';
        }

        const value =
          variable.securityLevel === 'secret'
            ? 'your_secret_here'
            : variable.defaultValue || 'your_value_here';

        content += `${variable.name}=${value}\n\n`;
      }
    }

    await fs.writeFile(envExamplePath, content);
    logger.info('📝 Generated .env.example file');
  }

  /**
   * Generate environment documentation
   */
  private async generateEnvDocumentation(config: EnvConfig, docsDir: string): Promise<void> {
    const docPath = path.join(docsDir, 'environment-variables.md');

    let content = '# Environment Variables\n\n';
    content += 'This document describes all environment variables used by this plugin.\n\n';
    content += `**Configuration Health Score:** ${config.healthScore}/100\n`;
    content += `**Total Variables:** ${config.variables.length}\n\n`;

    // Summary table
    content += '## Summary\n\n';
    content += '| Variable | Type | Category | Required | Security Level |\n';
    content += '|----------|------|----------|----------|----------------|\n';

    for (const variable of config.variables) {
      const required = variable.required ? '✅' : '❌';
      content += `| ${variable.name} | ${variable.type} | ${variable.category} | ${required} | ${variable.securityLevel} |\n`;
    }

    content += '\n';

    // Detailed descriptions
    content += '## Detailed Descriptions\n\n';

    const categories = new Map<string, EnvVar[]>();
    for (const variable of config.variables) {
      const category = variable.category;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      const categoryVars = categories.get(category);
      if (categoryVars) {
        categoryVars.push(variable);
      }
    }

    for (const [category, variables] of categories) {
      content += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Configuration\n\n`;

      for (const variable of variables) {
        content += `#### ${variable.name}\n\n`;
        content += `**Description:** ${variable.description}\n\n`;
        content += `**Type:** \`${variable.type}\`\n\n`;
        content += `**Required:** ${variable.required ? 'Yes' : 'No'}\n\n`;
        content += `**Security Level:** ${variable.securityLevel}\n\n`;

        if (variable.defaultValue) {
          content += `**Default Value:** \`${variable.defaultValue}\`\n\n`;
        }

        if (variable.examples && variable.examples.length > 0) {
          content += '**Examples:**\n';
          for (const example of variable.examples) {
            content += `- \`${example}\`\n`;
          }
          content += '\n';
        }

        if (variable.dependencies.length > 0) {
          content += `**Dependencies:** ${variable.dependencies.join(', ')}\n\n`;
        }

        content += '---\n\n';
      }
    }

    await fs.writeFile(docPath, content);
    logger.info('📝 Generated environment documentation');
  }

  /**
   * Generate environment validation script
   */
  private async generateValidationScript(config: EnvConfig, configDir: string): Promise<void> {
    const scriptPath = path.join(configDir, 'validate-env.js');

    const content = `// Environment Validation Script
// Generated by ElizaOS Plugin Migrator v2

const requiredVars = [
${config.variables
  .filter((v) => v.required)
  .map((v) => `  '${v.name}'`)
  .join(',\n')}
];

const optionalVars = [
${config.variables
  .filter((v) => !v.required)
  .map((v) => `  '${v.name}'`)
  .join(',\n')}
];

function validateEnvironment() {
  const missing = [];
  const warnings = [];
  
  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  // Check for potential issues
  for (const varName of optionalVars) {
    if (!process.env[varName]) {
      warnings.push(\`Optional variable \${varName} is not set\`);
    }
  }
  
  // Report results
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    for (const varName of missing) {
      console.error(\`  - \${varName}\`);
    }
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Environment warnings:');
    for (const warning of warnings) {
      console.warn(\`  - \${warning}\`);
    }
  }
  
  console.log('✅ Environment validation passed');
}

if (require.main === module) {
  validateEnvironment();
}

module.exports = { validateEnvironment };
`;

    await fs.writeFile(scriptPath, content);
    logger.info('📝 Generated environment validation script');
  }

  /**
   * Update .gitignore to exclude sensitive files
   */
  private async updateGitignore(repoPath: string): Promise<void> {
    const gitignorePath = path.join(repoPath, '.gitignore');

    const entriesToAdd = ['# Environment files', '.env', '.env.local', '.env.*.local', ''];

    let gitignoreContent = '';

    // Read existing .gitignore if it exists
    if (await fs.pathExists(gitignorePath)) {
      gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    }

    // Check if entries already exist
    let needsUpdate = false;
    for (const entry of entriesToAdd) {
      if (entry && !gitignoreContent.includes(entry)) {
        needsUpdate = true;
        break;
      }
    }

    // Add entries if needed
    if (needsUpdate) {
      if (gitignoreContent && !gitignoreContent.endsWith('\n')) {
        gitignoreContent += '\n';
      }
      gitignoreContent += entriesToAdd.join('\n');

      await fs.writeFile(gitignorePath, gitignoreContent);
      logger.info('📝 Updated .gitignore file');
    }
  }

  /**
   * Validate final configuration
   */
  private async validateFinalConfiguration(
    config: EnvConfig,
    context: MigrationContext
  ): Promise<boolean> {
    logger.info('🔍 Performing final configuration validation...');

    // Check if all critical variables are configured
    const criticalVars = config.variables.filter(
      (v) => v.required && v.securityLevel === 'critical'
    );
    const missingCritical = criticalVars.filter((v) => !v.value && !v.defaultValue);

    if (missingCritical.length > 0) {
      logger.warn(`⚠️ ${missingCritical.length} critical variables still missing values`);
      for (const variable of missingCritical) {
        logger.warn(`  - ${variable.name}: ${variable.description}`);
      }
    }

    // Check overall health score
    if (config.healthScore < 80) {
      logger.warn(`⚠️ Configuration health score is low: ${config.healthScore}/100`);
    }

    // Validation passed if score is above threshold
    const passed = config.healthScore >= 70;

    if (passed) {
      logger.info('✅ Final configuration validation passed');
    } else {
      logger.warn('⚠️ Final configuration validation has concerns but proceeding');
    }

    return passed;
  }

  /**
   * Check if this step should be executed
   */
  shouldExecute(context: MigrationContext): boolean {
    // Always execute for comprehensive environment setup
    return true;
  }

  /**
   * Get step dependencies
   */
  getDependencies(): string[] {
    // Run early in the migration pipeline
    return [];
  }
}

/**
 * Create and execute AI environment configuration step
 */
export async function runAIEnvConfig(
  context: MigrationContext,
  anthropic: Anthropic
): Promise<AIEnvConfigResult> {
  const step = new AIEnvConfigStep(anthropic);
  return await step.execute(context);
}

/**
 * Export the step for use in migration pipeline
 */
export const aiEnvConfigStep = {
  name: 'AI Environment Configuration',
  description: 'AI-powered environment variable detection and configuration',
  priority: 5,
  execute: async (context: MigrationContext, anthropic: Anthropic) => {
    return await runAIEnvConfig(context, anthropic);
  },
  shouldExecute: (context: MigrationContext) => true,
  getDependencies: () => [],
};
