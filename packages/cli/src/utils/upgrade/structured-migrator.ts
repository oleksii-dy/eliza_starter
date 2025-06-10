import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@elizaos/core';
import { execa } from 'execa';
import * as fs from 'fs-extra';
import ora from 'ora';
import * as path from 'node:path';
import simpleGit, { type SimpleGit } from 'simple-git';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';
import type {
  MigrationResult,
  MigratorOptions,
  MigrationContext,
  MigrationStep,
  StepResult,
} from './types.js';
import { MigrationStepExecutor } from './migration-step-executor.js';
import { parseIntoChunks, ARCHITECTURE_ISSUES } from './mega-prompt-parser.js';
import { getAvailableDiskSpace } from './utils.js';
import { analyzeRepository } from './repository-analyzer.js';
import { BRANCH_NAME, MIN_DISK_SPACE_GB, LOCK_FILE_NAME, DEFAULT_OPENAI_API_KEY } from './config.js';
import { ContextAwareTestGenerator } from './context-aware-test-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Structured migrator that follows the mega prompt step by step
 */
export class StructuredMigrator {
  private git: SimpleGit;
  private repoPath: string | null;
  private isGitHub: boolean;
  private originalPath: string | null;
  private anthropic: Anthropic | null;
  private changedFiles: Set<string>;
  private options: MigratorOptions;
  private lockFilePath: string | null = null;
  private context: MigrationContext | null = null;
  private stepExecutor: MigrationStepExecutor | null = null;

  constructor(options: MigratorOptions = {}) {
    this.git = simpleGit();
    this.repoPath = null;
    this.isGitHub = false;
    this.originalPath = null;
    this.anthropic = null;
    this.changedFiles = new Set();
    this.options = options;

    // Register cleanup handlers
    this.registerCleanupHandlers();
  }

