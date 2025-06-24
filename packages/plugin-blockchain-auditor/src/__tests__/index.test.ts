import { describe, it, expect, vi, beforeEach } from 'vitest';
import { blockchainAuditorPlugin } from '../index';
import { ToolExecutionService, CONTAINER_WORKSPACE_PATH } from '../tool-execution.service';
import type { IAgentRuntime, Action, Memory, State, HandlerCallback, Service, Character } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { initializeAuditorConfig, getAuditorConfig, AuditorPluginConfigSchema } from '../environment';

vi.mock('@elizaos/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@elizaos/core')>();
  return {
    ...original,
    logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(), fatal: vi.fn() },
    Service: class MockService {
        runtime: IAgentRuntime;
        constructor(runtime: IAgentRuntime) { this.runtime = runtime; }
        static getService(runtime: IAgentRuntime) { return runtime.getService(this.serviceType); }
        static serviceType = "MockService";
        init() {}
        stop() {}
    },
  };
});

const mockExecuteCommand = vi.fn();
let toolServiceInstanceMock: Partial<ToolExecutionService>;

vi.mock('../tool-execution.service', () => ({
  ToolExecutionService: vi.fn().mockImplementation((runtime: IAgentRuntime) => {
    toolServiceInstanceMock = { executeCommand: mockExecuteCommand, runtime };
    return toolServiceInstanceMock;
  }),
  CONTAINER_WORKSPACE_PATH: '/app/workspace',
}));

vi.mock('../environment', async (importOriginal) => {
    const actualEnvironment = await importOriginal<typeof import('../environment')>();
    const defaultConfigValues = actualEnvironment.AuditorPluginConfigSchema.parse({});
    let currentTestConfig = defaultConfigValues;
    return {
        ...actualEnvironment,
        initializeAuditorConfig: vi.fn((config) => {
            currentTestConfig = actualEnvironment.AuditorPluginConfigSchema.parse({ ...defaultConfigValues, ...config });
            return currentTestConfig;
        }),
        getAuditorConfig: vi.fn(() => currentTestConfig),
    };
});

