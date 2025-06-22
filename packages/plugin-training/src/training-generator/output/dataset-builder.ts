/**
 * Dataset Builder - Training Data Export and Formatting
 * 
 * Builds and exports training datasets in various formats for different platforms.
 * Supports Together.ai JSONL format, custom JSON, and analysis exports.
 */

import type { TrainingScenario } from '../core/scenario-generator';
import { elizaLogger } from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface TrainingExample {
  input: string;
  output: string;
  metadata: {
    type: string;
    source: string;
    complexity: 'simple' | 'medium' | 'complex';
    tokens: number;
    language: string;
    purpose: string;
  };
}

export interface DatasetMetrics {
  totalExamples: number;
  totalTokens: number;
  averageTokens: number;
  complexityDistribution: Record<string, number>;
  languageDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
}

export class DatasetBuilder {
  /**
   * Build training dataset from scenarios
   */
  async buildDataset(scenarios: TrainingScenario[]): Promise<TrainingExample[]> {
    elizaLogger.info(`🔧 Building dataset from ${scenarios.length} scenarios...`);
    
    const examples: TrainingExample[] = [];
    
    for (const scenario of scenarios) {
      try {
        const example = this.formatScenarioForTraining(scenario);
        examples.push(example);
      } catch (error) {
        elizaLogger.warn(`⚠️  Failed to format scenario ${scenario.id}:`, error);
      }
    }
    
    elizaLogger.info(`✅ Built dataset with ${examples.length} training examples`);
    return examples;
  }

  /**
   * Format individual scenario for training
   */
  private formatScenarioForTraining(scenario: TrainingScenario): TrainingExample {
    // Create comprehensive input context
    const input = this.buildTrainingInput(scenario);
    
    // Create structured output
    const output = this.buildTrainingOutput(scenario);
    
    return {
      input: input.trim(),
      output: output.trim(),
      metadata: {
        type: scenario.type,
        source: scenario.id,
        complexity: scenario.metadata.complexity,
        tokens: scenario.metadata.estimatedTokens,
        language: scenario.metadata.language,
        purpose: scenario.metadata.purpose
      }
    };
  }

  /**
   * Build comprehensive training input
   */
  private buildTrainingInput(scenario: TrainingScenario): string {
    let input = '';
    
    // Add user request
    input += `User Request: ${scenario.userQuery}\n\n`;
    
    // Add repository context
    input += `Repository Context: ${scenario.context.repositoryContext}\n\n`;
    
    // Add file tree for structure understanding
    if (scenario.context.fileTree) {
      input += `File Structure:\n${scenario.context.fileTree}\n\n`;
    }
    
    // Add related files context (limit to avoid token overflow)
    if (scenario.context.relatedFiles.length > 0) {
      input += 'Related Files:\n';
      const limitedFiles = scenario.context.relatedFiles.slice(0, 3);
      for (const file of limitedFiles) {
        input += `- ${file.relativePath}: ${file.purpose}\n`;
        
        // Add small content preview for context
        if (file.content.length < 500) {
          input += `  Preview: ${file.content.substring(0, 200)}...\n`;
        }
      }
      input += '\n';
    }
    
    // Add target file context
    if (scenario.context.targetFile) {
      input += `Target File: ${scenario.context.targetFile.relativePath}\n`;
      input += `Language: ${scenario.context.targetFile.language}\n`;
      input += `Purpose: ${scenario.context.targetFile.purpose}\n\n`;
    }
    
    // Add specific instructions based on scenario type
    switch (scenario.type) {
      case 'file-creation':
        input += 'Create the requested file with proper ElizaOS patterns and conventions.\n';
        break;
      case 'plugin-creation':
        input += 'Create a complete ElizaOS plugin with all necessary components.\n';
        break;
      case 'documentation':
        input += 'Provide comprehensive documentation that answers the user\'s question.\n';
        break;
    }
    
    return input;
  }

  /**
   * Build structured training output
   */
  private buildTrainingOutput(scenario: TrainingScenario): string {
    let output = '';
    
    // Add thinking process
    output += `${scenario.thinkingProcess}\n\n`;
    
    // Add the expected output
    output += scenario.expectedOutput;
    
    return output;
  }