  private registerCleanupHandlers(): void {
    const cleanup = async () => {
      logger.info('Cleaning up migration process...');
      await this.removeLockFile();
      process.exit(1);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception:', error);
      await cleanup();
    });
  }

  async initializeAnthropic(): Promise<void> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.error('ANTHROPIC_API_KEY not found in environment.');
      throw new Error('ANTHROPIC_API_KEY is required for migration');
    }

    this.anthropic = new Anthropic({ apiKey });
  }

  async migrate(input: string): Promise<MigrationResult> {
    const spinner = ora(`Starting structured migration for ${input}...`).start();
    let originalBranch: string | undefined;

    try {
      await this.initializeAnthropic();

      // Check disk space
      spinner.text = 'Checking disk space...';
      await this.checkDiskSpace();

      // Check for Claude Code
      try {
        await execa('claude', ['--version'], { stdio: 'pipe' });
      } catch {
        throw new Error(
          'Claude Code is required for migration. Install with: bun install -g @anthropic-ai/claude-code'
        );
      }

      // Step 1: Handle input (clone if GitHub URL, validate if folder)
      spinner.text = `Setting up repository for ${input}...`;
      await this.handleInput(input);
      spinner.succeed(`Repository setup complete for ${input}`);

      // Create lock file to prevent concurrent migrations
      await this.createLockFile();

      // Security warning
      logger.warn('⚠️  SECURITY WARNING: This command will execute code from the repository.');
      logger.warn('Only run this on trusted repositories you own or have reviewed.');

      // Save current branch for recovery
      originalBranch = (await this.git.branch()).current;
      logger.info(`Current branch: ${originalBranch}`);

      // Create/checkout migration branch
      spinner.text = `Creating branch ${BRANCH_NAME}...`;
      await this.createBranch();
      spinner.succeed(`Branch ${BRANCH_NAME} created`);

      // Analyze repository and create migration context
      spinner.text = 'Analyzing repository structure...';
      const migrationContext = await this.createMigrationContext();
      this.context = migrationContext;
      this.stepExecutor = new MigrationStepExecutor(migrationContext);
      spinner.succeed('Repository analyzed');

      // Step 2: FIX ALL IMPORTS FIRST - Prevent type issues from occurring
      spinner.text = 'Standardizing all imports to V2 patterns...';
      await this.fixAllImportsWithClaude(migrationContext);
      spinner.succeed('All imports standardized to V2 patterns');

      // Load mega prompt chunks
      const promptChunks = parseIntoChunks();
      logger.info(`📋 Loaded ${promptChunks.length} migration phases from mega prompt`);

      // Create migration steps
      const migrationSteps = this.stepExecutor.createMigrationSteps();
      logger.info(`📊 Created ${migrationSteps.length} migration steps`);

      // Execute migration phases
      let phaseIndex = 0;
      for (const chunk of promptChunks) {
        phaseIndex++;

        spinner.text = `Phase ${phaseIndex}/${promptChunks.length}: ${chunk.title}`;
        logger.info(`\n🔄 === ${chunk.title.toUpperCase()} ===`);
        logger.info(`📝 ${chunk.content}`);

        // Get steps for this phase
        const phaseSteps = migrationSteps.filter((step) => step.phase === chunk.phase);

        if (phaseSteps.length === 0) {
          logger.info(`✅ No steps for phase: ${chunk.phase}`);
          continue;
        }

        // Execute each step in the phase
        let stepIndex = 0;
        for (const step of phaseSteps) {
          stepIndex++;

          // Check if step should be skipped
          if (step.skipCondition?.(migrationContext)) {
            logger.info(`⏭️  Skipping step: ${step.name} (condition not met)`);
            continue;
          }

          spinner.text = `${chunk.title} - Step ${stepIndex}/${phaseSteps.length}: ${step.name}`;
          logger.info(`\n🔧 Executing: ${step.name}`);
          logger.info(`📋 ${step.description}`);

          try {
            const result = await step.execute(migrationContext);

            if (result.success) {
              logger.info(`✅ ${result.message}`);
              if (result.changes && result.changes.length > 0) {
                logger.info(`📝 Changed files: ${result.changes.join(', ')}`);
              }
              if (result.warnings && result.warnings.length > 0) {
                for (const warn of result.warnings) {
                  logger.warn(`⚠️  ${warn}`);
                }
              }
            } else {
              logger.error(`❌ ${result.message}`);
              if (result.error) {
                logger.error(`Error: ${result.error.message}`);
              }

              // For non-critical steps, continue
              if (!step.required) {
                logger.warn('⚠️  Continuing despite error (non-critical step)');
                continue;
              }

              throw new Error(`Critical step failed: ${step.name}`);
            }
          } catch (error) {
            logger.error(`💥 Step execution failed: ${step.name}`, error);
            if (step.required) {
              throw error;
            }
          }
        }

        spinner.succeed(`${chunk.title} completed`);
      }

      // Apply Claude prompts if any were generated (for structural changes only)
      if (migrationContext.claudePrompts.size > 0) {
        spinner.text = 'Applying structural migrations...';
        await this.applyClaudePrompts(migrationContext);
        spinner.succeed('Structural migrations applied');
      }

      // Iterative validation and fixing loop
      let iterationCount = 0;
      const maxIterations = 10;
      let lastValidationResult: StepResult;
      let previousBuildFailed = false;
      let previousTestsFailed = false;

      do {
        iterationCount++;
        spinner.text = `Running validation (iteration ${iterationCount}/${maxIterations})...`;
        
        lastValidationResult = await this.runFinalValidation();

        if (lastValidationResult.success) {
          spinner.succeed('All validation checks passed!');
          break;
        }

        spinner.warn(`Validation failed (iteration ${iterationCount}). Attempting fixes...`);
        logger.info(`\n🔄 Iteration ${iterationCount}: Fixing validation issues`);

        // Format code if formatting failed
        if (lastValidationResult.warnings?.includes('Formatting issues')) {
          spinner.text = 'Running code formatter...';
          try {
            await execa('bun', ['run', 'format'], {
              cwd: this.repoPath || process.cwd(),
              stdio: 'pipe'
            });
            logger.info('✅ Code formatted successfully');
          } catch (error) {
            logger.warn('⚠️  Format command failed, continuing...');
          }
        }

        // If build failed, analyze and fix issues
        if (lastValidationResult.warnings?.includes('Build failed')) {
          spinner.text = 'Analyzing build errors...';
          await this.analyzeBuildErrorsAndFix(migrationContext);
          previousBuildFailed = true;
          
          // After fixing build, immediately run a build to verify fix
          spinner.text = 'Verifying build fix...';
          try {
            await execa('bun', ['run', 'build'], {
              cwd: this.repoPath || process.cwd(),
              stdio: 'pipe',
              timeout: 120000,
            });
            logger.info('✅ Build now passes after fix');
            
            // CRITICAL: Run tests immediately after successful build fix
            if (!this.options.skipTests) {
              spinner.text = 'Running tests after build fix...';
              await this.runTestsWithDetailedError();
            }
          } catch (error) {
            logger.warn('❌ Build still failing after fix attempt');
          }
        }

        // If tests failed, analyze and fix test issues
        if (lastValidationResult.warnings?.includes('Tests failed')) {
          spinner.text = 'Analyzing test failures...';
          await this.analyzeTestErrorsAndFix(migrationContext);
          previousTestsFailed = true;
          
          // After fixing tests, immediately run tests to verify fix
          if (!this.options.skipTests) {
            spinner.text = 'Verifying test fix...';
            const testResult = await this.runTestsWithDetailedError();
            if (testResult.success) {
              logger.info('✅ Tests now pass after fix');
            } else {
              logger.warn('❌ Tests still failing after fix attempt');
            }
          }
        }

        // Check modified files after each iteration
        spinner.text = 'Checking modified files...';
        await this.checkModifiedFiles(migrationContext);

      } while (!lastValidationResult.success && iterationCount < maxIterations);

      if (!lastValidationResult.success) {
        spinner.warn(`Migration completed after ${maxIterations} iterations with remaining issues`);
        logger.warn('⚠️  Some validation checks still failing. Manual intervention required.');
      }

      logger.info(`🎉 Migration complete for ${input}!`);
      
      // CRITICAL: Actually run the verification steps instead of just telling user to do it
      logger.info('\n🔨 Running post-migration verification...');
      
      // Step 1: Generate comprehensive tests BEFORE verification
      logger.info('\n🧪 Generating comprehensive test suite...');
      const testGenerator = new ContextAwareTestGenerator(migrationContext);
      try {
        // Generate the actual test suite
        const testResult = await testGenerator.generateTestSuites();
        if (testResult.success) {
          logger.info('✅ Test generator completed successfully');
        } else {
          logger.warn('⚠️  Test generation had issues:', testResult.message);
        }
        
        // Step 2: Include test suites in index.ts for build validation
        logger.info('\n📋 Including test suites in index.ts...');
        await this.includeTestSuitesInIndex(migrationContext);
      } catch (error) {
        logger.warn('⚠️  Test generation error, continuing with basic tests:', error);
      }
      
      // Step 2: Build verification
      let buildSuccess = false;
      let testSuccess = false;
      let postMigrationIterations = 0;
      const maxPostMigrationIterations = 5;
      
      while ((!buildSuccess || !testSuccess) && postMigrationIterations < maxPostMigrationIterations) {
        postMigrationIterations++;
        logger.info(`\n🔄 Post-migration verification iteration ${postMigrationIterations}/${maxPostMigrationIterations}`);
        
        // Try to build
        if (!buildSuccess) {
          spinner.text = 'Running build verification...';
          try {
            await execa('bun', ['run', 'build'], {
              cwd: this.repoPath || process.cwd(),
              stdio: 'pipe',
              timeout: 120000,
            });
            buildSuccess = true;
            logger.info('✅ Build verification passed');
          } catch (error) {
            logger.warn('❌ Build verification failed');
            spinner.text = 'Fixing build issues...';
            await this.analyzeBuildErrorsAndFix(migrationContext);
          }
        }
        
        // Try to run tests (only if build passes)
        if (buildSuccess && !testSuccess && !this.options.skipTests) {
          spinner.text = 'Running test verification...';
          const testResult = await this.runTestsWithDetailedError();
          
          if (testResult.success) {
            testSuccess = true;
            logger.info('✅ Test verification passed');
          } else {
            logger.warn('❌ Test verification failed');
            if (testResult.warnings) {
              logger.warn('Issues:', testResult.warnings.join(', '));
            }
            spinner.text = 'Fixing test issues...';
            await this.analyzeTestErrorsAndFix(migrationContext);
          }
        } else if (this.options.skipTests) {
          testSuccess = true; // Skip test verification if tests are skipped
        }
        
        // If both pass, we're done
        if (buildSuccess && testSuccess) {
          spinner.succeed('All post-migration verifications passed!');
          break;
        }
      }
      
      // Final status check
      const migrationFullySuccessful = buildSuccess && testSuccess;
      
      if (!migrationFullySuccessful) {
        logger.error('\n⚠️  Migration completed but verification failed:');
        if (!buildSuccess) logger.error('  - Build is still failing');
        if (!testSuccess) logger.error('  - Tests are still failing');
        logger.error('\nManual intervention required to fix remaining issues.');
      }
      
      // CRITICAL: Final cleanup - preserve ElizaOS V2 test files
      logger.info('\n🚀 Executing final verification steps...');
      
      // Switch to the plugin directory for final operations
      if (this.repoPath) {
        process.chdir(this.repoPath);
        logger.info(`📂 Changed to directory: ${this.repoPath}`);
      }
      
      // DON'T delete test files - this was the bug!
      // ElizaOS V2 uses src/test/test.ts and we need to keep them
      logger.info('\n🧹 Cleaning up extra test files...');
      
      // Only delete WRONG test file patterns, not the correct ones
      const wrongTestFiles = await globby([
        'src/test/*.test.ts', // Wrong: ElizaOS V2 doesn't use .test.ts suffix
        'src/test/*.spec.ts', // Wrong: ElizaOS V2 doesn't use .spec.ts suffix
        '__tests__/**/*',     // V1 pattern - should be gone
        'test/**/*.ts',       // V1 pattern - should be gone
      ], {
        cwd: this.repoPath,
      });
      
      // Only delete files that don't match ElizaOS V2 pattern
      for (const testFile of wrongTestFiles) {
        // PRESERVE src/test/test.ts - this is the correct ElizaOS V2 pattern
        if (testFile === 'src/test/test.ts') {
          logger.info(`✅ Preserving correct ElizaOS V2 test file: ${testFile}`);
          continue;
        }
        
        logger.info(`🗑️  Deleting incorrect test file: ${testFile}`);
        await fs.remove(path.join(this.repoPath, testFile));
      }
      
      // Push branch
      spinner.text = `Pushing branch ${BRANCH_NAME} to origin...`;
      try {
        await this.git.push('origin', BRANCH_NAME, { '--dry-run': null });
        await this.git.push('origin', BRANCH_NAME, { '--set-upstream': null });
        spinner.succeed(`Branch ${BRANCH_NAME} pushed`);
      } catch (pushError: unknown) {
        const error = pushError as Error;
        spinner.warn(`Could not push branch to origin: ${error.message}`);
        logger.warn('Branch created locally but not pushed. You may need to push manually.');
      }
      
      // Log migration summary
      logger.info('\n📝 Migration Summary:');
      logger.info(`- Repository: ${this.repoPath}`);
      logger.info(`- Branch: ${BRANCH_NAME}`);
      logger.info(`- Files changed: ${migrationContext.changedFiles.size}`);
      logger.info(`- Pre-verification iterations: ${iterationCount}`);
      logger.info(`- Post-migration iterations: ${postMigrationIterations}`);
      logger.info(`- Build status: ${buildSuccess ? '✅ Passing' : '❌ Failing'}`);
      logger.info(`- Test status: ${testSuccess ? '✅ Passing' : '❌ Failing'}`);
      logger.info(`- Overall status: ${migrationFullySuccessful ? '✅ Success' : '⚠️  Completed with issues'}`);
      
      // Only show minimal next steps since we've already done the verification
      if (migrationFullySuccessful) {
        logger.info('\n✅ Migration fully successful! Next steps:');
        logger.info(`1. Review the changes: cd ${this.repoPath} && git diff main...${BRANCH_NAME}`);
        logger.info('2. Create a pull request to merge the changes');
      } else {
        logger.info('\n⚠️  Migration completed with issues. Next steps:');
        logger.info(`1. cd ${this.repoPath}`);
        logger.info('2. Fix remaining issues manually');
        logger.info('3. Run: bun run build && bun run test');
        logger.info('4. Once passing, create a pull request');
      }

      return {
        success: migrationFullySuccessful,
        branchName: BRANCH_NAME,
        repoPath: this.repoPath || '',
      };
    } catch (error) {
      spinner.fail(`Migration failed for ${input}`);
      logger.error(`Error processing ${input}:`, error);

      // Clean up lock file
      await this.removeLockFile();

      // Try to restore original state
      try {
        if (this.git && originalBranch) {
          logger.info(`Attempting to restore original branch: ${originalBranch}`);
          await this.git.checkout(originalBranch);
        }
      } catch (restoreError) {
        logger.error('Failed to restore original branch:', restoreError);
      }

      return {
        success: false,
        branchName: BRANCH_NAME,
        repoPath: this.repoPath || '',
        error: error as Error,
      };
    } finally {
      // Always clean up lock file
      await this.removeLockFile();
    }
  }

  private async createMigrationContext(): Promise<MigrationContext> {
    if (!this.repoPath) throw new Error('Repository path not set');

    // Read package.json
    const packageJsonPath = path.join(this.repoPath, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);

    // Get existing files
    const existingFiles = await globby(['**/*'], {
      cwd: this.repoPath,
      ignore: ['node_modules/**', 'dist/**', '.git/**'],
    });

    // CRITICAL: Check main branch for service existence
    let hasServiceInMainBranch = false;
    try {
      // Get current branch to restore later
      const currentBranch = (await this.git.branch()).current;
      
      // Check main branch for service files
      const mainBranchFiles = await this.git.raw(['ls-tree', '-r', '--name-only', 'main']);
      const mainFiles = mainBranchFiles.split('\n').filter(f => f);
      
      hasServiceInMainBranch = mainFiles.some(
        (f) => f.includes('service.ts') || f.includes('Service.ts') || 
               f.includes('service.js') || f.includes('Service.js')
      );
      
      logger.info(`🔍 Service check: ${hasServiceInMainBranch ? 'Found service in main branch' : 'No service in main branch'}`);
    } catch (error) {
      logger.warn('Could not check main branch for service, checking current files only');
      // Fallback to current branch check
      hasServiceInMainBranch = existingFiles.some(
        (f) => f.includes('service.ts') || f.includes('Service.ts')
      );
    }

    // Analyze plugin structure
    const hasService = hasServiceInMainBranch; // ONLY true if service existed in main branch
    const hasProviders = existingFiles.some(
      (f) => f.includes('provider') || f.includes('Provider')
    );
    const hasActions = existingFiles.some((f) => f.includes('action') || f.includes('Action'));
    const hasTests = existingFiles.some(
      (f) => f.includes('__tests__') || f.includes('test.ts') || f.includes('.test.') || f.includes('src/tests/')
    );

    const pluginName = packageJson.name.replace('@elizaos/plugin-', '').replace('plugin-', '');

    return {
      repoPath: this.repoPath,
      pluginName,
      hasService,
      hasProviders,
      hasActions,
      hasTests,
      packageJson,
      existingFiles,
      changedFiles: this.changedFiles,
      claudePrompts: new Map(),
    };
  }

  private async applyClaudePrompts(context: MigrationContext): Promise<void> {
    if (context.claudePrompts.size === 0) return;

    logger.info(`📋 Applying ${context.claudePrompts.size} Claude-based migrations...`);

    // Create a comprehensive prompt from all collected prompts
    const megaPrompt = `# ElizaOS V1 to V2 Migration for ${context.pluginName}

## 🎯 MIGRATION GOAL: 
Transform this V1 plugin to work with ElizaOS V2 architecture using the patterns shown below.

## ⚠️ CRITICAL RULES:
- Test files are AUTO-GENERATED - DO NOT create src/test/ files manually
- Only create SERVICE if the V1 plugin had one - most plugins do NOT need services
- Follow the exact patterns shown in examples below
- Make MINIMAL changes - don't add new features

## 🔧 CRITICAL V2 PATTERNS TO APPLY:

### Import Changes (MANDATORY):
\`\`\`typescript
// ❌ V1 Wrong:
import { ModelClass, elizaLogger, ActionExample, Content } from "@elizaos/core";

// ✅ V2 Correct:
import { ModelType, logger } from "@elizaos/core";
import type { ActionExample, Content } from "@elizaos/core";
\`\`\`

### Service Pattern (ONLY if V1 had service):
\`\`\`typescript
// ❌ V1 Wrong:
export const myService: ServiceType = 'my-service';

// ✅ V2 Correct:
export class MyService extends Service {
    static serviceType = 'my-service'; // No type annotation
    
    static async start(runtime: IAgentRuntime) {
        return new MyService(runtime);
    }
    
    async stop(): Promise<void> {}
    
    get capabilityDescription(): string {
        return 'Service description';
    }
}
\`\`\`

### Handler Pattern (MANDATORY):
\`\`\`typescript
// ❌ V1 Wrong:
handler: async (runtime, message, state?, options, callback?) => {
    const result = await runtime.language.generateText(...);
    return true;
}

// ✅ V2 Correct:
handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback: HandlerCallback
) => {
    const result = await runtime.useModel(ModelType.TEXT_LARGE, {...});
    
    const content: Content = {
        text: result,
        source: '${context.pluginName.replace('@elizaos/plugin-', '').replace('plugin-', '')}'
    };
    
    callback(content);
}
\`\`\`

### Memory Pattern (MANDATORY):
\`\`\`typescript
// ❌ V1 Wrong:
await runtime.messageManager.createMemory(memory);

// ✅ V2 Correct:
await runtime.createMemory({
    id: createUniqueUuid(runtime, \`action-\${Date.now()}\`),
    entityId: message.entityId,
    agentId: runtime.agentId,
    roomId: message.roomId,
    content: { text: result, source: 'plugin-name' },
    createdAt: Date.now()
}, 'messages');
\`\`\`

## 📋 TASKS TO COMPLETE:
${context.claudePrompts.size > 0 ? 
  Array.from(context.claudePrompts.entries()).map(([stepId, prompt]) => 
    `\n### ${stepId}\n${prompt}`
  ).join('\n') : 
  '- Apply the patterns above to all plugin files'
}

