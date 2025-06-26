import { ChannelType, IAgentRuntime, logger, Media, Memory, State, UUID } from '@elizaos/core';
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import {
  createMockMemory,
  createMockRuntime,
  createMockState,
  MockRuntime,
  setupActionTest,
} from './test-utils';

// Import providers from source modules
import { attachmentsProvider } from '../providers/attachments';
import { providersProvider } from '../providers/providers';
import { recentMessagesProvider } from '../providers/recentMessages';

// Mock getEntityDetails from @elizaos/core
mock.module('@elizaos/core', () => ({
  ...require('@elizaos/core'),
  getEntityDetails: mock().mockResolvedValue([
    {
      id: 'test-entity-id',
      names: ['Test User'],
      metadata: { userName: 'Test User' },
    },
  ]),
}));

describe('Providers Provider', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

  beforeEach(() => {
    // Use standardized mock factories
    mockRuntime = createMockRuntime({
      providers: [
        { name: 'TEST_PROVIDER_1', description: 'Test provider 1', dynamic: true, get: mock() },
        { name: 'TEST_PROVIDER_2', description: 'Test provider 2', dynamic: true, get: mock() },
        {
          name: 'INTERNAL_PROVIDER',
          description: 'Internal provider',
          dynamic: false,
          get: mock(),
        },
      ],
    }) as unknown as IAgentRuntime;
    mockMessage = createMockMemory() as Memory;
    mockState = createMockState() as State;
  });

  afterEach(() => {
    mock.restore();
  });

  it('should list all dynamic providers', async () => {
    const result = await providersProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.text).toContain('TEST_PROVIDER_1');
    expect(result.text).toContain('Test provider 1');
    expect(result.text).toContain('TEST_PROVIDER_2');
    expect(result.text).toContain('Test provider 2');
    expect(result.text).not.toContain('INTERNAL_PROVIDER');

    // Check data format
    expect(result.data).toBeDefined();
    expect(result.data!.dynamicProviders).toHaveLength(2);
    expect(result.data!.dynamicProviders[0].name).toBe('TEST_PROVIDER_1');
    expect(result.data!.dynamicProviders[1].name).toBe('TEST_PROVIDER_2');
  });

  it('should handle empty provider list gracefully', async () => {
    // Mock empty providers
    mockRuntime.providers = [];

    const result = await providersProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.text).toContain('No dynamic providers are currently available');
    expect(result.data).toBeUndefined();
  });
});

describe('Recent Messages Provider', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;
  let mockMessages: Memory[];

  beforeEach(() => {
    // Create sample messages
    mockMessages = [
      createMockMemory({
        id: 'msg-1' as UUID,
        content: { text: 'Hello there!', channelType: ChannelType.GROUP },
        createdAt: Date.now() - 3000,
      }) as Memory,
      createMockMemory({
        id: 'msg-2' as UUID,
        content: { text: 'How are you?', channelType: ChannelType.GROUP },
        createdAt: Date.now() - 2000,
      }) as Memory,
      createMockMemory({
        id: 'msg-3' as UUID,
        content: { text: 'I am doing well.', channelType: ChannelType.GROUP },
        createdAt: Date.now() - 1000,
      }) as Memory,
    ];

    // Use standardized mock factories
    mockRuntime = createMockRuntime({
      getMemories: mock().mockResolvedValue(mockMessages),
      getConversationLength: mock().mockReturnValue(10),
      getRoom: mock().mockResolvedValue({
        id: 'test-room-id',
        type: ChannelType.GROUP,
      }),
      getRoomsForParticipants: mock().mockResolvedValue([]),
      getMemoriesByRoomIds: mock().mockResolvedValue([]),
      getEntityById: mock().mockResolvedValue({
        id: 'test-entity-id',
        names: ['Test User'],
        metadata: { userName: 'Test User' },
      }),
    }) as unknown as IAgentRuntime;
    mockMessage = createMockMemory() as Memory;
    mockState = createMockState() as State;
  });

  afterEach(() => {
    mock.restore();
  });

  it('should retrieve recent messages', async () => {
    const result = await recentMessagesProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.text).toContain('Hello there!');
    expect(result.text).toContain('How are you?');
    expect(result.text).toContain('I am doing well.');
    expect(mockRuntime.getMemories).toHaveBeenCalledWith({
      tableName: 'messages',
      roomId: mockMessage.roomId,
      count: 10,
      unique: false,
    });
  });

  it('should handle empty message list gracefully', async () => {
    // Mock empty messages for this specific test
    mockRuntime.getMemories = mock().mockResolvedValue([]);
    // Ensure the current message content is also empty for the provider's specific check
    mockMessage.content = { ...mockMessage.content, text: '' };

    const result = await recentMessagesProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    // Corrected expected text to match provider output
    expect(result.text).toContain('No recent messages available');
  });

  it('should handle errors gracefully', async () => {
    // Mock error in getMemories
    mockRuntime.getMemories = mock().mockRejectedValue(new Error('Database error'));

    // Spy on logger.error
    const loggerErrorSpy = spyOn(logger, 'error').mockImplementation(() => {});

    const result = await recentMessagesProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.text).toContain('Error retrieving recent messages.');
    expect(loggerErrorSpy).toHaveBeenCalled();

    loggerErrorSpy.mockRestore();
  });
});

