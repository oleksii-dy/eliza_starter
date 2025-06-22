import {
  type IAgentRuntime,
  type UUID,
  elizaLogger,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import {
  type TrainingDataPoint,
  type CodeGenerationSuccess,
  type PluginCreationEvent,
  type MCPCreationEvent,
} from '../types.js';
import { ThinkingBlockGenerator } from './thinking-block-generator.js';
import { JSONLDatasetProcessor } from './jsonl-dataset-processor.js';
import { getTrainingConfig } from '../config/training-config.js';

/**
 * Automated data collector for successful code generations
 * Monitors plugin and MCP creation events to build training datasets
 */
export class AutomatedDataCollector {
  private thinkingGenerator: ThinkingBlockGenerator;
  private datasetProcessor: JSONLDatasetProcessor;
  private collectedData: TrainingDataPoint[] = [];
  private isCollecting = false;
  private config: ReturnType<typeof getTrainingConfig>;

  constructor(private runtime: IAgentRuntime) {
    this.config = getTrainingConfig(runtime);
    this.thinkingGenerator = new ThinkingBlockGenerator(runtime);
    this.datasetProcessor = new JSONLDatasetProcessor(runtime);
  }

  async initialize(): Promise<void> {
    elizaLogger.info('Initializing Automated Data Collector');
    
    // Set up event listeners for successful code generations
    this.setupEventListeners();
    
    elizaLogger.info('Automated Data Collector initialized');
  }

  /**
   * Start collecting training data
   */
  async startCollection(config?: {
    autoSave?: boolean;
    saveInterval?: number;
    maxDataPoints?: number;
  }): Promise<void> {
    this.isCollecting = true;
    elizaLogger.info('Started automated data collection');

    if (config?.autoSave) {
      this.setupAutoSave(config.saveInterval || this.config.getAutomationConfig().dataCollection.saveInterval);
    }
  }

  /**
   * Stop collecting training data
   */
  async stopCollection(): Promise<void> {
    this.isCollecting = false;
    elizaLogger.info('Stopped automated data collection');
  }

  /**
   * Handle successful plugin creation
   */
  async handlePluginSuccess(event: PluginCreationEvent): Promise<void> {
    if (!this.isCollecting) return;

    try {
      elizaLogger.info(`Recording successful plugin creation: ${event.outcome.pluginName}`);

      // Generate thinking block for this success
      const success: CodeGenerationSuccess = {
        id: `plugin-${Date.now()}`,
        prompt: event.originalRequest || 'Create plugin',
        code: event.outcome.implementation || '',
        language: 'typescript',
        explanation: `Plugin ${event.outcome.pluginName} created successfully`,
        type: 'plugin-creation',
        request: event.originalRequest,
        solution: event.outcome.implementation || '',
        files: event.outcome.files || [],
        quality: this.assessQuality(event),
        metadata: {
          complexity: 0.7,
          tokensUsed: event.tokensUsed || 0,
          responseTime: event.executionTime || 0,
          quality: this.assessQuality(event),
        },
      };

      const thinkingBlock = await this.thinkingGenerator.generatePluginThinking(event, success);

      // Create training data point
      const dataPoint: TrainingDataPoint = {
        id: uuidv4() as UUID,
        timestamp: Date.now(),
        modelType: 'coding' as any,
        type: 'code-generation',
        subtype: 'plugin-creation',
        request: event.originalRequest,
        thinking: thinkingBlock.thinking,
        response: this.formatPluginResponse(event, success),
        context: {
          pluginType: event.outcome.pluginType,
          complexity: thinkingBlock.metadata?.complexity,
          dependencies: event.outcome.dependencies,
          executionTime: event.executionTime,
        },
        quality: success.quality,
        createdAt: new Date(),
        input: {
          prompt: event.originalRequest || 'Create plugin',
          messageText: event.originalRequest,
        },
        output: {
          decision: 'create',
          reasoning: thinkingBlock.thinking,
          confidence: 0.9,
        },
        metadata: {
          agentId: this.runtime.agentId,
          original_event: event,
          thinking_block: thinkingBlock,
          success_metrics: this.calculateSuccessMetrics(event),
        },
      };

      this.collectedData.push(dataPoint);
      elizaLogger.info(`Collected training data point: ${dataPoint.id}`);

    } catch (error) {
      elizaLogger.error('Error handling plugin success:', error);
    }
  }

  /**
   * Handle successful MCP creation
   */
  async handleMCPSuccess(event: MCPCreationEvent): Promise<void> {
    if (!this.isCollecting) return;

    try {
      elizaLogger.info(`Recording successful MCP creation: ${event.outcome.mcpName}`);

      const success: CodeGenerationSuccess = {
        id: `mcp-${Date.now()}`,
        prompt: event.originalRequest || 'Create MCP server',
        code: event.outcome.implementation || '',
        language: 'typescript',
        explanation: `MCP server ${event.outcome.mcpName} created successfully`,
        type: 'mcp-creation',
        request: event.originalRequest,
        solution: event.outcome.implementation || '',
        files: event.outcome.files || [],
        quality: this.assessQuality(event),
        metadata: {
          complexity: 0.7,
          tokensUsed: event.tokensUsed || 0,
          responseTime: event.executionTime || 0,
          quality: this.assessQuality(event),
        },
      };

      const thinkingBlock = await this.thinkingGenerator.generateMCPThinking(event, success);

      const dataPoint: TrainingDataPoint = {
        id: uuidv4() as UUID,
        timestamp: Date.now(),
        modelType: 'coding' as any,
        type: 'code-generation',
        subtype: 'mcp-creation',
        request: event.originalRequest,
        thinking: thinkingBlock.thinking,
        response: this.formatMCPResponse(event, success),
        context: {
          mcpType: event.outcome.mcpType,
          complexity: thinkingBlock.metadata?.complexity,
          tools: event.outcome.tools,
          executionTime: event.executionTime,
        },
        quality: success.quality,
        createdAt: new Date(),
        input: {
          prompt: event.originalRequest || 'Create MCP server',
          messageText: event.originalRequest,
        },
        output: {
          decision: 'create',
          reasoning: thinkingBlock.thinking,
          confidence: 0.9,
        },
        metadata: {
          agentId: this.runtime.agentId,
          original_event: event,
          thinking_block: thinkingBlock,
          success_metrics: this.calculateSuccessMetrics(event),
        },
      };

      this.collectedData.push(dataPoint);
      elizaLogger.info(`Collected training data point: ${dataPoint.id}`);

    } catch (error) {
      elizaLogger.error('Error handling MCP success:', error);
    }
  }

  /**
   * Generate JSONL dataset from collected data
   */
  async generateJSONLDataset(
    outputPath: string,
    options?: {
      minQuality?: number;
      maxDataPoints?: number;
      includeThinking?: boolean;
      splitRatio?: { train: number; validation: number; test: number };
    }
  ): Promise<{
    trainPath: string;
    validationPath: string;
    testPath: string;
    stats: any;
  }> {
    elizaLogger.info(`Generating JSONL dataset from ${this.collectedData.length} data points`);

    // Filter by quality if specified
    let filteredData = this.collectedData;
    if (options?.minQuality) {
      filteredData = filteredData.filter(dp => (dp.quality || 0) >= options.minQuality!);
    }

    // Limit data points if specified
    if (options?.maxDataPoints) {
      filteredData = filteredData.slice(0, options.maxDataPoints);
    }

    // Convert to JSONL format
    const jsonlData = filteredData.map(dataPoint => this.convertToJSONL(dataPoint, options?.includeThinking));

    // Split into train/validation/test using configuration
    const splitRatio = options?.splitRatio || this.config.getDataConfig().processing.splitRatio;
    const { train, validation, test } = this.splitDataset(jsonlData, splitRatio);

    // Save datasets
    const trainPath = `${outputPath}_train.jsonl`;
    const validationPath = `${outputPath}_validation.jsonl`;
    const testPath = `${outputPath}_test.jsonl`;

    await this.saveJSONL(train, trainPath);
    await this.saveJSONL(validation, validationPath);
    await this.saveJSONL(test, testPath);

    const stats = {
      totalDataPoints: this.collectedData.length,
      filteredDataPoints: filteredData.length,
      trainSize: train.length,
      validationSize: validation.length,
      testSize: test.length,
      qualityDistribution: this.getQualityDistribution(filteredData),
      typeDistribution: this.getTypeDistribution(filteredData),
    };

    elizaLogger.info('JSONL dataset generated successfully', stats);

    return {
      trainPath,
      validationPath,
      testPath,
      stats,
    };
  }

  /**
   * Get collected data statistics
   */
  getCollectionStats(): any {
    const typeDistribution = this.getTypeDistribution(this.collectedData);
    const qualityDistribution = this.getQualityDistribution(this.collectedData);

    return {
      totalDataPoints: this.collectedData.length,
      isCollecting: this.isCollecting,
      typeDistribution,
      qualityDistribution,
      averageQuality: this.collectedData.reduce((sum, dp) => sum + (dp.quality || 0), 0) / this.collectedData.length,
      collectionStarted: this.isCollecting ? new Date() : undefined,
      lastDataPoint: this.collectedData[this.collectedData.length - 1]?.createdAt,
    };
  }

  /**
   * Export collected data
   */
  async exportData(format: 'json' | 'jsonl' = 'json'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `training-data-${timestamp}.${format}`;

    if (format === 'json') {
      await this.saveJSON(this.collectedData, filename);
    } else {
      const jsonlData = this.collectedData.map(dp => this.convertToJSONL(dp, true));
      await this.saveJSONL(jsonlData, filename);
    }

    elizaLogger.info(`Exported ${this.collectedData.length} data points to ${filename}`);
    return filename;
  }

  private setupEventListeners(): void {
    // Register event listeners for code generation events
    // This would integrate with the autocoder plugin and MCP creation systems
    
    elizaLogger.info('Event listeners set up for automated data collection');
  }

  private setupAutoSave(interval: number): void {
    setInterval(async () => {
      if (this.collectedData.length > 0) {
        try {
          await this.exportData('json');
          elizaLogger.info(`Auto-saved ${this.collectedData.length} data points`);
        } catch (error) {
          elizaLogger.error('Auto-save failed:', error);
        }
      }
    }, interval);
  }

  private assessQuality(event: PluginCreationEvent | MCPCreationEvent): number {
    let quality = 0.5; // Base quality

    // Increase quality based on success indicators
    if (event.outcome.success) quality += 0.3;
    if (event.outcome.files && event.outcome.files.length > 0) quality += 0.1;
    if (event.executionTime && event.executionTime < 30000) quality += 0.1; // Fast execution

    // Adjust based on complexity
    const fileCount = event.outcome.files?.length || 0;
    if (fileCount > 3) quality += 0.1; // More comprehensive implementation

    return Math.min(quality, 1.0);
  }

  private formatPluginResponse(event: PluginCreationEvent, success: CodeGenerationSuccess): string {
    let response = `I'll create a ${event.outcome.pluginType} plugin called "${event.outcome.pluginName}".\n\n`;
    
    if (success.files && success.files.length > 0) {
      success.files.forEach(file => {
        response += `**${file.path}**\n\`\`\`typescript\n${file.content}\n\`\`\`\n\n`;
      });
    }

    response += `This plugin provides ${event.outcome.description || 'the requested functionality'} and integrates seamlessly with ElizaOS.`;

    return response;
  }

  private formatMCPResponse(event: MCPCreationEvent, success: CodeGenerationSuccess): string {
    let response = `I'll create an MCP server called "${event.outcome.mcpName}".\n\n`;
    
    if (success.files && success.files.length > 0) {
      success.files.forEach(file => {
        response += `**${file.path}**\n\`\`\`typescript\n${file.content}\n\`\`\`\n\n`;
      });
    }

    response += `This MCP server provides ${event.outcome.tools?.join(', ') || 'the requested tools'} and follows the MCP protocol specifications.`;

    return response;
  }

  private calculateSuccessMetrics(event: PluginCreationEvent | MCPCreationEvent): any {
    return {
      executionTime: event.executionTime,
      tokensUsed: event.tokensUsed,
      fileCount: event.outcome.files?.length || 0,
      codeLines: event.outcome.files?.reduce((sum: number, file: any) => sum + file.content.split('\n').length, 0) || 0,
      hasTests: event.outcome.files?.some((file: any) => file.path.includes('test')) || false,
      hasDocs: event.outcome.files?.some((file: any) => file.path.includes('README') || file.path.includes('.md')) || false,
    };
  }

  private convertToJSONL(dataPoint: TrainingDataPoint, includeThinking = true): any {
    const messages: any[] = [
      {
        role: 'system',
        content: 'You are an expert ElizaOS developer who creates high-quality plugins and MCP servers. You think through problems step by step and provide complete, working implementations.'
      },
      {
        role: 'user',
        content: dataPoint.request
      }
    ];

    let assistantContent = '';
    
    if (includeThinking && dataPoint.thinking) {
      assistantContent += dataPoint.thinking + '\n\n';
    }
    
    assistantContent += dataPoint.response;

    messages.push({
      role: 'assistant',
      content: assistantContent
    });

    return {
      messages,
      metadata: {
        type: dataPoint.type,
        subtype: dataPoint.subtype,
        quality: dataPoint.quality,
        created_at: dataPoint.createdAt?.toISOString() || new Date().toISOString(),
      }
    };
  }

  private splitDataset(data: any[], splitRatio: { train: number; validation: number; test: number }): {
    train: any[];
    validation: any[];
    test: any[];
  } {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    
    const trainSize = Math.floor(shuffled.length * splitRatio.train);
    const validationSize = Math.floor(shuffled.length * splitRatio.validation);
    
    return {
      train: shuffled.slice(0, trainSize),
      validation: shuffled.slice(trainSize, trainSize + validationSize),
      test: shuffled.slice(trainSize + validationSize),
    };
  }

  private getTypeDistribution(data: TrainingDataPoint[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    data.forEach(dp => {
      const key = `${dp.type}-${dp.subtype}`;
      distribution[key] = (distribution[key] || 0) + 1;
    });
    return distribution;
  }

  private getQualityDistribution(data: TrainingDataPoint[]): Record<string, number> {
    const distribution: Record<string, number> = {
      'high (0.8+)': 0,
      'medium (0.5-0.8)': 0,
      'low (<0.5)': 0,
    };

    data.forEach(dp => {
      const quality = dp.quality || 0;
      if (quality >= 0.8) {
        distribution['high (0.8+)']++;
      } else if (quality >= 0.5) {
        distribution['medium (0.5-0.8)']++;
      } else {
        distribution['low (<0.5)']++;
      }
    });

    return distribution;
  }

  private async saveJSON(data: any, filename: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(filename, JSON.stringify(data, null, 2));
  }

  private async saveJSONL(data: any[], filename: string): Promise<void> {
    const fs = await import('fs/promises');
    const content = data.map(item => JSON.stringify(item)).join('\n');
    await fs.writeFile(filename, content);
  }
}