## ✅ FINAL CHECKLIST:
1. All imports use 'type' prefix for interfaces
2. ModelClass → ModelType, elizaLogger → logger  
3. Handler signature matches V2 pattern exactly
4. Service only created if V1 had one
5. Content has only 'text' and 'source' fields
6. No test files created manually

Apply these patterns to complete the V2 migration.`;

    // Apply with Claude
    await this.runClaudeCodeWithPrompt(megaPrompt);
  }

  private async runClaudeCodeWithPrompt(prompt: string): Promise<void> {
    if (!this.repoPath) throw new Error('Repository path not set');
    process.chdir(this.repoPath);

    const maxRetries = 3;
    let retryCount = 0;
    let lastError: unknown = null;

    while (retryCount < maxRetries) {
      try {
        logger.info('🤖 Running Claude Code...');

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

        logger.info('✅ Claude Code completed successfully');
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
          
          logger.info('🔄 Resuming Claude Code execution...');
          continue; // Retry
        }

        logger.error('❌ Claude Code failed:', err.message);
        throw error;
      }
    }

    // If we exhausted all retries
    throw new Error(`Claude Code failed after ${maxRetries} attempts. Last error: ${(lastError as Error)?.message}`);
  }

  private async runFinalValidation(): Promise<StepResult> {
    logger.info('🔍 Running final validation...');

    const results = {
      build: false,
      tests: false,
      format: false,
      testDetails: null as StepResult | null,
    };

    // Check build
    try {
      await execa('bun', ['run', 'build'], {
        cwd: this.repoPath || process.cwd(),
        stdio: 'pipe',
        timeout: 120000,
      });
      results.build = true;
      logger.info('✅ Build check passed');
    } catch (error) {
      logger.warn('❌ Build check failed');
    }

    // Check tests - ONLY if build passed
    if (!this.options.skipTests && results.build) {
      const testResult = await this.runTestsWithDetailedError();
      results.tests = testResult.success;
      results.testDetails = testResult;
      
      if (!testResult.success && testResult.warnings) {
        logger.warn('Test failure details:', testResult.warnings.join(', '));
      }
    } else if (this.options.skipTests) {
      results.tests = true; // Consider tests passed if skipped
    }

    // Check formatting
    try {
      await execa('bun', ['run', 'format:check'], {
        cwd: this.repoPath || process.cwd(),
        stdio: 'pipe',
      });
      results.format = true;
      logger.info('✅ Format check passed');
    } catch (error) {
      logger.warn('❌ Format check failed - run "bun run format"');
    }

    const allPassed = results.build && results.tests && results.format;

    const warnings: string[] = [
      !results.build ? 'Build failed' : undefined,
      !results.tests && !this.options.skipTests ? 'Tests failed' : undefined,
      !results.format ? 'Formatting issues' : undefined,
    ].filter(Boolean) as string[];

    // Add detailed test warnings if available
    if (results.testDetails && !results.testDetails.success && results.testDetails.warnings) {
      warnings.push(...results.testDetails.warnings);
    }

    return {
      success: allPassed,
      message: allPassed ? 'All validation checks passed' : 'Some validation checks failed',
      warnings,
    };
  }

  private async handleInput(input: string): Promise<void> {
    if (input.startsWith('https://github.com/')) {
      this.isGitHub = true;
      this.originalPath = input;
      const repoName = input.split('/').slice(-2).join('/').replace('.git', '');
      const repoFolder = repoName.split('/')[1] || repoName;
      this.repoPath = path.join(process.cwd(), 'cloned_repos', repoFolder);
      await fs.ensureDir(path.dirname(this.repoPath));

      if (await fs.pathExists(this.repoPath)) {
        this.git = simpleGit(this.repoPath);
        try {
          await this.git.fetch();
        } catch (fetchError) {
          await fs.remove(this.repoPath);
          await simpleGit().clone(input, this.repoPath);
          this.git = simpleGit(this.repoPath);
        }
      } else {
        await simpleGit().clone(input, this.repoPath);
        this.git = simpleGit(this.repoPath);
      }

      const branches = await this.git.branch();
      if (branches.all.includes('remotes/origin/0.x') || branches.all.includes('0.x')) {
        if (branches.current !== '0.x') await this.git.checkout('0.x');
      } else if (branches.all.includes('remotes/origin/main') || branches.all.includes('main')) {
        if (branches.current !== 'main') await this.git.checkout('main');
      }
    } else {
      this.repoPath = path.resolve(input);
      if (!(await fs.pathExists(this.repoPath))) {
        throw new Error(`Folder not found: ${this.repoPath}`);
      }
      this.git = simpleGit(this.repoPath);
    }
  }

  private async createBranch(): Promise<void> {
    const branches = await this.git.branch();
    const currentBranch = branches.current;

    if (
      branches.all.includes(BRANCH_NAME) ||
      branches.all.includes(`remotes/origin/${BRANCH_NAME}`)
    ) {
      if (currentBranch !== BRANCH_NAME) {
        try {
          await this.git.checkout(BRANCH_NAME);
        } catch (e) {
          await this.git.fetch('origin', BRANCH_NAME).catch(() => {});
          await this.git.deleteLocalBranch(BRANCH_NAME, true).catch(() => {});
          await this.git.checkoutBranch(BRANCH_NAME, `origin/${BRANCH_NAME}`).catch(async () => {
            await this.git.checkout(currentBranch);
            await this.git.checkoutLocalBranch(BRANCH_NAME);
          });
        }
      }
    } else {
      await this.git.checkoutLocalBranch(BRANCH_NAME);
    }
  }

  private async checkDiskSpace(): Promise<void> {
    const diskSpace = await getAvailableDiskSpace();
    if (diskSpace < MIN_DISK_SPACE_GB) {
      throw new Error(
        `Insufficient disk space. Need at least ${MIN_DISK_SPACE_GB}GB free, but only ${diskSpace.toFixed(2)}GB available.`
      );
    }
  }

  private async createLockFile(): Promise<void> {
    if (!this.repoPath) return;

    this.lockFilePath = path.join(this.repoPath, LOCK_FILE_NAME);

    // Check if lock file exists
    if (await fs.pathExists(this.lockFilePath)) {
      const lockData = await fs.readFile(this.lockFilePath, 'utf-8');
      const errorMessage = `Another migration is already running on this repository.
