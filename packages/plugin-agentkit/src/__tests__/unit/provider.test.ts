import { expect, mock } from 'bun:test';
import {
  createUnitTest,
  createMockRuntime,
  createMockMemory,
  createMockState,
} from '../test-utils';
import { walletProvider } from '../../provider';
import type { IAgentRuntime } from '@elizaos/core';
import agentkitPlugin from '../../index';
import { AgentKitService } from '../../services/AgentKitService';
import { CustodialWalletService as _CustodialWalletService } from '../../services/CustodialWalletService';

const walletProviderSuite = createUnitTest('Wallet Provider Tests');

// Test context for shared data
interface TestContext {
  mockRuntime: IAgentRuntime;
  mockAgentKitService: any;
}

walletProviderSuite.beforeEach<TestContext>((context) => {
  mock.restore();

  // Create mock AgentKit service
  context.mockAgentKitService = {
    isReady: mock().mockReturnValue(true),
    getAgentKit: mock().mockReturnValue({
      wallet: {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      },
      walletProvider: {
        getNetwork: mock().mockResolvedValue('base-sepolia'),
      },
    }),
  };

  // Create mock runtime with agentkit service
  context.mockRuntime = createMockRuntime({
    getService: mock((name: string) => {
      if (name === 'agentkit') {
        return context.mockAgentKitService;
      }
      return null;
    }),
  });
});