  /**
   * Export dataset for Together.ai training (JSONL format)
   */
  async exportForTogetherAI(examples: TrainingExample[], outputPath: string): Promise<void> {
    elizaLogger.info(`📤 Exporting ${examples.length} examples for Together.ai training...`);
    
    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Format examples for Together.ai
    const jsonlLines: string[] = [];
    
    for (const example of examples) {
      // Together.ai expects messages format
      const trainingData = {
        messages: [
          {
            role: 'system',
            content: 'You are an expert ElizaOS developer. Create high-quality code following ElizaOS patterns and conventions. Always include detailed thinking processes and comprehensive implementations.'
          },
          {
            role: 'user',
            content: example.input
          },
          {
            role: 'assistant',
            content: example.output
          }
        ]
      };
      
      jsonlLines.push(JSON.stringify(trainingData));
    }
    
    // Write JSONL file
    const jsonlContent = jsonlLines.join('\n');
    await fs.writeFile(outputPath, jsonlContent, 'utf-8');
    
    elizaLogger.info(`✅ Exported Together.ai training file: ${outputPath}`);
    elizaLogger.info(`📊 File size: ${Math.round(jsonlContent.length / 1024)}KB`);
  }

  /**
   * Export dataset as structured JSON
   */
  async exportAsJSON(examples: TrainingExample[], outputPath: string): Promise<void> {
    elizaLogger.info(`📤 Exporting dataset as JSON...`);
    
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    const dataset = {
      metadata: {
        totalExamples: examples.length,
        createdAt: new Date().toISOString(),
        format: 'elizaos-training',
        version: '1.0'
      },
      examples
    };
    
    await fs.writeFile(outputPath, JSON.stringify(dataset, null, 2), 'utf-8');
    elizaLogger.info(`✅ Exported JSON dataset: ${outputPath}`);
  }

  /**
   * Export examples by category
   */
  async exportByCategoryTogetherAI(examples: TrainingExample[], outputDir: string): Promise<string[]> {
    elizaLogger.info(`📂 Exporting datasets by category...`);
    
    await fs.mkdir(outputDir, { recursive: true });
    
    // Group by type
    const categories = new Map<string, TrainingExample[]>();
    
    for (const example of examples) {
      const category = example.metadata.type;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(example);
    }
    
    const outputPaths: string[] = [];
    
    // Export each category
    for (const [category, categoryExamples] of categories.entries()) {
      const categoryPath = path.join(outputDir, `${category}-training.jsonl`);
      await this.exportForTogetherAI(categoryExamples, categoryPath);
      outputPaths.push(categoryPath);
      
      elizaLogger.info(`📁 ${category}: ${categoryExamples.length} examples`);
    }
    
    return outputPaths;
  }

  /**
   * Export examples by complexity
   */
  async exportByComplexityTogetherAI(examples: TrainingExample[], outputDir: string): Promise<string[]> {
    elizaLogger.info(`📊 Exporting datasets by complexity...`);
    
    await fs.mkdir(outputDir, { recursive: true });
    
    // Group by complexity
    const complexities = new Map<string, TrainingExample[]>();
    
    for (const example of examples) {
      const complexity = example.metadata.complexity;
      if (!complexities.has(complexity)) {
        complexities.set(complexity, []);
      }
      complexities.get(complexity)!.push(example);
    }
    
    const outputPaths: string[] = [];
    
    // Export each complexity level
    for (const [complexity, complexityExamples] of complexities.entries()) {
      const complexityPath = path.join(outputDir, `${complexity}-complexity-training.jsonl`);
      await this.exportForTogetherAI(complexityExamples, complexityPath);
      outputPaths.push(complexityPath);
      
      elizaLogger.info(`📈 ${complexity}: ${complexityExamples.length} examples`);
    }
    
    return outputPaths;
  }

  /**
   * Calculate dataset metrics
   */
  calculateMetrics(examples: TrainingExample[]): DatasetMetrics {
    const complexityDistribution: Record<string, number> = {};
    const languageDistribution: Record<string, number> = {};
    const typeDistribution: Record<string, number> = {};
    
    let totalTokens = 0;
    
    for (const example of examples) {
      // Count distributions
      complexityDistribution[example.metadata.complexity] = 
        (complexityDistribution[example.metadata.complexity] || 0) + 1;
      
      languageDistribution[example.metadata.language] = 
        (languageDistribution[example.metadata.language] || 0) + 1;
      
      typeDistribution[example.metadata.type] = 
        (typeDistribution[example.metadata.type] || 0) + 1;
      
      totalTokens += example.metadata.tokens;
    }
    
    return {
      totalExamples: examples.length,
      totalTokens,
      averageTokens: examples.length > 0 ? Math.round(totalTokens / examples.length) : 0,
      complexityDistribution,
      languageDistribution,
      typeDistribution
    };
  }

