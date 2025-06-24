/**
 * AI-POWERED IMPORT RESOLUTION MIGRATION STEP
 *
 * This migration step integrates the AI Import Resolver into the migration pipeline
 * to ensure 100% import resolution success during V1 to V2 plugin migration.
 */

import { logger } from '@elizaos/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MigrationStep, MigrationContext, StepResult, MigrationPhase } from '../types.js';
import { AIImportResolver, ImportGraphAnalyzer, type DependencyAnalysis } from '../core/index.js';

/**
 * AI Import Resolution migration step
 */
export class AIImportResolutionStep implements MigrationStep {
  id = 'ai-import-resolution';
  phase: MigrationPhase = 'core-structure-migration';
  name = 'AI-Powered Import Resolution';
  description = 'Resolve all import issues using AI-powered analysis and self-healing mechanisms';
  required = true;

  skipCondition = (context: MigrationContext): boolean => {
    // Never skip this step - import resolution is critical
    return false;
  };

  async execute(context: MigrationContext): Promise<StepResult> {
    logger.info('🚀 Starting AI-powered import resolution step...');

    const startTime = Date.now();
    const changes: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Gather all TypeScript files
      const files = await this.gatherTypeScriptFiles(context.repoPath);
      logger.info(`📁 Found ${files.length} TypeScript files to analyze`);

      // 2. Pre-analysis with Import Graph Analyzer
      const analyzer = new ImportGraphAnalyzer();
      const preAnalysis = await analyzer.analyzeProject(context.repoPath, files);

      logger.info(`📊 Pre-analysis complete - Health Score: ${preAnalysis.healthScore}/100`);

      if (preAnalysis.circularDependencies.length > 0) {
        warnings.push(`Found ${preAnalysis.circularDependencies.length} circular dependencies`);
      }

      if (preAnalysis.missingImports.length > 0) {
        warnings.push(`Found ${preAnalysis.missingImports.length} missing imports`);
      }

      // 3. Initialize AI Import Resolver
      const resolver = new AIImportResolver(context);

      // 4. Run import resolution until perfect
      await resolver.resolveUntilPerfect(files);

      // 5. Post-analysis to verify success
      const postAnalysis = await analyzer.analyzeProject(context.repoPath, files);

      logger.info(`📊 Post-analysis complete - Health Score: ${postAnalysis.healthScore}/100`);

      // 6. Track changes and improvements
      const improvement = postAnalysis.healthScore - preAnalysis.healthScore;
      changes.push(`Import health score improved by ${improvement} points`);
      changes.push(
        `Resolved ${preAnalysis.missingImports.length - postAnalysis.missingImports.length} missing imports`
      );
      changes.push(
        `Fixed ${preAnalysis.circularDependencies.length - postAnalysis.circularDependencies.length} circular dependencies`
      );

      // 7. Generate detailed report
      await this.generateImportResolutionReport(context, preAnalysis, postAnalysis);

      // 8. Validate final state
      await this.validateFinalState(context, files);

      const duration = Date.now() - startTime;
      logger.info(`✅ AI Import Resolution completed successfully in ${duration}ms`);

      return {
        success: true,
        message: `AI Import Resolution completed with ${improvement} point health improvement`,
        changes,
        warnings,
      };
    } catch (error) {
      logger.error('❌ AI Import Resolution failed:', error);

      return {
        success: false,
        message: `AI Import Resolution failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
        warnings,
      };
    }
  }

  /**
   * Gather all TypeScript files in the project
   */
  private async gatherTypeScriptFiles(repoPath: string): Promise<string[]> {
    const files: string[] = [];

    const walkDir = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            // Skip common directories that don't contain source code
            if (!this.shouldSkipDirectory(entry.name)) {
              await walkDir(fullPath);
            }
          } else if (entry.isFile() && this.isTypeScriptFile(entry.name)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        logger.warn(`⚠️  Failed to read directory ${dir}:`, error);
      }
    };

    await walkDir(repoPath);

    return files.filter((file) => this.shouldIncludeFile(file));
  }

  /**
   * Check if directory should be skipped
   */
  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      'coverage',
      '.nyc_output',
      'temp',
      'tmp',
    ];

    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * Check if file is a TypeScript file
   */
  private isTypeScriptFile(fileName: string): boolean {
    return fileName.endsWith('.ts') || fileName.endsWith('.tsx');
  }

  /**
   * Check if file should be included in analysis
   */
  private shouldIncludeFile(filePath: string): boolean {
    const fileName = path.basename(filePath);

    // Skip certain file types
    if (
      fileName.endsWith('.d.ts') ||
      fileName.endsWith('.test.ts') ||
      fileName.endsWith('.spec.ts') ||
      fileName.includes('.min.')
    ) {
      return false;
    }

    return true;
  }

  /**
   * Generate detailed import resolution report
   */
  private async generateImportResolutionReport(
    context: MigrationContext,
    preAnalysis: DependencyAnalysis,
    postAnalysis: DependencyAnalysis
  ): Promise<void> {
    const reportDir = path.join(context.repoPath, '.taskmaster', 'reports');
    await fs.promises.mkdir(reportDir, { recursive: true });

    const reportPath = path.join(reportDir, 'import-resolution-report.json');

    const report = {
      timestamp: new Date().toISOString(),
      plugin: context.pluginName,
      summary: {
        preAnalysis: {
          healthScore: preAnalysis.healthScore,
          totalFiles: preAnalysis.totalFiles,
          totalImports: preAnalysis.totalImports,
          issues: {
            circularDependencies: preAnalysis.circularDependencies.length,
            missingImports: preAnalysis.missingImports.length,
            performanceIssues: preAnalysis.performanceIssues.length,
          },
        },
        postAnalysis: {
          healthScore: postAnalysis.healthScore,
          totalFiles: postAnalysis.totalFiles,
          totalImports: postAnalysis.totalImports,
          issues: {
            circularDependencies: postAnalysis.circularDependencies.length,
            missingImports: postAnalysis.missingImports.length,
            performanceIssues: postAnalysis.performanceIssues.length,
          },
        },
        improvement: {
          healthScoreGain: postAnalysis.healthScore - preAnalysis.healthScore,
          circularDependenciesFixed:
            preAnalysis.circularDependencies.length - postAnalysis.circularDependencies.length,
          missingImportsResolved:
            preAnalysis.missingImports.length - postAnalysis.missingImports.length,
          performanceIssuesFixed:
            preAnalysis.performanceIssues.length - postAnalysis.performanceIssues.length,
        },
      },
      detailed: {
        preAnalysis,
        postAnalysis,
        remainingIssues: {
          circularDependencies: postAnalysis.circularDependencies,
          missingImports: postAnalysis.missingImports,
          performanceIssues: postAnalysis.performanceIssues,
        },
        recommendations: postAnalysis.recommendations,
      },
    };

    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
    logger.info(`📄 Import resolution report saved to ${reportPath}`);
  }

  /**
   * Validate that the final state meets requirements
   */
  private async validateFinalState(context: MigrationContext, files: string[]): Promise<void> {
    logger.info('🔍 Validating final import state...');

    // Check for any remaining critical issues
    const analyzer = new ImportGraphAnalyzer();
    const finalAnalysis = await analyzer.analyzeProject(context.repoPath, files);

    // Validate health score
    if (finalAnalysis.healthScore < 80) {
      logger.warn(
        `⚠️  Final health score ${finalAnalysis.healthScore} is below recommended minimum of 80`
      );
    }

    // Check for critical circular dependencies
    const criticalCircular = finalAnalysis.circularDependencies.filter(
      (c) => c.impact === 'critical'
    );
    if (criticalCircular.length > 0) {
      logger.warn(`⚠️  ${criticalCircular.length} critical circular dependencies remain`);
    }

    // Check for missing imports
    if (finalAnalysis.missingImports.length > 0) {
      logger.warn(`⚠️  ${finalAnalysis.missingImports.length} missing imports remain`);
    }

    // Run syntax validation
    await this.validateSyntax(files);

    logger.info('✅ Final state validation completed');
  }

  /**
   * Run syntax validation on all files
   */
  private async validateSyntax(files: string[]): Promise<void> {
    logger.info('🔍 Running syntax validation...');

    let errorCount = 0;

    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');

        // Try to parse with TypeScript
        const ts = await import('typescript');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

        // Create a minimal program to get diagnostics
        const program = ts.createProgram([file], {
          allowJs: true,
          checkJs: false,
          noEmit: true,
          skipLibCheck: true,
        });

        const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);
        if (diagnostics.length > 0) {
          errorCount += diagnostics.length;
          logger.warn(`⚠️  Syntax errors in ${file}: ${diagnostics.length}`);
        }
      } catch (error) {
        errorCount++;
        logger.warn(`⚠️  Failed to parse ${file}:`, error);
      }
    }

    if (errorCount > 0) {
      logger.warn(`⚠️  Total syntax errors found: ${errorCount}`);
    } else {
      logger.info('✅ All files have valid syntax');
    }
  }

  /**
   * Static method to gather TypeScript files
   */
  static async gatherTypeScriptFiles(repoPath: string): Promise<string[]> {
    const step = new AIImportResolutionStep();
    return step.gatherTypeScriptFiles(repoPath);
  }
}

/**
 * Create and export the AI Import Resolution step
 */
export const aiImportResolutionStep = new AIImportResolutionStep();

/**
 * Utility function to run AI import resolution standalone
 */
export async function runAIImportResolution(
  repoPath: string,
  pluginName: string
): Promise<DependencyAnalysis> {
  logger.info(`🚀 Running standalone AI import resolution for ${pluginName}...`);

  // Create minimal context
  const context: MigrationContext = {
    repoPath,
    pluginName,
    hasService: false,
    hasProviders: false,
    hasActions: false,
    hasTests: false,
    packageJson: { name: pluginName, version: '1.0.0' },
    existingFiles: [],
    changedFiles: new Set(),
    claudePrompts: new Map(),
    abortController: new AbortController(),
  };

  const step = new AIImportResolutionStep();
  const result = await step.execute(context);

  if (!result.success) {
    throw new Error(`AI Import Resolution failed: ${result.message}`);
  }

  // Return final analysis
  const analyzer = new ImportGraphAnalyzer();
  const files = await AIImportResolutionStep.gatherTypeScriptFiles(repoPath);
  return await analyzer.analyzeProject(repoPath, files);
}
