import express from 'express';
import type { Request, Response } from 'express';
import type { IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type { CustomReasoningService, CodingContext } from '../interfaces/CustomReasoningService.js';
import { getTrainingConfig } from '../config/training-config.js';

interface AnthropicMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text: string }>;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  temperature?: number;
  messages: AnthropicMessage[];
  stream?: boolean;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{ type: 'text'; text: string }>;
  model: string;
  stop_reason: string;
  stop_sequence: null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Anthropic API proxy that intercepts Claude API calls and routes them to custom reasoning service
 */
export class AnthropicAPIProxy {
  private runtime: IAgentRuntime;
  private reasoningService: CustomReasoningService;
  private config: ReturnType<typeof getTrainingConfig>;
  private fallbackEnabled: boolean = true;

  constructor(runtime: IAgentRuntime, reasoningService: CustomReasoningService) {
    this.runtime = runtime;
    this.reasoningService = reasoningService;
    this.config = getTrainingConfig(runtime);
  }

  /**
   * Create the proxy server
   */
  createProxyServer(): express.Application {
    const app = express();
    
    // Middleware
    app.use(express.json({ limit: this.config.getAPIConfig().anthropic.requestSizeLimit }));
    app.use(express.urlencoded({ extended: true }));

    // Add request logging
    app.use((req, res, next) => {
      elizaLogger.debug(`Anthropic Proxy: ${req.method} ${req.path}`, {
        headers: this.sanitizeHeaders(req.headers),
        bodySize: req.body ? JSON.stringify(req.body).length : 0,
      });
      next();
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'anthropic-proxy',
        timestamp: new Date().toISOString(),
        customReasoningEnabled: true,
      });
    });

    // Main Anthropic API endpoint
    app.post('/v1/messages', this.handleMessagesRequest.bind(this));

    // Fallback for other endpoints
    app.use('*', this.handleFallbackRequest.bind(this));

    return app;
  }

  /**
   * Handle Anthropic messages API requests
   */
  private async handleMessagesRequest(req: Request, res: Response): Promise<void> {
    try {
      const anthropicReq = req.body as AnthropicRequest;
      
      // Validate request
      if (!anthropicReq.messages || !Array.isArray(anthropicReq.messages)) {
        res.status(400).json({ error: 'Invalid request: messages array required' });
        return;
      }

      // Check if this looks like a coding request
      const prompt = this.extractPromptFromMessages(anthropicReq.messages);
      const isCodingRequest = this.detectCodingRequest(prompt);

      if (isCodingRequest) {
        await this.handleCodingRequest(anthropicReq, res);
      } else {
        // For non-coding requests, forward to original API
        await this.forwardToOriginalAPI(req, res);
      }
    } catch (error) {
      elizaLogger.error('Error in Anthropic proxy:', error);
      
      if (this.fallbackEnabled) {
        await this.forwardToOriginalAPI(req, res);
      } else {
        res.status(500).json({
          error: 'Internal server error in custom reasoning proxy',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Handle coding-specific requests with custom reasoning
   */
  private async handleCodingRequest(anthropicReq: AnthropicRequest, res: Response): Promise<void> {
    const prompt = this.extractPromptFromMessages(anthropicReq.messages);
    const language = this.detectLanguage(prompt);
    const context = this.buildCodingContext(anthropicReq.messages);

    elizaLogger.debug('Processing coding request with custom reasoning', {
      language,
      promptLength: prompt.length,
      temperature: anthropicReq.temperature,
    });

    try {
      const codingContext: CodingContext = {
        prompt,
        language,
        context,
        maxTokens: anthropicReq.max_tokens,
        temperature: anthropicReq.temperature,
      };

      const result = await this.reasoningService.generateCode(codingContext);

      // Format response to match Anthropic API structure
      const anthropicResponse: AnthropicResponse = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: result.code }],
        model: anthropicReq.model,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: this.estimateTokens(prompt),
          output_tokens: this.estimateTokens(result.code),
        },
      };

      // Log successful custom generation
      await (this.runtime as any).adapter?.log({
        entityId: this.runtime.agentId,
        roomId: this.runtime.agentId,
        body: {
          type: 'anthropic_proxy_success',
          language,
          promptLength: prompt.length,
          responseLength: result.code.length,
          model: anthropicReq.model,
        },
        type: 'anthropic-proxy-success',
      });

      res.json(anthropicResponse);
    } catch (error) {
      elizaLogger.error('Custom coding generation failed:', error);
      
      // Log failure and fallback
      await (this.runtime as any).adapter?.log({
        entityId: this.runtime.agentId,
        roomId: this.runtime.agentId,
        body: {
          type: 'anthropic_proxy_fallback',
          error: error instanceof Error ? error.message : String(error),
          language,
          promptLength: prompt.length,
        },
        type: 'anthropic-proxy-fallback',
      });

      throw error; // This will trigger fallback in the calling function
    }
  }

  /**
   * Forward request to original Anthropic API
   */
  private async handleFallbackRequest(req: Request, res: Response): Promise<void> {
    await this.forwardToOriginalAPI(req, res);
  }

  /**
   * Forward request to the original Anthropic API
   */
  private async forwardToOriginalAPI(req: Request, res: Response): Promise<void> {
    try {
      const url = `${this.config.getAPIConfig().anthropic.baseUrl}${req.path}`;
      
      // Forward headers, but remove host and add anthropic headers
      const headers = { ...req.headers };
      delete headers.host;
      delete headers['content-length'];

      elizaLogger.debug(`Forwarding to original Anthropic API: ${url}`);

      const response = await fetch(url, {
        method: req.method,
        headers: headers as any,
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
      });

      // Copy response headers
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // Stream response
      res.status(response.status);
      
      if (response.body) {
        const reader = response.body.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      
      res.end();
    } catch (error) {
      elizaLogger.error('Error forwarding to original Anthropic API:', error);
      res.status(500).json({
        error: 'Failed to forward request to Anthropic API',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Extract coding prompt from Anthropic messages
   */
  private extractPromptFromMessages(messages: AnthropicMessage[]): string {
    return messages
      .map(msg => {
        const content = Array.isArray(msg.content) 
          ? msg.content.map(c => c.text).join(' ')
          : msg.content;
        return `${msg.role}: ${content}`;
      })
      .join('\n');
  }

  /**
   * Detect if the request is asking for code generation
   */
  private detectCodingRequest(prompt: string): boolean {
    const codingKeywords = [
      'write code', 'generate code', 'create a function', 'implement',
      'javascript', 'typescript', 'python', 'java', 'c++', 'rust',
      'function', 'class', 'method', 'algorithm', 'script',
      'npm', 'package.json', 'import', 'export', 'const ', 'let ',
      'def ', 'class ', 'public ', 'private ', 'async ', 'await',
      '```', 'code block', 'programming', 'development',
    ];

    const lowerPrompt = prompt.toLowerCase();
    return codingKeywords.some(keyword => lowerPrompt.includes(keyword));
  }

  /**
   * Detect programming language from the prompt
   */
  private detectLanguage(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('typescript') || lowerPrompt.includes('.ts')) return 'typescript';
    if (lowerPrompt.includes('javascript') || lowerPrompt.includes('.js') || lowerPrompt.includes('node')) return 'javascript';
    if (lowerPrompt.includes('python') || lowerPrompt.includes('.py') || lowerPrompt.includes('def ')) return 'python';
    if (lowerPrompt.includes('java') && !lowerPrompt.includes('javascript')) return 'java';
    if (lowerPrompt.includes('rust') || lowerPrompt.includes('.rs')) return 'rust';
    if (lowerPrompt.includes('c++') || lowerPrompt.includes('cpp')) return 'cpp';
    if (lowerPrompt.includes('go') || lowerPrompt.includes('golang')) return 'go';
    if (lowerPrompt.includes('php')) return 'php';
    if (lowerPrompt.includes('ruby')) return 'ruby';
    if (lowerPrompt.includes('swift')) return 'swift';
    if (lowerPrompt.includes('kotlin')) return 'kotlin';
    
    // Default to JavaScript for web development contexts
    if (lowerPrompt.includes('react') || lowerPrompt.includes('vue') || lowerPrompt.includes('angular')) {
      return 'javascript';
    }
    
    return 'javascript'; // Default
  }

  /**
   * Build coding context from conversation history
   */
  private buildCodingContext(messages: AnthropicMessage[]): string {
    // Include system messages and recent user messages for context
    const contextMessages = messages
      .filter(msg => msg.role === 'system' || msg.role === 'user')
      .slice(-3); // Last 3 context messages

    return contextMessages
      .map(msg => {
        const content = Array.isArray(msg.content) 
          ? msg.content.map(c => c.text).join(' ')
          : msg.content;
        return `${msg.role}: ${content}`;
      })
      .join('\n');
  }

  /**
   * Estimate token count for usage reporting
   */
  private estimateTokens(text: string): number {
    // Use configured token estimation ratio
    return Math.ceil(text.length / this.config.getAPIConfig().anthropic.tokenEstimationRatio);
  }

  /**
   * Sanitize headers for logging (remove sensitive information)
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized['x-api-key'];
    delete sanitized.cookie;
    
    return sanitized;
  }

  /**
   * Start the proxy server
   */
  async startServer(port: number = this.config.getAPIConfig().anthropic.proxyPort): Promise<void> {
    const app = this.createProxyServer();
    
    return new Promise((resolve, reject) => {
      const server = app.listen(port, (err?: any) => {
        if (err) {
          reject(err);
        } else {
          elizaLogger.info(`Anthropic API proxy server started on port ${port}`);
          resolve();
        }
      });

      // Handle server errors
      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          elizaLogger.error(`Port ${port} is already in use`);
        } else {
          elizaLogger.error('Server error:', error);
        }
        reject(error);
      });
    });
  }

  /**
   * Enable or disable fallback to original API
   */
  setFallbackEnabled(enabled: boolean): void {
    this.fallbackEnabled = enabled;
    elizaLogger.info(`Anthropic API fallback ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get proxy statistics
   */
  async getProxyStats(): Promise<{
    customRequests: number;
    fallbackRequests: number;
    totalRequests: number;
    successRate: number;
  }> {
    try {
      const logs = await (this.runtime as any).adapter?.getLogs({
        entityId: this.runtime.agentId,
        type: 'anthropic-proxy%',
        limit: 1000,
      }) || [];

      const customRequests = logs.filter((log: any) => log.type === 'anthropic-proxy-success').length;
      const fallbackRequests = logs.filter((log: any) => log.type === 'anthropic-proxy-fallback').length;
      const totalRequests = customRequests + fallbackRequests;
      const successRate = totalRequests > 0 ? (customRequests / totalRequests) * 100 : 0;

      return {
        customRequests,
        fallbackRequests,
        totalRequests,
        successRate,
      };
    } catch (error) {
      elizaLogger.error('Failed to get proxy stats:', error);
      return {
        customRequests: 0,
        fallbackRequests: 0,
        totalRequests: 0,
        successRate: 0,
      };
    }
  }
}