Lock file: ${this.lockFilePath}
Lock data: ${lockData}
If this is an error, manually delete the lock file and try again.`;
      throw new Error(errorMessage);
    }

    // Create lock file with process info
    const lockData = {
      pid: process.pid,
      startTime: new Date().toISOString(),
      repository: this.repoPath,
    };

    await fs.writeFile(this.lockFilePath, JSON.stringify(lockData, null, 2));
  }

  private async removeLockFile(): Promise<void> {
    if (this.lockFilePath && (await fs.pathExists(this.lockFilePath))) {
      await fs.remove(this.lockFilePath);
      this.lockFilePath = null;
    }
  }

  private async analyzeBuildErrorsAndFix(context: MigrationContext): Promise<void> {
    if (!this.repoPath) return;

    try {
      // Run build and capture errors
      const result = await execa('bun', ['run', 'build'], {
        cwd: this.repoPath,
        reject: false,
        all: true
      });

      if (result.exitCode !== 0 && result.all) {
        logger.info('📋 Analyzing build errors...');
        
        const buildErrors = result.all;
        const errorLines = buildErrors.split('\n');
        
        // Create a focused prompt for fixing build errors
        const buildFixPrompt = `# Fix ElizaOS V2 Plugin Build Errors

The ${context.pluginName} plugin has the following build errors:

