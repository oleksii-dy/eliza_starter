/**
 * Training Orchestrator - Main Controller for Training Data Generation
 * 
 * Orchestrates the complete training data generation pipeline:
 * 1. Repository cloning and processing
 * 2. File extraction and analysis
 * 3. Scenario generation for all components
 * 4. Dataset building and export
 */

import type { IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { RepositoryCloner, type RepositoryInfo } from './core/repo-cloner';
import { FileExtractor, type ExtractedFile, type ExtractionResult } from './core/file-extractor';
import { ScenarioGenerator, type TrainingScenario, type ScenarioGenerationOptions } from './core/scenario-generator';

// Re-export for convenience
export type { TrainingScenario } from './core/scenario-generator';
import { PluginProcessor } from './plugins/plugin-processor';
import { DatasetBuilder } from './output/dataset-builder';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface TrainingGenerationConfig {
  workspaceDir: string;
  outputDir: string;
  coreRepoUrl: string;
  maxScenariosPerPlugin: number;
  maxScenariosPerCore: number;
  includeTests: boolean;
  includeConfig: boolean;
  includeComplex: boolean;
  temperature: number;
}

export interface GenerationProgress {
  phase: string;
  current: number;
  total: number;
  message: string;
}

export interface GenerationResult {
  totalScenarios: number;
  coreScenarios: number;
  pluginScenarios: number;
  docScenarios: number;
  totalTokens: number;
  processingTime: number;
  outputPaths: string[];
  statistics: GenerationStatistics;
}

export interface GenerationStatistics {
  repositories: {
    core: number;
    plugins: number;
    failed: number;
  };
  files: {
    total: number;
    typescript: number;
    javascript: number;
    markdown: number;
    config: number;
  };
  scenarios: {
    simple: number;
    medium: number;
    complex: number;
  };
  components: {
    actions: number;
    providers: number;
    evaluators: number;
    services: number;
  };
}

export class TrainingOrchestrator {
  private readonly DEFAULT_CONFIG: TrainingGenerationConfig = {
    workspaceDir: './training-workspace',
    outputDir: './training-output',
    coreRepoUrl: 'https://github.com/elizaOS/eliza.git',
    maxScenariosPerPlugin: 50,
    maxScenariosPerCore: 500,
    includeTests: false,
    includeConfig: false,
    includeComplex: true,
    temperature: 0.7
  };

  private repoCloner: RepositoryCloner;
  private fileExtractor: FileExtractor;
  private scenarioGenerator: ScenarioGenerator;
  private pluginProcessor: PluginProcessor;
  private datasetBuilder: DatasetBuilder;

  private progressCallback?: (progress: GenerationProgress) => void;

  constructor(
    private runtime: IAgentRuntime,
    private config: Partial<TrainingGenerationConfig> = {}
  ) {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    this.repoCloner = new RepositoryCloner(finalConfig.workspaceDir);
    this.fileExtractor = new FileExtractor();
    this.scenarioGenerator = new ScenarioGenerator(runtime);
    this.pluginProcessor = new PluginProcessor(runtime);
    this.datasetBuilder = new DatasetBuilder();
  }

  /**
   * Generate complete training dataset
   */
  async generateTrainingDataset(progressCallback?: (progress: GenerationProgress) => void): Promise<GenerationResult> {
    const startTime = Date.now();
    this.progressCallback = progressCallback;

    elizaLogger.info('🚀 Starting comprehensive training data generation...');
    
    try {
      // Ensure output directory exists
      await this.ensureDirectories();

      // Phase 1: Repository Cloning
      this.reportProgress('Repository Cloning', 0, 100, 'Cloning ElizaOS repositories...');
      const repositories = await this.cloneAllRepositories();

      // Phase 2: File Extraction  
      this.reportProgress('File Extraction', 20, 100, 'Extracting and analyzing files...');
      const extractedData = await this.extractAllFiles(repositories);

      // Phase 3: Core Scenarios
      this.reportProgress('Core Scenarios', 40, 100, 'Generating core framework scenarios...');
      const coreScenarios = await this.generateCoreScenarios(extractedData.core);

      // Phase 4: Plugin Scenarios
      this.reportProgress('Plugin Scenarios', 60, 100, 'Generating plugin scenarios...');
      const pluginScenarios = await this.generatePluginScenarios(extractedData.plugins);

      // Phase 5: Documentation Scenarios
      this.reportProgress('Documentation Scenarios', 80, 100, 'Generating documentation scenarios...');
      const docScenarios = await this.generateDocumentationScenarios(extractedData.docs);

      // Phase 6: Dataset Building
      this.reportProgress('Dataset Building', 90, 100, 'Building and exporting datasets...');
      const allScenarios = [...coreScenarios, ...pluginScenarios, ...docScenarios];
      const outputPaths = await this.buildAndExportDatasets(allScenarios);

      // Phase 7: Statistics and Cleanup
      this.reportProgress('Finalizing', 95, 100, 'Generating statistics and cleaning up...');
      const statistics = await this.generateStatistics(repositories, extractedData, allScenarios);
      
      // Save comprehensive report
      await this.saveGenerationReport({
        totalScenarios: allScenarios.length,
        coreScenarios: coreScenarios.length,
        pluginScenarios: pluginScenarios.length,
        docScenarios: docScenarios.length,
        totalTokens: allScenarios.reduce((sum, s) => sum + s.metadata.estimatedTokens, 0),
        processingTime: Date.now() - startTime,
        outputPaths,
        statistics
      });

      this.reportProgress('Complete', 100, 100, `Generated ${allScenarios.length} training scenarios successfully!`);

      elizaLogger.info('🎉 Training data generation completed successfully!');
      elizaLogger.info(`📊 Generated ${allScenarios.length} total scenarios`);
      elizaLogger.info(`⏱️  Processing time: ${Math.round((Date.now() - startTime) / 1000)}s`);

      return {
        totalScenarios: allScenarios.length,
        coreScenarios: coreScenarios.length,
        pluginScenarios: pluginScenarios.length,
        docScenarios: docScenarios.length,
        totalTokens: allScenarios.reduce((sum, s) => sum + s.metadata.estimatedTokens, 0),
        processingTime: Date.now() - startTime,
        outputPaths,
        statistics
      };

    } catch (error) {
      elizaLogger.error('❌ Training data generation failed:', error);
      throw error;
    }
  }

  /**
   * Clone all required repositories
   */
  private async cloneAllRepositories(): Promise<{
    core: RepositoryInfo;
    plugins: RepositoryInfo[];
  }> {
    // Clone main ElizaOS repository
    const coreRepo = await this.repoCloner.cloneMainRepository();
    
    // Clone all plugin repositories
    const pluginRepos = await this.repoCloner.cloneAllPluginRepositories();

    elizaLogger.info(`✅ Cloned ${1 + pluginRepos.length} repositories`);
    elizaLogger.info(`   Core: ${coreRepo.name}`);
    elizaLogger.info(`   Plugins: ${pluginRepos.length}`);

    return {
      core: coreRepo,
      plugins: pluginRepos
    };
  }

  /**
   * Extract files from all repositories
   */
  private async extractAllFiles(repositories: {
    core: RepositoryInfo;
    plugins: RepositoryInfo[];
  }): Promise<{
    core: ExtractionResult;
    plugins: Map<string, ExtractionResult>;
    docs: ExtractionResult;
  }> {
    // Extract core files
    const coreResult = await this.fileExtractor.extractAllFiles(repositories.core.localPath);
    
    // Extract plugin files in parallel for better performance
    elizaLogger.info(`📁 Extracting files from ${repositories.plugins.length} plugins in parallel...`);
    const pluginExtractionPromises = repositories.plugins.map(async (plugin) => {
      try {
        const result = await this.fileExtractor.extractAllFiles(plugin.localPath);
        return { name: plugin.name, result };
      } catch (error) {
        elizaLogger.warn(`⚠️  Failed to extract files from ${plugin.name}:`, error);
        return null;
      }
    });

    const pluginExtractions = await Promise.all(pluginExtractionPromises);
    const pluginResults = new Map<string, ExtractionResult>();
    
    for (const extraction of pluginExtractions) {
      if (extraction) {
        pluginResults.set(extraction.name, extraction.result);
      }
    }

    // Extract docs (from core repo docs folder)
    const docsPath = path.join(repositories.core.localPath, 'docs');
    let docsResult: ExtractionResult;
    try {
      docsResult = await this.fileExtractor.extractAllFiles(docsPath);
    } catch (error) {
      elizaLogger.warn('⚠️  No docs folder found, creating empty result');
      docsResult = {
        files: [],
        totalFiles: 0,
        totalSize: 0,
        languages: {},
        fileTypes: {},
        extractionTime: 0
      };
    }

    const totalFiles = coreResult.totalFiles + 
      Array.from(pluginResults.values()).reduce((sum, r) => sum + r.totalFiles, 0) +
      docsResult.totalFiles;

    elizaLogger.info(`📁 Extracted ${totalFiles} total files`);
    elizaLogger.info(`   Core: ${coreResult.totalFiles} files`);
    elizaLogger.info(`   Plugins: ${Array.from(pluginResults.values()).reduce((sum, r) => sum + r.totalFiles, 0)} files`);
    elizaLogger.info(`   Docs: ${docsResult.totalFiles} files`);

    return {
      core: coreResult,
      plugins: pluginResults,
      docs: docsResult
    };
  }

  /**
   * Generate scenarios for core framework
   */
  private async generateCoreScenarios(coreResult: ExtractionResult): Promise<TrainingScenario[]> {
    const config = { ...this.DEFAULT_CONFIG, ...this.config };
    
    const options: Partial<ScenarioGenerationOptions> = {
      maxScenariosPerType: config.maxScenariosPerCore,
      includeComplexFiles: config.includeComplex,
      includeTestFiles: config.includeTests,
      includeConfigFiles: config.includeConfig,
      temperature: config.temperature
    };

    return await this.scenarioGenerator.generateFileCreationScenarios(
      coreResult.files,
      'core',
      options
    );
  }

  /**
   * Generate scenarios for all plugins
   */
  private async generatePluginScenarios(pluginResults: Map<string, ExtractionResult>): Promise<TrainingScenario[]> {
    elizaLogger.info(`🔌 Processing ${pluginResults.size} plugins in parallel...`);
    
    // Process plugins in parallel for better performance
    const pluginPromises = Array.from(pluginResults.entries()).map(async ([pluginName, result]) => {
      try {
        elizaLogger.info(`🔌 Processing plugin: ${pluginName}`);
        
        const scenarios = await this.pluginProcessor.processPlugin('', result.files);
        
        elizaLogger.info(`✅ Generated ${scenarios.length} scenarios for ${pluginName}`);
        return scenarios;
        
      } catch (error) {
        elizaLogger.warn(`⚠️  Failed to process plugin ${pluginName}:`, error);
        return []; // Return empty array on error
      }
    });

    // Wait for all plugins to be processed
    const pluginScenarios = await Promise.all(pluginPromises);
    
    // Flatten results
    const allScenarios = pluginScenarios.flat();
    elizaLogger.info(`🎉 Generated ${allScenarios.length} total plugin scenarios`);
    
    return allScenarios;
  }

  /**
   * Generate scenarios for documentation
   */
  private async generateDocumentationScenarios(docsResult: ExtractionResult): Promise<TrainingScenario[]> {
    // Filter to markdown files only
    const docFiles = docsResult.files.filter(f => f.language === 'markdown');
    
    elizaLogger.info(`📚 Processing ${docFiles.length} documentation files in parallel...`);
    
    // Process documentation files in parallel for better performance
    const docPromises = docFiles.map(async (docFile) => {
      try {
        return await this.generateDocScenario(docFile);
      } catch (error) {
        elizaLogger.warn(`⚠️  Failed to generate doc scenario for ${docFile.relativePath}:`, error);
        return null;
      }
    });

    // Wait for all docs to be processed and filter out null results
    const docScenarios = await Promise.all(docPromises);
    const scenarios = docScenarios.filter((scenario): scenario is TrainingScenario => scenario !== null);

    elizaLogger.info(`📚 Generated ${scenarios.length} documentation scenarios`);
    return scenarios;
  }

  /**
   * Generate scenario for a documentation file
   */
  private async generateDocScenario(docFile: ExtractedFile): Promise<TrainingScenario> {
    // Generate question about the documentation
    const userQuery = await this.generateDocQuestion(docFile);
    
    // Generate thinking process for documentation
    const thinkingProcess = await this.generateDocThinking(docFile, userQuery);
    
    return {
      id: `doc-${docFile.relativePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
      type: 'documentation',
      userQuery,
      context: {
        fileTree: docFile.relativePath,
        relatedFiles: [],
        targetFile: docFile,
        repositoryContext: 'ElizaOS Documentation'
      },
      thinkingProcess,
      expectedOutput: docFile.content,
      metadata: {
        complexity: 'medium',
        estimatedTokens: this.estimateTokens(userQuery + thinkingProcess + docFile.content),
        language: 'markdown',
        purpose: 'documentation',
        generationTime: Date.now()
      }
    };
  }

  /**
   * Generate question for documentation
   */
  private async generateDocQuestion(docFile: ExtractedFile): Promise<string> {
    const prompt = `
Generate a question that this documentation file would answer:

File: ${docFile.relativePath}
Content preview: ${docFile.content.substring(0, 500)}...

Create a question that someone learning ElizaOS would ask that this documentation addresses.
Make it natural and specific.`;

    const response = await this.runtime.useModel('TEXT_LARGE', {
      prompt,
      temperature: 0.7,
      max_tokens: 100
    });

    return (response as string).trim();
  }

  /**
   * Generate thinking process for documentation
   */
  private async generateDocThinking(docFile: ExtractedFile, userQuery: string): Promise<string> {
    const prompt = `
Generate thinking process for creating this documentation:

Question: ${userQuery}
Documentation file: ${docFile.relativePath}

Create a thinking process about:
1. Understanding what the user needs to know
2. How to structure the documentation
3. What examples to include
4. How to make it clear and useful

Keep it concise but thorough.`;

    const response = await this.runtime.useModel('TEXT_LARGE', {
      prompt,
      temperature: 0.5,
      max_tokens: 300
    });

    return `<thinking>\n${response}\n</thinking>`;
  }

  /**
   * Build and export datasets in multiple formats
   */
  private async buildAndExportDatasets(scenarios: TrainingScenario[]): Promise<string[]> {
    const config = { ...this.DEFAULT_CONFIG, ...this.config };
    const outputPaths: string[] = [];

    // Build training examples
    const examples = await this.datasetBuilder.buildDataset(scenarios);

    // Export for Together.ai (JSONL format)
    const togetherPath = path.join(config.outputDir, 'together-ai-training.jsonl');
    await this.datasetBuilder.exportForTogetherAI(examples, togetherPath);
    outputPaths.push(togetherPath);

    // Export as JSON for analysis
    const jsonPath = path.join(config.outputDir, 'training-scenarios.json');
    await fs.writeFile(jsonPath, JSON.stringify(scenarios, null, 2), 'utf-8');
    outputPaths.push(jsonPath);

    // Export statistics
    const statsPath = path.join(config.outputDir, 'generation-statistics.json');
    const stats = this.scenarioGenerator.getScenarioStatistics(scenarios);
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2), 'utf-8');
    outputPaths.push(statsPath);

    elizaLogger.info(`💾 Exported datasets to ${outputPaths.length} files`);
    return outputPaths;
  }

  /**
   * Generate comprehensive statistics
   */
  private async generateStatistics(
    repositories: { core: RepositoryInfo; plugins: RepositoryInfo[] },
    extractedData: any,
    scenarios: TrainingScenario[]
  ): Promise<GenerationStatistics> {
    // Repository statistics
    const repoStats = {
      core: 1,
      plugins: repositories.plugins.length,
      failed: 0 // Would track failed repos in real implementation
    };

    // File statistics
    const allFiles = [
      ...extractedData.core.files,
      ...Array.from(extractedData.plugins.values()).flatMap((r: any) => r.files),
      ...extractedData.docs.files
    ];

    const fileStats = {
      total: allFiles.length,
      typescript: allFiles.filter((f: any) => f.language.includes('typescript')).length,
      javascript: allFiles.filter((f: any) => f.language.includes('javascript')).length,
      markdown: allFiles.filter((f: any) => f.language === 'markdown').length,
      config: allFiles.filter((f: any) => f.isConfigFile).length
    };

    // Scenario statistics
    const scenarioStats = {
      simple: scenarios.filter(s => s.metadata.complexity === 'simple').length,
      medium: scenarios.filter(s => s.metadata.complexity === 'medium').length,
      complex: scenarios.filter(s => s.metadata.complexity === 'complex').length
    };

    // Component statistics
    const componentStats = {
      actions: scenarios.filter(s => s.metadata.purpose.includes('action')).length,
      providers: scenarios.filter(s => s.metadata.purpose.includes('provider')).length,
      evaluators: scenarios.filter(s => s.metadata.purpose.includes('evaluator')).length,
      services: scenarios.filter(s => s.metadata.purpose.includes('service')).length
    };

    return {
      repositories: repoStats,
      files: fileStats,
      scenarios: scenarioStats,
      components: componentStats
    };
  }

  /**
   * Save comprehensive generation report
   */
  private async saveGenerationReport(result: GenerationResult): Promise<void> {
    const config = { ...this.DEFAULT_CONFIG, ...this.config };
    const reportPath = path.join(config.outputDir, 'generation-report.json');
    
    const report = {
      ...result,
      timestamp: new Date().toISOString(),
      config: config
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    elizaLogger.info(`📊 Generation report saved to: ${reportPath}`);
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const config = { ...this.DEFAULT_CONFIG, ...this.config };
    await fs.mkdir(config.workspaceDir, { recursive: true });
    await fs.mkdir(config.outputDir, { recursive: true });
  }

  /**
   * Report progress to callback
   */
  private reportProgress(phase: string, current: number, total: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback({ phase, current, total, message });
    }
  }

  /**
   * Estimate token count
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Cleanup workspace
   */
  async cleanup(): Promise<void> {
    await this.repoCloner.cleanup();
  }
}

elizaLogger.info('✅ Training orchestrator module loaded');