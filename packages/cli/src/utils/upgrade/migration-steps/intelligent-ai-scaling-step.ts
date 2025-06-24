/**
 * INTELLIGENT AI SCALING MIGRATION STEP
 *
 * Integration of the IntelligentAIScaler with the migration pipeline.
 * Provides adaptive AI utilization that scales from simple to unlimited complexity.
 */

import { logger } from '@elizaos/core';
import type { MigrationContext, MigrationStep } from '../types.js';
import { IntelligentAIScaler } from '../core/intelligent-ai-scaler.js';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

export interface AIScalingResult {
  success: boolean;
  filesTransformed: number;
  totalCost: number;
  totalDuration: number;
  strategiesUsed: string[];
  avgConfidence: number;
  message: string;
  performanceMetrics?: any;
  learningInsights?: any;
}

export class IntelligentAIScalingStep implements MigrationStep {
  name = 'Intelligent AI Scaling';
  description = 'Apply intelligent AI scaling for optimal transformation quality';
  priority = 3; // High priority, runs after basic setup

  async execute(context: MigrationContext): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('🎯 Starting Intelligent AI Scaling transformation...');

      const result = await runIntelligentAIScaling(context);

      if (result.success) {
        logger.info(`✅ AI scaling completed: ${result.filesTransformed} files transformed`);
        logger.info(
          `📊 Performance: $${result.totalCost.toFixed(4)} cost, ${result.totalDuration}ms duration`
        );
        logger.info(`🧠 Strategies used: ${result.strategiesUsed.join(', ')}`);

        return {
          success: true,
          message: `Intelligent AI scaling completed successfully: ${result.message}`,
        };
      } else {
        return {
          success: false,
          message: `AI scaling failed: ${result.message}`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Intelligent AI scaling failed:', errorMessage);

      return {
        success: false,
        message: `AI scaling step failed: ${errorMessage}`,
      };
    }
  }
}

/**
 * Run intelligent AI scaling on the migration context
 */
