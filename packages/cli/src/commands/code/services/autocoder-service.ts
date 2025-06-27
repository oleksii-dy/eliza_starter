import { elizaLogger, type IAgentRuntime, ModelType } from '@elizaos/core';
import type { TelemetryService } from './telemetry-service.js';
import type { ErrorLogService } from './error-log-service.js';
import type { ArtifactStorageService } from './artifact-storage-service.js';
import type { CodeInterfaceService } from './code-interface-service.js';
import fs from 'fs/promises';
import path from 'path';

export interface AutocoderServiceOptions {
  runtime: IAgentRuntime;
  artifactStorageService: ArtifactStorageService;
  telemetryService: TelemetryService;
  codeInterfaceService: CodeInterfaceService;
}

export interface AutocoderRequest {
  input: string;
  context?: {
    currentDirectory?: string;
    files?: Array<{ path: string; content: string }>;
    previousCode?: string;
    projectType?: string;
  };
}

export interface AutocoderResponse {
  content: string;
  artifacts?: Array<{
    type: 'code' | 'documentation' | 'config' | 'test';
    path: string;
    content: string;
  }>;
  metadata?: {
    codeGenerated?: boolean;
    filesCreated?: number;
    testsCovered?: boolean;
    nextSteps?: string[];
  };
}

export interface AutocoderStatus {
  ready: boolean;
  currentTask?: string;
  filesGenerated: number;
  linesOfCode: number;
  testsCreated: number;
  lastActivity: string;
}

export class AutocoderService {
  private options: AutocoderServiceOptions;
  private runtime: IAgentRuntime;
  private artifactStorageService: ArtifactStorageService;
  private telemetryService: TelemetryService;
  private codeInterfaceService: CodeInterfaceService;
  private isInitialized = false;
  private currentTask: string | null = null;
  private statistics = {
    filesGenerated: 0,
    linesOfCode: 0,
    testsCreated: 0,
    requestsProcessed: 0,
  };

  constructor(options: AutocoderServiceOptions) {
    this.options = options;
    this.runtime = options.runtime;
    this.artifactStorageService = options.artifactStorageService;
    this.telemetryService = options.telemetryService;
    this.codeInterfaceService = options.codeInterfaceService;
  }

  async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing Autocoder Service...');

      // Verify runtime is ready
      if (!this.runtime) {
        throw new Error('Agent runtime not available');
      }

      // Test LLM connectivity
      await this.testLLMConnectivity();

      await this.telemetryService.logEvent('autocoder_service_initialized', {
        agentId: this.runtime.agentId,
        capabilities: this.getCapabilities(),
      }, 'autocoder');

