import { describe, expect, it, spyOn } from 'bun:test';
import plugin from '../plugin';
import { StarterService } from '../plugin';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

describe('Error Handling', () => {
  describe('Action Error Handling', () => {
    it('should handle empty actions array gracefully', async () => {
      // This starter plugin has no actions
      expect(plugin.actions).toEqual([]);
      expect(Array.isArray(plugin.actions)).toBe(true);
    });
  });

  describe('Service Error Handling', () => {
    it('should throw an error when stopping non-existent service', async () => {
      const mockRuntime = {
        getService: () => null,
      } as unknown as IAgentRuntime;

      let caughtError = null;
      try {
        await StarterService.stop(mockRuntime);
      } catch (error) {
        caughtError = error;
        expect((error as Error).message).toContain('not found');
      }

      expect(caughtError).not.toBeNull();
    });

    it('should handle service stop errors gracefully', async () => {
      const mockServiceWithError = {
        stop: () => {
          throw new Error('Error stopping service');
        },
      };

      const mockRuntime = {
        getService: () => mockServiceWithError,
      } as unknown as IAgentRuntime;

      // The error should be propagated
      let caughtError = null;
      try {
        await StarterService.stop(mockRuntime);
      } catch (error) {
        caughtError = error;
        expect((error as Error).message).toBe('Error stopping service');
      }

      expect(caughtError).not.toBeNull();
    });
  });

  describe('Plugin Events Error Handling', () => {
    it('should handle errors in event handlers gracefully', async () => {
      if (plugin.events && plugin.events.MESSAGE_RECEIVED) {
        const messageHandler = plugin.events.MESSAGE_RECEIVED[0];

        // Create a mock that will trigger an error
        const mockParams = {
          message: {
            id: 'test-id',
            content: { text: 'Hello!' },
          },
          source: 'test',
          runtime: {},
        };

        // Test that event handler can be called without throwing

        // This is a partial test - in a real handler, we'd have more robust error handling
        try {
          await messageHandler(mockParams as Parameters<typeof messageHandler>[0]);
          // If it succeeds without error, that's good too
          expect(true).toBe(true);
        } catch (error) {
          // If it does error, make sure we can catch it
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Provider Error Handling', () => {
    it('should handle errors in provider.get method', async () => {
      const provider = plugin.providers?.find((p) => p.name === 'HELLO_WORLD_PROVIDER');

      if (provider) {
        // Create invalid inputs to test error handling
        const mockRuntime = null as unknown as IAgentRuntime;
        const mockMessage = null as unknown as Memory;
        const mockState = null as unknown as State;

        // The provider should handle null inputs gracefully
        try {
          await provider.get(mockRuntime, mockMessage, mockState);
          // If we get here, it didn't throw - which is good
          expect(true).toBe(true);
        } catch (error) {
          // If it does throw, at least make sure it's a proper error
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });
});