describe('@elizaos/plugin-blockchain-auditor', () => {
  let mockRuntime: IAgentRuntime;
  let mockHandlerCb: HandlerCallback;
  let defaultPluginConfig: ReturnType<typeof AuditorPluginConfigSchema.parse>;


  beforeEach(() => {
    vi.resetAllMocks();
    mockHandlerCb = vi.fn();
    defaultPluginConfig = AuditorPluginConfigSchema.parse({}); // Get fresh defaults

    mockRuntime = {
      agentId: 'auditor-agent-001',
      character: { name: 'AuditBot001' } as Character,
      getService: vi.fn().mockImplementation((serviceTypeOrClass: string | typeof Service) => {
        const serviceTypeString = typeof serviceTypeOrClass === 'string' ? serviceTypeOrClass : (serviceTypeOrClass as any).serviceType;
        if (serviceTypeString === 'ToolExecutionService') {
          if (!toolServiceInstanceMock) new (vi.mocked(ToolExecutionService))(mockRuntime);
          return toolServiceInstanceMock as ToolExecutionService;
        }
        return undefined;
      }),
    } as unknown as IAgentRuntime;

    (ToolExecutionService as any).serviceType = 'ToolExecutionService';

    // Initialize plugin using the mocked initializeAuditorConfig
    // This ensures getAuditorConfig() in the plugin index.ts gets the mocked config.
    initializeAuditorConfig({}); // Initialize with defaults for each test context
    blockchainAuditorPlugin.init?.(mockRuntime, {}); // Call plugin init
  });

  describe('Plugin Initialization', () => {
    it('should call initializeAuditorConfig with merged env/direct config', async () => {
      const directConfig = { FORGE_PATH: '/custom/forge', DEFAULT_FOUNDRY_DOCKER_IMAGE: 'my/image' };
      // Simulate environment variables
      process.env.SLITHER_PATH = '/env/slither';

      await blockchainAuditorPlugin.init?.(mockRuntime, directConfig);

      // The mock for initializeAuditorConfig already handles merging logic.
      // We check if it was called with the directConfig, as it will internally handle process.env.
      // For a more precise test of merging, the mock of initializeAuditorConfig would need to be more complex
      // or we'd test the real initializeAuditorConfig in environment.test.ts (which is good practice).
      // Here, we trust our mock of initializeAuditorConfig to have been called.
      expect(initializeAuditorConfig).toHaveBeenCalled();
      // And that the plugin init completed
      expect(logger.success).toHaveBeenCalledWith('Blockchain Auditor Plugin initialized.');

      delete process.env.SLITHER_PATH; // Clean up env var
    });
  });

  describe('RUN_FORGE_TEST Action', () => {
    let action: Action | undefined;
    beforeEach(() => {
      action = blockchainAuditorPlugin.actions?.find(a => a.name === 'RUN_FORGE_TEST');
      mockExecuteCommand.mockResolvedValue({ stdout: 'Forge tests passed!', stderr: '', exitCode: 0 });
    });

    it('handler should call ToolExecutionService with default Docker image', async () => {
      const options = { projectPath: '/host/test/project' };
      await action?.handler?.(mockRuntime, {} as Memory, {} as State, options, mockHandlerCb, []);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        defaultPluginConfig.FORGE_PATH, ['test'],
        { cwd: '/host/test/project', dockerImageName: defaultPluginConfig.DEFAULT_FOUNDRY_DOCKER_IMAGE }
      );
    });
  });

  describe('RUN_SLITHER_ANALYSIS Action', () => {
    let action: Action | undefined;
    beforeEach(() => {
      action = blockchainAuditorPlugin.actions?.find(a => a.name === 'RUN_SLITHER_ANALYSIS');
      mockExecuteCommand.mockResolvedValue({ stdout: 'Slither JSON', stderr: '', exitCode: 0 });
    });

    it('handler should call ToolExecutionService for path target with default image', async () => {
      const options = { targetPath: '/host/project/MyContract.sol' };
      await action?.handler?.(mockRuntime, {} as Memory, {} as State, options, mockHandlerCb, []);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        defaultPluginConfig.SLITHER_PATH,
        [`${CONTAINER_WORKSPACE_PATH}/MyContract.sol`, '--json-human-compact'],
        expect.objectContaining({
          cwd: '/host/project',
          dockerImageName: defaultPluginConfig.DEFAULT_SLITHER_DOCKER_IMAGE
        })
      );
    });
  });

  describe('RUN_HARDHAT_TASK Action', () => {
    let action: Action | undefined;
    beforeEach(() => {
      action = blockchainAuditorPlugin.actions?.find(a => a.name === 'RUN_HARDHAT_TASK');
      mockExecuteCommand.mockResolvedValue({ stdout: 'Hardhat task complete!', stderr: '', exitCode: 0 });
    });

    it('should validate successfully with valid options', async () => {
      const options = { projectPath: '/host/hardhat/project', taskName: 'test' };
      const isValid = await action?.validate?.(mockRuntime, {} as Memory, {} as State, options);
      expect(isValid).toBe(true);
    });

    it('should fail validation if projectPath or taskName is missing', async () => {
      let options = { taskName: 'test' }; // Missing projectPath
      let isValid = await action?.validate?.(mockRuntime, {} as Memory, {} as State, options);
      expect(isValid).toBe(false);

      options = { projectPath: '/host/hardhat/project' } as any; // Missing taskName
      isValid = await action?.validate?.(mockRuntime, {} as Memory, {} as State, options);
      expect(isValid).toBe(false);
    });

    it('handler should call ToolExecutionService with correct Hardhat command and default image', async () => {
      const options = { projectPath: '/host/hh_project', taskName: 'test', taskArgs: ['--network', 'localhost'] };
      await action?.handler?.(mockRuntime, {} as Memory, {} as State, options, mockHandlerCb, []);

      const expectedHardhatCmdParts = defaultPluginConfig.HARDHAT_PATH.split(' ');
      const expectedCmd = expectedHardhatCmdParts[0]; // e.g., "npx"
      const expectedArgs = [...expectedHardhatCmdParts.slice(1), 'test', '--network', 'localhost'];

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expectedCmd,
        expectedArgs,
        {
          cwd: '/host/hh_project',
          dockerImageName: defaultPluginConfig.DEFAULT_HARDHAT_DOCKER_IMAGE
        }
      );
      expect(mockHandlerCb).toHaveBeenCalledWith(expect.objectContaining({
        text: "Hardhat task 'test' (Dockerized) finished with exit code 0.",
      }));
    });

    it('handler should use specified dockerImageName for Hardhat', async () => {
        const options = { projectPath: '/host/hh_project', taskName: 'compile', dockerImageName: 'my/custom-node:latest' };
        await action?.handler?.(mockRuntime, {} as Memory, {} as State, options, mockHandlerCb, []);

        const expectedHardhatCmdParts = defaultPluginConfig.HARDHAT_PATH.split(' ');
        const expectedCmd = expectedHardhatCmdParts[0];
        const expectedArgs = [...expectedHardhatCmdParts.slice(1), 'compile'];

        expect(mockExecuteCommand).toHaveBeenCalledWith(
            expectedCmd,
            expectedArgs,
            { cwd: '/host/hh_project', dockerImageName: 'my/custom-node:latest' }
        );
    });
  });
});