      this.isInitialized = true;
      elizaLogger.info('✅ Autocoder Service initialized');
    } catch (error) {
      elizaLogger.error('Failed to initialize Autocoder Service:', error);
      throw error;
    }
  }

  private async testLLMConnectivity(): Promise<void> {
    try {
      const testResponse = await this.runtime.useModel(ModelType.TEXT_LARGE, {
        prompt: 'Respond with "OK" to confirm connectivity.',
        temperature: 0,
        max_tokens: 10,
      });

      if (!testResponse || !testResponse.toString().toLowerCase().includes('ok')) {
        throw new Error('LLM connectivity test failed');
      }

      elizaLogger.debug('LLM connectivity test passed');
    } catch (error) {
      throw new Error(`LLM connectivity failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async processRequest(request: string | AutocoderRequest): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Autocoder Service not initialized');
    }

    const startTime = Date.now();
    this.currentTask = typeof request === 'string' ? request.substring(0, 50) + '...' : 'Complex request';

    try {
      const requestObj = typeof request === 'string' ? { input: request } : request;
      
      await this.telemetryService.logEvent('autocoder_request_started', {
        inputLength: requestObj.input.length,
        hasContext: !!requestObj.context,
        requestType: this.analyzeRequestType(requestObj.input),
      }, 'autocoder');

      // Analyze the request
      const analysis = await this.analyzeRequest(requestObj);
      
      // Generate response based on analysis
      const response = await this.generateResponse(requestObj, analysis);

      // Create artifacts if code was generated
      if (response.artifacts && response.artifacts.length > 0) {
        await this.createArtifacts(response.artifacts);
        this.updateStatistics(response.artifacts);
      }

      // Store artifacts in GitHub
      if (response.artifacts && response.artifacts.length > 0) {
        await this.storeArtifactsInGitHub(response.artifacts, requestObj.input);
      }

      const responseTime = Date.now() - startTime;
      this.statistics.requestsProcessed++;

      await this.telemetryService.logEvent('autocoder_request_completed', {
        responseTime,
        artifactsGenerated: response.artifacts?.length || 0,
        codeGenerated: response.metadata?.codeGenerated || false,
        filesCreated: response.metadata?.filesCreated || 0,
      }, 'autocoder');

      this.currentTask = null;
      return response.content;

    } catch (error) {
      this.currentTask = null;
      await this.telemetryService.logError('autocoder_request_failed', error as Error, {
        requestInput: typeof request === 'string' ? request.substring(0, 100) : request.input.substring(0, 100),
      });
      throw error;
    }
  }

  private async analyzeRequest(request: AutocoderRequest): Promise<{
    type: 'code-generation' | 'code-review' | 'debugging' | 'architecture' | 'research' | 'general';
    complexity: 'simple' | 'medium' | 'complex';
    technologies: string[];
    intent: string;
    suggestedApproach: string;
  }> {
    const analysisPrompt = `Analyze this coding request and provide structured analysis:

Request: "${request.input}"

${request.context ? `
Context:
- Directory: ${request.context.currentDirectory || 'Not specified'}
- Project type: ${request.context.projectType || 'Not specified'}
- Has existing files: ${request.context.files ? 'Yes' : 'No'}
` : ''}

Provide analysis in this JSON format:
{
  "type": "code-generation|code-review|debugging|architecture|research|general",
  "complexity": "simple|medium|complex",
  "technologies": ["tech1", "tech2"],
  "intent": "brief description of what user wants",
  "suggestedApproach": "recommended implementation approach"
}`;

    try {
      const response = await this.runtime.useModel(ModelType.TEXT_LARGE, {
        prompt: analysisPrompt,
        temperature: 0.3,
        max_tokens: 500,
      });

      return this.parseJsonResponse(response, {
        type: 'general',
        complexity: 'medium',
        technologies: [],
        intent: 'General request',
        suggestedApproach: 'Step-by-step implementation',
      });
    } catch (error) {
      elizaLogger.warn('Request analysis failed, using defaults:', error);
      return {
        type: 'general',
        complexity: 'medium',
        technologies: [],
        intent: request.input.substring(0, 100),
        suggestedApproach: 'Step-by-step implementation',
      };
    }
  }

  private async generateResponse(request: AutocoderRequest, analysis: any): Promise<AutocoderResponse> {
    const responsePrompt = this.buildResponsePrompt(request, analysis);

    try {
      const llmResponse = await this.runtime.useModel(ModelType.TEXT_LARGE, {
        prompt: responsePrompt,
        temperature: 0.4,
        max_tokens: 3000,
      });

      // Parse the response to extract content and artifacts
      return this.parseResponse(llmResponse.toString(), analysis);

    } catch (error) {
      elizaLogger.error('Failed to generate response:', error);
      throw new Error('Failed to generate autocoder response');
    }
  }

  private buildResponsePrompt(request: AutocoderRequest, analysis: any): string {
    return `You are an expert software developer and autocoder. Generate a comprehensive response to this coding request.

Request: "${request.input}"

Analysis:
- Type: ${analysis.type}
- Complexity: ${analysis.complexity}
- Technologies: ${analysis.technologies.join(', ')}
- Intent: ${analysis.intent}
- Approach: ${analysis.suggestedApproach}

${request.context ? `
Current Context:
- Directory: ${request.context.currentDirectory || 'Not specified'}
- Project type: ${request.context.projectType || 'Not specified'}
- Files available: ${request.context.files?.length || 0}
${request.context.previousCode ? '- Has previous code to work with' : ''}
` : ''}

Please provide:

1. **Response Content**: A detailed explanation of your implementation approach
2. **Code Implementation**: If applicable, complete, production-ready code
3. **Tests**: Unit tests for any code generated
4. **Documentation**: Clear explanations and comments
5. **Next Steps**: What the user should do after this

Format your response as follows:

## Implementation Approach
[Your detailed explanation here]

## Code
\`\`\`[language]
[Complete, production-ready code here]
\`\`\`

## Tests
\`\`\`[language]
[Comprehensive unit tests here]
\`\`\`

## Configuration
\`\`\`[format]
[Any configuration files needed]
\`\`\`

## Documentation
[Clear documentation and usage instructions]

## Next Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

Be thorough, practical, and provide complete implementations that work out of the box.`;
  }

  private parseResponse(llmResponse: string, analysis: any): AutocoderResponse {
    const artifacts: AutocoderResponse['artifacts'] = [];
    let content = llmResponse;

    // Extract code blocks and create artifacts
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let fileCounter = 1;

    while ((match = codeBlockRegex.exec(llmResponse)) !== null) {
      const language = match[1] || 'text';
      const code = match[2].trim();

      if (code.length > 50) { // Only create artifacts for substantial code
        const artifactType = this.determineArtifactType(language, code, analysis.type);
        const fileName = this.generateFileName(language, artifactType, fileCounter++);

        artifacts.push({
          type: artifactType,
          path: fileName,
          content: code,
        });
      }
    }

    // Generate metadata
    const metadata: AutocoderResponse['metadata'] = {
      codeGenerated: artifacts.some(a => a.type === 'code'),
      filesCreated: artifacts.length,
      testsCovered: artifacts.some(a => a.type === 'test'),
      nextSteps: this.extractNextSteps(llmResponse),
    };

    return {
      content,
      artifacts: artifacts.length > 0 ? artifacts : undefined,
      metadata,
    };
  }

  private determineArtifactType(language: string, code: string, analysisType: string): AutocoderResponse['artifacts'][0]['type'] {
    if (code.toLowerCase().includes('test') || code.toLowerCase().includes('spec')) {
      return 'test';
    }
    if (language === 'json' || language === 'yaml' || language === 'toml') {
      return 'config';
    }
    if (language === 'markdown' || code.includes('# ') || code.includes('## ')) {
      return 'documentation';
    }
    return 'code';
  }

  private generateFileName(language: string, type: string, counter: number): string {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      rust: 'rs',
      go: 'go',
      php: 'php',
      ruby: 'rb',
      swift: 'swift',
      kotlin: 'kt',
      json: 'json',
      yaml: 'yml',
      toml: 'toml',
      markdown: 'md',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sql: 'sql',
    };

    const ext = extensions[language.toLowerCase()] || 'txt';
    const prefix = type === 'test' ? 'test-' : type === 'config' ? 'config-' : '';
    
    return `${prefix}generated-${counter}.${ext}`;
  }

  private extractNextSteps(response: string): string[] {
    const nextStepsMatch = response.match(/## Next Steps\s*\n([\s\S]*?)(?=\n##|\n```|\n\n[A-Z]|$)/);
    if (!nextStepsMatch) return [];

    const stepsText = nextStepsMatch[1];
    const steps = stepsText
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim())
      .filter(step => step.length > 0 && !step.startsWith('[') && !step.startsWith('#'));

    return steps.slice(0, 5); // Return max 5 steps
  }

  private async createArtifacts(artifacts: NonNullable<AutocoderResponse['artifacts']>): Promise<void> {
    for (const artifact of artifacts) {
      try {
        // Create local files
        const outputDir = path.join(process.cwd(), '.elizaos-generated');
        await fs.mkdir(outputDir, { recursive: true });

        const filePath = path.join(outputDir, artifact.path);
        await fs.writeFile(filePath, artifact.content, 'utf8');

        elizaLogger.info(`Created artifact: ${filePath}`);
      } catch (error) {
        elizaLogger.warn(`Failed to create artifact ${artifact.path}:`, error);
      }
    }
  }

  private async storeArtifactsInGitHub(artifacts: NonNullable<AutocoderResponse['artifacts']>, requestInput: string): Promise<void> {
    try {
      for (const artifact of artifacts) {
        await this.artifactStorageService.storeArtifact({
          type: artifact.type,
          path: artifact.path,
          content: artifact.content,
          metadata: {
            generatedBy: 'autocoder',
            request: requestInput.substring(0, 200),
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      elizaLogger.warn('Failed to store artifacts in GitHub:', error);
      // Don't throw - artifact storage failure shouldn't break the main flow
    }
  }

  private updateStatistics(artifacts: NonNullable<AutocoderResponse['artifacts']>): void {
    this.statistics.filesGenerated += artifacts.length;
    this.statistics.testsCreated += artifacts.filter(a => a.type === 'test').length;
    
    // Count lines of code
    artifacts.forEach(artifact => {
      if (artifact.type === 'code') {
        this.statistics.linesOfCode += artifact.content.split('\n').length;
      }
    });
  }

  private analyzeRequestType(input: string): string {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('create') || lowerInput.includes('build') || lowerInput.includes('implement')) {
      return 'code-generation';
    }
    if (lowerInput.includes('review') || lowerInput.includes('check') || lowerInput.includes('analyze')) {
      return 'code-review';
    }
    if (lowerInput.includes('fix') || lowerInput.includes('debug') || lowerInput.includes('error')) {
      return 'debugging';
    }
    if (lowerInput.includes('architecture') || lowerInput.includes('design') || lowerInput.includes('structure')) {
      return 'architecture';
    }
    if (lowerInput.includes('research') || lowerInput.includes('learn') || lowerInput.includes('how')) {
      return 'research';
    }
    
    return 'general';
  }

  private parseJsonResponse(response: any, fallback: any): any {
    try {
      if (typeof response === 'string') {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }
        
        // Try to parse the whole response
        return JSON.parse(response);
      }
      return response;
    } catch (error) {
      elizaLogger.warn('Failed to parse JSON response, using fallback');
      return fallback;
    }
  }

  private getCapabilities(): string[] {
    return [
      'code-generation',
      'multi-language-support',
      'test-creation',
      'documentation-generation',
      'architecture-design',
      'debugging-assistance',
      'artifact-storage',
    ];
  }

  async getStatus(): Promise<AutocoderStatus> {
    return {
      ready: this.isInitialized,
      currentTask: this.currentTask || undefined,
      filesGenerated: this.statistics.filesGenerated,
      linesOfCode: this.statistics.linesOfCode,
      testsCreated: this.statistics.testsCreated,
      lastActivity: new Date().toISOString(),
    };
  }

  async stop(): Promise<void> {
    try {
      elizaLogger.info('Stopping Autocoder Service...');

      await this.telemetryService.logEvent('autocoder_service_stopped', {
        statistics: this.statistics,
      }, 'autocoder');

      this.isInitialized = false;
      this.currentTask = null;

      elizaLogger.info('✅ Autocoder Service stopped');
    } catch (error) {
      elizaLogger.error('Error stopping Autocoder Service:', error);
    }
  }
}