  /**
   * Export comprehensive metrics report
   */
  async exportMetrics(examples: TrainingExample[], outputPath: string): Promise<void> {
    const metrics = this.calculateMetrics(examples);
    
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalExamples: metrics.totalExamples,
        totalTokens: metrics.totalTokens,
        averageTokens: metrics.averageTokens,
        estimatedTrainingCost: this.estimateTrainingCost(metrics.totalTokens)
      },
      distributions: {
        complexity: metrics.complexityDistribution,
        language: metrics.languageDistribution,
        type: metrics.typeDistribution
      },
      recommendations: this.generateRecommendations(metrics)
    };
    
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8');
    elizaLogger.info(`📊 Metrics report exported: ${outputPath}`);
  }

  /**
   * Estimate training cost based on token count
   */
  private estimateTrainingCost(totalTokens: number): {
    tokensFormatted: string;
    estimatedCostUSD: number;
    trainingTimeHours: number;
  } {
    // Together.ai pricing estimates (approximate)
    const costPerMillionTokens = 5.0; // USD
    const tokensPerHour = 1000000; // Rough training speed
    
    const costUSD = (totalTokens / 1000000) * costPerMillionTokens;
    const trainingHours = totalTokens / tokensPerHour;
    
    return {
      tokensFormatted: this.formatNumber(totalTokens),
      estimatedCostUSD: Math.round(costUSD * 100) / 100,
      trainingTimeHours: Math.round(trainingHours * 10) / 10
    };
  }

  /**
   * Generate training recommendations
   */
  private generateRecommendations(metrics: DatasetMetrics): string[] {
    const recommendations: string[] = [];
    
    // Token count recommendations
    if (metrics.totalTokens < 100000) {
      recommendations.push('Consider generating more training examples for better model performance');
    } else if (metrics.totalTokens > 10000000) {
      recommendations.push('Dataset is quite large - consider filtering or sampling for faster training');
    }
    
    // Complexity balance
    const simpleRatio = (metrics.complexityDistribution.simple || 0) / metrics.totalExamples;
    const complexRatio = (metrics.complexityDistribution.complex || 0) / metrics.totalExamples;
    
    if (simpleRatio > 0.6) {
      recommendations.push('Consider adding more medium and complex examples for comprehensive learning');
    }
    if (complexRatio < 0.1) {
      recommendations.push('Add more complex examples to handle advanced use cases');
    }
    
    // Type distribution
    const typeCount = Object.keys(metrics.typeDistribution).length;
    if (typeCount < 3) {
      recommendations.push('Consider adding more diverse scenario types (file-creation, plugin-creation, documentation)');
    }
    
    // Token size
    if (metrics.averageTokens > 4000) {
      recommendations.push('Average token count is high - consider splitting large examples');
    } else if (metrics.averageTokens < 500) {
      recommendations.push('Average token count is low - consider adding more context or detail');
    }
    
    return recommendations;
  }

  /**
   * Validate dataset quality
   */
  async validateDataset(examples: TrainingExample[]): Promise<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Check for empty examples
    const emptyExamples = examples.filter(e => !e.input.trim() || !e.output.trim());
    if (emptyExamples.length > 0) {
      errors.push(`Found ${emptyExamples.length} examples with empty input or output`);
    }
    
    // Check token distribution
    const metrics = this.calculateMetrics(examples);
    
    if (metrics.averageTokens > 8000) {
      warnings.push('Average token count is very high, may cause training issues');
    }
    
    if (metrics.totalExamples < 10) {
      warnings.push('Very few training examples, model may not train effectively');
    }
    
    // Check for duplicate inputs
    const inputSet = new Set();
    let duplicates = 0;
    for (const example of examples) {
      if (inputSet.has(example.input)) {
        duplicates++;
      } else {
        inputSet.add(example.input);
      }
    }
    
    if (duplicates > 0) {
      warnings.push(`Found ${duplicates} duplicate inputs`);
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Format number for display
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}

elizaLogger.info('✅ Dataset builder module loaded');