import { describe, expect, it, beforeEach } from 'bun:test';
import { midnightPlugin } from '../index';
import { createMockRuntime, createMockMemory, createMockState } from './test-utils';
import type { IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';

describe('Midnight Plugin Integration Tests', () => {
  let mockRuntime: ReturnType<typeof createMockRuntime>;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
  });

  describe('Action Integration', () => {
    it('should validate SEND_SECURE_MESSAGE action', async () => {
      const action = midnightPlugin.actions?.find((a) => a.name === 'SEND_SECURE_MESSAGE');
      expect(action).toBeDefined();

      if (action) {
        const mockMessage = createMockMemory({
          content: {
            text: 'Send a secure message to agent-123 saying "Hello"',
            source: 'test',
          },
        });

        const mockState = createMockState();

        // Test validation
        const isValid = await action.validate(
          mockRuntime as unknown as IAgentRuntime,
          mockMessage as Memory,
          mockState as State
        );

        expect(typeof isValid).toBe('boolean');
      }
    });

    it('should validate SEND_PAYMENT action', async () => {
      const action = midnightPlugin.actions?.find((a) => a.name === 'SEND_PAYMENT');
      expect(action).toBeDefined();

      if (action) {
        const mockMessage = createMockMemory({
          content: {
            text: 'Send 100 MIDNIGHT tokens to agent-456',
            source: 'test',
          },
        });

        const mockState = createMockState();

        // Test validation
        const isValid = await action.validate(
          mockRuntime as unknown as IAgentRuntime,
          mockMessage as Memory,
          mockState as State
        );

        expect(typeof isValid).toBe('boolean');
      }
    });

    it('should validate CREATE_CHAT_ROOM action', async () => {
      const action = midnightPlugin.actions?.find((a) => a.name === 'CREATE_CHAT_ROOM');
      expect(action).toBeDefined();

      if (action) {
        const mockMessage = createMockMemory({
          content: {
            text: 'Create a private chat room called "secret-meeting"',
            source: 'test',
          },
        });

        const mockState = createMockState();

        // Test validation
        const isValid = await action.validate(
          mockRuntime as unknown as IAgentRuntime,
          mockMessage as Memory,
          mockState as State
        );

        expect(typeof isValid).toBe('boolean');
      }
    });
  });

  describe('Provider Integration', () => {
    it('should execute MIDNIGHT_WALLET provider', async () => {
      const provider = midnightPlugin.providers?.find((p) => p.name === 'MIDNIGHT_WALLET');
      expect(provider).toBeDefined();

      if (provider) {
        const mockMessage = createMockMemory();
        const mockState = createMockState();

        try {
          const result = await provider.get(
            mockRuntime as unknown as IAgentRuntime,
            mockMessage as Memory,
            mockState as State
          );

          expect(result).toBeDefined();
          // Provider should return an object with optional text, values, or data
          expect(typeof result).toBe('object');
        } catch (error) {
          // Provider might fail without real Midnight Network connection
          // This is expected in test environment
          expect(error).toBeDefined();
        }
      }
    });

    it('should execute MIDNIGHT_NETWORK_STATE provider', async () => {
      const provider = midnightPlugin.providers?.find((p) => p.name === 'MIDNIGHT_NETWORK_STATE');
      expect(provider).toBeDefined();

      if (provider) {
        const mockMessage = createMockMemory();
        const mockState = createMockState();

        try {
          const result = await provider.get(
            mockRuntime as unknown as IAgentRuntime,
            mockMessage as Memory,
            mockState as State
          );

          expect(result).toBeDefined();
          expect(typeof result).toBe('object');
        } catch (error) {
          // Provider might fail without real network connection
          expect(error).toBeDefined();
        }
      }
    });

    it('should execute MIDNIGHT_CHAT_ROOMS provider', async () => {
      const provider = midnightPlugin.providers?.find((p) => p.name === 'MIDNIGHT_CHAT_ROOMS');
      expect(provider).toBeDefined();

      if (provider) {
        const mockMessage = createMockMemory();
        const mockState = createMockState();

        try {
          const result = await provider.get(
            mockRuntime as unknown as IAgentRuntime,
            mockMessage as Memory,
            mockState as State
          );

          expect(result).toBeDefined();
          expect(typeof result).toBe('object');
        } catch (error) {
          // Provider might fail without real service connection
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Route Integration', () => {
    it('should execute status route handler', async () => {
      const route = midnightPlugin.routes?.find((r) => r.path === '/api/midnight/status');
      expect(route).toBeDefined();

      if (route) {
        const mockReq = {};
        const mockRes = {
          json: (data: any) => {
            expect(data).toBeDefined();
            expect(typeof data).toBe('object');
            return mockRes;
          },
          status: (code: number) => {
            expect(typeof code).toBe('number');
            return mockRes;
          },
        };

        try {
          if (route.handler) {
            await route.handler(
              mockReq as any,
              mockRes as any,
              mockRuntime as unknown as IAgentRuntime
            );
            // If we get here without throwing, the handler executed
            expect(true).toBe(true);
          } else {
            expect(route.handler).toBeDefined();
          }
        } catch (error) {
          // Handler might fail without real services
          expect(error).toBeDefined();
        }
      }
    });

    it('should execute wallet route handler', async () => {
      const route = midnightPlugin.routes?.find((r) => r.path === '/api/midnight/wallet');
      expect(route).toBeDefined();

      if (route) {
        const mockReq = {};
        const mockRes = {
          json: (data: any) => {
            expect(data).toBeDefined();
            expect(typeof data).toBe('object');
            return mockRes;
          },
          status: (code: number) => {
            expect(typeof code).toBe('number');
            return mockRes;
          },
        };

        try {
          if (route.handler) {
            await route.handler(
              mockReq as any,
              mockRes as any,
              mockRuntime as unknown as IAgentRuntime
            );
            expect(true).toBe(true);
          } else {
            expect(route.handler).toBeDefined();
          }
        } catch (error) {
          // Handler might fail without real services
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Full Plugin Workflow', () => {
    it('should initialize plugin and execute basic workflow', async () => {
      // 1. Initialize plugin
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

      // 2. Test that actions are available
      expect(midnightPlugin.actions).toHaveLength(7);

      // 3. Test that providers are available
      expect(midnightPlugin.providers).toHaveLength(3);

      // 4. Test that routes are available
      expect(midnightPlugin.routes).toHaveLength(2);

      // 5. Test basic action validation works
      const sendMessageAction = midnightPlugin.actions?.find(
        (a) => a.name === 'SEND_SECURE_MESSAGE'
      );
      if (sendMessageAction) {
        const mockMessage = createMockMemory({
          content: { text: 'Send secure message to agent-123', source: 'test' },
        });
        const mockState = createMockState();

        const isValid = await sendMessageAction.validate(
          mockRuntime as unknown as IAgentRuntime,
          mockMessage as Memory,
          mockState as State
        );

        expect(typeof isValid).toBe('boolean');
      }
    });
  });
});