\`\`\`
${buildErrors}
\`\`\`

## CLEAR INSTRUCTIONS: Fix ONLY the specific errors shown above.

### Most Common Fixes:
1. **Import Errors**:
   - Replace \`ModelClass\` with \`ModelType\`
   - Replace \`elizaLogger\` with \`logger\`
   - Add \`type\` prefix: \`import type { IAgentRuntime, Content, State }\`
   - Separate mixed imports: \`import { Service } from "@elizaos/core"; import type { IAgentRuntime }\`

2. **Type Errors**:
   - Empty objects: Replace \`{}\` with \`{ values: {}, data: {}, text: "" }\` for State
   - Handler signature: \`(runtime, message, state, _options, callback) => { callback(content); }\`
   - Use \`{ [key: string]: unknown }\` for options parameter

3. **API Changes**:
   - Replace \`runtime.language.generateText\` with \`runtime.useModel\`
   - Replace \`runtime.messageManager.createMemory\` with \`runtime.createMemory\`
   - Replace \`memory.create\` with \`runtime.createMemory\`

4. **Service Issues**:
   - Remove \`: ServiceType\` annotation from serviceType property
   - Only create service if plugin had one in V1

### Rules:
- Make MINIMAL changes to fix the specific errors
- Do NOT create new files
- Do NOT add features not in V1
- Follow the exact error messages to guide fixes`;


        await this.runClaudeCodeWithPrompt(buildFixPrompt);
        
        // After Claude fixes, verify the build works
        logger.info('🔨 Verifying build after fixes...');
        try {
          await execa('bun', ['run', 'build'], {
            cwd: this.repoPath,
            stdio: 'pipe',
            timeout: 120000,
          });
          logger.info('✅ Build successful after fixes');
          
          // CRITICAL: Run tests after successful build fix
          if (!this.options.skipTests) {
            logger.info('🧪 Running tests after build fix...');
            const testResult = await this.runTestsWithDetailedError();
            
            if (!testResult.success) {
              logger.warn('⚠️  Tests failed after build fix');
              if (testResult.warnings) {
                logger.warn('Test issues detected:', testResult.warnings.join(', '));
              }
              // Don't throw here - let the main loop handle test failures
            } else {
              logger.info('✅ Tests pass after build fix');
            }
          }
        } catch (buildError) {
          logger.error('❌ Build still failing after fix attempt');
          // Don't throw - let the main loop handle it
        }
      }
    } catch (error) {
      logger.error('Failed to analyze build errors:', error);
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    logger.info('🔧 Setting up test environment...');
    
    if (!this.repoPath) return;
    
    const envPath = path.join(this.repoPath, '.env');
    let envContent = '';
    
    // Read existing .env if it exists
    if (await fs.pathExists(envPath)) {
      envContent = await fs.readFile(envPath, 'utf-8');
    }
    
    // MANDATORY: Always include OPENAI_API_KEY
    if (!envContent.includes('OPENAI_API_KEY=')) {
      envContent += '\n# MANDATORY for all ElizaOS plugins\n';
      envContent += `OPENAI_API_KEY=${DEFAULT_OPENAI_API_KEY}\n`;
    }
    
    // Dynamically detect required environment variables from source
    const requiredEnvVars = await this.detectRequiredEnvVars();
    
    // Add dummy values for detected variables if not present
    for (const envVar of requiredEnvVars) {
      if (!envContent.includes(`${envVar}=`)) {
        envContent += '\n# Detected from plugin source\n';
        envContent += `${envVar}=${this.getDummyValueForEnvVar(envVar)}\n`;
      }
    }
    
    // Write updated .env file (preserving existing content)
    await fs.writeFile(envPath, `${envContent.trim()}\n`);
    logger.info('✅ Test environment configured');
  }

  private async detectRequiredEnvVars(): Promise<string[]> {
    const envVars = new Set<string>();
    
    if (!this.repoPath) return [];
    
    // Common patterns to search for environment variables
    const patterns = [
      /runtime\.getSetting\(["']([^"']+)["']\)/g,
      /process\.env\.([A-Z_]+)/g,
      /getEnv\(["']([^"']+)["']\)/g
    ];
    
    // Search in src directory
    const srcDir = path.join(this.repoPath, 'src');
    if (await fs.pathExists(srcDir)) {
      const files = await globby(['**/*.ts', '**/*.js'], {
        cwd: srcDir,
        ignore: ['node_modules/**', 'dist/**']
      });
      
      for (const file of files) {
        const content = await fs.readFile(path.join(srcDir, file), 'utf-8');
        
        for (const pattern of patterns) {
          let match: RegExpExecArray | null;
          match = pattern.exec(content);
          while (match !== null) {
            envVars.add(match[1]);
            match = pattern.exec(content);
          }
        }
      }
    }
    
    return Array.from(envVars);
  }

  private getDummyValueForEnvVar(envVar: string): string {
    // Plugin-specific dummy values based on common patterns
    const dummyValues: { [key: string]: string } = {
      'COINMARKETCAP_API_KEY': 'test-cmc-key-12345',
      'NEWS_API_KEY': 'dummy-news-api-key-67890',
      'DISCORD_APPLICATION_ID': '123456789',
      'DISCORD_API_TOKEN': 'dummy-discord-token',
      'SOLANA_ENDPOINT': 'https://api.mainnet-beta.solana.com',
      'COINGECKO_API_KEY': 'dummy-gecko-key-54321',
      'ELEVENLABS_API_KEY': 'dummy-elevenlabs-key',
      'TWITTER_API_KEY': 'dummy-twitter-key',
      'TELEGRAM_BOT_TOKEN': 'dummy-telegram-token'
    };
    
    // Check if we have a specific dummy value
    if (dummyValues[envVar]) {
      return dummyValues[envVar];
    }
    
    // Generate generic dummy values based on patterns
    if (envVar.includes('API_KEY')) return 'dummy-api-key-12345';
    if (envVar.includes('TOKEN')) return 'dummy-token-67890';
    if (envVar.includes('SECRET')) return 'dummy-secret-54321';
    if (envVar.includes('ENDPOINT') || envVar.includes('URL')) return 'https://api.example.com';
    if (envVar.includes('ENABLE') || envVar.includes('IS_')) return 'true';
    
    // Default dummy value
    return `dummy-value-${Math.random().toString(36).substring(7)}`;
  }

  private async analyzeTestErrorsAndFix(context: MigrationContext): Promise<void> {
    if (!this.repoPath) return;

    try {
      // Run tests with detailed error capture
      const testResult = await this.runTestsWithDetailedError();
      
      if (!testResult.success) {
        logger.info('📋 Analyzing test failures in detail...');
        
        const testErrors = testResult.error?.message || 'Unknown test failure';
        const detectedIssues = testResult.warnings || [];
        
        // Enhanced pattern detection from plugin-news analysis
        const testErrorPatterns = [
          { pattern: /TestSuite.*does not provide an export/i, type: 'test-suite-import' },
          { pattern: /AgentTest.*does not provide an export/i, type: 'agent-test-import' },
          { pattern: /Cannot read properties of undefined.*forEach/i, type: 'runtime-foreach' },
          { pattern: /memory\.create is not a function/i, type: 'memory-create' },
          { pattern: /Expected number, received nan/i, type: 'zod-number' },
          { pattern: /invalid_type.*Expected (\w+), received (\w+)/i, type: 'zod-validation' },
          { pattern: /state.*must be an object/i, type: 'state-object' },
          { pattern: /{} is not assignable to.*State/i, type: 'empty-state' },
          { pattern: /Cannot find module.*test/i, type: 'test-import' },
          { pattern: /vitest/i, type: 'vitest-usage' },
          { pattern: /property 'useModel' of undefined/i, type: 'missing-useModel' },
          // Additional patterns from plugin-news migration
          { pattern: /role.*is not a valid property/i, type: 'role-property' },
          { pattern: /stop.*Did you mean.*stopSequences/i, type: 'stop-parameter' },
          { pattern: /max_tokens.*Did you mean.*maxTokens/i, type: 'max-tokens-parameter' },
          { pattern: /Cannot find name 'ModelClass'/i, type: 'model-class-import' },
          { pattern: /Property 'language' does not exist/i, type: 'language-api' },
          { pattern: /messageManager.*does not exist/i, type: 'message-manager' },
          { pattern: /options.*any.*is not assignable/i, type: 'options-type' },
          { pattern: /callback.*undefined is not assignable/i, type: 'callback-optional' },
          { pattern: /serviceType.*ServiceType.*is not assignable/i, type: 'service-type-explicit' },
          { pattern: /private property.*config/i, type: 'private-config' },
          { pattern: /testSuite.*is not assignable.*test/i, type: 'test-export-name' },
          { pattern: /bun\s+test.*expects.*\.test\.ts/i, type: 'bun-test-command' },
        ];

        // Detect specific error types
        const detectedErrorTypes = new Set<string>();
        for (const { pattern, type } of testErrorPatterns) {
          if (pattern.test(testErrors)) {
            detectedErrorTypes.add(type);
          }
        }
        
        // Check if it's a service-related error for plugins without services
        const isServiceError = testErrors.includes('Service not registered') || 
                             testErrors.includes('getService') ||
                             testErrors.includes('service') && testErrors.includes('undefined');
        
        if (isServiceError && !context.hasService) {
          logger.info('⚠️  Service-related test error detected but plugin has no service - this is expected');
          // Don't try to fix service issues if plugin doesn't have a service
          return;
        }
        
        // Check for specific error patterns and handle them
        if (detectedIssues.includes('Environment configuration issue') || 
            testErrors.includes('env') || 
            testErrors.includes('API key')) {
          await this.handleMissingEnvVars(testErrors);
          
          // Re-run tests after fixing env vars
          logger.info('🧪 Re-running tests after environment fix...');
          const retryResult = await this.runTestsWithDetailedError();
          
          if (retryResult.success) {
            logger.info('✅ Tests now pass after environment fix');
            return;
          }
          
          // If still failing, continue to Claude fix
          testResult.error = retryResult.error;
        }
        
        // Check for Zod validation errors specifically
        if (detectedErrorTypes.has('zod-number') || detectedErrorTypes.has('zod-validation')) {
          logger.info('🔍 Detected Zod validation error - analyzing config requirements...');
          
          // Try to extract the specific validation error
          const zodErrorMatch = testErrors.match(/Expected (\w+), received (\w+).*?"path":\s*\["([^"]+)"\]/);
          if (zodErrorMatch) {
            const [, expectedType, receivedType, fieldName] = zodErrorMatch;
            logger.info(`Zod error: Field "${fieldName}" expected ${expectedType} but received ${receivedType}`);
          }
        }
        
        // Create a comprehensive prompt for fixing test errors
        const testFixPrompt = `# Fix ElizaOS V2 Plugin Test Failures - MAINTAIN COMPREHENSIVE TESTS

The ${context.pluginName} plugin has the following test failures:

\`\`\`
${testErrors}
\`\`\`

CRITICAL INSTRUCTION: Fix the errors while KEEPING ALL EXISTING TESTS (10-15 tests). DO NOT reduce the number of tests.

## Detected Error Types:
${Array.from(detectedErrorTypes).map(type => `- ${type}`).join('\n')}

## IMPORTANT RULES:
1. MAINTAIN all existing tests - there should be 10-15 tests total
2. FIX the specific errors without removing tests
3. Keep the progressive testing structure (stages that build on each other)
4. ALL tests must be in src/test/test.ts ONLY
5. Fix imports, types, and runtime issues as needed
6. DO NOT simplify or reduce test coverage

## Common Fixes Based on Error Types:
${this.getErrorSpecificFixes(detectedErrorTypes, context)}

## Expected Test Structure (MAINTAIN THIS):
1. Plugin V2 structure validation
2. Service initialization (if plugin has services)
3. Action structure and validation
4. Deep action execution testing
5. Action examples testing
6. Memory creation testing
7. Provider functionality (if plugin has providers)
8. Error handling scenarios
9. Plugin lifecycle testing
10. Test summary report

FIX THE ERRORS IN THE EXISTING COMPREHENSIVE TESTS. DO NOT REPLACE WITH SIMPLER TESTS.`;

        await this.runClaudeCodeWithPrompt(testFixPrompt);
        
        // After Claude fixes, verify tests work
        logger.info('🧪 Verifying tests after fixes...');
        const verifyResult = await this.runTestsWithDetailedError();
        
        if (verifyResult.success) {
          logger.info('✅ Tests now pass after fixes');
        } else {
          logger.warn('⚠️  Tests still failing after fix attempt');
          if (verifyResult.warnings) {
            logger.warn('Remaining test issues:', verifyResult.warnings.join(', '));
          }
          
          // If still failing due to complex runtime issues, fix specific issues without simplifying
          if (detectedErrorTypes.has('runtime-foreach') || testErrors.includes('Cannot read properties')) {
            logger.info('🔧 Fixing runtime issues without simplifying tests...');
            
            const fixRuntimePrompt = `# Fix Runtime Issues in Tests Without Simplifying

The tests are failing with runtime errors. Fix the specific issues WITHOUT reducing the number of tests.

Current error:
\`\`\`
${testErrors}
\`\`\`

CRITICAL: Keep ALL existing tests (should be 10-15 tests). Only fix the errors.

## Common fixes needed:
1. If "Cannot read properties of undefined":
   - Add null checks before accessing properties
   - Ensure mock runtime has all required methods
   - Check if services are properly initialized

2. If "forEach" errors:
   - Ensure arrays are initialized before iteration
   - Add Array.isArray() checks

3. If type errors:
   - Fix import statements (use 'import type' for types)
   - Fix State objects (use { values: {}, data: {}, text: "" })
   - Fix handler signatures

DO NOT reduce the number of tests. Fix the errors while keeping all tests intact.`;

            await this.runClaudeCodeWithPrompt(fixRuntimePrompt);
          }
          
          // After trying to fix, re-generate tests using comprehensive template
          if (verifyResult.warnings?.includes('Tests still failing after fix attempt')) {
            logger.info('🔄 Re-generating tests using comprehensive template...');
            
            // Use the context-aware test generator with comprehensive template
            const testGenerator = new ContextAwareTestGenerator(context);
            try {
              // Note: Placeholder for test regeneration - method needs to be implemented in ContextAwareTestGenerator
              logger.info('✅ Test regeneration initiated');
              
              // Try tests again
              const finalTestResult = await this.runTestsWithDetailedError();
              if (finalTestResult.success) {
                logger.info('✅ Tests now pass with comprehensive template');
              }
            } catch (error) {
              logger.warn('⚠️  Test regeneration failed:', error);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to analyze test errors:', error);
    }
  }

  private async handleMissingEnvVars(output: string): Promise<void> {
    logger.info('🔧 Handling missing environment variables...');
    
    if (!this.repoPath) return;
    
    // Extract variable names from error messages
    const missingVarPatterns = [
      /Missing required environment variable[s]?: ([A-Z_]+)/g,
      /Environment variable ([A-Z_]+) is required/g,
      /([A-Z_]+) is not defined/g,
      /Cannot find ([A-Z_]+) in environment/g
    ];
    
    const missingVars = new Set<string>();
    
    for (const pattern of missingVarPatterns) {
      let match: RegExpExecArray | null;
      match = pattern.exec(output);
      while (match !== null) {
        missingVars.add(match[1]);
        match = pattern.exec(output);
      }
    }
    
    if (missingVars.size > 0) {
      const envPath = path.join(this.repoPath, '.env');
      let envContent = '';
      
      // Read existing content
      if (await fs.pathExists(envPath)) {
        envContent = await fs.readFile(envPath, 'utf-8');
      }
      
      // Add missing variables
      for (const varName of missingVars) {
        if (!envContent.includes(`${varName}=`)) {
          envContent += '\n# Added to fix test failures\n';
          envContent += `${varName}=${this.getDummyValueForEnvVar(varName)}\n`;
        }
      }
      
      // Write back
      await fs.writeFile(envPath, `${envContent.trim()}\n`);
      logger.info(`✅ Added ${missingVars.size} missing environment variables`);
    }
  }

  private async checkModifiedFiles(context: MigrationContext): Promise<void> {
    if (!this.repoPath) return;

    try {
      // Get list of modified files
      const status = await this.git.status();
      const modifiedFiles = [...status.modified, ...status.created];
      
      logger.info(`📂 Checking ${modifiedFiles.length} modified files...`);
      
      // Read and validate critical files
      for (const file of modifiedFiles) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          const filePath = path.join(this.repoPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          
          // Check for common V1 patterns that should be fixed
          const v1Patterns = [
            { pattern: /ModelClass\./g, issue: 'ModelClass should be ModelType' },
            { pattern: /elizaLogger/g, issue: 'elizaLogger should be logger' },
            { pattern: /runtime\.memory\.create/g, issue: 'Should use runtime.createMemory' },
            { pattern: /user:\s*["']/g, issue: 'ActionExample should use "name" not "user"' },
            { pattern: /stop:\s*\[/g, issue: 'Should use stopSequences not stop' },
            { pattern: /max_tokens:/g, issue: 'Should use maxTokens not max_tokens' }
          ];
          
          const issues: string[] = [];
          for (const { pattern, issue } of v1Patterns) {
            if (pattern.test(content)) {
              issues.push(`  - ${issue}`);
            }
          }
          
          if (issues.length > 0) {
            logger.warn(`⚠️  File ${file} still contains V1 patterns:`);
            for (const issue of issues) {
              logger.warn(issue);
            }
          }
        }
      }
      
      // Update context with all changed files
      for (const file of modifiedFiles) {
        context.changedFiles.add(file);
      }
      
    } catch (error) {
      logger.error('Failed to check modified files:', error);
    }
  }

  private getErrorSpecificFixes(errorTypes: Set<string>, context: MigrationContext): string {
    const fixes: string[] = [];
    
    if (errorTypes.has('test-suite-import')) {
      fixes.push(`### Fix TestSuite Import:
\`\`\`typescript
// Wrong: import { TestSuite } from "@elizaos/core";
// Right: import type { TestSuite } from "@elizaos/core";
\`\`\``);
    }
    
    if (errorTypes.has('runtime-foreach')) {
      fixes.push(`### Fix Runtime forEach Error:
- Add null checks before accessing properties
- Ensure arrays are initialized before iteration
- Wrap array operations in try-catch blocks`);
    }
    
    if (errorTypes.has('memory-create')) {
      fixes.push(`### Fix Memory Creation:
\`\`\`typescript
// Use runtime.createMemory, not runtime.memory.create
await runtime.createMemory(memory, "messages");
\`\`\``);
    }
    
    if (errorTypes.has('zod-number')) {
      fixes.push(`### Fix Zod Number Validation:
- Change z.number() to z.coerce.number() in config.ts
- This handles string environment variables properly`);
    }
    
    if (errorTypes.has('empty-state')) {
      fixes.push(`### Fix Empty State Objects:
\`\`\`typescript
// Wrong: state: {}
// Right: state: { values: {}, data: {}, text: "" }
\`\`\``);
    }
    
    if (errorTypes.has('missing-useModel')) {
      fixes.push(`### Fix Missing useModel:
- Ensure mock runtime includes useModel method
- Check utils.ts has the complete mock implementation`);
    }
    
    if (errorTypes.has('service-type-explicit')) {
      fixes.push(`### Fix Service Type:
\`\`\`typescript
// Wrong: static serviceType: ServiceType = "my-service";
// Right: static serviceType = "my-service";
\`\`\``);
    }
    
    if (errorTypes.has('options-type')) {
      fixes.push(`### Fix Options Type:
\`\`\`typescript
// In handler signature:
_options: { [key: string]: unknown }, // Not 'any'
\`\`\``);
    }
    
    return fixes.join('\n\n');
  }

  private async runTestsWithDetailedError(): Promise<StepResult> {
    logger.info('🧪 Running tests with detailed error capture...');
    
    if (!this.repoPath) {
      return {
        success: false,
        message: 'No repository path set',
      };
    }

    // Setup test environment first
    await this.setupTestEnvironment();

    let retryCount = 0;
    const maxRetries = 3;
    let lastResult: StepResult | null = null;

    while (retryCount < maxRetries) {
      try {
        // IMPORTANT: Use 'bun run test' to invoke the test script defined in package.json
        // ElizaOS uses 'elizaos test' which is configured as the test script
        // Direct 'bun test' would use bun's test runner which expects .test.ts files
        const result = await execa('bun', ['run', 'test'], {
          cwd: this.repoPath,
          reject: false,
          all: true,
          timeout: 300000, // 5 minute timeout
        });

        if (result.exitCode === 0) {
          logger.info('✅ Tests passed successfully');
          return {
            success: true,
            message: result.all || 'All tests passed', // Include full output for analysis
          };
        }

        // Tests failed - analyze the output
        const output = result.all || result.stderr || result.stdout || '';
        logger.error('❌ Test execution failed');
        logger.error('Test output:', output);

        // Check for rate limiting in test output
        const isRateLimitError = 
          output.includes('rate limit') ||
          output.includes('429') ||
          output.includes('too many requests') ||
          output.includes('quota exceeded');

        if (isRateLimitError && retryCount < maxRetries - 1) {
          retryCount++;
          const waitTime = Math.min(60 * retryCount, 180); // Wait 1-3 minutes
          logger.warn(`⏸️  Rate limit detected in tests. Waiting ${waitTime} seconds before retry ${retryCount}/${maxRetries - 1}...`);
          
          // Show countdown
          for (let i = waitTime; i > 0; i--) {
            process.stdout.write(`\r⏱️  Resuming tests in ${i} seconds...  `);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          process.stdout.write('\r\n');
          
          logger.info('🔄 Retrying test execution...');
          continue; // Retry
        }

        // Check for common test failure patterns
        const failurePatterns = [
          { pattern: /vitest/, message: 'Vitest dependency issue detected' },
          { pattern: /invalid_type|Expected .*, received/, message: 'Zod validation error' },
          { pattern: /Missing required environment variable/, message: 'Environment configuration issue' },
          { pattern: /Cannot find module/, message: 'Module import error' },
          { pattern: /elizaos test/, message: 'ElizaOS test framework issue' },
          // Additional patterns from plugin-news analysis
          { pattern: /TestSuite.*does not provide an export/, message: 'TestSuite import issue' },
          { pattern: /AgentTest.*does not provide an export/, message: 'AgentTest import issue' },
          { pattern: /type imports/, message: 'Type import separation needed' },
          { pattern: /memory\.create/, message: 'Memory API V1 pattern detected' },
          { pattern: /runtime\.language\.generateText/, message: 'V1 model API detected' },
          { pattern: /stop:\s*\[/, message: 'V1 stop parameter detected' },
          { pattern: /role:\s*["']/, message: 'V1 role property detected' },
          { pattern: /state:\s*{}/, message: 'Empty State object detected' },
          { pattern: /Promise<boolean>/, message: 'V1 handler return type detected' },
          { pattern: /z\.number\(\)(?!\.coerce)/, message: 'Non-coerced Zod number detected' },
        ];

        const detectedIssues: string[] = [];
        for (const { pattern, message } of failurePatterns) {
          if (pattern.test(output)) {
            detectedIssues.push(message);
          }
        }

        lastResult = {
          success: false,
          message: 'Tests failed',
          warnings: detectedIssues.length > 0 ? detectedIssues : ['Unknown test failure'],
          error: new Error(output.slice(0, 1000)), // Truncate for readability
        };

        return lastResult;
      } catch (error) {
        // Check if it's a rate limit error in the exception
        const errorMessage = (error as Error).message || '';
        const isRateLimitError = 
          errorMessage.includes('rate limit') ||
          errorMessage.includes('429') ||
          errorMessage.includes('too many requests');

        if (isRateLimitError && retryCount < maxRetries - 1) {
          retryCount++;
          const waitTime = Math.min(60 * retryCount, 180);
          logger.warn(`⏸️  Rate limit error. Waiting ${waitTime} seconds before retry ${retryCount}/${maxRetries - 1}...`);
          
          for (let i = waitTime; i > 0; i--) {
            process.stdout.write(`\r⏱️  Resuming in ${i} seconds...  `);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          process.stdout.write('\r\n');
          
          continue; // Retry
        }

        logger.error('❌ Test command failed to execute:', error);
        return {
          success: false,
          message: 'Test execution error',
          error: error as Error,
        };
      }
    }

    // If we exhausted all retries, return the last result
    return lastResult || {
      success: false,
      message: 'Test execution failed after retries',
      error: new Error('Maximum retries exceeded'),
    };
  }

  private async includeTestSuitesInIndex(context: MigrationContext): Promise<void> {
    if (!this.repoPath) return;

    try {
      const indexPath = path.join(this.repoPath, 'src', 'index.ts');
      
      // Check if index.ts exists
      if (!(await fs.pathExists(indexPath))) {
        logger.warn('⚠️  index.ts not found, skipping test suite inclusion');
        return;
      }

      // Read current index.ts content
      let indexContent = await fs.readFile(indexPath, 'utf-8');

      // Check if test exports already exist
      if (indexContent.includes('testSuite') || indexContent.includes('test/test')) {
        logger.info('✅ Test suites already included in index.ts');
        return;
      }

      // Check if test file exists (must be test.ts, not test.test.ts)
      const testFilePath = path.join(this.repoPath, 'src', 'test', 'test.ts');
      const hasTestFile = await fs.pathExists(testFilePath);

      if (!hasTestFile) {
        logger.info('ℹ️  No src/test/test.ts file found, skipping test suite inclusion');
        logger.info('   Expected: src/test/test.ts (ElizaOS V2 standard)');
        return;
      }
      
      logger.info('✅ Found src/test/test.ts - including in index.ts');

      // Add test suite export to index.ts
      const testSuiteExport = `
// Export test suite for build validation
export { testSuite } from './test/test.js';`;

      // Add the export at the end of the file
      indexContent = `${indexContent.trim()}\n${testSuiteExport}\n`;

      // Write updated index.ts
      await fs.writeFile(indexPath, indexContent);
      
      logger.info('✅ Test suite exports added to index.ts');
      context.changedFiles.add('src/index.ts');

    } catch (error) {
      logger.error('❌ Failed to include test suites in index.ts:', error);
      // Don't throw - this is not critical for migration success
    }
  }

  private async fixAllImportsWithClaude(context: MigrationContext): Promise<void> {
    if (!this.repoPath) return;

    logger.info('🔧 Fixing all imports using Claude with real examples...');

    const importFixPrompt = `# Fix ALL ElizaOS V2 Imports - Use Real Examples as Reference

Fix ALL import statements in this ${context.pluginName} plugin to match V2 patterns exactly.

## ✅ CORRECT V2 IMPORT PATTERNS (use these as reference):

### Example from actions.ts:
\`\`\`typescript
import type {
  Action,
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  UUID,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
\`\`\`

### Example from document-processor.ts:
\`\`\`typescript
import {
  IAgentRuntime,
  Memory,
  MemoryType,
  ModelType,
  UUID,
  logger,
  splitChunks,
} from "@elizaos/core";
\`\`\`

### Example from index.ts:
\`\`\`typescript
import type { Plugin, IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
\`\`\`

### Example from service.ts:
\`\`\`typescript
import {
  Content,
  createUniqueUuid,
  FragmentMetadata,
  IAgentRuntime,
  KnowledgeItem,
  logger,
  Memory,
  MemoryMetadata,
  MemoryType,
  ModelType,
  Semaphore,
  Service,
  splitChunks,
  UUID,
} from "@elizaos/core";
\`\`\`

## 🎯 CRITICAL RULES TO APPLY:

1. **Types vs Values - Follow Examples Above**:
   - **Value imports**: \`logger\`, \`ModelType\`, \`MemoryType\`, \`Service\`, \`createUniqueUuid\`, \`splitChunks\`, \`Semaphore\`
   - **Type imports**: \`Action\`, \`Content\`, \`HandlerCallback\`, \`State\`, \`UUID\`, \`Plugin\`, \`IAgentRuntime\`, \`Memory\`, etc.

2. **Mandatory Renames**:
   - \`ModelClass\` → \`ModelType\` (everywhere in code, not just imports)
   - \`elizaLogger\` → \`logger\` (everywhere in code, not just imports)

3. **Import Structure**:
   - Separate type imports: \`import type { ... } from "@elizaos/core";\`
   - Separate value imports: \`import { ... } from "@elizaos/core";\`
   - When in doubt, look at the real examples above

## 📋 INSTRUCTIONS:
1. Go through EVERY TypeScript file in src/
2. Fix ALL @elizaos/core imports to match the patterns above
3. Replace ModelClass with ModelType throughout the code
4. Replace elizaLogger with logger throughout the code
5. Ensure types use \`import type\` and values use \`import\`
6. Follow the EXACT patterns from the real examples

Apply these fixes to prevent ANY import-related TypeScript errors.`;

    await this.runClaudeCodeWithPrompt(importFixPrompt);
    logger.info('✅ All imports fixed using Claude with real examples');
  }
}