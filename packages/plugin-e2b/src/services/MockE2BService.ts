import { Service, elizaLogger, type IAgentRuntime } from '@elizaos/core';
import type { E2BServiceType, E2BSandboxOptions, E2BExecutionResult, E2BSandboxHandle } from '../types.js';
import { ErrorInstrumentation, instrumented, retryable } from '../utils/errorInstrumentation.js';

/**
 * Mock E2B Service for testing purposes
 * Simulates E2B functionality without requiring a valid API key
 */
export class MockE2BService extends Service implements E2BServiceType {
  static serviceName = 'e2b';
  static serviceType = 'e2b';

  private mockSandboxes: Map<string, {
    sandbox: any;
    handle: E2BSandboxHandle;
  }> = new Map();

  private nextSandboxId = 1;

  get capabilityDescription(): string {
    return 'Mock E2B service for testing secure code execution workflows';
  }

  static async start(runtime: IAgentRuntime): Promise<MockE2BService> {
    const service = new MockE2BService(runtime);
    await service.initialize();
    elizaLogger.info('MockE2BService started successfully');
    return service;
  }

  @instrumented('MockE2BService', 'initialize')
  async initialize(): Promise<void> {
    elizaLogger.info('Initializing Mock E2B service');

    // Create a default mock sandbox
    const defaultSandboxId = await this.createSandbox({
      timeoutMs: 300000,
      metadata: { purpose: 'default', mock: 'true' }
    });

    elizaLogger.info('Mock E2B service initialized with default sandbox', { defaultSandboxId });

    // Log initialization metrics
    ErrorInstrumentation.logMetrics('MockE2BService', 'initialize', {
      defaultSandboxId,
      totalSandboxes: this.mockSandboxes.size,
      serviceReady: true
    });
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping Mock E2B service');
    this.mockSandboxes.clear();
    elizaLogger.info('Mock E2B service stopped');
  }

  @instrumented('MockE2BService', 'executeCode')
  async executeCode(code: string, language = 'python'): Promise<E2BExecutionResult> {
    elizaLogger.debug('Mock executing code', { language, codeLength: code.length });

    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Log execution metrics
    ErrorInstrumentation.logMetrics('MockE2BService', 'executeCode', {
      language,
      codeLength: code.length,
      executionStarted: true
    });

    // Mock different types of code execution
    if (code.includes('error') || code.includes('raise') || code.includes('1/0')) {
      return {
        text: undefined,
        results: [],
        logs: { stdout: [], stderr: ['Simulated error'] },
        error: {
          name: 'MockError',
          value: 'Simulated execution error',
          traceback: 'Mock traceback for testing'
        },
        executionCount: 1
      };
    }

    // Simulate successful execution
    let mockOutput = '';
    let mockResult = '';

    if (code.includes('print')) {
      const printMatch = code.match(/print\(['"](.*?)['"]\)/);
      if (printMatch) {
        mockOutput = printMatch[1];
      }
    }

    if (code.includes('=') && !code.includes('==')) {
      mockResult = 'Assignment completed';
    }

    if (code.includes('2 + 2') || code.includes('2+2')) {
      mockOutput = '4';
      mockResult = '4';
    }

    if (code.includes('math') || code.includes('sqrt')) {
      mockOutput = 'Math calculation completed';
      mockResult = '4.0';
    }

    if (code.includes('fibonacci')) {
      mockOutput = 'Fibonacci sequence up to 10: [0, 1, 1, 2, 3, 5, 8]';
      mockResult = '[0, 1, 1, 2, 3, 5, 8]';
    }

    if (code.includes('Hello') || code.includes('hello')) {
      mockOutput = 'Hello from Mock E2B!';
    }

    if (!mockOutput && !mockResult) {
      mockOutput = 'Mock execution completed successfully';
      mockResult = 'mock_result';
    }

    return {
      text: mockResult || mockOutput,
      results: mockResult ? [{ toJSON: () => ({ type: 'text', data: mockResult }) }] : [],
      logs: {
        stdout: mockOutput ? [mockOutput] : ['Mock execution output'],
        stderr: []
      },
      error: undefined,
      executionCount: 1
    };
  }

  @retryable('MockE2BService', 2, 500, 'createSandbox')
  async createSandbox(opts: E2BSandboxOptions = {}): Promise<string> {
    const sandboxId = `mock-sandbox-${this.nextSandboxId++}`;

    elizaLogger.info('Creating mock sandbox', { sandboxId, opts });

    // Simulate occasional sandbox creation failures for testing
    if (Math.random() < 0.1 && opts.metadata?.simulateFailure) {
      throw ErrorInstrumentation.instrumentError(
        new Error('Mock sandbox creation failed (simulated)'),
        {
          service: 'MockE2BService',
          operation: 'createSandbox',
          metadata: { sandboxId, opts }
        }
      );
    }

    const handle: E2BSandboxHandle = {
      sandboxId,
      isActive: true,
      createdAt: new Date(),
      lastActivity: new Date(),
      metadata: opts.metadata,
      template: opts.template || 'base'
    };

    const mockSandbox = {
      sandboxId,
      kill: async () => {
        handle.isActive = false;
      },
      runCode: async (code: string) => {
        return this.executeCode(code);
      }
    };

    this.mockSandboxes.set(sandboxId, { sandbox: mockSandbox, handle });

    return sandboxId;
  }

  async killSandbox(sandboxId: string): Promise<void> {
    const sandboxData = this.mockSandboxes.get(sandboxId);
    if (!sandboxData) {
      elizaLogger.warn('Attempted to kill non-existent mock sandbox', { sandboxId });
      return;
    }

    elizaLogger.info('Killing mock sandbox', { sandboxId });
    sandboxData.handle.isActive = false;
    this.mockSandboxes.delete(sandboxId);
  }

  getSandbox(sandboxId: string): E2BSandboxHandle | null {
    const sandboxData = this.mockSandboxes.get(sandboxId);
    return sandboxData?.handle || null;
  }

  listSandboxes(): E2BSandboxHandle[] {
    return Array.from(this.mockSandboxes.values()).map(data => data.handle);
  }

  async writeFileToSandbox(sandboxId: string, path: string, content: string): Promise<void> {
    const sandboxData = this.mockSandboxes.get(sandboxId);
    if (!sandboxData) {
      throw new Error(`Mock sandbox ${sandboxId} not found`);
    }

    elizaLogger.debug('Mock writing file to sandbox', { sandboxId, path, size: content.length });
    sandboxData.handle.lastActivity = new Date();
  }

  async readFileFromSandbox(sandboxId: string, path: string): Promise<string> {
    const sandboxData = this.mockSandboxes.get(sandboxId);
    if (!sandboxData) {
      throw new Error(`Mock sandbox ${sandboxId} not found`);
    }

    elizaLogger.debug('Mock reading file from sandbox', { sandboxId, path });
    sandboxData.handle.lastActivity = new Date();

    return `Mock file content from ${path}`;
  }

  async isHealthy(): Promise<boolean> {
    // Mock service is always healthy
    return true;
  }
}

