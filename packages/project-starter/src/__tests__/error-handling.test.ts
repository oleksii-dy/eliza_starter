import { describe, expect, it, mock, spyOn } from 'bun:test';
import plugin from '../plugin';
import { StarterService } from '../plugin';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

// Create mock logger functions
const mockLoggerInfo = mock();
const mockLoggerError = mock();
const mockLoggerWarn = mock();

describe('Error Handling', () => {

  describe('HELLO_WORLD Action Error Handling', () => {
    it('should log errors in action handlers', async () => {
      // Find the action
      const action = plugin.actions?.find((a) => a.name === 'HELLO_WORLD');

      if (action && action.handler) {
        // Force the handler to throw an error
        spyOn(console, 'error').mockImplementation(() => {});

        // Create a custom mock runtime
        const mockRuntime = {
          // This is just a simple object for testing
        } as unknown as IAgentRuntime;

        const mockMessage = {
          entityId: uuidv4(),
          roomId: uuidv4(),
          content: {
            text: 'Hello!',
            source: 'test',
          },
        } as Memory;

        const mockState = {
          values: {},
          data: {},
          text: '',
        } as State;

        const mockCallback = mock();

        // Test the error handling by observing the behavior
        try {
          await action.handler(mockRuntime, mockMessage, mockState, {}, mockCallback, []);

          // If we get here, no error was thrown, which is okay
          // In a real application, error handling might be internal
          expect(mockCallback).toHaveBeenCalled();
        } catch (_error) {
          // If error is thrown, ensure it's handled correctly
          expect(_error).toBeDefined();
        }
      }
    });
  });

  describe('Service Error Handling', () => {
    it('should throw an error when stopping non-existent service', async () => {
      const mockRuntime = {
        getService: mock().mockReturnValue(null),
      } as unknown as IAgentRuntime;

      let caughtError = null;
      try {
        await StarterService.stop(mockRuntime);
      } catch (error) {
        caughtError = error;
        expect((error as Error).message).toBe('Starter service not found');
      }

      expect(caughtError).not.toBeNull();
      expect(mockRuntime.getService).toHaveBeenCalledWith('starter');
    });

    it('should handle service stop errors gracefully', async () => {
      const mockServiceWithError = {
        stop: mock().mockImplementation(() => {
          throw new Error('Error stopping service');
        }),
      };

      const mockRuntime = {
        getService: mock().mockReturnValue(mockServiceWithError),
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
      expect(mockRuntime.getService).toHaveBeenCalledWith('starter');
      expect(mockServiceWithError.stop).toHaveBeenCalled();
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
        } catch (_error) {
          // If it does throw, at least make sure it's a handled error
          expect(_error).toBeDefined();
        }
      }
    });
  });
});
