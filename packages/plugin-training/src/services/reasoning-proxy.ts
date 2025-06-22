/**
 * Reasoning Proxy Service - Auto-Coder Integration
 * 
 * Proxies auto-coder requests to Together.ai trained models when reasoning
 * service is enabled. Falls back to runtime's existing model when disabled or unavailable.
 */

import { Service, ModelType, elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';

export interface ReasoningProxyConfig {
  togetherApiKey: string;
  fineTunedModel?: string;
  fallbackModel: string;
  enabled: boolean;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

export class ReasoningProxyService extends Service {
  static serviceType = 'reasoning_proxy' as const;
  static serviceName = 'reasoning_proxy';

  public config: any;
  private isHealthy: boolean = false;
  private requestCount: number = 0;
  
  capabilityDescription = 'Proxies auto-coder requests to fine-tuned reasoning models on Together.ai';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.config = this.loadConfig();
  }

  static async start(runtime: IAgentRuntime): Promise<ReasoningProxyService> {
    const service = new ReasoningProxyService(runtime);
    await service.initialize();
    return service;
  }

  /**
   * Initialize the reasoning proxy service
   */
  private async initialize(): Promise<void> {
    elizaLogger.info('🧠 Initializing Reasoning Proxy Service...');

    // Load configuration
    this.config = this.loadConfig();

    // Check if service should be enabled
    if (!this.config.enabled) {
      elizaLogger.info('🔴 Reasoning Proxy Service disabled via configuration');
      return;
    }

    // Validate API key
    if (!this.config.togetherApiKey) {
      elizaLogger.warn('⚠️  No Together.ai API key found. Reasoning proxy will use fallback only.');
      this.isHealthy = false;
      return;
    }

    // Test connection to Together.ai
    try {
      await this.testConnection();
      this.isHealthy = true;
      elizaLogger.info('✅ Reasoning Proxy Service initialized successfully');
    } catch (error) {
      elizaLogger.error('❌ Failed to connect to Together.ai:', error);
      this.isHealthy = false;
    }
  }

  /**
   * Load configuration from runtime settings
   */
  private loadConfig(): ReasoningProxyConfig {
    return {
      togetherApiKey: this.runtime?.getSetting('TOGETHER_API_KEY') as string || '',
      fineTunedModel: this.runtime?.getSetting('ELIZAOS_FINETUNED_MODEL') as string,
      fallbackModel: this.runtime?.getSetting('FALLBACK_MODEL') as string || 'gemini-pro',
      enabled: this.runtime?.getSetting('REASONING_PROXY_ENABLED') !== 'false',
      temperature: parseFloat(this.runtime?.getSetting('REASONING_TEMPERATURE') as string || '0.1'),
      maxTokens: parseInt(this.runtime?.getSetting('REASONING_MAX_TOKENS') as string || '4000'),
      timeout: parseInt(this.runtime?.getSetting('REASONING_TIMEOUT') as string || '30000')
    };
  }

  /**
   * Test connection to Together.ai
   */
  private async testConnection(): Promise<void> {
    const response = await fetch('https://api.together.xyz/v1/models', {
      headers: {
        'Authorization': `Bearer ${this.config.togetherApiKey}`,
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`Together.ai API test failed: ${response.status}`);
    }
  }

  /**
   * Process reasoning request with auto-coder integration
   */
  async processReasoningRequest(prompt: string, options: {
    type: 'code_generation' | 'code_analysis' | 'reasoning' | 'general';
    context?: string;
    files?: Array<{ path: string; content: string }>;
    language?: string;
    framework?: string;
  }): Promise<{
    content: string;
    model: string;
    tokensUsed: number;
    processingTime: number;
    source: 'together' | 'fallback';
  }> {
    const startTime = Date.now();

    // Determine if we should use the fine-tuned model
    const shouldUseTogether = this.shouldUseTogetherAI(options.type);

    if (shouldUseTogether && this.isHealthy) {
      try {
        elizaLogger.info(`🧠 Using Together.ai reasoning model for ${options.type}`);
        const result = await this.callTogetherAI(prompt, options);
        
        return {
          ...result,
          processingTime: Date.now() - startTime,
          source: 'together'
        };
      } catch (error) {
        elizaLogger.warn(`⚠️  Together.ai request failed, falling back:`, error);
        // Fall through to fallback
      }
    }

    // Use fallback model (Gemini)
    elizaLogger.info(`🔄 Using fallback model for ${options.type}`);
    const result = await this.callFallbackModel(prompt, options);
    
    return {
      ...result,
      processingTime: Date.now() - startTime,
      source: 'fallback'
    };
  }

  /**
   * Determine if Together.ai should be used based on request type
   */
  private shouldUseTogetherAI(type: string): boolean {
    if (!this.config.enabled || !this.config.togetherApiKey) {
      return false;
    }

    // Use Together.ai for code-related tasks and reasoning
    return ['code_generation', 'code_analysis', 'reasoning'].includes(type);
  }

  /**
   * Call Together.ai API with fine-tuned model
   */
  private async callTogetherAI(prompt: string, options: any): Promise<{
    content: string;
    model: string;
    tokensUsed: number;
  }> {
    const model = this.config.fineTunedModel || 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
    
    // Format prompt for ElizaOS training
    const formattedPrompt = this.formatPromptForElizaOS(prompt, options);

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.togetherApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert ElizaOS developer. Create high-quality code following ElizaOS patterns and conventions. Always include detailed thinking processes and comprehensive implementations.'
          },
          {
            role: 'user',
            content: formattedPrompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: false
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Together.ai API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      model: model,
      tokensUsed: data.usage?.total_tokens || 0
    };
  }

  /**
   * Format prompt for ElizaOS-trained model
   */
  private formatPromptForElizaOS(prompt: string, options: any): string {
    let formattedPrompt = prompt;

    // Add context if provided
    if (options.context) {
      formattedPrompt += `\n\nContext: ${options.context}`;
    }

    // Add file context if provided
    if (options.files && options.files.length > 0) {
      formattedPrompt += '\n\nRelated Files:\n';
      options.files.forEach((file: any) => {
        formattedPrompt += `- ${file.path}: ${file.content.substring(0, 200)}...\n`;
      });
    }

    // Add language/framework context
    if (options.language) {
      formattedPrompt += `\n\nLanguage: ${options.language}`;
    }
    if (options.framework) {
      formattedPrompt += `\nFramework: ${options.framework}`;
    }

    // Add ElizaOS-specific instructions
    if (options.type === 'code_generation') {
      formattedPrompt += '\n\nCreate the requested code with proper ElizaOS patterns and conventions.';
    } else if (options.type === 'code_analysis') {
      formattedPrompt += '\n\nAnalyze the code with focus on ElizaOS architecture and best practices.';
    }

    return formattedPrompt;
  }

  /**
   * Call fallback model (Gemini)
   */
  private async callFallbackModel(prompt: string, options: any): Promise<{
    content: string;
    model: string;
    tokensUsed: number;
  }> {
    try {
      // Use the runtime's existing model capabilities
      const modelType = this.determineFallbackModelType(options.type);
      
      // Format prompt for fallback model
      const formattedPrompt = this.formatPromptForFallback(prompt, options);
      
      // Call through runtime's model system
      const response = await this.runtime.useModel(modelType, {
        prompt: formattedPrompt,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      // Handle different response formats from useModel
      let content: string;
      if (typeof response === 'string') {
        content = response;
      } else if (response && typeof response === 'object') {
        // Handle structured response from some models
        content = (response as any).content || (response as any).text || String(response);
      } else {
        content = String(response || '');
      }

      return {
        content,
        model: this.config.fallbackModel,
        tokensUsed: this.estimateTokens(content) // Estimate since fallback may not provide usage
      };
    } catch (error) {
      elizaLogger.error('Fallback model call failed:', error);
      
      // Final fallback - return helpful error message
      return {
        content: `I apologize, but I'm unable to process your request right now due to service limitations. Please try again later.`,
        model: 'error_fallback',
        tokensUsed: 0
      };
    }
  }

  /**
   * Determine appropriate model type for fallback
   */
  private determineFallbackModelType(requestType: string) {
    // Use imported ModelType constants from @elizaos/core
    switch (requestType) {
      case 'code_generation':
      case 'code_analysis':
      case 'reasoning':
        return ModelType.TEXT_LARGE;
      case 'general':
        return ModelType.TEXT_SMALL;
      default:
        return ModelType.TEXT_LARGE;
    }
  }

  /**
   * Format prompt for fallback model (without ElizaOS-specific training)
   */
  private formatPromptForFallback(prompt: string, options: any): string {
    let formattedPrompt = prompt;

    // Add basic context if provided
    if (options.context) {
      formattedPrompt += `\n\nContext: ${options.context}`;
    }

    // Add file context if provided (but limit size for fallback)
    if (options.files && options.files.length > 0) {
      formattedPrompt += '\n\nRelated Files:\n';
      options.files.slice(0, 3).forEach((file: any) => { // Limit to 3 files for fallback
        formattedPrompt += `- ${file.path}: ${file.content.substring(0, 100)}...\n`;
      });
    }

    // Add language/framework context
    if (options.language) {
      formattedPrompt += `\n\nLanguage: ${options.language}`;
    }
    if (options.framework) {
      formattedPrompt += `\nFramework: ${options.framework}`;
    }

    // Add general instructions (not ElizaOS-specific)
    if (options.type === 'code_generation') {
      formattedPrompt += '\n\nCreate clean, well-structured code with proper TypeScript patterns.';
    } else if (options.type === 'code_analysis') {
      formattedPrompt += '\n\nAnalyze the code and provide insights on structure, patterns, and potential improvements.';
    }

    return formattedPrompt;
  }

  /**
   * Estimate token count for responses that don't provide usage data
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Get available fine-tuned models
   */
  async getAvailableModels(): Promise<string[]> {
    if (!this.config.togetherApiKey) {
      return [];
    }

    try {
      const response = await fetch('https://api.together.xyz/v1/fine-tuning/jobs', {
        headers: {
          'Authorization': `Bearer ${this.config.togetherApiKey}`
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.data
        .filter((job: any) => job.status === 'completed' && job.fine_tuned_model)
        .map((job: any) => job.fine_tuned_model);
    } catch (error) {
      elizaLogger.warn('Failed to get available models:', error);
      return [];
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ReasoningProxyConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize if enabled status changed
    if (newConfig.enabled !== undefined) {
      this.initialize();
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    enabled: boolean;
    healthy: boolean;
    model: string;
    fallbackModel: string;
    requestCount: number;
  } {
    return {
      enabled: this.config.enabled,
      healthy: this.isHealthy,
      model: this.config.fineTunedModel || 'None configured',
      fallbackModel: this.config.fallbackModel,
      requestCount: 0 // Would track this in real implementation
    };
  }

  /**
   * Service cleanup
   */
  async stop(): Promise<void> {
    elizaLogger.info('🛑 Stopping Reasoning Proxy Service...');
    this.isHealthy = false;
  }
}

/**
 * Auto-coder integration functions
 */

/**
 * Proxy Claude Code requests to Together.ai
 */
export async function proxyClaudeCodeRequest(
  service: ReasoningProxyService,
  request: {
    prompt: string;
    context?: string;
    files?: Array<{ path: string; content: string }>;
    operation: 'generate' | 'analyze' | 'refactor' | 'debug';
  }
): Promise<string> {
  
  const reasoningType = mapOperationToReasoningType(request.operation);
  
  const result = await service.processReasoningRequest(request.prompt, {
    type: reasoningType,
    context: request.context,
    files: request.files
  });
  
  return result.content;
}

/**
 * Map auto-coder operations to reasoning types
 */
function mapOperationToReasoningType(operation: string): 'code_generation' | 'code_analysis' | 'reasoning' | 'general' {
  const mappings: Record<string, any> = {
    'generate': 'code_generation',
    'create': 'code_generation',
    'write': 'code_generation',
    'analyze': 'code_analysis',
    'review': 'code_analysis',
    'debug': 'code_analysis',
    'refactor': 'reasoning',
    'optimize': 'reasoning'
  };
  
  return mappings[operation] || 'reasoning';
}

elizaLogger.info('✅ Reasoning proxy service loaded');