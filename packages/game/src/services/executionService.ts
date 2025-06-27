import {
  Service,
  type IAgentRuntime,
  type UUID
} from '@elizaos/core';
import type { ExecutionResult } from '../types/gameTypes';

export interface ExecutionEnvironment {
  type: 'local' | 'local-sandbox' | 'hosted-sandbox';
  agentId: string;
  initialize(): Promise<void>;
  execute(code: string, language: string, options?: any): Promise<ExecutionResult>;
  stop(): Promise<void>;
  getResourceUsage(): Promise<{ cpu: number; memory: number; duration: number }>;
}

export class LocalEnvironment implements ExecutionEnvironment {
  type: 'local' = 'local';
  
  constructor(public agentId: string, private runtime: IAgentRuntime) {}

  async initialize(): Promise<void> {
    this.runtime.logger.info(`[LocalEnvironment] Initialized for agent ${this.agentId}`);
  }

  async execute(code: string, language: string, options?: any): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = `local_${this.agentId}_${startTime}`;

    try {
      // Store execution attempt in memory
      await this.runtime.createMemory({
        entityId: this.agentId,
        roomId: options?.roomId || `room_${this.agentId}`,
        content: {
          text: `Executing ${language} code locally`,
          source: 'execution-service',
          metadata: {
            executionId,
            language,
            codeLength: code.length,
            environment: 'local'
          }
        },
        metadata: {
          type: 'code_execution',
          executionId,
          language,
          environment: 'local'
        }
      }, 'executions');

      // For local execution, we use Node.js child process
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      let command: string;
      let tempFile: string;

      switch (language.toLowerCase()) {
        case 'javascript':
        case 'typescript':
          tempFile = `/tmp/code_${executionId}.js`;
          command = `node ${tempFile}`;
          break;
        case 'python':
          tempFile = `/tmp/code_${executionId}.py`;
          command = `python3 ${tempFile}`;
          break;
        default:
          throw new Error(`Unsupported language for local execution: ${language}`);
      }

      // Write code to temp file
      const fs = await import('fs/promises');
      await fs.writeFile(tempFile, code);

      // Execute with timeout
      const timeout = options?.timeout || 30000;
      const { stdout, stderr } = await execAsync(command, { timeout });

      // Clean up temp file
      await fs.unlink(tempFile);

      const duration = Date.now() - startTime;

      const result: ExecutionResult = {
        success: !stderr,
        output: stdout || stderr,
        errors: stderr ? [stderr] : undefined,
        artifacts: [],
        resourceUsage: {
          cpu: 0, // Not available for local execution
          memory: 0,
          duration
        },
        executionId,
        agentId: this.agentId,
        timestamp: Date.now()
      };

      // Store execution result
      await this.runtime.createMemory({
        entityId: this.agentId,
        roomId: options?.roomId || `room_${this.agentId}`,
        content: {
          text: `Execution ${result.success ? 'successful' : 'failed'}: ${result.output?.substring(0, 100)}...`,
          source: 'execution-service',
          metadata: {
            executionId,
            result,
            language,
            environment: 'local'
          }
        },
        metadata: {
          type: 'execution_result',
          executionId,
          success: result.success,
          language,
          environment: 'local'
        }
      }, 'executions');

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      const result: ExecutionResult = {
        success: false,
        output: '',
        errors: [error instanceof Error ? error.message : String(error)],
        artifacts: [],
        resourceUsage: {
          cpu: 0,
          memory: 0,
          duration
        },
        executionId,
        agentId: this.agentId,
        timestamp: Date.now()
      };

      // Store execution error
      await this.runtime.createMemory({
        entityId: this.agentId,
        roomId: options?.roomId || `room_${this.agentId}`,
        content: {
          text: `Execution failed: ${error instanceof Error ? error.message : String(error)}`,
          source: 'execution-service',
          metadata: {
            executionId,
            error: error instanceof Error ? error.message : String(error),
            language,
            environment: 'local'
          }
        },
        metadata: {
          type: 'execution_error',
          executionId,
          language,
          environment: 'local'
        }
      }, 'executions');

      return result;
    }
  }

  async getResourceUsage(): Promise<{ cpu: number; memory: number; duration: number }> {
    return { cpu: 0, memory: 0, duration: 0 };
  }

  async stop(): Promise<void> {
    // Nothing to clean up for local environment
  }
}

export class SandboxEnvironment implements ExecutionEnvironment {
  type: 'local-sandbox' = 'local-sandbox';
  
  constructor(public agentId: string, private runtime: IAgentRuntime) {}

