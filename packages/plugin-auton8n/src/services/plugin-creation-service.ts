import Anthropic from '@anthropic-ai/sdk';
import { type IAgentRuntime, logger, Service } from '@elizaos/core';
import { exec, spawn, execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { DebugLogger } from '../utils/debug-logger';

const execAsync = promisify(exec);

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define our service type constant
// We can't extend ServiceTypeRegistry due to core satisfies constraint
export const PLUGIN_CREATION_SERVICE_TYPE = 'plugin_creation' as const;

// Claude model configuration
export const ClaudeModel = {
  SONNET_4: 'claude-sonnet-4-20250514', // Using Claude 3.5 Sonnet v2 as the latest
  OPUS_4: 'claude-opus-4-20250514', // Claude Opus 3 (Claude 4 models may not be available yet)
} as const;

export type ClaudeModel = (typeof ClaudeModel)[keyof typeof ClaudeModel];

export interface PluginSpecification {
  name: string;
  description: string;
  version?: string;
  actions?: Array<{
    name: string;
    description: string;
    parameters?: Record<string, any>;
  }>;
  providers?: Array<{
    name: string;
    description: string;
    dataStructure?: Record<string, any>;
  }>;
  services?: Array<{
    name: string;
    description: string;
    methods?: string[];
  }>;
  evaluators?: Array<{
    name: string;
    description: string;
    triggers?: string[];
  }>;
  dependencies?: Record<string, string>;
  environmentVariables?: Array<{
    name: string;
    description: string;
    required: boolean;
    sensitive: boolean;
  }>;
}

export interface PluginCreationJob {
  id: string;
  specification: PluginSpecification;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentPhase: string;
  progress: number;
  logs: string[];
  error?: string;
  result?: string;
  outputPath: string;
  startedAt: Date;
  completedAt?: Date;
  currentIteration: number;
  maxIterations: number;
  testResults?: {
    passed: number;
    failed: number;
    duration: number;
  };
  validationScore?: number;
  childProcess?: any;
  errors: Array<{
    iteration: number;
    phase: string;
    error: string;
    timestamp: Date;
  }>;
  modelUsed?: ClaudeModel;
}

export class PluginCreationService extends Service {
  static serviceType: 'plugin_creation' = 'plugin_creation';
  static serviceName = 'plugin_creation';
  private jobs: Map<string, PluginCreationJob> = new Map();
  private anthropic: Anthropic | null = null;
  private selectedModel: ClaudeModel = ClaudeModel.OPUS_4;
  private createdPlugins: Set<string> = new Set();
  private jobPersistencePath: string = '';
  private metrics = {
    totalJobs: 0,
    successfulJobs: 0,
    failedJobs: 0,
    cancelledJobs: 0,
    averageCompletionTime: 0,
    apiCalls: 0,
    apiErrors: 0,
  };
  private cleanupInterval?: NodeJS.Timeout;
  private debugLogger: DebugLogger;
  private debugSessions: Map<string, string> = new Map(); // jobId -> sessionId

  public readonly capabilityDescription: string =
    'Plugin creation service with AI-powered code generation';

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    this.debugLogger = DebugLogger.getInstance();
  }

  async stop(): Promise<void> {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Save jobs before stopping
    await this.persistJobs();

    // Cleanup any running jobs
    for (const job of this.jobs.values()) {
      if (job.status === 'running' || job.status === 'pending') {
        job.status = 'cancelled';
        job.completedAt = new Date();
        this.logToJob(job.id, 'Service stopped, job cancelled');

        // Kill child process if exists
        if (job.childProcess && !job.childProcess.killed) {
          job.childProcess.kill('SIGTERM');
        }
      }
    }

    // Log final metrics
    logger.info('Plugin creation service stopped', { metrics: this.metrics });
  }

  static async start(runtime: IAgentRuntime): Promise<PluginCreationService> {
    const service = new PluginCreationService(runtime);
    await service.initialize(runtime);
    return service;
  }

  async initialize(runtime: IAgentRuntime): Promise<void> {
    this.runtime = runtime;
    const apiKey = runtime.getSetting('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }

    // Get model preference from settings
    const modelSetting = runtime.getSetting('CLAUDE_MODEL');
    if (modelSetting && Object.values(ClaudeModel).includes(modelSetting as ClaudeModel)) {
      this.selectedModel = modelSetting as ClaudeModel;
    }

    // Set up persistence path
    this.jobPersistencePath = path.join(this.getDataDir(), 'plugin-jobs.json');

    // Load persisted jobs
    await this.loadPersistedJobs();

    // Start cleanup timer
    this.startCleanupTimer();
  }

  public setModel(model: ClaudeModel): void {
    this.selectedModel = model;
    logger.info(`Claude model set to: ${model}`);
  }

  public getCreatedPlugins(): string[] {
    return Array.from(this.createdPlugins);
  }

  public isPluginCreated(name: string): boolean {
    return this.createdPlugins.has(name);
  }

  public async createPlugin(
    specification: PluginSpecification,
    apiKey?: string,
    options?: { useTemplate?: boolean; model?: ClaudeModel; maxIterations?: number }
  ): Promise<string> {
    // Increment metrics
    this.metrics.totalJobs++;

    // Check if plugin already exists
    if (this.createdPlugins.has(specification.name)) {
      throw new Error(`Plugin ${specification.name} has already been created in this session`);
    }

    // Validate plugin name to prevent path traversal
    if (!this.isValidPluginName(specification.name)) {
      throw new Error('Invalid plugin name. Must follow format: @scope/plugin-name');
    }

    // Rate limiting check
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please wait before creating another plugin.');
    }

    // Resource limit check
    if (this.jobs.size >= 10) {
      throw new Error(
        'Maximum number of concurrent jobs reached. Please wait for existing jobs to complete.'
      );
    }

    // Initialize Anthropic if API key is provided - must be done before creating job
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    } else if (!this.anthropic) {
      throw new Error('No API key provided and Anthropic client not initialized');
    }

    // Use provided model or default
    const model = options?.model || this.selectedModel;

    const jobId = uuidv4();
    const sanitizedName = this.sanitizePluginName(specification.name);
    const outputPath = path.join(this.getDataDir(), 'plugins', jobId, sanitizedName);

    // Ensure output path is within data directory
    const resolvedPath = path.resolve(outputPath);
    const dataDir = path.resolve(this.getDataDir());
    if (!resolvedPath.startsWith(dataDir)) {
      throw new Error('Invalid output path');
    }

    const job: PluginCreationJob = {
      id: jobId,
      specification,
      status: 'pending',
      currentPhase: 'initializing',
      progress: 0,
      logs: [],
      outputPath: resolvedPath,
      startedAt: new Date(),
      currentIteration: 0,
      maxIterations: options?.maxIterations || 10, // Increased default to 10
      errors: [],
      modelUsed: model,
    };

    this.jobs.set(jobId, job);
    this.createdPlugins.add(specification.name);

    // Create debug session
    const sessionId = await this.debugLogger.createSession(jobId, specification);
    if (sessionId) {
      this.debugSessions.set(jobId, sessionId);
    }

    // Set timeout for job
    setTimeout(
      () => {
        const jobStatus = this.jobs.get(jobId);
        if (jobStatus && (jobStatus.status === 'pending' || jobStatus.status === 'running')) {
          jobStatus.status = 'failed';
          jobStatus.error = 'Job timed out after 30 minutes';
          jobStatus.completedAt = new Date();
          this.logToJob(jobId, 'Job timed out');
          
          // End debug session
          const debugSessionId = this.debugSessions.get(jobId);
          if (debugSessionId) {
            this.debugLogger.endSession(debugSessionId, false, 'Job timed out');
          }
        }
      },
      30 * 60 * 1000
    ); // 30 minutes timeout

    // Start creation process in background
    this.runCreationProcess(job, options?.useTemplate ?? true).catch((error) => {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      this.logToJob(jobId, `Job failed: ${error.message}`);
      this.metrics.failedJobs++;
      
      // End debug session
      const debugSessionId = this.debugSessions.get(jobId);
      if (debugSessionId) {
        this.debugLogger.endSession(debugSessionId, false, error.message);
      }
    });

    return jobId;
  }

  public getAllJobs(): PluginCreationJob[] {
    return Array.from(this.jobs.values());
  }

  public getJobStatus(jobId: string): PluginCreationJob | null {
    return this.jobs.get(jobId) || null;
  }

  public cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job && (job.status === 'pending' || job.status === 'running')) {
      job.status = 'cancelled';
      job.completedAt = new Date();
      this.logToJob(jobId, 'Job cancelled by user');

      // Kill child process if exists
      if (job.childProcess && !job.childProcess.killed) {
        job.childProcess.kill('SIGTERM');
      }
      
      // End debug session
      const debugSessionId = this.debugSessions.get(jobId);
      if (debugSessionId) {
        this.debugLogger.endSession(debugSessionId, false, 'Job cancelled by user');
      }
    }
  }

  private logToJob(jobId: string, message: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.logs.push(`[${new Date().toISOString()}] ${message}`);
      logger.info(`[Job ${jobId}] ${message}`);
      
      // Log job snapshot to debug session
      const debugSessionId = this.debugSessions.get(jobId);
      if (debugSessionId) {
        this.debugLogger.logJob(debugSessionId, job);
      }
    }
  }

  private getDataDir(): string {
    // Use a fallback if runtime is not initialized
    if (this.runtime && typeof this.runtime.getSetting === 'function') {
      const dataDir = this.runtime.getSetting('PLUGIN_DATA_DIR');
      if (dataDir) return dataDir;
    }
    return path.join(process.cwd(), 'data');
  }

  private async runCreationProcess(
    job: PluginCreationJob,
    useTemplate: boolean = true
  ): Promise<void> {
    const debugSessionId = this.debugSessions.get(job.id);
    
    try {
      // Log phase start
      if (debugSessionId) {
        await this.debugLogger.logPhaseStart(debugSessionId, 'setup', { useTemplate });
      }
      
      // Setup workspace
      await this.setupPluginWorkspace(job, useTemplate);
      
      if (debugSessionId) {
        await this.debugLogger.logPhaseEnd(debugSessionId, 'setup', true);
      }

      // Run creation loop with retry logic
      let success = false;
      let retryCount = 0;
      const maxRetries = 2;

      while (job.currentIteration < job.maxIterations && !success) {
        job.currentIteration++;
        job.currentPhase = `iteration ${job.currentIteration}/${job.maxIterations}`;
        job.progress = (job.currentIteration / job.maxIterations) * 100;
        this.logToJob(job.id, `Starting iteration ${job.currentIteration}`);

        try {
          success = await this.runSingleIteration(job);
          retryCount = 0; // Reset retry count on success
        } catch (error) {
          // Handle specific errors with retry logic
          if (this.isRetryableError(error) && retryCount < maxRetries) {
            retryCount++;
            this.logToJob(job.id, `Retryable error encountered, retry ${retryCount}/${maxRetries}`);
            await this.delay(retryCount * 5000); // Exponential backoff
            job.currentIteration--; // Retry the same iteration
            continue;
          }
          throw error; // Re-throw non-retryable errors
        }

        if (!success && job.currentIteration < job.maxIterations) {
          // Prepare for next iteration
          job.status = 'running';
          await this.prepareNextIteration(job);
        }
      }

      if (success) {
        job.status = 'completed';
        job.completedAt = new Date();
        this.logToJob(job.id, 'Job completed successfully');
        this.metrics.successfulJobs++;

        // Update average completion time
        const completionTime = job.completedAt.getTime() - job.startedAt.getTime();
        this.updateAverageCompletionTime(completionTime);
        
        // End debug session successfully
        if (debugSessionId) {
          await this.debugLogger.endSession(debugSessionId, true);
        }
      } else {
        job.status = 'failed';
        job.completedAt = new Date();
        this.logToJob(job.id, 'Job failed after maximum iterations');
        this.metrics.failedJobs++;
        
        // End debug session with failure
        if (debugSessionId) {
          await this.debugLogger.endSession(debugSessionId, false, 'Failed after maximum iterations');
        }
      }
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
      this.logToJob(
        job.id,
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      );
      this.metrics.failedJobs++;
      
      // End debug session with error
      if (debugSessionId) {
        await this.debugLogger.endSession(debugSessionId, false, job.error);
      }
      
      throw error;
    } finally {
      // Always persist job state
      await this.persistJobs();
      
      // Clean up debug session mapping
      this.debugSessions.delete(job.id);
    }
  }

  private async runSingleIteration(job: PluginCreationJob): Promise<boolean> {
    const debugSessionId = this.debugSessions.get(job.id);
    
    try {
      // Phase 1: Generate/update code
      job.currentPhase = 'generating';
      if (debugSessionId) {
        await this.debugLogger.logPhaseStart(debugSessionId, 'generating', {
          iteration: job.currentIteration,
          previousErrors: job.errors.filter(e => e.iteration === job.currentIteration - 1)
        });
      }
      await this.generatePluginCode(job);
      if (debugSessionId) {
        await this.debugLogger.logPhaseEnd(debugSessionId, 'generating', true);
      }

      // Phase 2: Build
      job.currentPhase = 'building';
      if (debugSessionId) {
        await this.debugLogger.logPhaseStart(debugSessionId, 'building', {
          iteration: job.currentIteration
        });
      }
      const buildSuccess = await this.buildPlugin(job);
      if (!buildSuccess) {
        job.errors.push({
          iteration: job.currentIteration,
          phase: 'building',
          error: job.error || 'Build failed',
          timestamp: new Date(),
        });
        if (debugSessionId) {
          await this.debugLogger.logPhaseEnd(debugSessionId, 'building', false, job.error);
        }
        return false;
      }
      if (debugSessionId) {
        await this.debugLogger.logPhaseEnd(debugSessionId, 'building', true);
      }

      // Phase 3: Lint
      job.currentPhase = 'linting';
      if (debugSessionId) {
        await this.debugLogger.logPhaseStart(debugSessionId, 'linting', {
          iteration: job.currentIteration
        });
      }
      const lintSuccess = await this.lintPlugin(job);
      if (!lintSuccess) {
        job.errors.push({
          iteration: job.currentIteration,
          phase: 'linting',
          error: job.error || 'Lint failed',
          timestamp: new Date(),
        });
        if (debugSessionId) {
          await this.debugLogger.logPhaseEnd(debugSessionId, 'linting', false, job.error);
        }
        return false;
      }
      if (debugSessionId) {
        await this.debugLogger.logPhaseEnd(debugSessionId, 'linting', true);
      }

      // Phase 4: Test
      job.currentPhase = 'testing';
      if (debugSessionId) {
        await this.debugLogger.logPhaseStart(debugSessionId, 'testing', {
          iteration: job.currentIteration
        });
      }
      const testSuccess = await this.testPlugin(job);
      if (!testSuccess) {
        job.errors.push({
          iteration: job.currentIteration,
          phase: 'testing',
          error: job.error || 'Tests failed',
          timestamp: new Date(),
        });
        if (debugSessionId) {
          await this.debugLogger.logPhaseEnd(debugSessionId, 'testing', false, job.error);
          
          // Log test results if available
          if (job.testResults) {
            await this.debugLogger.logTestResults(debugSessionId, 'plugin tests', {
              ...job.testResults,
              skipped: 0 // Add missing field
            });
          }
        }
        return false;
      }
      if (debugSessionId) {
        await this.debugLogger.logPhaseEnd(debugSessionId, 'testing', true);
        
        // Log test results
        if (job.testResults) {
          await this.debugLogger.logTestResults(debugSessionId, 'plugin tests', {
            ...job.testResults,
            skipped: 0 // Add missing field
          });
        }
      }

      // Phase 5: Validate
      job.currentPhase = 'validating';
      if (debugSessionId) {
        await this.debugLogger.logPhaseStart(debugSessionId, 'validating', {
          iteration: job.currentIteration
        });
      }
      const validationSuccess = await this.validatePlugin(job);
      if (!validationSuccess) {
        job.errors.push({
          iteration: job.currentIteration,
          phase: 'validating',
          error: job.error || 'Validation failed',
          timestamp: new Date(),
        });
        if (debugSessionId) {
          await this.debugLogger.logPhaseEnd(debugSessionId, 'validating', false, job.error);
        }
        return false;
      }
      if (debugSessionId) {
        await this.debugLogger.logPhaseEnd(debugSessionId, 'validating', true);
      }

      return true;
    } catch (error) {
      job.errors.push({
        iteration: job.currentIteration,
        phase: job.currentPhase,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });
      job.error = error instanceof Error ? error.message : String(error);
      logger.error(`[Job ${job.id}] Error in ${job.currentPhase}:`, {
        error: error instanceof Error ? error.message : String(error),
        iteration: job.currentIteration,
      });
      this.logToJob(
        job.id,
        `Error in iteration: ${error instanceof Error ? error.message : String(error)}`
      );
      
      if (debugSessionId) {
        await this.debugLogger.logPhaseEnd(debugSessionId, job.currentPhase, false, job.error);
      }
      
      return false;
    }
  }

  private async setupPluginWorkspace(
    job: PluginCreationJob,
    useTemplate: boolean = true
  ): Promise<void> {
    await fs.ensureDir(job.outputPath);

    if (useTemplate) {
      // Try to use a template if available
      // Copy plugin-starter template
      // Try multiple possible locations for the template
      const possiblePaths = [
        // When running from dist/
        path.join(__dirname, '../src/resources/templates/plugin-starter'),
        // When running from src/
        path.join(__dirname, '../../resources/templates/plugin-starter'),
        path.join(__dirname, '../../../resources/templates/plugin-starter'),
        // Based on cwd
        path.join(process.cwd(), 'src/resources/templates/plugin-starter'),
        path.join(process.cwd(), 'resources/templates/plugin-starter'),
        // Check package root
        path.resolve(__dirname, '..', 'src', 'resources', 'templates', 'plugin-starter'),
      ];

      let templatePath: string | null = null;
      for (const p of possiblePaths) {
        if (await fs.pathExists(p)) {
          templatePath = p;
          break;
        }
      }

      if (templatePath) {
        this.logToJob(job.id, 'Using plugin-starter template');
        await fs.copy(templatePath, job.outputPath, {
          overwrite: false,
          errorOnExist: false,
        });

        // Update package.json with plugin info
        const packageJsonPath = path.join(job.outputPath, 'package.json');
        const packageJson = await fs.readJson(packageJsonPath);

        packageJson.name = job.specification.name;
        packageJson.version = job.specification.version || '1.0.0';
        packageJson.description = job.specification.description;

        // Merge dependencies
        if (job.specification.dependencies) {
          packageJson.dependencies = {
            ...packageJson.dependencies,
            ...job.specification.dependencies,
          };
        }

        // Add environment variables to elizaos config
        if (job.specification.environmentVariables) {
          packageJson.elizaos = {
            ...packageJson.elizaos,
            environmentVariables: job.specification.environmentVariables,
          };
        }

        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      } else {
        this.logToJob(job.id, 'Template not found, using fallback setup');
        await this.setupPluginWorkspaceFallback(job);
      }
    } else {
      await this.setupPluginWorkspaceFallback(job);
    }
  }

  private async setupPluginWorkspaceFallback(job: PluginCreationJob): Promise<void> {
    // Original setup code as fallback
    // Create package.json
    const packageJson = {
      name: job.specification.name,
      version: job.specification.version,
      description: job.specification.description,
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsc',
        test: 'vitest run',
        lint: 'eslint src/**/*.ts',
        dev: 'tsc --watch',
      },
      dependencies: {
        '@elizaos/core': '^1.0.0',
        ...job.specification.dependencies,
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        typescript: '^5.0.0',
        vitest: '^1.0.0',
        eslint: '^8.0.0',
        '@typescript-eslint/parser': '^6.0.0',
        '@typescript-eslint/eslint-plugin': '^6.0.0',
      },
      elizaos: {
        environmentVariables: job.specification.environmentVariables || [],
      },
    };

    await fs.writeJson(path.join(job.outputPath, 'package.json'), packageJson, {
      spaces: 2,
    });

    // Create tsconfig.json
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'commonjs',
        lib: ['ES2022'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        resolveJsonModule: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', '**/*.test.ts'],
    };

    await fs.writeJson(path.join(job.outputPath, 'tsconfig.json'), tsConfig, {
      spaces: 2,
    });

    // Create src directory
    await fs.ensureDir(path.join(job.outputPath, 'src'));
    await fs.ensureDir(path.join(job.outputPath, 'src', '__tests__'));

    // Create .eslintrc
    const eslintConfig = {
      parser: '@typescript-eslint/parser',
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      env: {
        node: true,
        es2022: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      },
    };

    await fs.writeJson(path.join(job.outputPath, '.eslintrc.json'), eslintConfig, { spaces: 2 });

    // Create vitest.config.ts
    const vitestConfig = `
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            reporter: ['text', 'json', 'html']
        }
    }
});
`;

    await fs.writeFile(path.join(job.outputPath, 'vitest.config.ts'), vitestConfig.trim());
  }

  private async generatePluginCode(job: PluginCreationJob): Promise<void> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    this.metrics.apiCalls++;
    const debugSessionId = this.debugSessions.get(job.id);
    const startTime = Date.now();

    try {
      // Generate prompt based on iteration
      let prompt: string;
      if (job.currentIteration === 1) {
        prompt = this.generateInitialPrompt(job.specification);
      } else {
        const recentErrors = job.errors.filter((e) => e.iteration === job.currentIteration - 1);
        prompt = this.generateIterationPrompt(job, recentErrors);
      }
      
      // Log prompt to debug session
      if (debugSessionId) {
        await this.debugLogger.logPrompt(
          debugSessionId,
          job.currentPhase,
          job.currentIteration === 1 ? 'initial_prompt' : 'iteration_prompt',
          {
            iteration: job.currentIteration,
            specification: job.specification,
            errors: job.errors
          },
          prompt
        );
      }

      // Call Anthropic API
      const message = await this.anthropic.messages.create({
        model: job.modelUsed || this.selectedModel,
        max_tokens: 4096, // Claude Opus limit
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Safely extract text from response
      if (!message || !message.content || !Array.isArray(message.content)) {
        throw new Error('Invalid API response: missing or malformed content');
      }

      const responseText = message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      if (!responseText) {
        throw new Error('API response contained no text content');
      }
      
      const duration = Date.now() - startTime;
      
      // Log API call to debug session
      if (debugSessionId) {
        await this.debugLogger.logAPICall(
          debugSessionId,
          job.modelUsed || this.selectedModel,
          prompt,
          responseText,
          duration,
          undefined, // Token counts not available in current API
          undefined
        );
      }

      // Parse and write files
      await this.writeGeneratedCode(job, responseText);
    } catch (error) {
      this.metrics.apiErrors++;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - startTime;
      
      // Log failed API call
      if (debugSessionId) {
        await this.debugLogger.logAPICall(
          debugSessionId,
          job.modelUsed || this.selectedModel,
          '', // Prompt already logged
          '',
          duration,
          undefined,
          errorMessage
        );
      }

      if (error instanceof Error && error.message?.includes('401')) {
        throw new Error('Invalid ANTHROPIC_API_KEY. Please check your API key.');
      } else if (error instanceof Error && error.message?.includes('404')) {
        throw new Error(
          `Model ${job.modelUsed} not found. Please ensure you have access to this model.`
        );
      } else if (error instanceof Error && error.message?.includes('rate_limit')) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw error;
    }
  }

  private generateInitialPrompt(spec: PluginSpecification): string {
    return `You are creating an ElizaOS plugin with the following specification:

Name: ${spec.name}
Description: ${spec.description}
Version: ${spec.version}

${
  spec.actions
    ? `Actions:
${spec.actions.map((a) => `- ${a.name}: ${a.description}`).join('\n')}`
    : ''
}

${
  spec.providers
    ? `Providers:
${spec.providers.map((p) => `- ${p.name}: ${p.description}`).join('\n')}`
    : ''
}

${
  spec.services
    ? `Services:
${spec.services.map((s) => `- ${s.name}: ${s.description}`).join('\n')}`
    : ''
}

${
  spec.evaluators
    ? `Evaluators:
${spec.evaluators.map((e) => `- ${e.name}: ${e.description}`).join('\n')}`
    : ''
}

Create a complete ElizaOS plugin implementation following these requirements:

1. Create src/index.ts that exports the plugin object
2. Implement all specified actions, providers, services, and evaluators
3. Include proper TypeScript types and imports from @elizaos/core
4. Add comprehensive error handling
5. Include unit tests in src/__tests__/

IMPORTANT: Format your response with each file in a separate code block like this:

\`\`\`typescript
// file: src/index.ts
import { Plugin, Action, Provider } from '@elizaos/core';
// ... rest of the code
\`\`\`

\`\`\`typescript  
// file: src/actions/myAction.ts
import { Action, IAgentRuntime, Memory, State } from '@elizaos/core';
// ... rest of the code
\`\`\`

Start with the main plugin file:`;
  }

  private generateIterationPrompt(job: PluginCreationJob, errors: any[]): string {
    const errorSummary = errors.map((e) => `- Phase ${e.phase}: ${e.error}`).join('\n');

    return `You are fixing errors in an ElizaOS plugin implementation.

Plugin: ${job.specification.name}
Current iteration: ${job.currentIteration}

Previous iteration encountered these errors:
${errorSummary}

Current code structure:
${job.logs
  .filter((log) => log.includes('Wrote file'))
  .map((log) => `- ${log}`)
  .join('\n')}

Please fix the errors and provide the updated code. 

IMPORTANT: Format your response with each file in a separate code block like this:

\`\`\`typescript
// file: src/index.ts
import { Plugin, Action, Provider } from '@elizaos/core';
// ... rest of the code
\`\`\`

\`\`\`typescript  
// file: src/actions/myAction.ts
import { Action, IAgentRuntime, Memory, State } from '@elizaos/core';
// ... rest of the code
\`\`\`

Focus on fixing the specific errors mentioned above.`;
  }

  private async writeGeneratedCode(job: PluginCreationJob, responseText: string): Promise<void> {
    const debugSessionId = this.debugSessions.get(job.id);
    
    // Log the raw response for debugging
    logger.info(`[Job ${job.id}] AI Response length: ${responseText.length} characters`);
    logger.debug(`[Job ${job.id}] AI Response preview: ${responseText.substring(0, 500)}...`);

    // Parse response for file blocks with explicit file markers
    const fileRegex =
      /(?:File:\s*|```(?:typescript|ts|javascript|js)?\s+)([^\n]+\\.(?:ts|js|json))[\s\n]+([\\s\\S]*?)```/g;
    let match;
    let filesWritten = 0;

    while ((match = fileRegex.exec(responseText)) !== null) {
      const filePath = match[1].trim();
      const fileContent = match[2].trim();

      // Validate file path
      if (!filePath || filePath.includes('\n') || filePath.includes('import ')) {
        logger.warn(`Skipping invalid file path: ${filePath}`);
        continue;
      }

      // Ensure file path is relative to src/
      const normalizedPath = filePath.startsWith('src/') ? filePath : `src/${filePath}`;
      const fullPath = path.join(job.outputPath, normalizedPath);

      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, fileContent);
      filesWritten++;
      logger.info(`Wrote file: ${normalizedPath}`);
      
      // Log generated file to debug session
      if (debugSessionId) {
        await this.debugLogger.logGeneratedFile(debugSessionId, normalizedPath, fileContent, 'generating');
      }
    }

    // If no files were parsed with explicit markers, try alternative parsing
    if (filesWritten === 0) {
      logger.info('Trying alternative parsing patterns...');

      // Look for code blocks with file paths in comments
      const altRegex =
        /```(?:typescript|ts|javascript|js)?\s*\n(?:\/\/\s*)?(?:file:\s*)?([^\n]+\.(?:ts|js|json))\s*\n([\s\S]*?)```/gi;
      let altMatch;

      while ((altMatch = altRegex.exec(responseText)) !== null) {
        const filePath = altMatch[1].trim();
        const fileContent = altMatch[2].trim();

        if (!filePath || filePath.includes('import ')) {
          continue;
        }

        const normalizedPath = filePath.startsWith('src/') ? filePath : `src/${filePath}`;
        const fullPath = path.join(job.outputPath, normalizedPath);

        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, fileContent);
        filesWritten++;
        logger.info(`Wrote file (alt): ${normalizedPath}`);
        
        // Log generated file to debug session
        if (debugSessionId) {
          await this.debugLogger.logGeneratedFile(debugSessionId, normalizedPath, fileContent, 'generating');
        }
      }
    }

    // If still no files, try the most basic pattern - just look for typescript/javascript blocks
    if (filesWritten === 0) {
      logger.info('Trying basic code block parsing...');

      // Match any code block and try to extract filename from first line or comment
      const basicRegex = /```(?:typescript|ts|javascript|js)?\s*\n([\s\S]*?)```/g;
      let basicMatch;
      let blockIndex = 0;

      while ((basicMatch = basicRegex.exec(responseText)) !== null) {
        const content = basicMatch[1].trim();

        // Try to extract filename from first line
        const firstLine = content.split('\n')[0];
        let fileName: string | null = null;

        // Check for various filename patterns
        const filenamePatterns = [
          /^\/\/\s*(?:file:\s*)?(.+\.(?:ts|js|json))$/i,
          /^\/\*\s*(?:file:\s*)?(.+\.(?:ts|js|json))\s*\*\/$/i,
          /^#\s*(.+\.(?:ts|js|json))$/,
        ];

        for (const pattern of filenamePatterns) {
          const match = firstLine.match(pattern);
          if (match) {
            fileName = match[1].trim();
            break;
          }
        }

        // If no filename found, generate one based on content
        if (!fileName) {
          if (content.includes('export const plugin') || content.includes('export default')) {
            fileName = 'index.ts';
          } else if (content.includes('Action')) {
            fileName = `actions/action${blockIndex}.ts`;
          } else if (content.includes('Provider')) {
            fileName = `providers/provider${blockIndex}.ts`;
          } else if (content.includes('Service')) {
            fileName = `services/service${blockIndex}.ts`;
          } else {
            fileName = `file${blockIndex}.ts`;
          }
        }

        if (fileName) {
          const normalizedPath = fileName.startsWith('src/') ? fileName : `src/${fileName}`;
          const fullPath = path.join(job.outputPath, normalizedPath);

          // Remove the filename comment if it exists
          const cleanContent = content.replace(/^(\/\/|\/\*|#)[^\n]*\n/, '');

          await fs.ensureDir(path.dirname(fullPath));
          await fs.writeFile(fullPath, cleanContent);
          filesWritten++;
          logger.info(`Wrote file (basic): ${normalizedPath}`);
          
          // Log generated file to debug session
          if (debugSessionId) {
            await this.debugLogger.logGeneratedFile(debugSessionId, normalizedPath, cleanContent, 'generating');
          }
        }
        blockIndex++;
      }
    }

    // If still no files were parsed, log error with more details
    if (filesWritten === 0) {
      logger.error('No valid files could be extracted from AI response');
      logger.error('Response snippet:', responseText.substring(0, 1000));
      throw new Error('Failed to parse any files from AI response');
    }

    logger.info(`[Job ${job.id}] Successfully wrote ${filesWritten} files`);
  }

  private async buildPlugin(job: PluginCreationJob): Promise<boolean> {
    try {
      // Install dependencies first
      await this.runCommand(job, 'npm', ['install'], 'Installing dependencies');

      // Run TypeScript compilation
      const { success, output } = await this.runCommand(
        job,
        'npm',
        ['run', 'build'],
        'Building plugin'
      );

      if (!success) {
        job.error = output;
        return false;
      }

      return true;
    } catch (error) {
      job.error = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  private async lintPlugin(job: PluginCreationJob): Promise<boolean> {
    try {
      const { success, output } = await this.runCommand(
        job,
        'npm',
        ['run', 'lint'],
        'Linting plugin'
      );

      if (!success) {
        job.error = output;
        return false;
      }

      return true;
    } catch (error) {
      job.error = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  private async testPlugin(job: PluginCreationJob): Promise<boolean> {
    try {
      const { success, output } = await this.runCommand(job, 'npm', ['test'], 'Running tests');

      // Parse test results
      const testResults = this.parseTestResults(output);
      job.testResults = testResults;

      if (!success || testResults.failed > 0) {
        job.error = `${testResults.failed} tests failed`;
        return false;
      }

      return true;
    } catch (error) {
      job.error = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  private async validatePlugin(job: PluginCreationJob): Promise<boolean> {
    if (!this.anthropic) {
      // Skip AI validation if no API key
      logger.warn('Skipping AI validation - no ANTHROPIC_API_KEY');
      return true;
    }

    try {
      // Collect all generated code
      const codeFiles = await this.collectCodeFiles(job.outputPath);

      const validationPrompt = `Review this ElizaOS plugin for production readiness:

Plugin: ${job.specification.name}
Specification: ${JSON.stringify(job.specification, null, 2)}

Generated Code:
${codeFiles
  .map(
    (f) => `
File: ${f.path}
\`\`\`typescript
${f.content}
\`\`\`
`
  )
  .join('\n')}

Evaluate:
1. Does it implement all specified features?
2. Is the code complete without stubs?
3. Does it follow ElizaOS conventions?
4. Is error handling comprehensive?
5. Are the tests adequate?
6. Is it production ready?

Respond with JSON:
{
  "score": 0-100,
  "production_ready": boolean,
  "issues": ["list of issues"],
  "suggestions": ["list of improvements"]
}`;

      const message = await this.anthropic.messages.create({
        model: job.modelUsed || this.selectedModel,
        max_tokens: 4096,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: validationPrompt,
          },
        ],
      });

      // Safely extract text from response
      if (!message || !message.content || !Array.isArray(message.content)) {
        throw new Error('Invalid API response for validation');
      }

      const responseText = message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      if (!responseText) {
        throw new Error('API response contained no validation data');
      }

      const validation = JSON.parse(responseText);
      job.validationScore = validation.score;

      if (!validation.production_ready) {
        job.error = `Score: ${validation.score}/100. Issues: ${validation.issues.join(', ')}`;
        return false;
      }

      return true;
    } catch (error) {
      job.error = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  private async runCommand(
    job: PluginCreationJob,
    command: string,
    args: string[],
    description: string
  ): Promise<{ success: boolean; output: string }> {
    const debugSessionId = this.debugSessions.get(job.id);
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      this.logToJob(job.id, `${description} for ${job.specification.name}`);

      let output = '';
      let outputSize = 0;
      const maxOutputSize = 1024 * 1024; // 1MB limit

      // Handle package manager commands
      let actualCommand = command;
      let actualArgs = args;

      if (command === 'npm') {
        // Try to find a package manager that exists
        const packageManagers = [
          { cmd: 'bun', install: ['install'], run: ['run'], test: ['test'] },
          { cmd: 'pnpm', install: ['install'], run: ['run'], test: ['test'] },
          { cmd: 'yarn', install: ['install'], run: ['run'], test: ['test'] },
          { cmd: 'npm', install: ['install'], run: ['run'], test: ['test'] },
        ];

        // Check which package manager is available
        for (const pm of packageManagers) {
          try {
            execSync(`which ${pm.cmd}`, { stdio: 'ignore' });
            actualCommand = pm.cmd;

            // Adjust args based on package manager
            if (args[0] === 'install') {
              actualArgs = pm.install;
            } else if (args[0] === 'run') {
              actualArgs = [...pm.run, ...args.slice(1)];
            } else if (args[0] === 'test') {
              actualArgs = pm.test;
            }

            this.logToJob(job.id, `Using ${pm.cmd} as package manager`);
            break;
          } catch {
            // Try next package manager
          }
        }
      }

      // In test environment, we need to ensure commands are available
      const spawnOptions: any = {
        cwd: job.outputPath,
        env: { ...process.env },
        shell: false, // Prevent shell injection
      };

      // Add common paths to PATH
      const paths = [
        '/usr/local/bin',
        '/usr/bin',
        '/bin',
        '/opt/homebrew/bin',
        `${process.env.HOME}/.bun/bin`,
        `${process.env.HOME}/.nvm/versions/node/v23.11.0/bin`,
        process.env.PATH,
      ].filter(Boolean);

      spawnOptions.env.PATH = paths.join(':');

      const child = spawn(actualCommand, actualArgs, spawnOptions);

      // Handle spawn errors (e.g., command not found)
      child.on('error', (error: any) => {
        if (error.code === 'ENOENT') {
          this.logToJob(job.id, `Command '${actualCommand}' not found`);
          resolve({
            success: false,
            output: `Error: Command '${actualCommand}' not found. ${error.message}`,
          });
        } else {
          this.logToJob(job.id, `Process error: ${error.message}`);
          resolve({
            success: false,
            output: `Process error: ${error.message}`,
          });
        }
      });

      const handleData = (data: Buffer) => {
        outputSize += data.length;
        if (outputSize < maxOutputSize) {
          output += data.toString();
        } else if (outputSize >= maxOutputSize && !output.includes('Output truncated')) {
          output += '\n[Output truncated due to size limit]';
          this.logToJob(job.id, 'Output truncated due to size limit');
        }
      };

      child.stdout.on('data', handleData);
      child.stderr.on('data', handleData);

      child.on('close', async (code) => {
        const duration = Date.now() - startTime;
        
        // Log build command to debug session
        if (debugSessionId) {
          await this.debugLogger.logBuildCommand(
            debugSessionId,
            `${actualCommand} ${actualArgs.join(' ')}`,
            output,
            code || 0,
            duration
          );
        }
        
        resolve({
          success: code === 0,
          output,
        });
      });

      // Kill process after timeout
      const timeout = setTimeout(
        () => {
          try {
            child.kill('SIGTERM');
          } catch (e) {
            // Process might already be dead
          }
          resolve({
            success: false,
            output: output + '\n[Process killed due to timeout]',
          });
        },
        5 * 60 * 1000
      ); // 5 minutes per command

      child.on('exit', () => {
        clearTimeout(timeout);
      });

      // Store process reference
      job.childProcess = child;
    });
  }

  private parseTestResults(output: string): any {
    // Parse vitest output
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);
    const durationMatch = output.match(/Duration (\d+\.?\d*)s/);

    const results = {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      duration: durationMatch ? parseFloat(durationMatch[1]) : 0,
      failures: [] as any[],
    };

    // Extract failure details if any
    if (results.failed > 0) {
      const failureRegex = /FAIL\s+(.+?)\s+›\s+(.+?)(?:\n|$)/g;
      let match;
      while ((match = failureRegex.exec(output)) !== null) {
        results.failures.push({
          test: `${match[1]} › ${match[2]}`,
          error: 'See full output for details',
        });
      }
    }

    return results;
  }

  private async collectCodeFiles(
    dirPath: string
  ): Promise<Array<{ path: string; content: string }>> {
    const files: Array<{ path: string; content: string }> = [];

    const collectRecursive = async (currentPath: string, basePath: string) => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);

        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', '.git'].includes(entry.name)) {
            await collectRecursive(fullPath, basePath);
          }
        } else if (entry.isFile() && /\.(ts|js|json)$/.test(entry.name)) {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({ path: relativePath, content });
        }
      }
    };

    await collectRecursive(dirPath, dirPath);
    return files;
  }

  private async prepareNextIteration(job: PluginCreationJob): Promise<void> {
    // Clean up failed build artifacts
    const distPath = path.join(job.outputPath, 'dist');
    if (await fs.pathExists(distPath)) {
      await fs.remove(distPath);
    }

    // Log iteration summary
    logger.info(`Iteration ${job.currentIteration} summary for ${job.specification.name}:`);
    const iterationErrors = job.errors.filter((e) => e.iteration === job.currentIteration);
    iterationErrors.forEach((e) => {
      logger.error(`  - ${e.phase}: ${e.error}`);
    });
  }

  private async notifyPluginReady(job: PluginCreationJob): Promise<void> {
    // Notify plugin management service
    const pluginService = this.runtime.getService('pluginManagement') as any;
    if (pluginService) {
      try {
        // Install the newly created plugin
        await pluginService.installPlugin(job.outputPath);
        logger.success(`Plugin ${job.specification.name} installed from ${job.outputPath}`);
      } catch (error) {
        logger.error(`Failed to install newly created plugin:`, error);
      }
    }
  }

  private async ensureWorkspaceDirs(): Promise<void> {
    const workspaceDir = path.join(this.getDataDir(), 'plugin_dev_workspace');
    await fs.ensureDir(workspaceDir);
  }

  // Public API methods

  getJob(jobId: string): PluginCreationJob | undefined {
    return this.jobs.get(jobId);
  }

  listJobs(): PluginCreationJob[] {
    return Array.from(this.jobs.values());
  }

  private isValidPluginName(name: string): boolean {
    // Validate plugin name format and prevent path traversal
    const validNameRegex = /^@?[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+$/;
    return (
      validNameRegex.test(name) &&
      !name.includes('..') &&
      !name.includes('./') &&
      !name.includes('\\')
    );
  }

  private sanitizePluginName(name: string): string {
    // Remove @ prefix and replace / with -
    return name.replace(/^@/, '').replace(/\//g, '-').toLowerCase();
  }

  private lastJobCreation: number = 0;
  private jobCreationCount: number = 0;

  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Reset counter if more than an hour has passed
    if (now - this.lastJobCreation > oneHour) {
      this.jobCreationCount = 0;
    }

    // Allow max 10 jobs per hour
    if (this.jobCreationCount >= 10) {
      return false;
    }

    this.lastJobCreation = now;
    this.jobCreationCount++;
    return true;
  }

  // Add cleanup method for old jobs
  public cleanupOldJobs(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const jobsToRemove: string[] = [];

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt < oneWeekAgo) {
        jobsToRemove.push(jobId);

        // Clean up output directory
        if (job.outputPath) {
          fs.remove(job.outputPath).catch((err) => {
            logger.error(`Failed to clean up job ${jobId} output:`, err);
          });
        }
      }
    }

    // Remove old jobs from memory
    jobsToRemove.forEach((jobId) => this.jobs.delete(jobId));

    if (jobsToRemove.length > 0) {
      logger.info(`Cleaned up ${jobsToRemove.length} old jobs`);
    }
  }

  private async persistJobs(): Promise<void> {
    try {
      const jobsData = Array.from(this.jobs.entries()).map(([id, job]) => ({
        id,
        job: {
          ...job,
          childProcess: undefined, // Don't persist child process
        },
      }));

      const data = {
        jobs: jobsData,
        createdPlugins: Array.from(this.createdPlugins),
        lastUpdated: new Date().toISOString(),
      };

      await fs.ensureDir(path.dirname(this.jobPersistencePath));
      await fs.writeJson(this.jobPersistencePath, data, { spaces: 2 });

      logger.info('Persisted plugin creation jobs', { count: jobsData.length });
    } catch (error) {
      logger.error('Failed to persist jobs:', error);
    }
  }

  private async loadPersistedJobs(): Promise<void> {
    try {
      if (await fs.pathExists(this.jobPersistencePath)) {
        const data = await fs.readJson(this.jobPersistencePath);

        // Restore jobs
        if (data.jobs && Array.isArray(data.jobs)) {
          for (const { id, job } of data.jobs) {
            // Convert date strings back to Date objects
            job.startedAt = new Date(job.startedAt);
            if (job.completedAt) {
              job.completedAt = new Date(job.completedAt);
            }

            // Mark running jobs as failed since they were interrupted
            if (job.status === 'running' || job.status === 'pending') {
              job.status = 'failed';
              job.error = 'Job interrupted by service restart';
              job.completedAt = new Date();
            }

            this.jobs.set(id, job);
          }
        }

        // Restore created plugins set
        if (data.createdPlugins && Array.isArray(data.createdPlugins)) {
          this.createdPlugins = new Set(data.createdPlugins);
        }

        logger.info('Loaded persisted jobs', {
          jobCount: this.jobs.size,
          pluginCount: this.createdPlugins.size,
        });
      }
    } catch (error) {
      logger.error('Failed to load persisted jobs:', error);
    }
  }

  private startCleanupTimer(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupOldJobs();
        this.persistJobs().catch((error) => {
          logger.error('Failed to persist jobs during cleanup:', error);
        });

        // Log metrics periodically
        logger.info('Plugin creation service metrics', { metrics: this.metrics });
      },
      60 * 60 * 1000
    ); // 1 hour
  }

  public getMetrics() {
    return { ...this.metrics };
  }

  private isRetryableError(error: any): boolean {
    const errorMessage = error?.message || String(error);
    const retryablePatterns = [
      'rate_limit',
      'timeout',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'network',
      '429',
      '503',
      '504',
    ];

    return retryablePatterns.some((pattern) =>
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private updateAverageCompletionTime(newTime: number): void {
    const currentAvg = this.metrics.averageCompletionTime;
    const totalCompleted = this.metrics.successfulJobs;

    this.metrics.averageCompletionTime =
      (currentAvg * (totalCompleted - 1) + newTime) / totalCompleted;
  }

  public getHealthStatus() {
    const now = Date.now();
    const activeJobs = Array.from(this.jobs.values()).filter(
      (job) => job.status === 'running' || job.status === 'pending'
    );

    const recentJobs = Array.from(this.jobs.values()).filter(
      (job) => job.completedAt && now - job.completedAt.getTime() < 60 * 60 * 1000
    );

    const successRate =
      this.metrics.totalJobs > 0 ? (this.metrics.successfulJobs / this.metrics.totalJobs) * 100 : 0;

    const apiErrorRate =
      this.metrics.apiCalls > 0 ? (this.metrics.apiErrors / this.metrics.apiCalls) * 100 : 0;

    return {
      status: this.anthropic ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      metrics: this.metrics,
      activeJobs: activeJobs.length,
      totalJobs: this.jobs.size,
      recentCompletions: recentJobs.length,
      successRate: successRate.toFixed(2) + '%',
      apiErrorRate: apiErrorRate.toFixed(2) + '%',
      averageCompletionTimeMinutes: (this.metrics.averageCompletionTime / 60000).toFixed(2),
      anthropicConfigured: !!this.anthropic,
      selectedModel: this.selectedModel,
    };
  }
}