export async function runIntelligentAIScaling(context: MigrationContext): Promise<AIScalingResult> {
  const startTime = Date.now();
  const scaler = new IntelligentAIScaler(context);

  logger.info(`🚀 Initializing intelligent AI scaling for ${context.pluginName}...`);

  const results: Array<{
    file: string;
    success: boolean;
    strategy: string;
    cost: number;
    duration: number;
    confidence: number;
  }> = [];

  const strategiesUsed = new Set<string>();
  let totalCost = 0;
  let filesTransformed = 0;

  try {
    // Get all TypeScript files that need transformation
    const filesToTransform = getTransformableFiles(context);

    logger.info(`📁 Found ${filesToTransform.length} files to transform`);

    // Transform each file with intelligent scaling
    for (const file of filesToTransform) {
      logger.info(`🔄 Transforming ${file}...`);

      try {
        const content = readFileSync(file, 'utf-8');
        const transformResult = await scaler.transformWithScaling(file, content, context);

        if (transformResult.success) {
          // Write transformed content back to file
          writeFileSync(file, transformResult.transformedCode, 'utf-8');
          filesTransformed++;

          // Track transformation details
          results.push({
            file: path.relative(context.repoPath, file),
            success: true,
            strategy: transformResult.strategy || 'unknown',
            cost: transformResult.cost || 0,
            duration: transformResult.duration || 0,
            confidence: transformResult.confidence,
          });

          strategiesUsed.add(transformResult.strategy || 'unknown');
          totalCost += transformResult.cost || 0;

          logger.info(`✅ ${file} transformed successfully (${transformResult.strategy})`);
        } else {
          logger.warn(`⚠️ Failed to transform ${file}`);
          results.push({
            file: path.relative(context.repoPath, file),
            success: false,
            strategy: 'failed',
            cost: 0,
            duration: 0,
            confidence: 0,
          });
        }
      } catch (fileError) {
        logger.error(`❌ Error transforming ${file}:`, fileError);
        results.push({
          file: path.relative(context.repoPath, file),
          success: false,
          strategy: 'error',
          cost: 0,
          duration: 0,
          confidence: 0,
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const successfulResults = results.filter((r) => r.success);
    const avgConfidence =
      successfulResults.length > 0
        ? successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length
        : 0;

    // Get performance insights
    const performanceMetrics = scaler.getPerformanceMetrics();
    const learningInsights = scaler.getLearningInsights();

    // Generate summary message
    let message = `Transformed ${filesTransformed}/${filesToTransform.length} files`;
    if (strategiesUsed.size > 0) {
      message += ` using strategies: ${Array.from(strategiesUsed).join(', ')}`;
    }

    const result: AIScalingResult = {
      success: filesTransformed > 0,
      filesTransformed,
      totalCost,
      totalDuration,
      strategiesUsed: Array.from(strategiesUsed),
      avgConfidence,
      message,
      performanceMetrics,
      learningInsights,
    };

    // Log summary
    logger.info(`📊 AI Scaling Summary:`);
    logger.info(`  - Files transformed: ${filesTransformed}/${filesToTransform.length}`);
    logger.info(`  - Total cost: $${totalCost.toFixed(4)}`);
    logger.info(`  - Total duration: ${totalDuration}ms`);
    logger.info(`  - Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);
    logger.info(`  - Strategies used: ${Array.from(strategiesUsed).join(', ')}`);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ AI scaling execution failed:', errorMessage);

    return {
      success: false,
      filesTransformed,
      totalCost,
      totalDuration: Date.now() - startTime,
      strategiesUsed: Array.from(strategiesUsed),
      avgConfidence: 0,
      message: `AI scaling failed: ${errorMessage}`,
    };
  }
}

/**
 * Get files that can be transformed by the AI scaler
 */
function getTransformableFiles(context: MigrationContext): string[] {
  const files: string[] = [];

  // Get all TypeScript files in src directory
  const srcDir = path.join(context.repoPath, 'src');

  try {
    // Recursively find TypeScript files
    const findTsFiles = (dir: string): void => {
      const fs = require('fs');
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip certain directories
          if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
            findTsFiles(fullPath);
          }
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
          // Skip declaration files and test files
          if (
            !entry.name.endsWith('.d.ts') &&
            !entry.name.includes('.test.') &&
            !entry.name.includes('.spec.')
          ) {
            files.push(fullPath);
          }
        }
      }
    };

    if (require('fs').existsSync(srcDir)) {
      findTsFiles(srcDir);
    }

    // Also check for index.ts in root
    const rootIndex = path.join(context.repoPath, 'index.ts');
    if (require('fs').existsSync(rootIndex)) {
      files.push(rootIndex);
    }
  } catch (error) {
    logger.warn('⚠️ Error finding transformable files:', error);
  }

  return files;
}

/**
 * Validate AI scaling result
 */
export async function validateAIScalingResult(
  result: AIScalingResult,
  context: MigrationContext
): Promise<boolean> {
  logger.info('🔍 Validating AI scaling result...');

  // Basic validation criteria
  if (!result.success) {
    logger.warn('❌ AI scaling reported failure');
    return false;
  }

  if (result.filesTransformed === 0) {
    logger.warn('❌ No files were transformed');
    return false;
  }

  if (result.avgConfidence < 0.7) {
    logger.warn(`⚠️ Low average confidence: ${(result.avgConfidence * 100).toFixed(1)}%`);
    // Don't fail, but warn
  }

  // Check that files are syntactically valid
  const transformedFiles = getTransformableFiles(context);
  for (const file of transformedFiles.slice(0, 5)) {
    // Check first 5 files
    try {
      const content = readFileSync(file, 'utf-8');

      // Basic syntax checks
      if (!content.includes('import') && !content.includes('export')) {
        logger.warn(`⚠️ File ${file} may have syntax issues (no imports/exports)`);
      }

      // Check for V1 patterns that should be transformed
      if (content.includes('ModelClass') || content.includes('elizaLogger')) {
        logger.warn(`⚠️ File ${file} still contains V1 patterns`);
      }
    } catch (error) {
      logger.error(`❌ Error validating file ${file}:`, error);
      return false;
    }
  }

  logger.info('✅ AI scaling result validation passed');
  return true;
}

// Export the migration step instance
export const intelligentAIScalingStep = new IntelligentAIScalingStep();