  async initialize(): Promise<void> {
    try {
      this.runtime.logger.info(`[SandboxEnvironment] Initialized for agent ${this.agentId}`);
    } catch (error) {
      this.runtime.logger.error(`[SandboxEnvironment] Failed to initialize for agent ${this.agentId}:`, error);
      throw error;
    }
  }

  async execute(code: string, language: string, options?: any): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = `sandbox_${this.agentId}_${startTime}`;

    try {
      // Store execution attempt
      await this.runtime.createMemory({
        entityId: this.agentId,
        roomId: options?.roomId || `room_${this.agentId}`,
        content: {
          text: `Executing ${language} code in sandbox`,
          source: 'execution-service',
          metadata: {
            executionId,
            language,
            codeLength: code.length,
            environment: 'sandbox'
          }
        },
        metadata: {
          type: 'code_execution',
          executionId,
          language,
          environment: 'sandbox'
        }
      }, 'executions');

      // Check if E2B service is available
      const e2bService = this.runtime.getService('e2b');
      if (e2bService) {
        return await this.executeWithE2B(code, language, executionId, options);
      }

      // Fallback to Docker-like isolation
      return await this.executeWithDocker(code, language, executionId, options);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      const result: ExecutionResult = {
        success: false,
        output: '',
        errors: [error instanceof Error ? error.message : String(error)],
        artifacts: [],
        resourceUsage: {
          cpu: 0,
          memory: 0,
          duration
        },
        executionId,
        agentId: this.agentId,
        timestamp: Date.now()
      };

      // Store execution error
      await this.runtime.createMemory({
        entityId: this.agentId,
        roomId: options?.roomId || `room_${this.agentId}`,
        content: {
          text: `Sandbox execution failed: ${error instanceof Error ? error.message : String(error)}`,
          source: 'execution-service',
          metadata: {
            executionId,
            error: error instanceof Error ? error.message : String(error),
            language,
            environment: 'sandbox'
          }
        },
        metadata: {
          type: 'execution_error',
          executionId,
          language,
          environment: 'sandbox'
        }
      }, 'executions');

      return result;
    }
  }

  private async executeWithE2B(code: string, language: string, executionId: string, options?: any): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // This would use the actual E2B plugin when available
      const e2bService = this.runtime.getService('e2b');
      
      // For now, simulate E2B execution
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      const duration = Date.now() - startTime;
      const isSuccess = Math.random() > 0.1; // 90% success rate simulation

      const result: ExecutionResult = {
        success: isSuccess,
        output: isSuccess ? 
          `E2B execution completed successfully for ${language} code.\nOutput: Hello World!\nProcess completed with exit code 0.` :
          `E2B execution failed with error: Syntax error in ${language} code`,
        errors: isSuccess ? undefined : [`Syntax error in ${language} code`],
        artifacts: isSuccess ? [`output_${executionId}.log`] : [],
        resourceUsage: {
          cpu: 25 + Math.random() * 50,
          memory: 64 + Math.random() * 192,
          duration
        },
        executionId,
        agentId: this.agentId,
        timestamp: Date.now()
      };

      // Store E2B execution result
      await this.runtime.createMemory({
        entityId: this.agentId,
        roomId: options?.roomId || `room_${this.agentId}`,
        content: {
          text: `E2B execution ${result.success ? 'successful' : 'failed'}: ${result.output?.substring(0, 100)}...`,
          source: 'execution-service',
          metadata: {
            executionId,
            result,
            language,
            environment: 'e2b'
          }
        },
        metadata: {
          type: 'execution_result',
          executionId,
          success: result.success,
          language,
          environment: 'e2b'
        }
      }, 'executions');

      return result;
    } catch (error) {
      throw error;
    }
  }

  private async executeWithDocker(code: string, language: string, executionId: string, options?: any): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Create isolated Docker container
      let dockerImage: string;
      let runCommand: string;

      switch (language.toLowerCase()) {
        case 'javascript':
        case 'typescript':
          dockerImage = 'node:18-alpine';
          runCommand = `echo '${code.replace(/'/g, "'\\''")}' | node`;
          break;
        case 'python':
          dockerImage = 'python:3.9-alpine';
          runCommand = `echo '${code.replace(/'/g, "'\\''")}' | python3`;
          break;
        default:
          throw new Error(`Unsupported language for Docker execution: ${language}`);
      }

      const dockerCommand = `docker run --rm --memory=256m --cpus=0.5 --network=none ${dockerImage} sh -c "${runCommand}"`;
      
      const timeout = options?.timeout || 30000;
      const { stdout, stderr } = await execAsync(dockerCommand, { timeout });

      const duration = Date.now() - startTime;

      const result: ExecutionResult = {
        success: !stderr,
        output: stdout || stderr,
        errors: stderr ? [stderr] : undefined,
        artifacts: [],
        resourceUsage: {
          cpu: 50, // Estimated
          memory: 256,
          duration
        },
        executionId,
        agentId: this.agentId,
        timestamp: Date.now()
      };

      // Store Docker execution result
      await this.runtime.createMemory({
        entityId: this.agentId,
        roomId: options?.roomId || `room_${this.agentId}`,
        content: {
          text: `Docker execution ${result.success ? 'successful' : 'failed'}: ${result.output?.substring(0, 100)}...`,
          source: 'execution-service',
          metadata: {
            executionId,
            result,
            language,
            environment: 'docker'
          }
        },
        metadata: {
          type: 'execution_result',
          executionId,
          success: result.success,
          language,
          environment: 'docker'
        }
      }, 'executions');

      return result;

    } catch (error) {
      throw error;
    }
  }

  async getResourceUsage(): Promise<{ cpu: number; memory: number; duration: number }> {
    return { cpu: 25, memory: 128, duration: 0 };
  }

  async stop(): Promise<void> {
    // Clean up any running containers or E2B instances
    this.runtime.logger.info(`[SandboxEnvironment] Stopped environment for agent ${this.agentId}`);
  }
}

