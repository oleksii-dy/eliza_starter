import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';
import { logger } from '@elizaos/core';
import type { IAgentRuntime, Memory, State, UUID } from '@elizaos/core';
import { createMockRuntime, createMockMemory, createMockState, createMockTask } from './test-utils';

// Import providers from source modules
import choiceProvider from '../providers/choice';

describe('Choice Provider', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

  beforeEach(() => {
    // Set up mocks
    mockRuntime = createMockRuntime();
    mockMessage = createMockMemory();
    mockState = createMockState();

    // Mock logger
    spyOn(logger, 'error').mockImplementation(() => {});
    spyOn(logger, 'warn').mockImplementation(() => {});
    spyOn(logger, 'debug').mockImplementation(() => {});

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

    const result = await choiceProvider.get(mockRuntime, mockMessage, mockState);

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

    const result = await choiceProvider.get(mockRuntime, mockMessage, mockState);

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

    const result = await choiceProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data!.tasks).toHaveLength(0); // Tasks without options are filtered out
    expect(result.text).toContain('No pending choices for the moment.');
  });

  it('should handle errors from getTasks gracefully', async () => {
    mockRuntime.getTasks = mock().mockRejectedValue(new Error('Task service error'));

    const result = await choiceProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data!.tasks).toHaveLength(0);
    expect(result.text).toContain('There was an error retrieving pending tasks with options.');
    expect(logger.error).toHaveBeenCalledWith('Error in options provider:', expect.any(Error));
  });
});

// Facts Provider section removed - was incomplete in original file
// Focus on completing choice provider migration first
