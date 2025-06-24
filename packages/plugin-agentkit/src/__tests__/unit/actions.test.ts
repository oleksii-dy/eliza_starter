import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { getAgentKitActions, createAgentKitActionsFromService } from '../../actions';
import { createMockRuntime, createMockMemory, createMockState } from '../test-utils';
import type { IAgentRuntime } from '../../types/core.d';

describe('AgentKit Actions', () => {
  let mockRuntime: IAgentRuntime;
  let mockAgentKitService: any;

  beforeEach(() => {
    mock.restore();

    // Create mock AgentKit service
    mockAgentKitService = {
      isReady: mock().mockReturnValue(true),
      getAgentKit: mock().mockReturnValue({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        getBalance: mock().mockResolvedValue({
          eth: '1000000000000000000', // 1 ETH
        }),
        getActions: mock().mockReturnValue([
          {
            name: 'get_balance',
            description: 'Get wallet balance',
            schema: {
              _def: { shape: mock().mockReturnValue({}) },
              safeParse: mock().mockReturnValue({ success: true, data: {} }),
            },
            invoke: mock().mockResolvedValue('1.5 ETH'),
          },
          {
            name: 'transfer',
            description: 'Transfer tokens',
            schema: {
              _def: { shape: mock().mockReturnValue({}) },
              safeParse: mock().mockReturnValue({ success: true, data: {} }),
            },
            invoke: mock().mockResolvedValue({ hash: '0x123' }),
          },
        ]),
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

  describe('getAgentKitActions', () => {
    it('should return an empty array (actions registered dynamically)', () => {
      const actions = getAgentKitActions();

      expect(actions).toEqual([]);
    });
  });

  describe('createAgentKitActionsFromService', () => {
    it('should create actions from service when service is available', async () => {
      const actions = await createAgentKitActionsFromService(mockRuntime);

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBe(2);
      expect(actions[0].name).toBe('GET_BALANCE');
      expect(actions[1].name).toBe('TRANSFER');
    });

    it('should return empty array when service is not available', async () => {
      mockRuntime.getService = mock().mockReturnValue(null);
      const actions = await createAgentKitActionsFromService(mockRuntime);

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBe(0);
    });

    it('should return empty array when service is not ready', async () => {
      mockAgentKitService.isReady.mockReturnValue(false);
      const actions = await createAgentKitActionsFromService(mockRuntime);

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockAgentKitService.getAgentKit.mockImplementation(() => {
        throw new Error('AgentKit not available');
      });

      await expect(createAgentKitActionsFromService(mockRuntime)).rejects.toThrow(
        'AgentKit not available'
      );
    });
  });

  describe('Created Action Behavior', () => {
    it('should create actions with proper handler and validation', async () => {
      const actions = await createAgentKitActionsFromService(mockRuntime);
      const getBalanceAction = actions[0];

      expect(getBalanceAction.name).toBe('GET_BALANCE');
      expect(getBalanceAction.description).toBe('Get wallet balance');
      expect(getBalanceAction.handler).toBeDefined();
      expect(getBalanceAction.validate).toBeDefined();

      // Test validation
      const mockMessage = createMockMemory({
        content: { text: 'check balance' },
      });
      const isValid = await getBalanceAction.validate(mockRuntime, mockMessage);
      expect(isValid).toBe(true);

      // Test handler
      const mockState = createMockState();
      const mockCallback = mock();

      const _result = await getBalanceAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledWith({
        text: expect.stringContaining('1.5 ETH'),
        content: '1.5 ETH',
      });
    });

    it('should handle action invocation errors', async () => {
      // Make the action throw an error
      mockAgentKitService
        .getAgentKit()
        .getActions()[0]
        .invoke.mockRejectedValue(new Error('Network error'));

      const actions = await createAgentKitActionsFromService(mockRuntime);
      const getBalanceAction = actions[0];

      const mockMessage = createMockMemory();
      const mockState = createMockState();
      const mockCallback = mock();

      const result = await getBalanceAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect((result as any).success).toBe(false);
      expect((result as any).error).toBe('Network error');
      expect(mockCallback).toHaveBeenCalledWith({
        text: expect.stringContaining('Error executing action get_balance'),
        content: { error: 'Network error' },
      });
    });
  });
});