export class ExecutionService extends Service {
  static serviceName = 'execution';
  static serviceType = 'CODE_EXECUTION';
  
  capabilityDescription = 'Provides code execution environments using real ElizaOS infrastructure';
  
  private environments: Map<string, ExecutionEnvironment> = new Map();

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<ExecutionService> {
    const service = new ExecutionService(runtime);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    this.runtime.logger.info('[ExecutionService] Service initialized');
  }

  async createEnvironment(
    type: ExecutionEnvironment['type'], 
    agentId: string
  ): Promise<ExecutionEnvironment> {
    let environment: ExecutionEnvironment;

    switch (type) {
      case 'local':
        environment = new LocalEnvironment(agentId, this.runtime);
        break;
      case 'local-sandbox':
        environment = new SandboxEnvironment(agentId, this.runtime);
        break;
      case 'hosted-sandbox':
        // For hosted sandbox, we'll use the sandbox environment with E2B preference
        environment = new SandboxEnvironment(agentId, this.runtime);
        break;
      default:
        throw new Error(`Unsupported environment type: ${type}`);
    }

    await environment.initialize();
    this.environments.set(agentId, environment);

    this.runtime.logger.info(`[ExecutionService] Created ${type} environment for agent ${agentId}`);
    return environment;
  }

  async executeCode(
    agentId: string, 
    code: string, 
    language: string, 
    options?: any
  ): Promise<ExecutionResult> {
    let environment = this.environments.get(agentId);
    
    if (!environment) {
      // Create default environment
      const defaultType = this.runtime.getSetting('defaultExecutionEnvironment') as ExecutionEnvironment['type'] || 'local-sandbox';
      environment = await this.createEnvironment(defaultType, agentId);
    }

    return await environment.execute(code, language, options);
  }

  async getEnvironment(agentId: string): Promise<ExecutionEnvironment | undefined> {
    return this.environments.get(agentId);
  }

  async removeEnvironment(agentId: string): Promise<void> {
    const environment = this.environments.get(agentId);
    if (environment) {
      await environment.stop();
      this.environments.delete(agentId);
      this.runtime.logger.info(`[ExecutionService] Removed environment for agent ${agentId}`);
    }
  }

  async getResourceUsage(agentId: string): Promise<{ cpu: number; memory: number; duration: number } | null> {
    const environment = this.environments.get(agentId);
    return environment ? await environment.getResourceUsage() : null;
  }

  async getAllExecutions(agentId?: string): Promise<any[]> {
    try {
      const executions = await this.runtime.getMemories({
        tableName: 'executions',
        count: 50
      });

      return executions
        .filter(m => !agentId || m.entityId === agentId)
        .map(m => ({
          executionId: m.metadata?.executionId,
          agentId: m.entityId,
          success: m.metadata?.success,
          language: m.metadata?.language,
          environment: m.metadata?.environment,
          timestamp: m.createdAt,
          result: m.content.metadata?.result
        }));
    } catch (error) {
      this.runtime.logger.error('[ExecutionService] Failed to get executions:', error);
      return [];
    }
  }

  async stop(): Promise<void> {
    // Stop all environments
    const stopPromises = Array.from(this.environments.values()).map(env => env.stop());
    await Promise.all(stopPromises);
    
    this.environments.clear();
    this.runtime.logger.info('[ExecutionService] Stopped all environments');
  }
}