walletProviderSuite.addTest<TestContext>(
  'should provide wallet information when service is available',
  async (context) => {
    const mockMessage = createMockMemory();
    const mockState = createMockState();

    const result = await walletProvider.get(context.mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.text).toContain('Wallet address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    expect(result.text).toContain('Network: base-sepolia');
    expect(result.values).toEqual({
      walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      network: 'base-sepolia',
    });
  }
);

walletProviderSuite.addTest<TestContext>(
  'should return service not initialized when service is not available',
  async (context) => {
    context.mockRuntime.getService = mock().mockReturnValue(null);
    const mockMessage = createMockMemory();
    const mockState = createMockState();

    const result = await walletProvider.get(context.mockRuntime, mockMessage, mockState);

    expect(result.text).toBe('[AgentKit] Service not initialized');
    expect(result.values).toEqual({ walletAddress: null });
  }
);

walletProviderSuite.addTest<TestContext>(
  'should return service not initialized when service is not ready',
  async (context) => {
    context.mockAgentKitService.isReady.mockReturnValue(false);
    const mockMessage = createMockMemory();
    const mockState = createMockState();

    const result = await walletProvider.get(context.mockRuntime, mockMessage, mockState);

    expect(result.text).toBe('[AgentKit] Service not initialized');
    expect(result.values).toEqual({ walletAddress: null });
  }
);

walletProviderSuite.addTest<TestContext>('should handle errors gracefully', async (context) => {
  context.mockAgentKitService.getAgentKit.mockImplementation(() => {
    throw new Error('AgentKit error');
  });
  const mockMessage = createMockMemory();
  const mockState = createMockState();

  const result = await walletProvider.get(context.mockRuntime, mockMessage, mockState);

  expect(result.text).toBe('[AgentKit] Error: AgentKit error');
  expect(result.values).toEqual({ walletAddress: null, error: true });
});

walletProviderSuite.addTest<TestContext>(
  'should handle missing wallet address',
  async (context) => {
    context.mockAgentKitService.getAgentKit.mockReturnValue({
      // No wallet property
    });
    const mockMessage = createMockMemory();
    const mockState = createMockState();

    const result = await walletProvider.get(context.mockRuntime, mockMessage, mockState);

    expect(result.text).toContain('Wallet address: Unknown');
    expect(result.values?.walletAddress).toBe('Unknown');
  }
);

walletProviderSuite.addTest<TestContext>('should have correct metadata', async (context) => {
  expect(walletProvider.name).toBe('agentKitWallet');
  expect(walletProvider.description).toBeDefined();
});

// Plugin Provider Test Suite
const pluginProviderSuite = createUnitTest('AgentKit Plugin Provider Tests');

interface PluginTestContext {
  mockRuntime: any;
}

pluginProviderSuite.beforeEach<PluginTestContext>((context) => {
  mock.restore();
  context.mockRuntime = createMockRuntime();
});

pluginProviderSuite.addTest<PluginTestContext>(
  'should export a valid plugin with name and description',
  async (context) => {
    expect(agentkitPlugin).toBeDefined();
    expect(agentkitPlugin.name).toBe('@elizaos/plugin-agentkit');
    expect(agentkitPlugin.description).toBe('AgentKit plugin for ElizaOS');
  }
);

pluginProviderSuite.addTest<PluginTestContext>(
  'should provide services when initialized',
  async (context) => {
    expect(agentkitPlugin.services).toBeDefined();
    expect(agentkitPlugin.services).toHaveLength(2);

    // Check service constructors exist
    const serviceNames =
      agentkitPlugin.services?.map((ServiceClass: any) => ServiceClass.serviceName) || [];
    expect(serviceNames).toContain('agentkit');
    expect(serviceNames).toContain('custodial-wallet');
  }
);

pluginProviderSuite.addTest<PluginTestContext>(
  'should provide actions when initialized',
  async (context) => {
    expect(agentkitPlugin.actions).toBeDefined();
    expect(Array.isArray(agentkitPlugin.actions)).toBe(true);
    // Plugin now includes custodial wallet actions
    expect(agentkitPlugin.actions?.length || 0).toBeGreaterThan(0);

    // Check that custodial wallet actions are included
    const actionNames = agentkitPlugin.actions?.map((action: any) => action.name) || [];
    expect(actionNames).toContain('CREATE_CUSTODIAL_WALLET');
    expect(actionNames).toContain('LIST_CUSTODIAL_WALLETS');
  }
);

pluginProviderSuite.addTest<PluginTestContext>(
  'should initialize services with runtime',
  async (context) => {
    // Test AgentKitService initialization
    const AgentKitServiceClass = agentkitPlugin.services?.find(
      (ServiceClass: any) => ServiceClass.serviceName === 'agentkit'
    ) as typeof AgentKitService;
    expect(AgentKitServiceClass).toBeDefined();

    // Create service instance without starting (to avoid CDP API calls)
    const service = new AgentKitServiceClass(context.mockRuntime);
    expect(service).toBeInstanceOf(AgentKitService);
    expect(service.runtime).toBe(context.mockRuntime);
  }
);

pluginProviderSuite.addTest<PluginTestContext>(
  'should handle missing environment variables gracefully',
  async (context) => {
    const runtimeWithoutEnv = createMockRuntime({
      getSetting: mock(() => undefined),
    });

    const AgentKitServiceClass = agentkitPlugin.services?.find(
      (ServiceClass: any) => ServiceClass.serviceName === 'agentkit'
    ) as typeof AgentKitService;

    // Service should throw when credentials are invalid or missing
    await expect(AgentKitServiceClass.start(runtimeWithoutEnv)).rejects.toThrow();
  }
);

pluginProviderSuite.addTest<PluginTestContext>(
  'should have init function to register actions dynamically',
  async (context) => {
    expect(agentkitPlugin.init).toBeDefined();
    expect(typeof agentkitPlugin.init).toBe('function');
  }
);

pluginProviderSuite.addTest<PluginTestContext>(
  'should have valid action structures',
  async (context) => {
    agentkitPlugin.actions?.forEach((action: any) => {
      // Each action should have required properties
      expect(action.name).toBeDefined();
      expect(typeof action.name).toBe('string');

      expect(action.description).toBeDefined();
      expect(typeof action.description).toBe('string');

      expect(action.handler).toBeDefined();
      expect(typeof action.handler).toBe('function');

      expect(action.validate).toBeDefined();
      expect(typeof action.validate).toBe('function');
    });
  }
);