describe('Attachments Provider', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

  beforeEach(() => {
    const setup = setupActionTest();
    mockRuntime = setup.mockRuntime;
    mockMessage = setup.mockMessage as Memory;
    mockState = setup.mockState as State;

    // Mock getConversationLength
    mockRuntime.getConversationLength = mock().mockReturnValue(10);

    // Mock getMemories for testing
    mockRuntime.getMemories = mock().mockResolvedValue([]);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle messages with no attachments', async () => {
    // Test message without attachments
    mockMessage.content = {
      text: 'Hello, how are you?',
      channelType: ChannelType.GROUP,
    };

    const result = await attachmentsProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.data?.attachments).toHaveLength(0);
    expect(result.text).toBe('');
    expect(result.values?.attachments).toBe('');
  });

  it('should return current message attachments', async () => {
    // Test message with attachments
    const testAttachments: Media[] = [
      {
        id: 'attach-1',
        url: 'https://example.com/image1.jpg',
        title: 'Test Image 1',
        source: 'image/jpeg',
        description: 'A test image',
        text: 'Image content text',
      },
      {
        id: 'attach-2',
        url: 'https://example.com/document.pdf',
        title: 'Test Document',
        source: 'application/pdf',
        description: 'A test PDF document',
        text: 'Document content text',
      },
    ];

    mockMessage.content = {
      text: 'Check out these attachments',
      channelType: ChannelType.GROUP,
      attachments: testAttachments,
    };

    const result = await attachmentsProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.data?.attachments).toHaveLength(2);
    expect(result.data?.attachments[0].id).toBe('attach-1');
    expect(result.data?.attachments[1].id).toBe('attach-2');
    expect(result.text).toContain('# Attachments');
    expect(result.text).toContain('Test Image 1');
    expect(result.text).toContain('Test Document');
    expect(result.text).toContain('https://example.com/image1.jpg');
    expect(result.text).toContain('Image content text');
  });

  it('should merge attachments from recent messages', async () => {
    const currentAttachment: Media = {
      id: 'current-attach',
      url: 'https://example.com/current.jpg',
      title: 'Current Image',
      source: 'image/jpeg',
      description: 'Current attachment',
      text: 'Current content',
    };

    mockMessage.content = {
      text: 'Current message with attachment',
      channelType: ChannelType.GROUP,
      attachments: [currentAttachment],
    };

    // Mock recent messages with attachments - note they will be reversed by the provider
    const recentMessages: Memory[] = [
      {
        id: 'msg-1' as UUID,
        content: {
          text: 'Previous message 1',
          attachments: [
            {
              id: 'prev-attach-1',
              url: 'https://example.com/prev1.jpg',
              title: 'Previous Image 1',
              source: 'image/jpeg',
              description: 'Previous attachment 1',
              text: 'Previous content 1',
            },
          ],
        },
        createdAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
      } as Memory,
      {
        id: 'msg-2' as UUID,
        content: {
          text: 'Previous message 2',
          attachments: [
            {
              id: 'prev-attach-2',
              url: 'https://example.com/prev2.jpg',
              title: 'Previous Image 2',
              source: 'image/jpeg',
              description: 'Previous attachment 2',
              text: 'Previous content 2',
            },
          ],
        },
        createdAt: Date.now() - 15 * 60 * 1000, // 15 minutes ago
      } as Memory,
    ];

    mockRuntime.getMemories = mock().mockResolvedValue(recentMessages);

    const result = await attachmentsProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.data?.attachments).toHaveLength(3);
    expect(result.data?.attachments[0].id).toBe('current-attach');
    // Messages are reversed, so prev-attach-2 comes before prev-attach-1
    expect(result.data?.attachments[1].id).toBe('prev-attach-2');
    expect(result.data?.attachments[2].id).toBe('prev-attach-1');
    expect(result.text).toContain('Current Image');
    expect(result.text).toContain('Previous Image 1');
    expect(result.text).toContain('Previous Image 2');
  });

  it('should hide text for attachments older than 1 hour', async () => {
    const currentAttachment: Media = {
      id: 'current-attach',
      url: 'https://example.com/current.jpg',
      title: 'Current Image',
      source: 'image/jpeg',
      description: 'Current attachment',
      text: 'Current content',
    };

    mockMessage.content = {
      text: 'Current message',
      channelType: ChannelType.GROUP,
      attachments: [currentAttachment],
    };

    // Mock messages - the provider finds the first message with attachments
    // Recent message needs to come first to be the reference point
    const messages: Memory[] = [
      {
        id: 'msg-recent' as UUID,
        content: {
          text: 'Recent message',
          attachments: [
            {
              id: 'recent-attach',
              url: 'https://example.com/recent.jpg',
              title: 'Recent Image',
              source: 'image/jpeg',
              description: 'Recent attachment',
              text: 'This should be visible',
            },
          ],
        },
        createdAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
      } as Memory,
      {
        id: 'msg-old' as UUID,
        content: {
          text: 'Old message',
          attachments: [
            {
              id: 'old-attach',
              url: 'https://example.com/old.jpg',
              title: 'Old Image',
              source: 'image/jpeg',
              description: 'Old attachment',
              text: 'This should be hidden',
            },
          ],
        },
        createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      } as Memory,
    ];

    mockRuntime.getMemories = mock().mockResolvedValue(messages);

    const result = await attachmentsProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.data?.attachments).toHaveLength(3);

    // Check that old attachment has hidden text
    const oldAttachment = result.data?.attachments.find((a: Media) => a.id === 'old-attach');
    expect(oldAttachment?.text).toBe('[Hidden]');

    // Check that recent attachments have visible text
    const recentAttachment = result.data?.attachments.find((a: Media) => a.id === 'recent-attach');
    expect(recentAttachment?.text).toBe('This should be visible');

    const currentAtt = result.data?.attachments.find((a: Media) => a.id === 'current-attach');
    expect(currentAtt?.text).toBe('Current content');
  });

  it('should not duplicate attachments with same ID', async () => {
    const sharedAttachment: Media = {
      id: 'shared-attach',
      url: 'https://example.com/shared.jpg',
      title: 'Shared Image',
      source: 'image/jpeg',
      description: 'Shared attachment',
      text: 'Shared content with more details',
    };

    mockMessage.content = {
      text: 'Current message',
      channelType: ChannelType.GROUP,
      attachments: [sharedAttachment],
    };

    // Mock a recent message with the same attachment ID but less data
    const recentMessages: Memory[] = [
      {
        id: 'msg-1' as UUID,
        content: {
          text: 'Previous message',
          attachments: [
            {
              id: 'shared-attach', // Same ID as current
              url: 'https://example.com/shared.jpg',
              title: 'Shared Image',
              source: 'image/jpeg',
              description: 'Basic description',
              text: 'Basic text',
            },
          ],
        },
        createdAt: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      } as Memory,
    ];

    mockRuntime.getMemories = mock().mockResolvedValue(recentMessages);

    const result = await attachmentsProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.data?.attachments).toHaveLength(1);
    expect(result.data?.attachments[0].id).toBe('shared-attach');
    // Should keep the current message's richer data
    expect(result.data?.attachments[0].text).toBe('Shared content with more details');
    expect(result.data?.attachments[0].description).toBe('Shared attachment');
  });

  it('should format attachment data correctly', async () => {
    const testAttachment: Media = {
      id: 'format-test',
      url: 'https://example.com/test.png',
      title: 'Format Test Image',
      source: 'image/png',
      description: 'Testing formatted output',
      text: 'This is the extracted text from the image',
    };

    mockMessage.content = {
      text: 'Testing format',
      channelType: ChannelType.GROUP,
      attachments: [testAttachment],
    };

    const result = await attachmentsProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.text).toContain('# Attachments');
    expect(result.text).toContain('ID: format-test');
    expect(result.text).toContain('Name: Format Test Image');
    expect(result.text).toContain('URL: https://example.com/test.png');
    expect(result.text).toContain('Type: image/png');
    expect(result.text).toContain('Description: Testing formatted output');
    expect(result.text).toContain('Text: This is the extracted text from the image');
  });

  it('should handle messages with no recent attachments history', async () => {
    const currentAttachment: Media = {
      id: 'only-attach',
      url: 'https://example.com/only.jpg',
      title: 'Only Attachment',
      source: 'image/jpeg',
      description: 'The only attachment',
      text: 'Only attachment content',
    };

    mockMessage.content = {
      text: 'Message with attachment',
      channelType: ChannelType.GROUP,
      attachments: [currentAttachment],
    };

    // No messages have attachments
    const recentMessages: Memory[] = [
      {
        id: 'msg-1' as UUID,
        content: { text: 'Text only message 1' },
        createdAt: Date.now() - 5 * 60 * 1000,
      } as Memory,
      {
        id: 'msg-2' as UUID,
        content: { text: 'Text only message 2' },
        createdAt: Date.now() - 2 * 60 * 1000,
      } as Memory,
    ];

    mockRuntime.getMemories = mock().mockResolvedValue(recentMessages);

    const result = await attachmentsProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.data?.attachments).toHaveLength(1);
    expect(result.data?.attachments[0].id).toBe('only-attach');
    expect(result.text).toContain('Only Attachment');
  });

  it('should handle errors by throwing them', async () => {
    mockMessage.content = {
      text: 'Test message',
      channelType: ChannelType.GROUP,
      attachments: [
        {
          id: 'test-attach',
          url: 'https://example.com/test.jpg',
          title: 'Test',
          source: 'image/jpeg',
        },
      ],
    };

    // Mock error in getMemories
    mockRuntime.getMemories = mock().mockRejectedValue(new Error('Database error'));

    // The provider doesn't catch errors, so they propagate up
    await expect(attachmentsProvider.get(mockRuntime, mockMessage, mockState)).rejects.toThrow(
      'Database error'
    );
  });
});
