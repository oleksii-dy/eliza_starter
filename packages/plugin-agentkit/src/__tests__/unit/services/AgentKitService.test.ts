import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { AgentKitService } from '../../../services/AgentKitService';
import { createMockRuntime } from '../../test-utils';
import type { IAgentRuntime } from '@elizaos/core';
import { AgentKit as _AgentKit } from '@coinbase/agentkit';

// Mock the fs module
const mockFs = {
  existsSync: mock(),
  readFileSync: mock(),
  writeFileSync: mock(),
};

// Mock modules before importing the service
mock.module('fs', () => mockFs);

describe('AgentKitService', () => {
  let mockRuntime: IAgentRuntime;
  let service: AgentKitService;
  let mockAgentKit: any;
  let mockWalletProvider: any;

  beforeEach(() => {
    mock.restore();

    // Reset fs mocks
    mockFs.existsSync.mockReset();
    mockFs.readFileSync.mockReset();
    mockFs.writeFileSync.mockReset();

    // Create mock AgentKit
    mockAgentKit = {
      wallet: {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      },
      getActions: mock().mockReturnValue([
        { name: 'get_balance', description: 'Get wallet balance' },
        { name: 'transfer', description: 'Transfer tokens' },
      ]),
    };

    // Create mock WalletProvider
    mockWalletProvider = {
      getAddress: mock().mockResolvedValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
      getNetwork: mock().mockResolvedValue({ networkId: 'base-sepolia' }),
      exportWallet: mock().mockResolvedValue('{"walletData": "test"}'),
    };

    // Mock AgentKit.from
    const mockAgentKitFrom = mock().mockResolvedValue(mockAgentKit);

    // Mock the modules
    mock.module('@coinbase/agentkit', () => ({
      AgentKit: {
        from: mockAgentKitFrom,
      },
      CdpWalletProvider: {
        configureWithWallet: mock().mockResolvedValue(mockWalletProvider),
      },
    }));

    mock.module('@coinbase/cdp-sdk', () => ({
      Wallet: {
        create: mock().mockResolvedValue({ id: 'wallet-123' }),
        import: mock().mockResolvedValue({ id: 'wallet-456' }),
      },
      Coinbase: {
        configure: mock(),
      },
    }));

    // Create mock runtime
    mockRuntime = createMockRuntime({
      getSetting: mock((key: string) => {
        const settings: Record<string, string> = {
          CDP_API_KEY_NAME: 'test-api-key',
          CDP_API_KEY_PRIVATE_KEY: 'test-private-key',
          CDP_AGENT_KIT_NETWORK: 'base-sepolia',
        };
        return settings[key];
      }),
    });

    // Create service instance with runtime
    service = new AgentKitService(mockRuntime);
  });

  afterEach(() => {
    // Clean up env vars
    delete process.env.CDP_API_KEY_NAME;
    delete process.env.CDP_API_KEY_PRIVATE_KEY;
    delete process.env.CDP_AGENT_KIT_NETWORK;
  });

  describe('initialization', () => {
    it('should initialize with API credentials', async () => {
      await service.initialize();

      expect(service.isReady()).toBe(true);
      expect(mockRuntime.getSetting).toHaveBeenCalledWith('CDP_API_KEY_NAME');
      expect(mockRuntime.getSetting).toHaveBeenCalledWith('CDP_API_KEY_PRIVATE_KEY');
    });

    it('should initialize when credentials are available', async () => {
      await service.initialize();

      expect(service.isReady()).toBe(true);
      expect(service.getAgentKit()).toBeDefined();
    });

    it('should handle initialization errors gracefully', async () => {
      const badRuntime = createMockRuntime({
        getSetting: mock(() => undefined), // No credentials
      });
      const badService = new AgentKitService(badRuntime);

      // Should throw when credentials are missing
      await expect(badService.initialize()).rejects.toThrow('Missing required CDP API credentials');
      expect(badService.isReady()).toBe(false);
    });
  });

  describe('isReady', () => {
    it('should return false before initialization', () => {
      expect(service.isReady()).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      await service.initialize();
      expect(service.isReady()).toBe(true);
    });
  });

  describe('getAgentKit', () => {
    it('should return AgentKit instance when ready', async () => {
      await service.initialize();

      const agentKit = service.getAgentKit();
      expect(agentKit).toBe(mockAgentKit);
    });

    it('should throw error when not initialized', () => {
      expect(() => service.getAgentKit()).toThrow('AgentKit service not initialized');
    });
  });

  describe('stop', () => {
    it('should clean up resources', async () => {
      await service.initialize();
      await service.stop();

      expect(service.isReady()).toBe(false);
      expect(() => service.getAgentKit()).toThrow('AgentKit service not initialized');
    });

    it('should handle stop when not initialized', async () => {
      // Should not throw when stopping uninitialized service
      await service.stop();
      expect(service.isReady()).toBe(false);
    });
  });

  describe('static start method', () => {
    it('should create and initialize service', async () => {
      const service = await AgentKitService.start(mockRuntime);

      expect(service).toBeInstanceOf(AgentKitService);
      expect(service.isReady()).toBe(true);
    });

    it('should pass through initialization errors', async () => {
      mockRuntime.getSetting = mock().mockReturnValue(null);
      delete process.env.CDP_API_KEY_NAME;
      delete process.env.CDP_API_KEY_PRIVATE_KEY;

      await expect(AgentKitService.start(mockRuntime)).rejects.toThrow(
        '[AgentKit] Missing required CDP API credentials'
      );
    });
  });

  describe('capabilityDescription', () => {
    it('should return correct description', () => {
      expect(service.capabilityDescription).toBe(
        'CDP AgentKit service for blockchain interactions'
      );
    });
  });
});
