import { describe, expect, it, beforeEach } from 'bun:test';
import { midnightPlugin } from '../index';
import { createMockRuntime } from './test-utils';
import type { IAgentRuntime } from '@elizaos/core';

describe('Midnight Plugin Configuration', () => {
  it('should have correct plugin metadata', () => {
    expect(midnightPlugin.name).toBe('@elizaos/plugin-midnight');
    expect(midnightPlugin.description).toContain('Midnight Network integration');
    expect(midnightPlugin.config).toBeDefined();
  });

  it('should have required configuration properties', () => {
    expect(midnightPlugin.config).toHaveProperty('MIDNIGHT_NETWORK_URL');
    expect(midnightPlugin.config).toHaveProperty('MIDNIGHT_INDEXER_URL');
    expect(midnightPlugin.config).toHaveProperty('MIDNIGHT_WALLET_MNEMONIC');
  });

  it('should initialize properly with valid config', async () => {
    const mockRuntime = createMockRuntime();

    const validConfig = {
      MIDNIGHT_NETWORK_URL: 'https://rpc.testnet.midnight.network',
      MIDNIGHT_INDEXER_URL: 'https://indexer.testnet.midnight.network',
      MIDNIGHT_WALLET_MNEMONIC:
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      MIDNIGHT_PROOF_SERVER_URL: 'https://proof.testnet.midnight.network',
      MIDNIGHT_NETWORK_ID: 'testnet',
      MIDNIGHT_ZK_CONFIG_URL: 'https://zk-config.testnet.midnight.network',
    };

    if (midnightPlugin.init) {
      // Test that init doesn't throw with valid config
      await expect(async () => {
        await midnightPlugin.init!(validConfig, mockRuntime as unknown as IAgentRuntime);
      }).not.toThrow();
    }
  });

  it('should fail initialization with invalid config', async () => {
    const mockRuntime = createMockRuntime();

    const invalidConfig = {
      MIDNIGHT_NETWORK_URL: '', // Empty URL should fail
    };

    if (midnightPlugin.init) {
      await expect(
        midnightPlugin.init(invalidConfig, mockRuntime as unknown as IAgentRuntime)
      ).rejects.toThrow();
    }
  });
});

describe('Midnight Plugin Services', () => {
  it('should have all required services defined', () => {
    expect(midnightPlugin.services).toBeDefined();
    expect(midnightPlugin.services).toHaveLength(6);

    const serviceNames = midnightPlugin.services?.map((service) => {
      if (typeof service === 'function') {
        return (service as any).serviceName || (service as any).name || 'unknown';
      }
      if (service && typeof service === 'object' && 'component' in service) {
        return (
          (service.component as any).serviceName || (service.component as any).name || 'unknown'
        );
      }
      return (service as any).serviceName || 'unknown';
    });

    expect(serviceNames).toContain('MidnightNetworkService');
    expect(serviceNames).toContain('SecureMessagingService');
    expect(serviceNames).toContain('PaymentService');
    expect(serviceNames).toContain('AgentDiscoveryService');
  });
});

describe('Midnight Plugin Actions', () => {
  it('should have all required actions defined', () => {
    expect(midnightPlugin.actions).toBeDefined();
    expect(midnightPlugin.actions).toHaveLength(9);

    const actionNames = midnightPlugin.actions?.map((action) => action.name);

    expect(actionNames).toContain('SEND_SECURE_MESSAGE');
    expect(actionNames).toContain('CREATE_CHAT_ROOM');
    expect(actionNames).toContain('JOIN_CHAT_ROOM');
    expect(actionNames).toContain('SEND_PAYMENT');
    expect(actionNames).toContain('REQUEST_PAYMENT');
    expect(actionNames).toContain('DISCOVER_AGENTS');
  });

  it('should have properly structured actions', () => {
    midnightPlugin.actions?.forEach((action) => {
      expect(action.name).toBeDefined();
      expect(action.description).toBeDefined();
      expect(action.handler).toBeDefined();
      expect(action.validate).toBeDefined();
      expect(typeof action.handler).toBe('function');
      expect(typeof action.validate).toBe('function');
    });
  });
});

describe('Midnight Plugin Providers', () => {
  it('should have all required providers defined', () => {
    expect(midnightPlugin.providers).toBeDefined();
    expect(midnightPlugin.providers).toHaveLength(4);

    const providerNames = midnightPlugin.providers?.map((provider) => provider.name);

    expect(providerNames).toContain('MIDNIGHT_WALLET');
    expect(providerNames).toContain('MIDNIGHT_NETWORK_STATE');
    expect(providerNames).toContain('MIDNIGHT_CHAT_ROOMS');
  });

  it('should have properly structured providers', () => {
    midnightPlugin.providers?.forEach((provider) => {
      expect(provider.name).toBeDefined();
      expect(provider.get).toBeDefined();
      expect(typeof provider.get).toBe('function');
    });
  });
});

describe('Midnight Plugin Routes', () => {
  it('should have API routes defined', () => {
    expect(midnightPlugin.routes).toBeDefined();
    expect(midnightPlugin.routes).toHaveLength(2);

    const routePaths = midnightPlugin.routes?.map((route) => route.path);

    expect(routePaths).toContain('/api/midnight/status');
    expect(routePaths).toContain('/api/midnight/wallet');
  });

  it('should have properly structured routes', () => {
    midnightPlugin.routes?.forEach((route) => {
      expect(route.name).toBeDefined();
      expect(route.path).toBeDefined();
      expect(route.type).toBeDefined();
      expect(route.handler).toBeDefined();
      expect(typeof route.handler).toBe('function');
      expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).toContain(route.type);
    });
  });
});
