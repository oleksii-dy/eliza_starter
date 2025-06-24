import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { walletProvider } from '../../provider';
import { createMockRuntime, createMockMemory, createMockState } from '../test-utils';
import type { IAgentRuntime } from '../../types/core.d';
import agentkitPlugin from '../../index';
import { AgentKitService } from '../../services/AgentKitService';
import { CustodialWalletService } from '../../services/CustodialWalletService';

describe('walletProvider', () => {
  let mockRuntime: IAgentRuntime;
  let mockAgentKitService: any;

  beforeEach(() => {
    mock.restore();

    // Create mock AgentKit service
    mockAgentKitService = {
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
    mockRuntime = createMockRuntime({
      getService: mock((name: string) => {
        if (name === 'agentkit') {
          return mockAgentKitService;
        }
        return null;
      }),
    });
  });

  describe('get', () => {
    it('should provide wallet information when service is available', async () => {
      const mockMessage = createMockMemory();
      const mockState = createMockState();

      const result = await walletProvider.get(mockRuntime, mockMessage, mockState);

      expect(result).toBeDefined();
      expect(result.text).toContain('Wallet address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
      expect(result.text).toContain('Network: base-sepolia');
      expect(result.values).toEqual({
        walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        network: 'base-sepolia',
      });
    });

    it('should return service not initialized when service is not available', async () => {
      mockRuntime.getService = mock().mockReturnValue(null);
      const mockMessage = createMockMemory();
      const mockState = createMockState();

      const result = await walletProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.text).toBe('[AgentKit] Service not initialized');
      expect(result.values).toEqual({ walletAddress: null });
    });

    it('should return service not initialized when service is not ready', async () => {
      mockAgentKitService.isReady.mockReturnValue(false);
      const mockMessage = createMockMemory();
      const mockState = createMockState();

      const result = await walletProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.text).toBe('[AgentKit] Service not initialized');
      expect(result.values).toEqual({ walletAddress: null });
    });

    it('should handle errors gracefully', async () => {
      mockAgentKitService.getAgentKit.mockImplementation(() => {
        throw new Error('AgentKit error');
      });
      const mockMessage = createMockMemory();
      const mockState = createMockState();

      const result = await walletProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.text).toBe('[AgentKit] Error: AgentKit error');
      expect(result.values).toEqual({ walletAddress: null, error: true });
    });

    it('should handle missing wallet address', async () => {
      mockAgentKitService.getAgentKit.mockReturnValue({
        // No wallet property
      });
      const mockMessage = createMockMemory();
      const mockState = createMockState();

      const result = await walletProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.text).toContain('Wallet address: Unknown');
      expect(result.values?.walletAddress).toBe('Unknown');
    });
  });

  describe('properties', () => {
    it('should have correct metadata', () => {
      expect(walletProvider.name).toBe('agentKitWallet');
      expect(walletProvider.description).toBeDefined();
    });
  });
});

describe('AgentKit Plugin Provider', () => {
  let mockRuntime: any;

  beforeEach(() => {
    mock.restore();
    mockRuntime = createMockRuntime();
  });

  it('should export a valid plugin with name and description', () => {
    expect(agentkitPlugin).toBeDefined();
    expect(agentkitPlugin.name).toBe('@elizaos/plugin-agentkit');
    expect(agentkitPlugin.description).toBe('AgentKit plugin for ElizaOS');
  });

  it('should provide services when initialized', async () => {
    expect(agentkitPlugin.services).toBeDefined();
    expect(agentkitPlugin.services!).toHaveLength(1);

    // Check service constructors exist
    const serviceTypes = agentkitPlugin.services!.map((s: any) => s.name);
    expect(serviceTypes).toContain('AgentKitService');
  });

  it('should provide actions when initialized', () => {
    expect(agentkitPlugin.actions).toBeDefined();
    expect(Array.isArray(agentkitPlugin.actions)).toBe(true);
    // Actions are registered dynamically in the init function
    expect(agentkitPlugin.actions!).toEqual([]);
  });

  it('should initialize services with runtime', async () => {
    // Test AgentKitService initialization
    const AgentKitServiceClass = agentkitPlugin.services!.find(
      (s: any) => s.name === 'AgentKitService'
    );
    expect(AgentKitServiceClass).toBeDefined();

    const agentKitService = new AgentKitServiceClass(mockRuntime);
    expect(agentKitService).toBeInstanceOf(AgentKitService);


  });

  it('should handle missing environment variables gracefully', async () => {
    const runtimeWithoutEnv = createMockRuntime({
      getSetting: mock(() => undefined),
    });

    const AgentKitServiceClass = agentkitPlugin.services!.find(
      (s: any) => s.name === 'AgentKitService'
    );

    // Service should still initialize but with limited functionality
    expect(() => new AgentKitServiceClass(runtimeWithoutEnv)).not.toThrow();
  });

  it('should have init function to register actions dynamically', () => {
    expect(agentkitPlugin.init).toBeDefined();
    expect(typeof agentkitPlugin.init).toBe('function');
  });

  it('should have valid action structures', () => {
    agentkitPlugin.actions!.forEach((action: any) => {
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
  });
});
