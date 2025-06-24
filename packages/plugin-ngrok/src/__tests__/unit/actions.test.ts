import type { HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { getTunnelStatusAction } from '../../actions/get-tunnel-status';
import { startTunnelAction } from '../../actions/start-tunnel';
import { stopTunnelAction } from '../../actions/stop-tunnel';
import { MockNgrokService } from '../mocks/NgrokServiceMock';

describe('Ngrok Actions - Validation and Error Handling', () => {
  let mockRuntime: IAgentRuntime;
  let mockTunnelService: MockNgrokService;
  let mockCallback: HandlerCallback;
  let mockMemory: Memory;
  let mockState: State;

  beforeEach(() => {
    mockRuntime = {
      getService: jest.fn(),
      getSetting: jest.fn(),
      useModel: jest.fn(),
      logger: {
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
      },
    } as unknown as IAgentRuntime;

    mockTunnelService = new MockNgrokService(mockRuntime);
    (mockRuntime.getService as any).mockReturnValue(mockTunnelService);

    mockCallback = jest.fn();
    mockMemory = {} as Memory;
    mockState = {} as State;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startTunnelAction - Validation', () => {
    it('should validate that tunnel service exists', async () => {
      (mockRuntime.getService as any).mockReturnValue(null);

      const isValid = await startTunnelAction.validate(mockRuntime, mockMemory);

      expect(isValid).toBe(false);
    });

    it('should validate when tunnel service is available', async () => {
      const isValid = await startTunnelAction.validate(mockRuntime, mockMemory);

      expect(isValid).toBe(true);
    });
  });

  describe('startTunnelAction - Error Handling', () => {
    it('should handle service not available', async () => {
      (mockRuntime.getService as any).mockReturnValue(null);
      mockMemory.content = { text: 'start tunnel on port 8080' };

      const result = await startTunnelAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback
      );

      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should handle invalid port numbers gracefully', async () => {
      mockMemory.content = { text: 'start tunnel on port -1' };
      (mockRuntime.useModel as any).mockResolvedValue('{"port": -1}');
      mockTunnelService.startTunnel.mockResolvedValue('https://test.ngrok.io');

      const result = await startTunnelAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback
      );

      expect(result).toBe(true);
      expect(mockTunnelService.startTunnel).toHaveBeenCalledWith(3000); // Uses default for invalid port
    });

    it('should handle port extraction failure', async () => {
      mockMemory.content = { text: 'start tunnel' };
      (mockRuntime.useModel as any).mockResolvedValue('invalid json');
      mockTunnelService.startTunnel.mockResolvedValue('https://test.ngrok.io');

      const result = await startTunnelAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback
      );

      expect(result).toBe(true);
      expect(mockTunnelService.startTunnel).toHaveBeenCalledWith(3000); // Should use default
    });

    it('should handle tunnel start failure', async () => {
      mockMemory.content = { text: 'start tunnel on port 8080' };
      (mockRuntime.useModel as any).mockResolvedValue('{"port": 8080}');
      mockTunnelService.startTunnel.mockRejectedValue(new Error('Ngrok auth failed'));

      const result = await startTunnelAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback
      );

      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Failed to start ngrok tunnel'),
          metadata: expect.objectContaining({
            error: 'Ngrok auth failed',
          }),
        })
      );
    });

    it('should handle port already in use', async () => {
      mockMemory.content = { text: 'start tunnel on port 8080' };
      (mockRuntime.useModel as any).mockResolvedValue('{"port": 8080}');
      mockTunnelService.isActive.mockReturnValue(true);
      mockTunnelService.getStatus.mockReturnValue({
        active: true,
        url: 'https://existing.ngrok.io',
        port: 8080,
        startedAt: new Date(),
        provider: 'ngrok',
      });

      const result = await startTunnelAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback
      );

      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Tunnel is already active'),
        })
      );
    });
  });

  describe('stopTunnelAction - Validation', () => {
    it('should validate that tunnel service exists', async () => {
      (mockRuntime.getService as any).mockReturnValue(null);

      const isValid = await stopTunnelAction.validate(mockRuntime, mockMemory);

      expect(isValid).toBe(false);
    });
  });

  describe('stopTunnelAction - Error Handling', () => {
    it('should handle service not available', async () => {
      (mockRuntime.getService as any).mockReturnValue(null);

      const result = await stopTunnelAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback
      );

      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Tunnel service is not available'),
        })
      );
    });

    it('should handle stopping when no tunnel is active', async () => {
      mockTunnelService.isActive.mockReturnValue(false);

      const result = await stopTunnelAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback
      );

      expect(result).toBe(true);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('No tunnel is currently running'),
        })
      );
      expect(mockTunnelService.stopTunnel).not.toHaveBeenCalled();
    });

    it('should handle stop failure gracefully', async () => {
      mockTunnelService.isActive.mockReturnValue(true);
      mockTunnelService.getStatus.mockReturnValue({
        active: true,
        url: 'https://test.ngrok.io',
        port: 8080,
        startedAt: new Date(),
        provider: 'ngrok',
      });
      mockTunnelService.stopTunnel.mockRejectedValue(new Error('Stop failed'));

      const result = await stopTunnelAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback
      );

      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Failed to stop ngrok tunnel'),
          metadata: expect.objectContaining({
            error: 'Stop failed',
          }),
        })
      );
    });
  });

  describe('getTunnelStatusAction - Edge Cases', () => {
    it('should handle service not available', async () => {
      (mockRuntime.getService as any).mockReturnValue(null);

      const result = await getTunnelStatusAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback
      );

      expect(result).toBe(false);
    });

    it('should format uptime correctly', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - 2); // 2 hours ago

      mockTunnelService.getStatus.mockReturnValue({
        active: true,
        url: 'https://test.ngrok.io',
        port: 8080,
        startedAt: startTime,
        provider: 'ngrok',
      });

      await getTunnelStatusAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('2 hours'),
        })
      );
    });
  });
});
