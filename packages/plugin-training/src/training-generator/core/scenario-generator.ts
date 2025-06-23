/**
 * Scenario Generator - Core Infrastructure for Training Data Generation
 * 
 * Generates realistic training scenarios for file creation with detailed thinking processes.
 * Creates user queries, thinking workflows, and expected outputs for model training.
 */

import type { ExtractedFile } from './file-extractor';
import type { IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import * as path from 'path';

export interface TrainingScenario {
  id: string;
  type: 'file-creation' | 'plugin-creation' | 'documentation';
  userQuery: string;
  context: {
    fileTree: string;
    relatedFiles: ExtractedFile[];
    targetFile: ExtractedFile;
    repositoryContext: string;
  };
  thinkingProcess: string;
  expectedOutput: string;
  metadata: {
    complexity: 'simple' | 'medium' | 'complex';
    estimatedTokens: number;
    language: string;
    purpose: string;
    generationTime: number;
  };
}

export interface ScenarioGenerationOptions {
  maxScenariosPerType: number;
  includeComplexFiles: boolean;
  includeTestFiles: boolean;
  includeConfigFiles: boolean;
  temperature: number;
  maxTokensPerScenario: number;
}

export class ScenarioGenerator {
  private readonly DEFAULT_OPTIONS: ScenarioGenerationOptions = {
    maxScenariosPerType: 100,
    includeComplexFiles: true,
    includeTestFiles: false,
    includeConfigFiles: false,
    temperature: 0.7,
    maxTokensPerScenario: 2000
  };

  constructor(private runtime: IAgentRuntime) {}

  /**
   * Generate training scenarios for file creation
   */
  async generateFileCreationScenarios(
    files: ExtractedFile[], 
    repositoryType: 'core' | 'plugin' = 'core',
    options: Partial<ScenarioGenerationOptions> = {}
  ): Promise<TrainingScenario[]> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const scenarios: TrainingScenario[] = [];
    
    elizaLogger.info(`🎯 Generating training scenarios for ${files.length} files...`);
    
    // Filter files based on options
    const filteredFiles = this.filterFilesForScenarios(files, opts);
    
    elizaLogger.info(`📋 Processing ${filteredFiles.length} filtered files for scenarios`);
    
    // Process scenarios in parallel batches for better performance
    const filesToProcess = filteredFiles.slice(0, opts.maxScenariosPerType);
    const batchSize = 10; // Process 10 files at a time to avoid overwhelming the system
    
    for (let i = 0; i < filesToProcess.length; i += batchSize) {
      const batch = filesToProcess.slice(i, Math.min(i + batchSize, filesToProcess.length));
      
      const batchPromises = batch.map(async (file) => {
        try {
          return await this.createFileScenario(file, files, repositoryType, opts);
        } catch (error) {
          elizaLogger.warn(`⚠️  Failed to generate scenario for ${file.relativePath}:`, error instanceof Error ? error.message : String(error));
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      const validScenarios = batchResults.filter((scenario): scenario is TrainingScenario => scenario !== null);
      scenarios.push(...validScenarios);
      
      elizaLogger.info(`✅ Generated ${scenarios.length}/${filesToProcess.length} scenarios (batch ${Math.floor(i / batchSize) + 1})`);
    }
    
    elizaLogger.info(`🎉 Generated ${scenarios.length} file creation scenarios`);
    return scenarios;
  }

  /**
   * Create a single file creation scenario
   */
  private async createFileScenario(
    targetFile: ExtractedFile, 
    allFiles: ExtractedFile[], 
    repositoryType: 'core' | 'plugin',
    options: ScenarioGenerationOptions
  ): Promise<TrainingScenario> {
    const startTime = Date.now();
    
    // Generate user query for creating this file
    const userQuery = await this.generateUserQuery(targetFile, repositoryType);
    
    // Find related files (imports, similar purpose)
    const relatedFiles = this.findRelatedFiles(targetFile, allFiles);
    
    // Generate file tree
    const fileTree = this.generateFileTree(allFiles);
    
    // Generate repository context
    const repositoryContext = this.generateRepositoryContext(allFiles, repositoryType);
    
    // Generate thinking process
    const thinkingProcess = await this.generateThinkingProcess(targetFile, relatedFiles, userQuery, repositoryType);
    
    // Format expected output
    const expectedOutput = this.formatFileOutput(targetFile);
    
    const generationTime = Date.now() - startTime;
    const estimatedTokens = this.estimateTokens(userQuery + thinkingProcess + expectedOutput);
    
    return {
      id: `file-${repositoryType}-${targetFile.relativePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
      type: 'file-creation',
      userQuery,
      context: {
        fileTree,
        relatedFiles,
        targetFile,
        repositoryContext
      },
      thinkingProcess,
      expectedOutput,
      metadata: {
        complexity: targetFile.complexity,
        estimatedTokens,
        language: targetFile.language,
        purpose: targetFile.purpose,
        generationTime
      }
    };
  }

  /**
   * Generate realistic user query for file creation
   */
  private async generateUserQuery(file: ExtractedFile, repositoryType: 'core' | 'plugin'): Promise<string> {
    const contextMap = {
      'core': 'ElizaOS core framework',
      'plugin': 'ElizaOS plugin'
    };
    
    const prompt = `
Generate a realistic user request that would lead to creating this file in the ${contextMap[repositoryType]}:

File: ${file.relativePath}
Language: ${file.language}
Purpose: ${file.purpose}
Complexity: ${file.complexity}
Exports: ${file.exports.join(', ')}

Content preview (first 300 chars):
${file.content.substring(0, 300)}...

Requirements:
1. Make it sound like a natural request from a developer
2. Be specific about what functionality they need
3. Mention relevant ElizaOS concepts if applicable (actions, providers, evaluators, services)
4. Keep it concise but detailed enough to understand the requirements
5. Don't mention the specific file name or path

Generate only the user request, nothing else.`;

    const response = await this.runtime.useModel('TEXT_LARGE', {
      prompt,
      temperature: 0.7,
      max_tokens: 200
    });

    return (response as string).trim();
  }

  /**
   * Generate detailed thinking process
   */
  private async generateThinkingProcess(
    targetFile: ExtractedFile, 
    relatedFiles: ExtractedFile[], 
    userQuery: string,
    repositoryType: 'core' | 'plugin'
  ): Promise<string> {
    const prompt = `
Generate a detailed thinking process for creating this file based on the user's request.

User Request: ${userQuery}

Target File Details:
- Path: ${targetFile.relativePath}
- Language: ${targetFile.language}
- Purpose: ${targetFile.purpose}
- Complexity: ${targetFile.complexity}
- Exports: ${targetFile.exports.join(', ')}
- Dependencies: ${targetFile.dependencies.slice(0, 5).join(', ')}

Related Files:
${relatedFiles.slice(0, 3).map(f => `- ${f.relativePath}: ${f.purpose}`).join('\n')}

Repository Type: ${repositoryType === 'core' ? 'ElizaOS Core Framework' : 'ElizaOS Plugin'}

Create a comprehensive thinking process that includes:

1. **Understanding Requirements**: Analyze what the user actually needs
2. **Architecture Planning**: High-level design decisions and approach
3. **ElizaOS Integration**: How this fits into the ElizaOS ecosystem
4. **File Structure**: Why this file goes in this location
5. **Implementation Strategy**: Step-by-step approach to building this
6. **Function Design**: Key functions and their purposes
7. **Dependencies**: What imports and dependencies are needed
8. **Error Handling**: How to handle potential issues
9. **Testing Considerations**: How this code should be tested
10. **Integration Points**: How this connects with other parts of the system

Make this realistic - think like a senior ElizaOS developer working through this problem.
Be specific about ElizaOS patterns, conventions, and best practices.
Include reasoning about imports from @elizaos/core and other packages.

Format as natural thinking, not as a numbered list.`;

    const response = await this.runtime.useModel('TEXT_LARGE', {
      prompt,
      temperature: 0.5,
      max_tokens: 1500
    });

    return `<thinking>\n${response}\n</thinking>`;
  }

  /**
   * Find files related to the target file
   */
  private findRelatedFiles(targetFile: ExtractedFile, allFiles: ExtractedFile[]): ExtractedFile[] {
    const related: ExtractedFile[] = [];
    const targetDir = path.dirname(targetFile.relativePath);
    
    for (const file of allFiles) {
      if (file.path === targetFile.path) continue;
      
      let relevanceScore = 0;
      
      // Same directory
      if (path.dirname(file.relativePath) === targetDir) {
        relevanceScore += 3;
      }
      
      // Shared dependencies
      const sharedDeps = targetFile.dependencies.filter(dep => 
        file.dependencies.includes(dep)
      ).length;
      relevanceScore += sharedDeps * 2;
      
      // Similar purpose
      const targetPurposes = targetFile.purpose.split(', ');
      const filePurposes = file.purpose.split(', ');
      const sharedPurposes = targetPurposes.filter(purpose => 
        filePurposes.includes(purpose)
      ).length;
      relevanceScore += sharedPurposes * 2;
      
      // Same language
      if (file.language === targetFile.language) {
        relevanceScore += 1;
      }
      
      // Import relationships
      if (targetFile.imports.some(imp => imp.includes(file.relativePath.replace(/\.[^.]+$/, '')))) {
        relevanceScore += 4;
      }
      if (file.imports.some(imp => imp.includes(targetFile.relativePath.replace(/\.[^.]+$/, '')))) {
        relevanceScore += 4;
      }
      
      if (relevanceScore > 0) {
        related.push({ ...file, relevanceScore } as any);
      }
    }
    
    // Sort by relevance and return top 5
    return related
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }

  /**
   * Generate file tree representation
   */
  private generateFileTree(files: ExtractedFile[]): string {
    const tree: Record<string, any> = {};
    
    // Build tree structure
    for (const file of files) {
      const parts = file.relativePath.split('/');
      let current = tree;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          // Leaf node - store file info
          current[part] = {
            type: 'file',
            language: file.language,
            purpose: file.purpose.split(', ')[0] // First purpose only
          };
        } else {
          // Directory node
          current[part] = current[part] || { type: 'directory' };
          current = current[part];
        }
      }
    }
    
    return this.formatTree(tree, 0);
  }

  /**
   * Format tree structure as text
   */
  private formatTree(obj: any, depth: number): string {
    const indent = '  '.repeat(depth);
    let result = '';
    
    const entries = Object.entries(obj).filter(([key]) => key !== 'type');
    
    for (const [key, value] of entries) {
      if (typeof value === 'object' && value !== null && (value as any).type === 'file') {
        result += `${indent}├── ${key} (${(value as any).language})\n`;
      } else if (typeof value === 'object' && value !== null && (value as any).type === 'directory') {
        result += `${indent}├── ${key}/\n`;
        result += this.formatTree(value, depth + 1);
      }
    }
    
    return result;
  }

  /**
   * Generate repository context description
   */
  private generateRepositoryContext(files: ExtractedFile[] repositoryType: 'core' | 'plugin'): string {
    const stats = this.getFileStatistics(files);
    
    if (repositoryType === 'core') {
      return `ElizaOS Core Framework - A comprehensive AI agent framework with ${stats.totalFiles} files including actions, providers, evaluators, services, and core utilities. Main components: ${Object.keys(stats.purposeDistribution).slice(0, 5).join(', ')}.`;
    } else {
      return `ElizaOS Plugin - An extension plugin with ${stats.totalFiles} files. Plugin components: ${Object.keys(stats.purposeDistribution).slice(0, 3).join(', ')}.`;
    }
  }

  /**
   * Format file output with XML markup
   */
  private formatFileOutput(file: ExtractedFile): string {
    return `<file path="${file.relativePath}" language="${file.language}" purpose="${file.purpose}">
${file.content}
</file>`;
  }

  /**
   * Filter files for scenario generation
   */
  private filterFilesForScenarios(files: ExtractedFile[] options: ScenarioGenerationOptions): ExtractedFile[] {
    return files.filter(file => {
      // Skip test files if not included
      if (!options.includeTestFiles && file.isTestFile) return false;
      
      // Skip config files if not included
      if (!options.includeConfigFiles && file.isConfigFile) return false;
      
      // Skip complex files if not included
      if (!options.includeComplexFiles && file.complexity === 'complex') return false;
      
      // Skip very small files (likely not useful for training)
      if (file.size < 100) return false;
      
      // Skip very large files (might exceed token limits)
      if (file.size > 50000) return false;
      
      return true;
    });
  }

  /**
   * Estimate token count for text
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Get file statistics
   */
  private getFileStatistics(files: ExtractedFile[]): {
    totalFiles: number;
    languageDistribution: Record<string, number>;
    purposeDistribution: Record<string, number>;
  } {
    const languageDistribution: Record<string, number> = {};
    const purposeDistribution: Record<string, number> = {};
    
    files.forEach(file => {
      languageDistribution[file.language] = (languageDistribution[file.language] || 0) + 1;
      
      file.purpose.split(', ').forEach(purpose => {
        purposeDistribution[purpose] = (purposeDistribution[purpose] || 0) + 1;
      });
    });
    
    return {
      totalFiles: files.length,
      languageDistribution,
      purposeDistribution
    };
  }

  /**
   * Generate scenario statistics
   */
  getScenarioStatistics(scenarios: TrainingScenario[]): {
    totalScenarios: number;
    averageTokens: number;
    complexityDistribution: Record<string, number>;
    languageDistribution: Record<string, number>;
    totalEstimatedTokens: number;
  } {
    const complexityDistribution: Record<string, number> = {};
    const languageDistribution: Record<string, number> = {};
    let totalTokens = 0;
    
    scenarios.forEach(scenario => {
      complexityDistribution[scenario.metadata.complexity] = (complexityDistribution[scenario.metadata.complexity] || 0) + 1;
      languageDistribution[scenario.metadata.language] = (languageDistribution[scenario.metadata.language] || 0) + 1;
      totalTokens += scenario.metadata.estimatedTokens;
    });
    
    return {
      totalScenarios: scenarios.length,
      averageTokens: scenarios.length > 0 ? Math.round(totalTokens / scenarios.length) : 0,
      complexityDistribution,
      languageDistribution,
      totalEstimatedTokens: totalTokens
    };
  }
}

elizaLogger.info('✅ Scenario generator module loaded');