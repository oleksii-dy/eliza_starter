import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { blockchainAuditorPlugin } from '../index';
import { ToolExecutionService, type CommandResult } from '../tool-execution.service';
import type { IAgentRuntime, Action, Memory, State, HandlerCallback, Service } from '@elizaos/core';
import { logger } from '@elizaos/core'; // Assuming logger is exported like this

// Mock @elizaos/core logger
vi.mock('@elizaos/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@elizaos/core')>();
  return {
    ...original,
    logger: {
      info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
      success: vi.fn(), fatal: vi.fn(),
    },
    Service: class MockService { // Mock base Service class
        runtime: IAgentRuntime;
        constructor(runtime: IAgentRuntime) { this.runtime = runtime; }
        static getService(runtime: IAgentRuntime) { return runtime.getService(this.serviceType); }
        static serviceType = "MockService"; // Default, will be overridden by actual service mock
        init() {}
        stop() {}
    },
  };
});

// Mock ToolExecutionService
const mockExecuteCommand = vi.fn();
let toolServiceInstance: ToolExecutionService | null = null;

vi.mock('../tool-execution.service', () => {
  return {
    ToolExecutionService: vi.fn().mockImplementation((runtime: IAgentRuntime) => {
      toolServiceInstance = {
        runtime,
        executeCommand: mockExecuteCommand,
      } as unknown as ToolExecutionService;
      return toolServiceInstance;
    }),
  };
});


describe('@elizaos/plugin-blockchain-auditor', () => {
  let mockRuntime: IAgentRuntime;
  let mockHandlerCb: HandlerCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHandlerCb = vi.fn();

    mockRuntime = {
      agentId: 'auditor-agent-001',
      getService: vi.fn((serviceType: string | typeof Service) => {
        if (serviceType === ToolExecutionService.serviceType || serviceType === ToolExecutionService) {
          if (!toolServiceInstance) { // Create instance if not exists for this test
            new (vi.mocked(ToolExecutionService))(mockRuntime);
          }
          return toolServiceInstance;
        }
        return undefined;
      }) as any,
      // ... other runtime methods if needed
    } as unknown as IAgentRuntime;

    // Ensure static serviceType is available on the mock for getService lookup
    (vi.mocked(ToolExecutionService) as any).serviceType = 'ToolExecutionService';

    // Initialize plugin with default config for tests
    const defaultConfig = { FORGE_PATH: 'forge', SLITHER_PATH: 'slither' };
    blockchainAuditorPlugin.init?.(mockRuntime, defaultConfig);
  });

  describe('Plugin Initialization', () => {
    it('should initialize with default tool paths if none are provided', async () => {
      await blockchainAuditorPlugin.init?.(mockRuntime, {});
      // Access internal pluginConfig for verification (not ideal, but for testing init)
      // This requires pluginConfig to be exported or inspectable, or test via behavior.
      // For now, assume init logs or sets up ToolExecutionService correctly.
      expect(logger.success).toHaveBeenCalledWith('Blockchain Auditor Plugin initialized.');
    });

    it('should initialize with configured tool paths', async () => {
      const config = { FORGE_PATH: '/usr/bin/forge', SLITHER_PATH: '/usr/bin/slither' };
      await blockchainAuditorPlugin.init?.(mockRuntime, config);
      expect(logger.debug).toHaveBeenCalledWith('Blockchain Auditor plugin configuration:', config);
    });
  });

  describe('RUN_FORGE_TEST Action', () => {
    let action: Action | undefined;

    beforeEach(() => {
      action = blockchainAuditorPlugin.actions?.find(a => a.name === 'RUN_FORGE_TEST');
      expect(action).toBeDefined();
      mockExecuteCommand.mockResolvedValue({ stdout: 'Forge tests passed!', stderr: '', exitCode: 0 });
    });

    it('should validate successfully with valid options', async () => {
      const options = { projectPath: '/path/to/project' };
      const isValid = await action?.validate?.(mockRuntime, {} as Memory, {} as State, options);
      expect(isValid).toBe(true);
    });

    it('should fail validation if projectPath is missing', async () => {
      const options = {};
      const isValid = await action?.validate?.(mockRuntime, {} as Memory, {} as State, options);
      expect(isValid).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('[RUN_FORGE_TEST] Validation failed:', expect.any(Error));
    });

    it('handler should call ToolExecutionService.executeCommand with correct forge args', async () => {
      const options = { projectPath: '/test/project', verbosity: 'vvv', fuzzRuns: 100 };
      await action?.handler?.(mockRuntime, {} as Memory, {} as State, options, mockHandlerCb, []);

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        'forge', // from default pluginConfig
        ['test', '-vvv', '--fuzz-runs', '100'],
        { cwd: '/test/project' }
      );
      expect(mockHandlerCb).toHaveBeenCalledWith(expect.objectContaining({
        text: 'Forge test execution finished with exit code 0.',
        data: { stdout: 'Forge tests passed!', stderr: '', exitCode: 0 },
      }));
    });
  });

  describe('RUN_SLITHER_ANALYSIS Action', () => {
    let action: Action | undefined;

    beforeEach(() => {
      action = blockchainAuditorPlugin.actions?.find(a => a.name === 'RUN_SLITHER_ANALYSIS');
      expect(action).toBeDefined();
      mockExecuteCommand.mockResolvedValue({ stdout: '{"success": true, "results": []}', stderr: '', exitCode: 0 });
    });

    it('should validate successfully with valid options', async () => {
      const options = { targetPath: '/path/to/contract.sol' };
      const isValid = await action?.validate?.(mockRuntime, {} as Memory, {} as State, options);
      expect(isValid).toBe(true);
    });

    it('handler should call ToolExecutionService.executeCommand with correct slither args', async () => {
      const options = { targetPath: '/test/project/src/MyContract.sol', outputFormat: 'json' };
      // For this test, let's assume the plugin was configured to use 'slither_custom_path'
      await blockchainAuditorPlugin.init?.(mockRuntime, { SLITHER_PATH: 'slither_custom_path' });

      await action?.handler?.(mockRuntime, {} as Memory, {} as State, options, mockHandlerCb, []);

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        'slither_custom_path',
        ['/test/project/src/MyContract.sol', '--json'], // Note: schema default is json-human-compact, test is overriding
        { cwd: process.cwd() }
      );
      expect(mockHandlerCb).toHaveBeenCalledWith(expect.objectContaining({
        text: 'Slither analysis finished with exit code 0. Output (JSON) is in data field.',
        data: { stdout: '{"success": true, "results": []}', stderr: '', exitCode: 0 },
      }));
    });

    it('handler should use default json-human-compact if outputFormat is not specified', async () => {
        const options = { targetPath: '/test/project/src/MyContract.sol' };
        await blockchainAuditorPlugin.init?.(mockRuntime, { SLITHER_PATH: 'slither' }); // re-init with default
        await action?.handler?.(mockRuntime, {} as Memory, {} as State, options, mockHandlerCb, []);
        expect(mockExecuteCommand).toHaveBeenCalledWith(
            'slither',
            ['/test/project/src/MyContract.sol', '--json-human-compact'],
            expect.any(Object)
        );
    });
  });
});
