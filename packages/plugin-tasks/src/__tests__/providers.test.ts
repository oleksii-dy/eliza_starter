import { AgentRuntime, logger, Memory, State, UUID } from '@elizaos/core';
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { MockRuntime, setupActionTest } from './test-utils';

// Import providers from source modules
import choiceProvider from '../providers/choice';

// Note: Complex module mocking removed for bun:test compatibility

describe('Choice Provider', () => {
  let mockRuntime: MockRuntime;
  let mockMessage: Partial<Memory>;
  let mockState: Partial<State>;

  beforeEach(() => {
    // Set up logger spies for each test
    spyOn(logger, 'error').mockImplementation(() => {});
    spyOn(logger, 'warn').mockImplementation(() => {});
    spyOn(logger, 'debug').mockImplementation(() => {});

    const setup = setupActionTest({}); // No specific state overrides needed for these tests
    mockRuntime = setup.mockRuntime;
    mockMessage = setup.mockMessage;
    mockState = setup.mockState;

    // Default mock for getTasks
    mockRuntime.getTasks = mock().mockResolvedValue([]);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should list pending tasks with options', async () => {
    const tasks = [
      {
        id: 'task-1' as UUID,
        name: 'Approve Post',
        description: 'A blog post is awaiting approval.',
        roomId: mockMessage.roomId,
        tags: ['AWAITING_CHOICE'],
        metadata: {
          options: ['approve', 'reject', { name: 'edit', description: 'Edit the post' }],
        },
      },
      {
        id: 'task-2' as UUID,
        name: 'Select Image',
        roomId: mockMessage.roomId,
        tags: ['AWAITING_CHOICE'],
        metadata: {
          options: [
            { name: 'imageA.jpg', description: 'A cat' },
            { name: 'imageB.jpg', description: 'A dog' },
          ],
        },
      },
    ];
    mockRuntime.getTasks = mock().mockResolvedValue(tasks);

    const result = await choiceProvider.get(
      mockRuntime as unknown as AgentRuntime,
      mockMessage as Memory,
      mockState as State
    );

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data!.tasks).toHaveLength(2);
    expect(result.data!.tasks[0].name).toBe('Approve Post');
    expect(result.text).toContain('Pending Tasks');
    expect(result.text).toContain('1. **Approve Post**');
    expect(result.text).toContain('A blog post is awaiting approval.');
    expect(result.text).toContain('- `approve`');
    expect(result.text).toContain('- `reject`');
    expect(result.text).toContain('- `edit` - Edit the post');
    expect(result.text).toContain('2. **Select Image**');
    expect(result.text).toContain('- `imageA.jpg` - A cat');
    expect(result.text).toContain('- `imageB.jpg` - A dog');
    expect(result.text).toContain(
      "To select an option, reply with the option name (e.g., 'post' or 'cancel')."
    );
    expect(mockRuntime.getTasks).toHaveBeenCalledWith({
      roomId: mockMessage.roomId,
      tags: ['AWAITING_CHOICE'],
    });
  });

  it('should handle no pending tasks gracefully', async () => {
    mockRuntime.getTasks = mock().mockResolvedValue([]); // No tasks

    const result = await choiceProvider.get(
      mockRuntime as unknown as AgentRuntime,
      mockMessage as Memory,
      mockState as State
    );

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data!.tasks).toHaveLength(0);
    expect(result.text).toContain('No pending choices for the moment.');
  });

  it('should handle tasks with no options gracefully', async () => {
    const tasks = [
      {
        id: 'task-1' as UUID,
        name: 'No Options Task',
        roomId: mockMessage.roomId,
        tags: ['AWAITING_CHOICE'],
        metadata: {}, // No options here
      },
    ];
    mockRuntime.getTasks = mock().mockResolvedValue(tasks);

    const result = await choiceProvider.get(
      mockRuntime as unknown as AgentRuntime,
      mockMessage as Memory,
      mockState as State
    );

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data!.tasks).toHaveLength(0); // Tasks without options are filtered out
    expect(result.text).toContain('No pending choices for the moment.');
  });

  it('should handle errors from getTasks gracefully', async () => {
    mockRuntime.getTasks = mock().mockRejectedValue(new Error('Task service error'));

    const result = await choiceProvider.get(
      mockRuntime as unknown as AgentRuntime,
      mockMessage as Memory,
      mockState as State
    );

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data!.tasks).toHaveLength(0);
    expect(result.text).toContain('There was an error retrieving pending tasks with options.');
    expect(logger.error).toHaveBeenCalledWith('Error in options provider:', expect.any(Error));
  });
});

describe('Facts Provider', () => {
  let mockRuntime: MockRuntime;
  let mockMessage: Partial<Memory>;
  let mockState: Partial<State>;

  beforeEach(() => {
    // Set up logger spies for each test
    spyOn(logger, 'error').mockImplementation(() => {});
    spyOn(logger, 'warn').mockImplementation(() => {});
    spyOn(logger, 'debug').mockImplementation(() => {});

    // Use setupActionTest for consistent test setup
    const setup = setupActionTest();
    mockRuntime = setup.mockRuntime;
    mockMessage = setup.mockMessage;
    mockState = setup.mockState;

    // Mock for initial recent messages
    mockRuntime.getMemories = mock().mockResolvedValue([
      {
        id: 'msg-prev-1' as UUID,
        content: { text: 'Previous message 1' },
        createdAt: Date.now() - 1000,
      },
    ]);

    // Mock for useModel
    mockRuntime.useModel = mock().mockResolvedValue([0.1, 0.2, 0.3]); // Example embedding

    // Mock for searchMemories
    mockRuntime.searchMemories = mock().mockImplementation(async (params) => {
      if (params.tableName === 'facts' && params.count === 6) {
        // Could differentiate between the two calls if needed by params.entityId
        if (params.entityId === mockMessage.entityId) {
          // recentFactsData call
          return [
            {
              id: 'memory-2' as UUID,
              entityId: 'entity-1' as UUID,
              agentId: 'agent-1' as UUID,
              roomId: 'room-1' as UUID,
              content: { text: 'User dislikes spicy food' },
              embedding: [0.2, 0.3, 0.4],
              createdAt: Date.now(),
            },
          ];
        } else {
          // relevantFacts call
          return [
            {
              id: 'memory-1' as UUID,
              entityId: 'entity-1' as UUID, // Can be different or same based on test
              agentId: 'agent-1' as UUID,
              roomId: 'room-1' as UUID,
              content: { text: 'User likes chocolate' },
              embedding: [0.1, 0.2, 0.3],
              createdAt: Date.now(),
            },
          ];
        }
      }
      return [];
    });
  });

  afterEach(() => {
    mock.restore();
  });
});
