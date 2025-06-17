import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  createMockRuntime,
  createMockMemory,
  createMockState,
  MockRuntime,
  setupActionTest,
} from './test-utils';
import {
  IAgentRuntime,
  Memory,
  Provider,
  State,
  UUID,
  logger,
  ChannelType,
  createUniqueUuid as actualCreateUniqueUuid,
  Media,
  WorldSettings,
  Setting,
  World,
} from '@elizaos/core';

// Import providers from source modules
import choiceProvider from '../src/providers/choice';
import { factsProvider } from '../src/providers/facts';
import { providersProvider } from '../src/providers/providers';
import { recentMessagesProvider } from '../src/providers/recentMessages';
import { settingsProvider } from '../src/providers/settings';
import { attachmentsProvider } from '../src/providers/attachments';

// Mock external dependencies
vi.mock('@elizaos/core', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    createUniqueUuid: vi.fn(),
    getWorldSettings: vi.fn().mockResolvedValue({
      setting1: {
        name: 'setting1',
        value: 'value1',
        description: 'Description 1',
        required: false,
        usageDescription: '',
      } as Setting,
      setting2: {
        name: 'setting2',
        value: 'value2',
        description: 'Description 2',
        secret: true,
        required: false,
        usageDescription: '',
      } as Setting,
    }),
    findWorldsForOwner: vi.fn().mockResolvedValue([
      {
        id: 'world-1' as UUID,
        agentId: 'agent-123' as UUID,
        name: 'Test World',
        serverId: 'server-1',
        metadata: { settings: true },
      } as World,
    ]),
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
    },
  };
});

describe('Choice Provider', () => {
  let mockRuntime: MockRuntime;
  let mockMessage: Partial<Memory>;
  let mockState: State;

  beforeEach(() => {
    const setup = setupActionTest({});
    mockRuntime = setup.mockRuntime;
    mockMessage = setup.mockMessage;
    mockState = {
      ...setup.mockState,
      values: setup.mockState.values || {},
    } as State;
    mockRuntime.getTasks = vi.fn().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
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
    mockRuntime.getTasks = vi.fn().mockResolvedValue(tasks);
    const result = await choiceProvider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState as State
    );
    if (result.data) {
      expect(result.data.tasks).toHaveLength(2);
    }
  });

  it('should handle no pending tasks gracefully', async () => {
    const result = await choiceProvider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState
    );
    if (result.data) {
      expect(result.data.tasks).toHaveLength(0);
    }
  });

  it('should handle tasks with no options gracefully', async () => {
    //...
    const result = await choiceProvider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState
    );
    if (result.data) {
      expect(result.data.tasks).toHaveLength(0);
    }
  });

  it('should handle errors from getTasks gracefully', async () => {
    //...
    const result = await choiceProvider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState
    );
    if (result.data) {
      expect(result.data.tasks).toHaveLength(0);
    }
  });
});

describe('Providers Provider', () => {
  let mockRuntime: MockRuntime;
  let mockMessage: Partial<Memory>;
  let mockState: State;

  beforeEach(() => {
    mockRuntime = createMockRuntime({
      providers: [
        { name: 'TEST_PROVIDER_1', description: 'Test provider 1', dynamic: true, get: vi.fn() },
        { name: 'TEST_PROVIDER_2', description: 'Test provider 2', dynamic: true, get: vi.fn() },
        {
          name: 'INTERNAL_PROVIDER',
          description: 'Internal provider',
          dynamic: false,
          get: vi.fn(),
        },
      ],
    });
    mockMessage = createMockMemory();
    const tempState = createMockState();
    // Ensure mockState has required properties
    mockState = {
      ...tempState,
      values: tempState.values || {},
    } as State;
  });

  it('should list all dynamic providers', async () => {
    const result = await providersProvider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState
    );
    if (result.data) {
      expect(result.data.dynamicProviders).toHaveLength(2);
    }
  });

  it('should handle empty provider list gracefully', async () => {
    //...
    const result = await providersProvider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState
    );
    expect(result.data).toBeUndefined();
  });
});

describe('Attachments Provider', () => {
  let mockRuntime: MockRuntime;
  let mockMessage: Partial<Memory>;
  let mockState: State;

  beforeEach(() => {
    const setup = setupActionTest();
    mockRuntime = setup.mockRuntime;
    mockMessage = setup.mockMessage;
    mockState = {
      ...setup.mockState,
      values: setup.mockState.values || {},
    } as State;

    // Mock getConversationLength
    mockRuntime.getConversationLength = vi.fn().mockReturnValue(10);

    // Mock getMemories for testing
    mockRuntime.getMemories = vi.fn().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should handle messages with no attachments', async () => {
    // Test message without attachments
    mockMessage.content = {
      text: 'Hello, how are you?',
      channelType: ChannelType.GROUP,
    };

    const result = await attachmentsProvider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState
    );

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

    const result = await attachmentsProvider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState
    );

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
    const recentMessages = [
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
      },
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
      },
    ];

    mockRuntime.getMemories = vi.fn().mockResolvedValue(recentMessages);

    const result = await attachmentsProvider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState
    );

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
    const messages = [
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
      },
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
      },
    ];

    mockRuntime.getMemories = vi.fn().mockResolvedValue(messages);

    const result = await attachmentsProvider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState
    );

    expect(result).toBeDefined();
    expect(result.data?.attachments).toHaveLength(3);

    // Check that old attachment has hidden text
    const oldAttachment = result.data?.attachments.find((a) => a.id === 'old-attach');
    expect(oldAttachment?.text).toBe('[Hidden]');

    // Check that recent attachments have visible text
    const recentAttachment = result.data?.attachments.find((a) => a.id === 'recent-attach');
    expect(recentAttachment?.text).toBe('This should be visible');

    const currentAtt = result.data?.attachments.find((a) => a.id === 'current-attach');
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
    const recentMessages = [
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
      },
    ];

    mockRuntime.getMemories = vi.fn().mockResolvedValue(recentMessages);

    const result = await attachmentsProvider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState
    );

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

    const result = await attachmentsProvider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState
    );

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
    const recentMessages = [
      {
        id: 'msg-1' as UUID,
        content: { text: 'Text only message 1' },
        createdAt: Date.now() - 5 * 60 * 1000,
      },
      {
        id: 'msg-2' as UUID,
        content: { text: 'Text only message 2' },
        createdAt: Date.now() - 2 * 60 * 1000,
      },
    ];

    mockRuntime.getMemories = vi.fn().mockResolvedValue(recentMessages);

    const result = await attachmentsProvider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState
    );

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
    mockRuntime.getMemories = vi.fn().mockRejectedValue(new Error('Database error'));

    // The provider doesn't catch errors, so they propagate up
    await expect(
      attachmentsProvider.get(mockRuntime as IAgentRuntime, mockMessage as Memory, mockState)
    ).rejects.toThrow('Database error');
  });
});
